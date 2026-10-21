# Define scene-action limits once

**Source spec:** [Graph contract deepening, section 3](../../specs/graph-contract-deepening.md#3-scene-action-limits)
**Status:** done on 2026-10-21; reviewed in the main chat (limit values unchanged, content checks keep type and shape only), handler reran full `just unit`, `just typecheck` and `just build`. No browser smoke: learner-visible behavior and lesson content are unchanged. No ADR: the choice is local to the content translation and the limits' homes, and is recorded under Decision below.
**Priority:** worth exploring; independent of tasks 01 and 02, test first.

## Goal

Stop restating graph value limits inside the content-side scene-action translation. Each limit lives with the graph or analysis module that enforces it, and lesson and activity content is tested against the real handlers. The closed scene-action name list from ADR 0013 stays.

## Scope and sequence

1. Read the source spec's five acceptance criteria and ADRs 0002, 0012 and 0013. Inspect `sceneAction()` in `lessonCatalog.ts`, `SUPPORTED_SCENE_ACTION_NAMES` and `SceneActionValue` in `guidedLessons.ts`, `LessonAction` in `model.ts`, `LessonActionRegistry` and its tests, the graph handlers registered through `registerLessonActions`, and `src/learning/chapter/activities.ts`.
2. Add the content-wide test first: apply every Guided lesson scene, and every Chapter activity's actions, to its Demonstration's graph in one synchronous sequence, and fail on any rejected value. If the [graph transient state task](01-graph-transient-state.md) has introduced a real-graph harness, reuse it. Record any content it finds out of range, such as alpha-parametrization samples above 40.
3. Make an inventory of every limit `sceneAction` checks and where the graph enforces the same limit, including actions whose target graphs disagree (`set-parameterization-samples`).
4. Choose how the content check reads the enforcing module's limits. Consider at least two options (for example exported limit constants beside each handler versus a check that consults the target Demonstration's handler) and apply the deletion test. If the content-wide test makes the content-side range checks redundant, removing them is a valid outcome; keep type and shape checks that give authors actionable errors.
5. Correct the stale comment in `splineGuidedLessons.ts`. Fix any out-of-range content only after reviewing its mathematical meaning.

## Verification and completion

- Start with `just --list`; run the lesson catalog, guided lesson content, analysis lesson, `lessonMathNotation`, LessonActionRegistry, LessonSession and activities suites, then `just typecheck` and `just build`.
- Learner-visible behavior should not change. If it does not, unit tests are sufficient under AGENTS.md. If content changes, smoke-test the affected lessons with `$smoke-tester` and keep their rows in `tests/guided-lessons.smoke.spec.cjs`.
- Review the diff in the main chat unless it grows into a multi-file graph change.
- Record the inventory, the chosen option and the rejected one in this file. Commit and push under AGENTS.md.

## Result

### What the content-wide test found

`src/learning/content/sceneContentAgainstGraphs.test.tsx` was written first. It mounts the real graph of each Demonstration (`graphFactories`, through the `realGraphTestHarness` `mountGraph`) and applies every scene of every Guided lesson (45 lessons) and every Chapter activity (6) in one synchronous sequence, restoring the captured scene between scenes as the lesson session does, and reports each rejected action with its lesson step and the graph's message. Against the unchanged limits all 51 cases passed: **no authored content was out of range**. In particular no alpha-parametrization lesson sets samples above 40, so no lesson content changed and no smoke row is affected. The spec's worry, a value accepted by `sceneAction()` and rejected only by the graph, was therefore a latent risk, not a present defect.

### Inventory: limits `sceneAction()` checked and who enforces them

| Scene action | `sceneAction()` literal (removed) | Enforced by | Defined once now |
| --- | --- | --- | --- |
| `set-decasteljau-parameter` | 0..1 | `DecasteljauGraph`, `DecasteljauGraph2` (`parameter` `t`) | Curve parameter interval; stays a literal domain check in each graph |
| `show-evaluation-point` | 0..1 | `AbstractJXGPointControlledCurve.showEvaluationPoint` | Same |
| `set-offset-distance` | -3..3 | `BasePhBezierCurveGraph`; the offset slider repeated the range | `OFFSET_DISTANCE_MIN/MAX` in `JXGPHBezierCurve.ts`, used by handler and slider |
| `set-bernstein-degree` | integer 0..5 | `BernsteinGraph` | `BERNSTEIN_MAX_DEGREE` (already existed) |
| `set-parameterization-alpha` | 0..1 | weighted, uniform and spline graphs, three copies, plus two sliders | `PARAMETERIZATION_ALPHA_MIN/MAX` in `parametrisationLimits.ts` |
| `set-parameterization-samples` | integer 0..50 | weighted graph 1..40 (`ALPHA_PARAM_MAX_SAMPLES`), uniform graph 1..40 (literal, twice), spline graph 0..50 | `parametrisationLimits.ts` (`ALPHA_PARAM_*_SAMPLES`, `SPLINE_ALPHA_*_SAMPLES`); the target graph applies its own |
| `set-subdivision-parameter` | 0.01..0.99 | `SubdivisionGraph1` (also the rational subdivision graph), in two handlers and the slider | `SUBDIVISION_T_MIN/MAX` in `SubdivisionGraph1.tsx` |
| `set-extrapolation-parameter` | 1..1.5 | `extrapolationActions` in `curveLessonActions.ts`; four sliders repeated the range | `EXTRAPOLATION_T_MIN/MAX` in `AbstractJXGBezierCurve.ts`, used by handler and all four sliders |
| `set-spline-continuity`, `set-spline-degree`, `set-circle-pieces`, `set-spline-beta`, `set-function-parameter` | none (shape only; function parameters finite) | Graph or analysis module (`CnSplineGraph` from the live curve, `MIN/MAX_CIRCLE_PIECES`, `G1_BETA_*`, function models) | Unchanged; already defined once |

`set-parameterization-samples` is the action whose target graphs disagree (weighted and uniform 1..40, spline 0..50). The old content check accepted 0..50 for all of them, so 0 or 41..50 on a weighted lesson would have passed translation and failed when applied.

### Decision

- **Chosen: the graph or analysis module defines and enforces each limit (exported constants beside the owner, used by the handler and its slider), `sceneAction()` keeps type and shape checks only, and the content-wide test applies all content to the real graph of the targeted Demonstration.** Deletion test: the content-side range checks were pure restatement. Deleting them changes nothing a learner sees (the graph rejects the value, the lesson session restores the checkpoint and shows the message) and no check is lost, because the content-wide test now covers every authored value with the real limits. The per-Demonstration limit for `set-parameterization-samples` is checked against the target Demonstration for free, because the test applies the action to that Demonstration's graph.
- **Rejected A: `sceneAction()` imports the exported limit constants.** It keeps an early throw at lesson load, but it makes `lessonCatalog.ts` import graph modules (React, JSXGraph), reverses the layering (graphs import `learning/model`, not the reverse) and risks import cycles; it still cannot express "valid for this Demonstration" without a second table keyed by Demonstration; and the check duplicates the graph's, so deletion removes it at no loss.
- **Rejected B: `sceneAction()` consults the target Demonstration's handler.** It would need a dry-run `check` beside every handler (handlers validate and apply in one step) and `sceneAction()` would need the Demonstration id and `graphFactories`, tying the content translation to every graph. It is the largest change and adds nothing the content-wide test does not already give.
- Kept: the closed `SUPPORTED_SCENE_ACTION_NAMES` list and `LessonAction` union (ADR 0013), the shape and type checks, and the `UnsupportedLessonActionError` handler-existence test in `LessonActionRegistry.test.ts`. No open registry.

### Behavior and error messages

- Out-of-range authored values are now reported when the scene is applied (and by the content-wide test, with lesson step and action) instead of at lesson load. Graph messages are unchanged and name the range from the same constants, for example "The subdivision parameter t must be a number from 0.01 to 0.99."
- Malformed values (a string, NaN, a fraction for a count) are still rejected by `sceneAction()`, now with one message per kind: "The scene action “set-subdivision-parameter” needs a finite number value." or "... needs an integer value."
- Learner-visible behavior, routes and stored Presets are unchanged. The sliders keep their ranges.
- Tests: the hand-picked range cases in `lessonCatalog.test.ts` and the range assertions in `guidedLessons.test.ts` were superseded; shape cases stay and one test pins that `sceneAction()` leaves ranges to the graph. The content-wide test also probes the boundary of every limit above against the target graph (inside accepted, just outside rejected), using the exported constants.
- The stale header comment in `splineGuidedLessons.ts` and the range remarks in the `guidedLessons.ts` action list were corrected.

### Acceptance criteria

1. The closed `SUPPORTED_SCENE_ACTION_NAMES` list and the `LessonAction` union are untouched; no registry was added.
2. Every limit above has one definition in the module that enforces it, used by its handler and slider; `sceneAction()` no longer states a range. Parameterization samples are checked against the target Demonstration's own limits (probe cases for the weighted, uniform and spline graphs).
3. `sceneContentAgainstGraphs.test.tsx` applies all 45 lessons and 6 activities to their real graphs and fails on a rejected value; the boundary probes show it detects rejections. The superseded hand-picked boundary cases in `lessonCatalog.test.ts` and `guidedLessons.test.ts` were removed or reduced to shape cases.
4. Stale comments corrected (`splineGuidedLessons.ts`, `guidedLessons.ts`). No lesson content, learner-visible behavior or smoke row changed.
5. Scene actions still run synchronously in one tick (the test applies each scene inside one `act`); errors for malformed content name the scene action, and graph range errors keep their text.

### Checks run

- `just --list`; `just typecheck` passed; `just build` passed (existing warnings).
- `just unit src/learning/content/sceneContentAgainstGraphs.test.tsx`: 51 passed against the unchanged limits (the finding above). After the change, with `lessonCatalog.test.ts` and `guidedLessons.test.ts`: 95 passed.
- Full `just unit`: 154 files, 3090 tests passed (includes the lesson catalog, guided lesson content, analysis lesson, `lessonMathNotation`, `LessonActionRegistry`, `LessonSession` and activities suites, and the graph handler tests whose messages are unchanged).
- Not run: browser smoke tests. Learner-visible behavior is unchanged, so unit tests suffice under AGENTS.md; the slider ranges now read from the shared constants with identical values.

