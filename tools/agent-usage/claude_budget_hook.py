"""PostToolUse hook: tell a Claude worker or handler when its input budget is reached.

Claude Code runs this after every tool call, in workers too. The hook reads the caller's latest
request input from its transcript and prints a message as additional context, so a worker gets
HANDOFF without the handler spending a turn on it. It prints nothing below the threshold or when
telemetry is missing, and repeats on each call past a threshold, so a missed signal costs one
tool call. Flags override thresholds for live tests. BEZEG_HANDLER_BUDGET_SCALE (a positive number,
set per worktree in .claude/settings.local.json under "env") scales the handler's default thresholds, which depend on its model (handler_limits).
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
    # Owner decision 2026-11-27: non-Haiku workers signal at 175k (was 135k).
    limit = args.worker_until or (78000 if 'haiku' in model else 175000)
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


def handler_limits(model):
    """Default (soft, hard) handler thresholds for a model, before BEZEG_HANDLER_BUDGET_SCALE."""
    if 'fable' in model:
        return 315000, 342000  # Owner decision 2026-11-14: 80% above the 175k / 190k of other non-Opus models.
    if 'opus' in model:
        return 315000, 387000  # Owner decision 2026-11-20: 80% above the earlier Opus 175k / 215k.
    return 175000, 190000


def handler_message(tokens, model, args):
    scale = handler_scale()
    soft_default, hard_default = handler_limits(model)
    hard = args.hard or round(hard_default * scale)
    soft = args.soft or round(soft_default * scale)
    if tokens >= hard:
        return (f'BUDGET HANDOFF: handler input {tokens:,} reached {hard:,}. Send HANDOFF to running workers, collect '
                'their notes, and hand off now (docs/agent-workflow.md#handler-context-budget-claude).')
    if tokens >= soft:
        return (f'BUDGET SOFT: handler input {tokens:,} passed {soft:,}. Start no new step or worker; finish, '
                'integrate and verify, then hand off (docs/agent-workflow.md#handler-context-budget-claude).')
    return None


STATE_NOTE_BYTES = 10000


def state_note_message(payload, limit=STATE_NOTE_BYTES):
    """Warn when an Edit or Write leaves a handler state note over the limit.

    A state note is read once and then re-read on every turn of every successor; the 124 KB ux-picks note
    cost about a tenth of each session that carried it (docs/agent-workflow/handler-cost-2026-11-22.md).
    """
    if payload.get('tool_name') not in ('Edit', 'Write'):
        return None
    path = str((payload.get('tool_input') or {}).get('file_path') or '')
    parts = path.replace('\\', '/').split('/')
    if parts[-1] != 'state.md' or 'reviews' not in parts:
        return None
    try:
        size = os.path.getsize(path)
    except OSError:
        return None
    if size <= limit:
        return None
    return (f'STATE NOTE: {parts[-1]} is {size:,} bytes; the limit is {limit:,}. Rewrite it to the present state before '
            'you hand off: delete resolved items and earlier handlers\' sections, which Git history keeps '
            '(docs/agent-workflow.md#handler-context-budget-claude).')


def budget_message(payload, args):
    try:
        sample = read_sample(transcript_for(payload))
    except (OSError, ValueError, KeyError, TypeError):
        return None
    if not sample:
        return None
    build = worker_message if payload.get('agent_id') else handler_message
    return build(*sample, args)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--worker-until', type=int)
    parser.add_argument('--soft', type=int)
    parser.add_argument('--hard', type=int)
    args = parser.parse_args()
    try:
        payload = json.load(sys.stdin)
    except ValueError:
        return
    if not isinstance(payload, dict):
        return
    messages = [m for m in (budget_message(payload, args), state_note_message(payload)) if m]
    if messages:
        print(json.dumps({'hookSpecificOutput': {'hookEventName': 'PostToolUse', 'additionalContext': '\n'.join(messages)}}))


if __name__ == '__main__':
    main()
