# Define scene-action limits once

**Source spec:** [Graph contract deepening, section 3](../../specs/graph-contract-deepening.md#3-scene-action-limits)
**Status:** planned.
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
