# Brief: port the jank probe and record its baseline (task 01c, slice 3)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (branch `board-workspace`). Do not commit. Another worker ports the fuzzer into `scripts/fuzz/` at the same time: do not touch it.

## Goal

A repository probe measuring interaction smoothness on master's current workspace, with the prototype's thresholds, and a recorded baseline. Source: `docs/tasks/ux-picks-app-wide/01c-check-tooling.md` (slice 3; Acceptance second bullet) and `docs/specs/ux-picks-app-wide.md` acceptance 6 (read that item only).

## Reference (read-only)

`docs/reviews/ux-picks-app-wide/night-tooling/probe.cjs` (prototype DOM: pucks, cards, glides). Keep its metrics and thresholds: long tasks, frame gaps, layout shift, value flicker, glides per step, Back return, board cover. Metrics that need cards or glides (board cover, glides per step) have no subject on master yet: keep them in the code behind a check that reports `n/a` when the element is absent, so tasks 03-07 switch them on. Real-input selectors that work on master: `docs/reviews/ux-picks-app-wide/smoke/devcheck-01b.cjs`.

## Owned paths

`scripts/probe/` (new: `probe.cjs` CLI, `thresholds.cjs`, `README.md`), and the baseline files `docs/reviews/ux-picks-app-wide/measure/probe-baseline-<viewport>.json` plus a short `probe-baseline.md` (table per route and viewport). Not the `justfile` (the handler wires `just probe` to `node scripts/probe/probe.cjs <args>`).

## Settled

- CLI: `node scripts/probe/probe.cjs --base <url> [--route <path>]... [--viewport 1440x900] [--throttle 4] [--json <file>]`. Exit 1 when a threshold fails; one line per route and metric.
- Measure on the **production preview** `http://127.0.0.1:4471/bezeg-2.0/` (already running; do not start or stop servers).
- Routes: Taylor (`analysis/taylor`), transformations, De Casteljau, phase portrait (free), and the Taylor lesson (Back return applies there). Script per route: a slider drag, a board pan, a point drag where present, Play then a slider touch where playback exists, lesson Next then Back.

## Checks

- Each route at 1440x900 and 1024x768 without throttle, and Taylor and phase portrait at 1440x900 with `--throttle 4`: record all numbers in the baseline files. A threshold failure on master is a finding to report, not something to fix.
- Repeat one route twice and report the spread of its main numbers (so a later comparison knows the noise).
- `just lint` passes.

Send independent reads in one message. Create files with Write, not heredocs; start commands from the working directory; one browser run at a time.

## Return (at most 300 words)

Files; the baseline table (route × viewport, main numbers); threshold failures; noise spread; metrics reported `n/a`. Handoff note if you stop early: `docs/reviews/ux-picks-app-wide/notes/01c-probe.md`.
