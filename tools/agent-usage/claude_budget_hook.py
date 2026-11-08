"""PostToolUse hook: tell a Claude worker or handler when its input budget is reached.

Claude Code runs this after every tool call, in workers too. The hook reads the caller's latest
request input from its transcript and prints a message as additional context, so a worker gets
HANDOFF without the handler spending a turn on it. It prints nothing below the threshold or when
telemetry is missing, and repeats on each call past a threshold, so a missed signal costs one
tool call. Flags override thresholds for live tests. BEZEG_HANDLER_BUDGET_SCALE (a positive number,
set per worktree in .claude/settings.local.json under "env") scales the handler's default thresholds.
"""
import argparse, json, os, sys
from pathlib import Path

TAIL_BYTES = 512 * 1024


def request_input(usage):
    return sum(usage.get(k) or 0 for k in ('input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'))


def latest_sample(lines):
    """Return (input tokens, model) of the last real assistant request, or None."""
    for line in reversed(lines):
        if '"assistant"' not in line:
            continue
        try:
            entry = json.loads(line)
        except ValueError:
            continue
        message = entry.get('message') or {}
        tokens = request_input(message.get('usage') or {})
        if entry.get('type') == 'assistant' and message.get('model') != '<synthetic>' and tokens:
            return tokens, message.get('model') or ''
    return None


def read_sample(path):
    size = os.path.getsize(path)
    with open(path, 'rb') as handle:
        handle.seek(max(0, size - TAIL_BYTES))
        sample = latest_sample(handle.read().decode('utf-8', 'ignore').splitlines())
        if sample or size <= TAIL_BYTES:
            return sample
        handle.seek(0)
        return latest_sample(handle.read().decode('utf-8', 'ignore').splitlines())


def transcript_for(payload):
    path = Path(payload['transcript_path'])
    agent = payload.get('agent_id')
    return path.with_suffix('') / 'subagents' / f'agent-{agent}.jsonl' if agent else path


def worker_message(tokens, model, args):
    limit = args.worker_until or (78000 if 'haiku' in model else 135000)
    if tokens >= limit:
        return (f'HANDOFF: input {tokens:,} reached the {limit:,} budget signal. Stop at a consistent point, '
                'write the handoff note to the path in your brief, and return partial.')
    return None


def handler_scale():
    try:
        scale = float(os.environ.get('BEZEG_HANDLER_BUDGET_SCALE') or '1')
    except ValueError:
        return 1.0
    return scale if scale > 0 else 1.0


def handler_message(tokens, model, args):
    scale = handler_scale()
    hard = args.hard or round((215000 if 'opus' in model else 190000) * scale)
    soft = args.soft or round(175000 * scale)
    if tokens >= hard:
        return (f'BUDGET HANDOFF: handler input {tokens:,} reached {hard:,}. Send HANDOFF to running workers, collect '
                'their notes, and hand off now (docs/agent-workflow.md#handler-context-budget-claude).')
    if tokens >= soft:
        return (f'BUDGET SOFT: handler input {tokens:,} passed {soft:,}. Start no new step or worker; finish, '
                'integrate and verify, then hand off (docs/agent-workflow.md#handler-context-budget-claude).')
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--worker-until', type=int)
    parser.add_argument('--soft', type=int)
    parser.add_argument('--hard', type=int)
    args = parser.parse_args()
    try:
        payload = json.load(sys.stdin)
        sample = read_sample(transcript_for(payload))
    except (OSError, ValueError, KeyError, TypeError):
        return
    if not sample:
        return
    build = worker_message if payload.get('agent_id') else handler_message
    message = build(*sample, args)
    if message:
        print(json.dumps({'hookSpecificOutput': {'hookEventName': 'PostToolUse', 'additionalContext': message}}))


if __name__ == '__main__':
    main()
