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

Rewritten by handler 2 (2026-11-27). Present state only.

### Where

- Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/lane-b`, branch `lane-b` (`node_modules` junction;
  unlink with PowerShell before ever removing). Last merged `board-workspace-2` (incl. L39 waves `fd9072f80`) after
  `17b84ef59`; merge again before a lane if A has moved far (conflicts so far: list unions in `fragments/index.ts`,
  `parity.test.tsx`, `AnalysisFirstTask.test.tsx`, the L50 notes; keep both sides).
- Stream A = **"Board workspace handler 13"**: send every accepted commit id there; it cherry-picks and publishes.
- Lane-b Vite dev server on 4484 (`npx vite --port 4484 --strictPort --host 127.0.0.1`, background; check the port's
  process before restarting): `http://127.0.0.1:4484/bezeg-2.0/`. Lesson smoke port 4395.

### Done

- **L54 complete** (15 compgeo demos; all picked by A). View-binding base fix `cb59a901f` + `2420f7a87`.
- **L50 complete** (8 demos): accumulation `43e4628db`, convexity `42d6cb877` + `706f45046`, `c26f785a3`, darboux
  `f7f55df5d`, extrema `b9d478a81`, fixed-point `56c18c651`, sequence `e67860b95`, mean-value `17b84ef59`,
  uniform-convergence `4e8a0b0aa` (all sent to A and picked).
- **L49 so far:** curve-comb `44ca2f919`, curve-curvature `524e4ab08`, curve-envelope `62cb9d1e6` (sent; comb and curvature
  picked). Last merge of `board-workspace-2`: `b7a2d4a93` (unit suite green there; parity flake fixed by A in `05f203d21`).

### Waiting on stream A

- **Do not start L47 until A sends the L42 ids** (A's L42 may add opt-in hooks to `IterativeFunctionGraph.tsx`; merge
  them first). L44 is free.
- Nothing else blocking. A repoints stale clip/preview/perf script rows (controls that became pucks) in one pass; lane workers
  list them in notes and B forwards them.

### Rules learned (in `briefs/08-lane-L50.md` and `briefs/08-lane-L49.md`; copy into L44/L47 briefs)

- One demonstration per Sonnet worker; most need a second (finish) worker for tests, checks and the browser check.
- Before declaring a graph, grep shared tests for it as an "undeclared graph" fixture (fixed-point broke `BoardCards` /
  `LessonCard` tests and a publish).
- FirstTask "pucks" tests query `#board-card-tools` after `openTools()`, and show red.
- Board labels vs cards: measure room against `this.boardView.intent().box` (extrema, L50 notes 4c); views that would put
  watched objects under cards get a declared `followView` box (sequence `followBox`, notes 6c).
- Owner, 2026-11-27: remove board caption lines that repeat a legend entry or readout row; formula becomes a `formula` row.
- Handler checks the Slovenian rewording itself, looks at the 1280x720 step-5 capture, then re-records the golden
  (`BEZEG_PARITY_GOLDEN_RECORD=1 BEZEG_PARITY_GOLDEN_ID=<id> just unit src/graphs/base/declare/parityGolden.test.tsx`)
  only for captions/rows/labels moving to cards.
- Prose: "vklopi krmilnik X" / "turn on the X control", "s krmilnikom X"; readouts "v kartici Odčitki".

### Next

1. **L49** (curve geometry, dispatch `briefs/08-lane-L49.md`, notes `briefs/notes/08-lane-L49.md`), one per worker:
   curve-evolute (dispatched by handler 2), curve-offset, curve-parametric.
   A holds L31/L32/L33 until L49 is picked (shared `CurveGeometryFirstTask.test.tsx`, `PlaybackRoutes.test.tsx`).
2. Then L44 (splines, 6; `BaseSplineCurveGraph.tsx` shared, `GraphSceneReload.test.tsx`), L47 (probability, 5;
   `IterativeFunctionGraph` opt-in only, `BaseFunctionGraph.authority.test.tsx` shared with L46). Write a dispatch per lane
   from `briefs/08-lane-L49.md`.
3. Open for the owner from stream B: none.
