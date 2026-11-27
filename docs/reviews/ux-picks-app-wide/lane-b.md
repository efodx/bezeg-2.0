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

Rewritten by handler 2 at its soft budget (2026-11-27). Present state only.

### Where

- Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/lane-b`, branch `lane-b` (`node_modules` junction;
  unlink with PowerShell before ever removing). Last merge of `board-workspace-2`: `f95cfcbb7` (before A's L42 tip
  `85c4efe8a`). Merge again before each lane; conflicts are list unions in `fragments/index.ts`, `parity.test.tsx`,
  `*FirstTask.test.tsx`, lesson files and the lane notes: keep both sides (a Sonnet worker resolves them; check for
  leftover markers with Grep `^(<<<<<<<|>>>>>>>)` before committing the merge).
- Stream A = **"Board workspace handler 13"**: send every accepted commit id there; it cherry-picks and publishes.
- Lane-b Vite dev server on 4484 (`npx vite --port 4484 --strictPort --host 127.0.0.1`, background; check the port's
  owner before restarting, it may already be running): `http://127.0.0.1:4484/bezeg-2.0/`. Lesson smoke port 4395.

### Done (all sent to A and picked)

- **L54** (15 compgeo demos) and the view-binding base fix `cb59a901f` + `2420f7a87`.
- **L50** (8 analysis demos): accumulation `43e4628db`, convexity `42d6cb877`/`706f45046`/`c26f785a3`, darboux `f7f55df5d`,
  extrema `b9d478a81`, fixed-point `56c18c651`, sequence `e67860b95`, mean-value `17b84ef59`, uniform-convergence `4e8a0b0aa`.
- **L49** (6 curve-geometry demos): curve-comb `44ca2f919`, curve-curvature `524e4ab08`, curve-envelope `62cb9d1e6`,
  curve-evolute `5c130f94a`, curve-offset `34039cc2c`, curve-parametric `3ff7fc670`.

### In progress

- **L44 spline-c1: converted and verified, UNCOMMITTED in the lane-b tree** (notes `briefs/notes/08-lane-L44.md`,
  "spline-c1"). Hook: `BaseSplineCurveGraph.declaresSplineWorkspace()` (default false; joins in marks, `followView` around
  free points and joins); the next spline graph only overrides it. Checks pass (tsc, lint, build, FirstTask, round trip,
  graph-check, smoke-lesson; parity n/a, golden unchanged; 8 captions clear). **One blocker:** shared
  `src/graphs/curves/typedPointPaths.test.tsx:88-110` uses spline-c1 as its *undeclared* fixture and now fails
  (`expected 5 to be greater than 55`, :108). Ask stream A whether to switch that fixture to an undeclared spline
  (spline-c2) or move spline-c1 into the declared branch; apply it, rerun that test, then review the Slovenian
  (two reworded observation prompts in `splineGuidedLessons.ts`) and commit. Stale rows for A:
  `demonstration-preview-recipes.cjs:33`, `demonstration-preview-curve-motion.cjs:382`.

### Waiting on stream A

- Nothing blocking. A repoints stale clip/preview/perf script rows (controls that became pucks) in one pass; lane workers
  list them in notes and B forwards them. Stale rows from L44 so far: `demonstration-preview-recipes.cjs:33`,
  `demonstration-preview-curve-motion.cjs:382` (spline-c1).
- Shared `typedPointPaths.test.tsx` refit test: stream A (handler 13) decided spline-c1 moves to the declared branch;
  the undeclared case uses a graph outside L44 with a comment naming its lane.

### How a demonstration goes (pattern that worked in L49)

1. Dispatch one Sonnet `bezeg-worker` with a short prompt: "read `briefs/08-lane-<L>.md` whole; finished examples <ids>;
   settled rules; order (a) fixture grep + parity, (b) conversion, (c) tests red first, (d) checks, (e) browser captions,
   view every image; ≤300 words; notes section <id>". It usually hands off partway at 175k.
2. Dispatch a finish worker from its notes section: the failing tests, smoke probes (`#board-card-readouts`, open the
   card in that step, no mangled escapes), checks, captions.
3. Accept: read the reworded Slovenian yourself (imperatives "povečaj/premakni/vklopi"; pucks "s krmilnikom X", bare
   names; Orodja controls "V kartici Orodja izberi …"; readouts "v kartici Odčitki"); open the 1280x720 step-5 capture;
   if the curve is squeezed, require a declared `followView` box with a red-first test. Then re-record the golden
   (`BEZEG_PARITY_GOLDEN_RECORD=1 BEZEG_PARITY_GOLDEN_ID=<id> just unit src/graphs/base/declare/parityGolden.test.tsx`)
   when only captions/rows moved, commit with explicit paths (skip `*.report.txt`), send the id to A.

### Rules learned (in the L49/L44 briefs; copy into the L47 brief)

- Before declaring a graph, grep shared tests for it as an "undeclared graph" fixture.
- `parity.test.tsx` counts declared notes and rows as shown; a caption moved into a row or note gets an `<id>Accepted` entry.
- FirstTask "pucks" tests query `#board-card-tools` after `openTools()`, shown red.
- Playback that writes a puck's parameter uses an animation lease (`useLease`, ADR 0064, curve-parametric).
- Owner, 2026-11-27: remove board caption lines that repeat a legend entry or readout row.

### Next

1. Finish and commit L44 spline-c1, then spline-c2, spline-cn, spline-g1, spline-g1-symmetric, spline-parameterization
   (one per worker; reuse the spline-c1 hook).
2. L47 (probability, 5 demos: prob-binomial-normal, prob-clt, prob-correlation, prob-density, prob-summary;
   `probabilityGuidedLessons.ts`, `ProbabilityFirstTask.test.tsx`; shared `BaseFunctionGraph.authority.test.tsx` with L46,
   `IterativeFunctionGraph.tsx` opt-in only). A's L42 is done (`85c4efe8a`, `IterativeFunctionGraph.tsx` unchanged), so
   L47 is free after a merge. Write `briefs/08-lane-L47.md` from `briefs/08-lane-L44.md` plus the function-graph rules of
   `briefs/08-lane-L50.md` and A's note: a lesson morph that writes a parameter as `animation` must not set the view
   intent in that write (`GeometricSeriesGraph.tsx:~193` skips the refit when `currentWrite()?.source === 'animation'`);
   `src/inputs/sharedControlBehaviour.tsx:166` now blurs as the learner.
3. Open for the owner from stream B: none.
