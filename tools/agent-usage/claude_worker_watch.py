"""Watch a running Claude Code worker's input tokens; exit when it reaches a threshold.

Usage: python tools/agent-usage/claude_worker_watch.py AGENT_ID [--until TOKENS] [--interval SECONDS]

Without --until, prints the latest turn count and input once. With --until, polls the worker's
transcript (~/.claude/projects/*bezeg*/*/subagents/agent-AGENT_ID.jsonl) and exits when the latest
request input reaches TOKENS, the worker stops writing for 10 minutes, or no transcript appears in 2 minutes. Run it as a background command
so its exit notifies the handler.
"""
import argparse, glob, json, os, sys, time

ap = argparse.ArgumentParser()
ap.add_argument('agent_id')
ap.add_argument('--until', type=int)
ap.add_argument('--interval', type=float, default=5)
args = ap.parse_args()


def latest():
    fs = glob.glob(os.path.expanduser(f'~/.claude/projects/*bezeg*/*/subagents/agent-{args.agent_id}.jsonl'))
    if not fs:
        return None, 0, 0
    seen, last, turns = set(), 0, 0
    for line in open(fs[0], encoding='utf-8', errors='ignore'):
        try:
            o = json.loads(line)
        except ValueError:
            continue
        m = o.get('message') or {}
        if o.get('type') == 'assistant' and m.get('id') not in seen:
            seen.add(m.get('id'))
            u = m.get('usage') or {}
            c = sum(u.get(k) or 0 for k in ('input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'))
            if c:
                last, turns = c, turns + 1
    return fs[0], turns, last


start = time.time()
while True:
    path, turns, last = latest()
    if not path and time.time() - start > 120:
        sys.exit('no transcript for this agent id')
    if args.until is None or last >= args.until:
        print(f'turns={turns} input={last:,}' + (' THRESHOLD' if args.until else ''))
        sys.exit(0 if path else 1)
    if path and time.time() - os.path.getmtime(path) > 600:
        print(f'turns={turns} input={last:,} IDLE')
        sys.exit(0)
    time.sleep(args.interval)
