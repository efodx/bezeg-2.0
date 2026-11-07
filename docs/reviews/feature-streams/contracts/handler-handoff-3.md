# Contracts handler handoff 3

Written 2026-11-07 at `BUDGET SOFT`. Read this and the [handler card](../../../agent-workflow/handler-card.md), then continue. Same worktree (`.claude/worktrees/stream-contracts`), branch `worktree-stream-contracts`. Keep: `--agent bezeg-handler --model opus --permission-mode auto --effort medium`, card routing, at most two workers. Pass this launch line on to your successor, and start your own successor the same way at your handoff. Port 4318.

## Done since handoff 2

- **Test count:** explained and confirmed, recorded in [handoff 2](handler-handoff-2.md). Local runs sample the transient state contract unless `BEZEG_TRANSIENT_STATE=all`. Compare full-suite counts only with `=all`.
- **Families:** pilots and F1 to F4 deployed at `b8840ec9` (hosted CI green). F5 `a89afc88` and F6 `a085c210` deployed on `master`, with the `=all` suite green: 12,051 tests, 4 skipped. Hosted CI for `a085c210` was not checked: run `just ci a085c210`, with `C:\Program Files\GitHub CLI` on `PATH`.
- **F5 audit:** I fixed a field-by-field rebuild the worker missed, `historyOf({example, a, b, step})` in Bisection and RootFinding render, plus six stale banners.

## In progress: the final commit (spec F4), uncommitted in this worktree

Ten files, backed up as `.claude/jobs/f4-final-wip.patch`:

- **`BaseFunctionGraph.tsx`:** the type becomes `BaseGraphState & {model: M}`. `modelPatch` and `stateSnapshot()` are deleted. `getInitialState`, `commitModel` and `replaceState` write `{model}` with no casts. The header is updated. `savedGraphState` and `importPreset` are unchanged.
- **Lesson tests:** five tests now read `graph.state.model`:
  - `fourierSeries`, `numericalMethods` and `interpolation` (Runge and LSQ sections only)
  - `numericalEuler` and `probability` (narrowed through `FunctionGraphState<DensityAreaModel>`)
- **Lesson test, by model value:** `guidedExampleScenes` checks `.model` for its four function ids. Bernstein stays flat.
- **Authority test:** "current" is dropped from two titles. A new assertion requires the store keys to be exactly `['initialized', 'model']`; it was seen failing on the old core.
- **`docs/current-architecture.md`:** a new paragraph under "State and persistence" documents ownership.
- **`graphTransientStateContract.tsx:392-398`:** for a function graph, the expected flat `graphState` keys are now `initialized` plus the model's keys, matching `savedGraphState`. This is **not run yet**.

Checks:

- Typecheck and lint pass. The focused lesson and authority files pass.
- The engineering review (Sonnet) found the three cast-hidden test readers fixed above. Its items 2 to 5 are clean: no `model` key leaks into files, no casts, expected values unchanged, no evaluation or cache change. Evidence is in `.claude/jobs/f4-review.md`.
- The `=all` run before the last fixes failed 62 tests (`.claude/jobs/unit-f4-all.json`):
  - **41 transient contract failures:** all at line 395. They should be fixed by the edit above.
  - **21 function unit-test failures, not diagnosed:** Accumulation, ArcLength, AreaBetweenCurves, Bisection, Continuity, DefiniteIntegral, Derivative, ExponentialFunction, FixedPoint, LinearFunction, MeanValue, Sequence and TrigonometricFunctions `*Graph.test.ts`, 1 or 2 each. They probably read flat `graph.state` through a test subclass or an `any` path, or compare whole `graph.state`.

Read each message from the JSON before you fix anything, and apply the stop rule: never change an expected value. A real behaviour failure, rather than a flat read, means the core is wrong.

Next:

1. Diagnose and fix the 21. Run the four `GraphTransientState.part*` files with `BEZEG_TRANSIENT_STATE=all` plus the failing files, then the full `=all` suite. Expect 12,051 tests with 0 failed.
2. Commit everything above as one commit, "refactor: let the store hold only the live function model". Rebase, run typecheck and lint, push, then `just ci`.
3. Close task 4, as step 4 of handoff 2 describes:
   - Record drag and slider baselines (work item 4, `docs/performance-plan.md`).
   - Run the full browser checklist through `bezeg-smoke` (Sonnet).
   - Mark task 4 accepted in `contracts.md` and the queue.
   - Log the evaluation entry. Its notes: workers twice missed rebuilds, so audit stays mandatory, and the reviewer's grep missed 21 test readers that only the full suite caught.
4. Then step 4 of `contracts.md` (lesson-authoring workstream 2), as handoff 1 describes.

## Traps (new)

- Any `just unit` argument with `/` skips the slot and drops to 2 workers. Write JSON output to a bare filename, then move it.
- `sed -i` here turns CRLF working files into LF. The index is LF with `core.autocrlf=true`, so commits are unaffected. `CltGraph.tsx` has mixed endings: edit it byte-wise, as `.claude/jobs/f5-fix.cjs` does.
- `model` is a protected getter. Outside a test subclass, read `graph.state.model`.
- Never update the stale `origin/worktree-stream-contracts` with a force-push. The classifier rightly refused one.
