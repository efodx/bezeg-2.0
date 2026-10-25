"""Watch a running Claude Code worker's or handler's input tokens; exit when it reaches a threshold.

Usage: python tools/agent-usage/claude_worker_watch.py (AGENT_ID | --self) [--until TOKENS] [--interval SECONDS]

Without --until, prints the latest turn count and input once. With --until, polls the worker's
transcript (~/.claude/projects/*bezeg*/*/subagents/agent-AGENT_ID.jsonl) and exits when the latest
request input reaches TOKENS, the worker stops writing for 10 minutes, or no transcript appears in 2 minutes. Run it as a background command
so its exit notifies the handler.

--self watches the calling session's own transcript (CLAUDE_CODE_SESSION_ID) for the handler budget. It skips
the idle exit, since a handler waiting on workers writes nothing.
"""
import argparse, glob, json, os, sys, time

ap = argparse.ArgumentParser()
ap.add_argument('agent_id', nargs='?')
ap.add_argument('--self', action='store_true', help="watch this session's own transcript")
ap.add_argument('--until', type=int)
ap.add_argument('--interval', type=float, default=5)
args = ap.parse_args()
if args.self == bool(args.agent_id):
    ap.error('give either AGENT_ID or --self')
if args.self and not os.environ.get('CLAUDE_CODE_SESSION_ID'):
    ap.error('--self needs CLAUDE_CODE_SESSION_ID; run it from a Claude Code session')


def latest():
    if args.self:
        pattern = f"~/.claude/projects/*bezeg*/{os.environ['CLAUDE_CODE_SESSION_ID']}.jsonl"
    else:
        pattern = f'~/.claude/projects/*bezeg*/*/subagents/agent-{args.agent_id}.jsonl'
    fs = glob.glob(os.path.expanduser(pattern))
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
        sys.exit('no transcript for this session' if args.self else 'no transcript for this agent id')
    if args.until is None or last >= args.until:
        print(f'turns={turns} input={last:,}' + (' THRESHOLD' if args.until else ''))
        sys.exit(0 if path else 1)
    if path and not args.self and time.time() - os.path.getmtime(path) > 600:
        print(f'turns={turns} input={last:,} IDLE')
        sys.exit(0)
    time.sleep(args.interval)
