"""Per-turn input profile of local Claude Code transcripts for this repository.

Usage: python tools/agent-usage/claude_turn_usage.py [--since YYYY-MM-DD] [--exclude SESSION_ID]

Reads ~/.claude/projects/*bezeg*/ (handlers: top-level *.jsonl, workers: */subagents/*.jsonl).
Input per request = input + cache_creation + cache_read tokens, counted once per message ID.
Cost-weighted input uses 1.25x cache writes, 0.1x cache reads and 5x output as a relative price.
"""
import argparse, glob, json, os, statistics as st

ap = argparse.ArgumentParser()
ap.add_argument('--since', default='')
ap.add_argument('--exclude', action='append', default=[])
args = ap.parse_args()

projects = glob.glob(os.path.expanduser('~/.claude/projects/*bezeg*'))
groups = {'handler': [], 'worker': []}
for p in projects:
    groups['handler'] += glob.glob(p + '/*.jsonl')
    groups['worker'] += glob.glob(p + '/*/subagents/*.jsonl')


def profile(path):
    seen, ctx, cost, first_ts = set(), [], 0.0, None
    for line in open(path, encoding='utf-8', errors='ignore'):
        try:
            o = json.loads(line)
        except ValueError:
            continue
        first_ts = first_ts or o.get('timestamp')
        m = o.get('message') or {}
        if o.get('type') != 'assistant' or m.get('id') in seen:
            continue
        seen.add(m.get('id'))
        u = m.get('usage') or {}
        c = sum(u.get(k) or 0 for k in ('input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'))
        if c:
            ctx.append(c)
        cost += (u.get('cache_creation_input_tokens') or 0) * 1.25 + (u.get('cache_read_input_tokens') or 0) * 0.1 \
            + (u.get('input_tokens') or 0) + (u.get('output_tokens') or 0) * 5
    return first_ts or '', ctx, cost


rows = {}
for g, files in groups.items():
    rows[g] = []
    for f in files:
        if any(x in f for x in args.exclude):
            continue
        ts, ctx, cost = profile(f)
        if ctx and ts[:10] >= args.since:
            rows[g].append((len(ctx), ctx[0], st.mean(ctx), max(ctx), sum(ctx), cost))

all_in = sum(r[4] for g in rows.values() for r in g) or 1
for g, rs in rows.items():
    if not rs:
        continue
    med = lambda i: st.median(r[i] for r in rs)
    print(f'{g}s: {len(rs)} contexts, {sum(r[4] for r in rs) / all_in:.0%} of input, '
          f'turns median {med(0):.0f} (max {max(r[0] for r in rs)}), start median {med(1):,.0f}, '
          f'per-turn mean median {med(2):,.0f}, peak median {med(3):,.0f} (max {max(r[3] for r in rs):,}), '
          f'over 40 turns {sum(r[0] > 40 for r in rs)}, peak over 150k {sum(r[3] > 150_000 for r in rs)}, '
          f'cost-weighted {sum(r[5] for r in rs) / 1e6:.1f}M')
