# 3. Accumulated integral and FTC

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md) — A3

**Dependencies:** [00](00-family-and-playback.md) (family only)

**Status:** implemented, awaiting review

## Part A — mathematics (`src/analysis/accumulation.ts`, `accumulationModel.ts`)

- Reuse the exact antiderivatives in `src/analysis/functions.ts` (`sin`, `square`, `exp`). `A(x) = F(x) - F(a)` evaluated exactly, so the orientation for `x < a` follows from the formula rather than from shading logic.
- Tangent to `A` at `x` with slope `f(x)`.
- Model: `{fn, a, x, accumulationVisible}`; the accumulation curve starts hidden so the lesson can ask for an area prediction first.

## Part B — graph (`src/graphs/functions/AccumulationGraph.tsx`)

- Plot `f` and `A` with distinct labels and legend text, not colour alone. Decide in review whether one board or coordinated views keep both readable at projection and narrow widths; record the choice in the task notes.
- Shade signed area between `a` and `x` with positive and negative parts distinguishable, and show the tangent to `A` at `x` with its slope.
- Controls for `fn`, `a`, `x`, and the accumulation reveal; lesson actions for the same.

## Part C — lesson

5–7 steps: prerequisites, an area prediction before revealing `A`, the default `sin` values, negative integrand decreasing `A`, `x < a` orientation, `A'(x) = f(x)` with continuity as the sufficient hypothesis, and a handoff. `sl`/`en` content, tests, smoke row.

## Acceptance criteria

- Default `sin`, `a = 0`: `A(0) = 0`, `A(π) = 2`, `A(2π) = 0`; the tangent slope at `x` equals `f(x)` for each example.
- `x < a` gives `A(x) = -∫_x^a f`; regions with `f < 0` decrease `A`; the readout never reports unsigned geometric area as the integral.
- Presets round-trip with the reveal state; out-of-domain values are rejected with an actionable error.

## Implementation notes

- **Model.** `{fn, a, x, accumulationVisible}` (`src/analysis/accumulationModel.ts`); default `sin`, `a = 0`, `x = 2`, curve hidden. `a` and `x` are independent in `[-7, 7]`. Every setter (number fields, lesson actions, drags) throws `DomainError` outside that range and leaves the model unchanged (reject, never clamp). Values are stored as given, not rounded, so a lesson can set `x` to exactly `pi` or `2 pi` and keep it a zero of `sin` (rounding to nine decimals moved `x` just past the zero and created a degenerate sliver stretch); a drag still rounds to `0.01`.
- **Board layout decision: one board, not two coordinated views.** `A(x) = F(x) - F(a)` has the same unit as `f` times `x`, both curves share the horizontal axis, and the tangent to `A` at `x` has slope `f(x)`. One y-scale keeps "the slope of `A` is the height of `f`" honest; a second board would show slopes on a different scale. The repository has no multi-board or inset precedent for a function graph (each graph owns exactly one session board, with `own()` disposal and one capture/restore path), so a second board would also need new ownership, disposal and capture rules. Both curves stay readable because each function has its own view (`FUNCTION_VIEWS`, like the definite-integral route) chosen so that `f(2)` and `A(2)` for `a = 0` lie inside it: `sin` `[-1.2, 6.7] x [-3.1, 3.1]`, `x^2` `[-2.5, 5.5] x [-2, 6]`, `e^x` `[-5, 9.6] x [-1.5, 10]` (the unit tests assert that, but only a browser check shows the result at projection and narrow widths). `f` is a solid line, `A` a thick dashed line, so they differ by pattern as well as colour. Text names: the board caption (`f: solid line`, `A: dashed line`, `f(x) = ...`, `A(x) = ... (signed)`, the tangent slope), the labelled points `f(x)` and `A(x)` on the curves, and the legend with words.
- **Signed shading.** Two curve objects (all stretches above the axis, all below it, point lists rebuilt on every update, so the object count does not depend on `a`, `x` or the function), `fillOpacity 0.42`, teal above and brown below as in the definite-integral route; the below-axis outline is dashed. Each stretch also gets a bold `+` or `-` mark (six mark texts, the most `sin` can have on `[-7, 7]`), and a stretch narrower than 3% of the board width gets none. The legend says "above the axis: counts as positive, marked +" and the reverse. Stretches are split at the zeros of `sin` by `accumulationPieces`; the shading is `accumulationFill` (exported pure helper, tested against the exact integral).
- **Hidden A.** While the curve is hidden, the readout rows `signed-integral` (`A(x)`), `slope` (`A'(x)`), `above-axis` and `below-axis` read "hidden" (a word) and the status is only the prompt (`data-accumulation-status="hidden"`), because the orientation status would give away the sign of `A`. The curve, its tangent, its point and the board value lines are hidden too. `a`, `x`, `f(x)` and the shaded region stay visible so the learner can predict. Showing it is the **Show accumulation A** native button (label flips to **Hide accumulation A**) and the lesson element `accumulation-curve`; the reveal survives edits of `a`, `x` and `f`, and is saved with presets and lesson checkpoints.
- **Readout.** Stable ids `a`, `x`, `f-x`, `signed-integral`, `slope`, `above-axis`, `below-axis`; the label says "signed" and the note says it is the signed definite integral, not the geometric area (for `sin` on `[0, 2 pi]` the unsigned area `4` is never shown). `above-axis` and `below-axis` are the contributions of the parts to `A(x)` and always sum to it (for `x < a` the contributions swap sign). Statuses: `hidden`, `empty` (`x = a`), `reversed` (`x < a`), `rising`, `falling`, `flat`; a slope that rounds to `0` at four decimals counts as flat (`sin(pi)` is `1.2e-16` in floating point).
- **Controls.** `a` and `x` are draggable points on the x-axis (labels swap sides when `x` passes `a`); native labelled number fields are the keyboard and touch alternative (arrows step `0.1`); a function select. Changing the function keeps `a`, `x` and the reveal and switches to that function's view (also for a preset without a view of its own).
- **Closed vocabulary.** Parameters `accum-a`, `accum-x`; visibility target `accumulation-curve`; choice `accumulation-function` (values `FUNCTION_IDS`); preset collection `accumulation` registered in `src/graphs/base/presets/PresetImport.ts`, which reports numeric `a` or `x` outside `[-7, 7]` with its own message naming the range and other invalid data with the generic function-data message. `lessonCatalog.ts` validators, `SceneActionValue` and the availability list are updated together; `GUIDED_LESSON_AVAILABLE_IDS` gained `accumulation`.
- **Real-board finding.** JSXGraph evaluates a function graph at non-finite `t` while it sets up, and `accumulation()` rejects non-finite input by design, so the curve closures return `NaN` for non-finite `t` (found by the jsdom host test; the fake-board unit tests could not see it).
- **Lesson.** Seven steps (`accumulation-guided`): the shaded region and an area prediction with `A` hidden, the reveal (`A(2) = 1 - cos 2 = 1.4161`, `A(0) = 0`), `A(pi) = 2` after a prediction, `A(2 pi) = 0` with the `+2` and `-2` contributions, `x < a` (`a = 2`, `x = 0` gives `-1.4161`), `A'(x) = f(x)` at `x = pi/2` with continuity of `f` named as the sufficient hypothesis and the derivative called the height of `f`, not an area, and a handoff with `x^2` (`A(2) = 8/3`). Steps 1, 3, 4, 5 and 7 wait for the learner to press Show accumulation A after predicting; steps 2 and 6 reveal because their point is the curve or its tangent. Frames: 2 + 3 + 2 + 2 + 3 + 3 + 2. Source: Globevnik and Brojan §§5.5-5.6.
- **Preview image.** `catalog/accumulation.png` is a placeholder copy of an existing preview (the preview assets map is `Record<DemonstrationId, string>`); task 04 regenerates previews and the manifest.
- **Verification done.** `npx tsc --noEmit --pretty false`, `npx vitest run` (whole suite, 110 files, 1582 tests) and `npm run build` pass. The browser smoke row is added to `tests/guided-lessons.smoke.spec.cjs` and syntax-checked only; it has not been run, and no browser verification (dragging, point and sign-mark placement, both curves at projection and narrow widths, caption overlap, SL/EN live switch) was performed.
