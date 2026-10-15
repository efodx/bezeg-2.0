# 1. Intermediate value theorem and bisection

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md) — A1

**Dependencies:** [00](00-family-and-playback.md) (family and iterative playback)

**Status:** implemented on the Batch A branch (Parts A–C), awaiting review; not released until task 04

## Part A — mathematics (`src/analysis/bisection.ts`, `bisectionModel.ts`)

- Named examples: `x^2 - 2` on `[1, 2]` (default) and the sign step (`-1` for `x < 0`, `1` otherwise), plus any further continuous example the lesson needs. The examples carry a `continuous` flag and, for the step, its discontinuity location.
- A deterministic history function `bisectionHistory(example, a, b, steps)` deriving each step from validated inputs: endpoints, midpoint, function values, retained half, width. Never trust an imported history array.
- Classify the bracket: valid opposite signs; invalid (same sign); exact root at an endpoint. Termination: exact midpoint root, iteration limit (documented constant), or floating-point stagnation (midpoint equals an endpoint).
- Model: `{example, a, b, step}` where `step` is the iteration index; parser rejects out-of-domain values and steps beyond the limit.

## Part B — graph (`src/graphs/functions/BisectionGraph.tsx`)

- Show the endpoints, midpoint, function values, retained interval, step count, and width; for the step example, show the jump as a discontinuity, not a connected vertical segment.
- Controls: example choice, endpoint numeric inputs, Next step, Play/Pause, Reset, using the task 00 controller. Endpoint or example edits reset the history and pause playback.
- Lesson actions: example choice, endpoint parameters, and iteration commands. Do not overload unrelated `function-parameter` names; add new names to the closed unions and to the `lessonCatalog` validation.

## Part C — lesson

5–7 steps with stated prerequisites, a prediction of the retained half before Next step reveals it, the continuity plus opposite-sign hypothesis (existence, not uniqueness), the discontinuous counterexample, and a handoff to free exploration. Add `sl` and `en` content, tests, and a smoke row (not yet enabled in `GUIDED_LESSON_AVAILABLE_IDS` until task 04).

## Implementation notes

- The lesson drives the iteration with scene actions, not with lesson-frame controls. `run-bisection-command` (`next-step` or `reset`) maps to the `animation` action of id `bisection`; a scene repeats `next-step` once per revealed step after the default scene, so a step shows the state after k steps and the learner predicts the next one, then presses the graph's own Next step. `GuidedLesson.tsx` is unchanged and bisection frames carry no `animation`, so De Casteljau behaviour is untouched. Play and pause are deliberately not scene actions: playback is initially stopped and under the learner's control.
- The graph registers `play`, `pause`, `replay`, `next-step` and `reset` for `bisection`; `stop` is rejected (the iteration has no separate stopped state).
- New closed names: parameters `bisect-a` and `bisect-b`, the choice `bisection-example` (the three example ids). Choosing an example loads its default bracket and returns to step 0.
- `BaseGraph` gained the protected hook `beforeFigureCapture()` (called before single-figure SVG and PNG export and figure batches) and a protected `exportBusy`, so a running iteration pauses and a capture shows one settled scene.
- `src/demonstrationPreviewAssets.ts` is generated and `Record<DemonstrationId, string>` needs an entry per id: `bisection` points at a copy of the continuity preview (`catalog/bisection.png`) as a placeholder; task 04 regenerates the previews and `manifest.json`.

## Acceptance criteria

- Midpoints `1.5, 1.25, 1.375` with values `0.25, -0.4375, -0.109375`; each proper step halves the width; the opposite-sign invariant holds for every retained bracket.
- Exact endpoint and midpoint roots stop the iteration and are reported as exact; the floating-point midpoint of `x^2 - 2` is never called an exact root.
- The step example has no zero and is labelled as not satisfying the theorem's hypothesis.
- Presets save and reopen in a paused state with the same iteration index; malformed files give an actionable error.
- A synchronous multi-action scene test and a playback/Next-step equivalence test pass.
