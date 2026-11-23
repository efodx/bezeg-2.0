# Brief: board label halo (task 03, slice 5)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium, edits allowed in owned paths. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`; keep it as cwd, no `cd`, create files with Write (no heredocs). Do not commit. Send independent reads and searches in one message. Handoff note: `docs/reviews/ux-picks-app-wide/briefs/notes/03-label-halo.md`.

## Goal

Board labels (JSXGraph text labels of points, curves and axes on every graph) get a halo so they stay legible over curves, grid and fills, as on the prototype. Spec: `docs/specs/ux-picks-app-wide.md` (search "halo"); task file `docs/tasks/ux-picks-app-wide/03-layout-and-board-cards.md` slice 5.

## Entry

- Prototype behaviour (reference, branch frozen at `aff6df6c`): find the halo with `git grep -n -i "halo\|paint-order\|text-shadow" aff6df6c -- src` and read only those hunks. Keep the behaviour; improve if it is cheap (e.g. use the board's background colour token, so dark/presentation themes still work).
- Current label styling: search `src/` for JSXGraph label CSS (`.JXGtext`, `jxgbox`, label classes) and the theme tokens.

## Settled

- CSS only if possible (`paint-order: stroke` on SVG text, `text-shadow` for HTML labels), using the board background token, not a hard-coded white. No per-graph code.
- Must not change label positions, sizes or MathJax layout; must not affect figure export legibility badly (PNG via html2canvas and SVG export: check the halo survives or degrades harmlessly; report which).

## Owned paths

The stylesheet(s) that style board labels, plus a new small test if a unit test can observe it. Do not touch `src/workspace/**`, `GraphHost.tsx`, `BaseGraph.tsx`, `DemonstrationWorkspace.tsx` (another worker owns them now), graph files, or `tests/**`.

## Checks

- `npx tsc --noEmit --pretty false`; lint; `just build`.
- Do not start servers or use ports 4482, 4483, 4471; the handler checks screenshots.

## Return (≤250 words)

The rule(s) added with `file:line`, which label kinds they reach (SVG text, HTML text, MathJax), export behaviour, and anything you could not cover.
