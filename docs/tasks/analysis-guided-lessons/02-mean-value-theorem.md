# 2. Mean value theorem

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md) — A2

**Dependencies:** [00](00-family-and-playback.md) (family only)

**Status:** released 2026-10-15 with Batch A (task 04)

## Part A — mathematics (`src/analysis/meanValue.ts`, `meanValueModel.ts`)

- Named examples: `x^2` on `[0, 2]` (default), `x^3` on `[-1, 1]`, `|x|` on `[-1, 1]`. Each provides value, derivative (or `undefined` where it does not exist), and the exact set of interior matching points for given `a < b`, computed analytically rather than by sampling.
- Secant slope for `a < b`; tangent at `a < c < b`; slope difference. An undefined derivative is returned as `undefined`, never `Infinity` or `NaN`.
- Model: `{example, a, b, c}` with `a < c < b`, validated by the parser.

## Part B — graph (`src/graphs/functions/MeanValueGraph.tsx`)

- Independent controls for `a`, `b`, and `c` (drag and numeric inputs); changing `c` never moves the secant endpoints.
- Show the secant, the tangent at `c` (hidden with an explanatory status at a corner), both slopes, and their difference; a displayed match tolerance is labelled as a numerical comparison.
- A **Show matching point** action reveals all interior matches (two for `x^3`, none for `|x|` on `[-1, 1]`).

## Part C — lesson

5–7 steps: prerequisites, the default example with a prediction before the reveal of `c = 1`, multiple matches for `x^3`, the `|x|` counterexample and the differentiability hypothesis, then a handoff. `sl`/`en` content, tests, smoke row.

## Acceptance criteria

- `x^2` on `[0, 2]` matches at `c = 1`; `x^3` on `[-1, 1]` matches at `c = ±1/√3`; `|x|` on `[-1, 1]` has secant slope `0`, no interior point with derivative `0`, and an undefined derivative at `0`.
- Setting `c` through a control and through a lesson action yields equivalent configurations; secant endpoints are unchanged.
- Presets round-trip; invalid orderings (`c` outside `(a, b)`, `a ≥ b`) are rejected with an actionable error.

## Implementation notes

- **Model.** `{example, a, b, c, revealed}` (`src/analysis/meanValueModel.ts`). `revealed` is saved with presets and lesson checkpoints, so a reopened preset and a restored checkpoint show the same scene; the matching points themselves are recomputed from `example`, `a` and `b`. The parser requires `revealed` to be a boolean (as the bisection parser requires `step`). `MEAN_VALUE_EXAMPLE_MODELS` holds each example's starting model: `x^2` on `[0, 2]` with `c = 0.5`, `x^3` on `[-1, 1]` with `c = 0` (flat tangent), `|x|` on `[-1, 1]` with `c = 0.5` (the corner `c = 0` is reached on purpose). `meanValue.ts` gained `corners` per example and `isDifferentiableOn`, which drives the differentiability status.
- **Ordering rule: reject, never clamp.** Every setter (`setA`, `setB`, `setC`, so also number fields, lesson actions and drags) throws `DomainError` and leaves the model unchanged when `a < c < b` or the range `[-4, 4]` would break. Changing `c` never moves `a` or `b` and the reverse. To move an endpoint past the current `c`, move `c` first; the number fields carry the current limits in `min`/`max`, and a refused value gets the field's rejection hint plus the help text. A drag is clamped to the range the ordering allows (one grid step of `0.01` short of `c`), and a drag the model still refuses puts the point back (`slidingPoint` now accepts `min`/`max` as functions and a `write` that returns `false`).
- **Controls.** `a`, `b` and `c` are draggable points on the x-axis (the function values sit on the graph); native labelled number fields are the keyboard and touch alternative (arrow keys step `0.1`). **Show matching point** is a native button whose label flips to **Hide matching point**; the lesson element is the new visibility target `matching-points`. Choosing an example resets to that example's model and hides the reveal; edits of `a`, `b` and `c` keep the reveal on and the matches follow.
- **Matches.** `x^3` on `[-1, 1]` reveals both `c = +-0.5774`; `|x|` on `[-1, 1]` shows the status "no matching point" with the reason (differentiability fails at 0); `|x|` on an interval that does not contain 0 in its interior has a whole matching interval, drawn as a thick segment on the x-axis and described as such (never as isolated points). Markers are drawn for at most two isolated matches with tangents parallel to the secant.
- **Corner.** At `c = 0` for `|x|` there is no tangent line, the tangent slope and the difference read "does not exist" (a word, never `NaN` or `Infinity`), and the status and board line say so.
- **Tolerance.** Slopes within `0.005` are called agreeing, always labelled as a numerical comparison of the displayed numbers, not a proof; the reveal uses the exact formula.
- **Closed vocabulary.** Parameters `mvt-a`, `mvt-b`, `mvt-c`; visibility target `matching-points`; choice `mean-value-example` with the three example ids. Existing names are not overloaded. `src/graphs/base/presets/PresetImport.ts` registers collection `mean-value` and reports misordered data with its own message (`a < c < b`), other invalid data with the generic function-data message.
- **Lesson.** Six steps (`mean-value-guided`): prerequisites with the prediction on `x^2` before any reveal, the reveal at `c = 1`, moving `c` with the secant unchanged, the two matches of `x^3`, the `|x|` counterexample and the hypothesis, then `|x|` on `[0, 1]` (matching interval) as the handoff. The cube and corner steps wait for the learner to press Show matching point after predicting. Frames: 2 + 3 + 2 + 3 + 3 + 2.
- **Preview image.** `catalog/mean-value.png` is a placeholder copy of an existing preview (the preview assets map is `Record<DemonstrationId, string>`); task 04 regenerates previews and the manifest.
- **Verification done.** `npx tsc --noEmit`, `npx vitest run` (whole suite) and `npm run build` pass. The browser smoke row is added to `tests/guided-lessons.smoke.spec.cjs` and syntax-checked only; it has not been run, and no browser verification (dragging, labels on the board, narrow viewport, SL/EN live switch) was performed.
