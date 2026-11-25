# Brief: close task 08 step 2 slice 2 (curve workspace)

Role: `bezeg-worker` (Sonnet). Worktree root `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`
(branch `board-workspace-2`); never `cd` elsewhere, never create a worktree, never commit or push. The slice is uncommitted
(`src/graphs/base/BaseCurveGraph.tsx`, `controls/CurveDisplayControls.tsx`, `curves/bezier/BezierCurveGraph.tsx` and its
declaration test, `src/localization/fragments/curves.ts`, `fragments/index.ts`); notes `docs/reviews/ux-picks-app-wide/briefs/notes/08-curve-workspace.md`. Preserve it.

## 1. Parity not applicable to a graph that shows no values (handler decision)

`bezier` shows no readout rows, notes, outputs or captions, so no parity recording can exist and `just graph-check bezier`
fails on parity. Decision: parity is **not applicable** when the demonstration has no recording **and** its declaration has
no readouts, notes, readout help or status (nothing parity compares). Then graph-check reports parity as `n/a (no shown
values)` and passes that item. A graph whose declaration has readouts still needs a recording. Implement this where
graph-check decides parity (find it: `just --list`, `scripts/`, search `parity`). Test: a unit or script test for both
branches (no-values graph passes as n/a; a readout-declaring graph without recording still fails), each observed failing once.
Add one line to `docs/guides/converting-a-graph.md` where parity is described.

## 2. Marks cache key misses rational weights

`BaseCurveGraph.curveViewMarks()` memoizes on point coordinates only; for a rational curve a weight change moves the curve
samples without moving the points, so the `nice` marks go stale. Include the weights in the key when the curve has them
(see `JXGRationalBezierCurve` / its curve model for the weights accessor). Unit test with a rational curve in a declared
state if reachable cheaply; otherwise state why.

## 3. Checks

- `just graph-check bezier --base http://127.0.0.1:4472/bezeg-2.0/` after `just build` (the preview on 4472 serves this
  worktree's `build/`; rebuild so it has current sources; if `just preview` refuses for stale sources, report it, the handler
  restarts it). Git Bash: `MSYS_NO_PATHCONV=1`. Also `just graph-check decasteljau --base http://127.0.0.1:4472/bezeg-2.0/`
  (the earlier run printed "browser skipped (no --base)": make sure the flag reaches it).
- `just unit src/graphs/base src/graphs/curves src/learning/content/declarationContract`, `npx tsc --noEmit --pretty false`,
  `just lint <changed files>`.

Owned: the slice files above, the graph-check/parity script you change and its test, the guide line.
Foreground runs with a long timeout; never bare `npm test`/`npx vitest`. Send independent reads in one message.

## Return

At most 250 words: per item pass/fail with log paths, red failures observed, files changed. Append "Close-out" to the notes.
