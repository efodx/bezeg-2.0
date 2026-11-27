# Task 08 stream B: long-pole lanes (side handler)

Owner, 2026-11-27: task 08 runs as two parallel lane streams. Stream A (the board workspace handler, worktree
`.claude/worktrees/board-workspace`, branch `board-workspace-2`) runs the small lanes and owns integration, gates and
publishes. **Stream B (you)** runs the long-pole lanes, in this order: **L54, L50, L49, L44, L47**
(`inventory/08-partition.json`; L54 has 15 demonstrations in 5 sessions).

## Setup (once)

- In the main checkout (on `master`, clean apart from untracked files), `git merge --ff-only origin/master` first, so the
  project hook there carries the 175k worker signal (the hook runs from `$CLAUDE_PROJECT_DIR`).
- From the main checkout `C:/Users/1337Hacker/Desktop/bezeg-2.0`: `git worktree add -b lane-b .claude/worktrees/lane-b board-workspace-2`,
  then link `node_modules` as a junction to the main checkout's (PowerShell `New-Item -ItemType Junction`). Enter it with
  EnterWorktree by path. Never create a worktree inside another worktree. Before ever removing it, unlink the junction with
  PowerShell first (`(Get-Item <wt>/node_modules).Delete()`), or the shared `node_modules` is wiped.
- Read: the handler card `docs/agent-workflow/handler-card.md`, then the state note `docs/reviews/ux-picks-app-wide/state.md`
  ("Next slice's brief inputs" item 2 and the owner's 2026-11-27 line), then `briefs/08-lane.md` and a finished dispatch
  (`briefs/08-lane-L25.md`) as the brief template.

## Rules

- Work and commit only on branch `lane-b` in your worktree, one commit per lane (or per L54 session). **Never push, never
  publish, never touch master or `board-workspace-2`.** Stream A cherry-picks your commits into `board-workspace-2` and
  publishes; tell it by SendMessage to "Board workspace handler 11" (or its successor named in the state note) with the
  commit ids after each accepted lane.
- One lane at a time; one Sonnet `bezeg-worker` at a time (the owner allows two parallel lanes in total, one per stream).
  Worker HANDOFF is at 175k. Heavy commands queue machine-wide through the test slots; keep lane checks focused (graph-check,
  golden check for the id, own tests, tsc, lint, the lesson test), and run one `just build` + `just smoke-lesson` per lane.
- Standing owner permission: lane workers may wrap untagged writes in any shared test in `runAs('learner', ...)` with
  asserted values unchanged; any other shared-test change stops that parameter and is reported.
- Re-record a golden only when the difference is notes/rows/legend moving to cards (as stream A does). Check Slovenian
  rewording of lesson prose yourself; the term for pucks is *krmilnik*.
- Tough handler choices: consult a Fable advisor (Agent `Plan`, model `fable`, effort `high`, read-only brief with the
  facts and options; owner, 2026-11-27).
- Owner decisions go to the owner (AskUserQuestion) after you update this file's "Status" section.
- Budget: at `BUDGET HANDOFF` update "Status" below, commit it on `lane-b`, and start your successor from the main
  checkout with `claude --bg -n 'Board workspace lane B handler N' --agent bezeg-handler --model claude-opus-5-5 --effort medium --permission-mode auto "<prompt naming this file>"`, confirm it with `claude logs <id>`, and pass this rule on.
- Never end a turn with nothing running and nothing asked.

## Status

Rewritten by handler 1 at its soft budget (2026-11-27). Present state only.

### Where

- Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/lane-b`, branch `lane-b` (`node_modules` junction;
  unlink with PowerShell before ever removing). Merged `board-workspace-2` (incl. `ee7a33aa7`) at `156d36f7c`; stream A
  picks only lane commits after a merge. Merge again from `board-workspace-2` before a new lane if A has moved far.
- Stream A = **"Board workspace handler 13"** (from 2026-11-27; merge `board-workspace-2` at `879e0ed31` or later into
  lane-b before the next lane, A asked: AnalysisFirstTask conflicted with L37) (send every accepted commit id there; it cherry-picks between its lanes).
- Lane-b Vite dev server (handler 1's shell, dies with the session; restart with `npx vite --port 4484 --strictPort --host 127.0.0.1`
  as a background command): `http://127.0.0.1:4484/bezeg-2.0/`. Lesson smoke port 4395.

### Done

- **L54 complete** (15 compgeo demos): `fa98874c4`, `644dca72b`, `7ff06edc9`, `48f4d392e`, `d0d2acb8c`, `a14152ab2`,
  `dfb8498ad`, `028efbf9a` (all picked or queued by A).
- **View-binding base fix** `cb59a901f` + tests `2420f7a87` (declared graphs with no parameter bindings now bind `view`, so
  the view director runs on point-set/projective/curve graphs). It made master CI red once (Bezier batch export restored
  the box by raw JXG; A fixed it in BaseGraph `applyFigurePreset`).
- **L50 so far:** accumulation `43e4628db`, convexity `42d6cb877`, convexity sign marks clear of cards `706f45046`,
  sharedControls row dropped `c26f785a3`, darboux + caption sweep `f7f55df5d`, extrema `b9d478a81` (handler 2; all sent
  to A). Extrema pattern for board labels vs cards: measure room against `this.boardView.intent().box`, compact labels
  by card-free width, keep labels inside top/bottom edges (notes Session 4c).

### Rules learned this session (all in `briefs/08-lane-L50.md`; copy them into the L49/L44/L47 briefs)

- One function-graph demonstration per Sonnet worker (one fills the 175k budget); compgeo took two.
- Checks per demo: graph-check, golden, FirstTask, `BEZEG_PRESET_ROUNDTRIP=all ... -t <id>`, family unit, tsc, lint,
  `src/graphs/base/sharedControls.graphs.test.tsx` when a slider becomes a puck, every `tests/*.spec.cjs` that names the id
  or route, build, smoke-lesson, browser caption check at 1440x900 and 1280x720 on the dev server.
- Host tests of function graphs mock `../../mathjax/loadMathJax` (else pucks never settle in jsdom).
- **Owner, 2026-11-27: remove board caption lines that repeat a legend entry or readout row** ("Yes, remove that. I
  thought it was part of it since you can do it when you move to cards."). Pattern: Taylor `e0bfe3576`; the function
  formula becomes a declared `formula` row ("Funkcija"); unused board keys go from `sl.ts`/`en.ts`. Recorded by A in
  `e5e4374fb`. Board text a lesson step tells the learner to read must be clear of cards (`marks.must` or user-coordinate
  anchors inside the followed frame, as `706f45046` / L37 `89e4245ee`).
- Handler re-records goldens only for notes/rows/labels moving to cards or removed caption lines, after the browser check.
- Prose: "vklopi krmilnik X" / "turn on the X control"; readouts are "v kartici Odčitki" / "the Readouts card".
- Views are restored through `BoardView`, never raw `setBoundingBox`.

### Next

1. L50 remaining, one per worker (handler 2 dispatched fixed-point): fixed-point, sequence (both `IterativeFunctionGraph`, shared with L42/L47:
   opt-in hook only, default off), mean-value, uniform-convergence. Dispatch template: the darboux dispatch in this
   handler's history is the shape: "read `briefs/08-lane-L50.md`, the shared brief, the notes; finished examples
   `43e4628db`, `42d6cb877`, the darboux commit; one demo; checks per the dispatch".
2. Then L49 (curve geometry, 6 demos, conflicts L31/L33 on `CurveGeometryFirstTask.test.tsx` and L32 on
   `PlaybackRoutes.test.tsx`), L44 (splines, 6), L47 (probability, 5; `IterativeFunctionGraph`, `BaseFunctionGraph.authority.test.tsx`
   shared with L46). Write a dispatch per lane like `briefs/08-lane-L50.md`.
3. Open: none for the owner from stream B.
