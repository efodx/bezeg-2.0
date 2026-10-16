# 12. Fixed-point iteration

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md), C3

**Dependencies:** Batch B released ([09](09-batch-b-release.md)); iterative playback ([00](00-family-and-playback.md), ADR 0012, ADR 0013)

**Status:** implemented (Batch C release pending)

## Part A: mathematics (`src/analysis/fixedPoint.ts`, `fixedPointModel.ts`)

- Named examples on a closed interval `[a, b]`:
  - `affine`: `T(x) = (x + 1)/2` on `[0, 2]` (default). Fixed point `1`; contraction factor `q = 1/2`, because `|T'| = 1/2`.
  - `cosine`: `T(x) = cos x` on `[0, 1]`. `cos` maps `[0, 1]` into `[cos 1, 1]`, a subset of `[0, 1]`; `|T'(x)| = sin x <= sin 1 = q < 1`. Fixed point about `0.7390851332`; give an independent reference value in the tests, not one computed by the module.
  - `reflection`: `T(x) = 1 - x` on `[0, 1]`. Self-map with `|T'| = 1`, so it is not a contraction. Fixed point `1/2`; every other start forms the two-cycle `x0, 1 - x0`.
- State the hypotheses per example as data: a closed (complete) interval, the self-map condition with its reason, and the contraction factor `q` with its reason (mean value theorem bound on `|T'|`) or "no `q < 1`".
- A deterministic history `x_0, ..., x_k` from validated inputs, never from imported arrays. The step `k` is an integer `0..FIXED_POINT_MAX_STEPS` (for example, `60`).
- Error bounds, only where `q < 1`:
  - a priori `|x_k - x*| <= q^k/(1 - q) |x_1 - x_0|`;
  - a posteriori `|x_k - x*| <= q/(1 - q) |x_k - x_{k-1}|`.
  Name their prerequisites. For `reflection`, show no bound and say why.
- Tolerance `10^-d` with `d` an integer `1..8`. Termination:
  - the iteration limit;
  - the requested threshold (a posteriori bound `< 10^-d`, contractions only);
  - numeric stagnation (`x_k == x_{k-1}` in floating point), reported as stagnation and never as an exact fixed point.
  - The two-cycle of `reflection` is detected and reported; account for floating-point drift of `1 - (1 - x0)`, for example by exact arithmetic on the `0.01` grid of `x0`.
  - Only a start that equals an analytically known fixed point (`1`, `1/2`) exactly may be called the fixed point.
- `x0` lies in the example's interval on a `0.01` grid.
- Model: `{example, x0, step, digits, boundVisible}`. Reject invalid values; never clamp them.

## Part B: graph (`src/graphs/functions/FixedPointGraph.tsx`)

- `y = T(x)` and `y = x` on the interval, the interval box, and cobweb segments: a vertical segment from `(x_k, x_k)` to `(x_k, T(x_k))`, then a horizontal one to `(x_{k+1}, x_{k+1})`.
- Show the current value `x_k` on the x-axis and the step count.
- After Show error bound, show the bound value with its formula and hypotheses.
- Controls: example select; native number fields for `x0` and the tolerance digits; Next step, Play/Pause and Reset through `IterationController`; a Show error bound button.
- Editing `x0`, the example or the tolerance pauses playback and resets the step to `0`. Playback stops at the limit, the threshold, stagnation or (for `reflection`) the iteration limit, with a textual reason.

## Part C: lesson

5–7 steps:
1. Prerequisites (composition, sequence convergence), the cobweb for `affine` from `x0 = 0`.
2. Prediction of the next iterate, then Next step.
3. Contraction `q = 1/2`, the bound, and the threshold.
4. `cos x` on `[0, 1]`: self-map, `q = sin 1`, a posteriori bound.
5. Stagnation is not an exact root.
6. `1 - x`: a two-cycle; failure of the hypothesis does not prove divergence.
7. Handoff.

Add `sl`/`en` content, tests and a smoke row.

## Vocabulary (closed names)

- Parameters: `fixed-point-x0`, `fixed-point-digits`.
- Visibility target: `fixed-point-bound`.
- Choice: `fixed-point-example` (`affine`, `cosine`, `reflection`).
- Animation id `fixed-point` and scene action `run-fixed-point-command` (`next-step` | `reset`), following ADR 0013.
- Preset collection `fixed-point`, route `/bezeg-2.0/analysis/fixed-point`, demonstration id `fixed-point`.

## Implementation notes

- **Part A.** `src/analysis/fixedPoint.ts` and `fixedPointModel.ts`. Hypotheses are data per example (`interval`, `selfMap` with its image and reason, `contraction` or `null`). `reflection` iterates in integer hundredths, so its two-cycle is exact. Default tolerance digits `3`; the reflection default start is `0.2`. `fixedPointTransition` is the controller's transition; `normalizeFixedPointModel` cuts a step beyond the history (a start at a known fixed point has step `0`).
- **Stagnation is not reachable in the app.** With `d <= 8` and the limit `60` the threshold always stops first (affine by step `27`, cosine by step `51`); affine stagnates only at step `55` with the threshold off. Stagnation handling stays in the module and its tests, and the lesson treats it conceptually: a threshold stop or equal rounded values never prove an exact fixed point.
- **Part B/C additive helper.** `fixedPointLocation(example)` in `src/analysis/fixedPoint.ts` returns the exact fixed point where it is known and, for cosine, the root of `cos x - x` by 80 bisection steps (machine precision). It only places the cross marker at `(x*, x*)`; no error bound uses it, and the tests compare it with the hard-coded Dottie number.
- **Model and vocabulary.** The model is `{example, x0, step, digits, boundVisible}` (Part A). Closed vocabulary: parameters `fixed-point-x0`, `fixed-point-digits`; visibility target `fixed-point-bound`; choice `fixed-point-example` (`affine`, `cosine`, `reflection`); animation id `fixed-point` (commands `play`, `pause`, `replay`, `next-step`, `reset`; `stop` is rejected) and scene action `run-fixed-point-command` (`next-step` | `reset`; play and pause are not scene actions). `src/graphs/base/presets/PresetImport.ts` registers collection `fixed-point` with its own diagnosis: the example list, `x0` (a multiple of 0.01 inside the interval of the stated example), the integer step `0..60`, the integer digits `1..8` and the `boundVisible` flag each get a specific actionable message; wrong types and missing fields keep the generic function-data message. A stored step beyond the end of the iteration is cut by `normalizeFixedPointModel` when a preset is opened (not an import error: the file is valid). Route `/analysis/fixed-point`, Analysis family entry (9 entries, 43 routes), lesson availability and a placeholder preview (`catalog/fixed-point.png`, a copy of the sequence placeholder; the Batch C release task regenerates previews).
- **Reject, never clamp.** `setX0`, `setDigits` and `setExample` (so also number fields and lesson actions) throw `DomainError` and leave the model unchanged for an unknown example, an `x0` off the 0.01 grid or outside the interval of the current example, or digits that are not an integer `1..8`. `setX0` snaps only arithmetic noise (`0.06 + 0.01` becomes the exact hundredths `0.07`, and `-0` becomes `0`) and hands the model exact hundredths; a value that is really off the grid is rejected, never rounded. Editing the example, `x0` or the digits pauses playback and returns the step to 0 (a repeated value is not an edit); `setExample` loads the default model of the example (its own start, step 0, bound hidden) and keeps the digits; Show error bound does not stop playback. Next step and playback run `fixedPointTransition` through `commitModel`; Reset returns to step 0 and keeps example, `x0`, digits and the reveal. The controller follows the stored step after every edit, import and restore, so k Next steps and k played steps give the same model, a finished iteration reopens finished, and playback never starts on preset load. Playback interval 600 ms (`FIXED_POINT_STEP_INTERVAL_MS`), limit 60 steps.
- **Board.** Fixed pool of 71 objects whatever the example, step or reveal: the interval box (one closed filled curve with a dashed edge), the dashed diagonal over the interval, the map as a `functiongraph` over `[a, b]` only, the cobweb as one polyline curve recomputed from the history (`(x_0, x_0)`, then `(x_k, x_{k+1})` and `(x_{k+1}, x_{k+1})` for every step), the drop line from `(x_k, x_k)` to the axis, the bound bar (a thick translucent segment on the x-axis around `x_k`, clipped to `[a, b]`, visible only when the bound is shown and an a posteriori bound exists), a pool of 59 filled circles for the iterates `1 <= k < step`, an open circle for the start (visible from step 1), a larger filled circle for the current iterate, a cross at the fixed point, the axis marker, the `x_k` label and one caption. Shapes carry the meaning, not colour alone: filled circle (iterate), open circle (start), cross (fixed point), dashed line (diagonal) against solid (map). The caption (top-right) has the formula, `step k = ..., x_k = ...`, one bound line (neutral while hidden or pending, green when shown, brown for "no bound: |T'| = 1, not a contraction"), the two-cycle `0.2 <-> 0.8`, the reason the iteration ended and a key line; the two-cycle and key lines disappear below 520 px (`COMPACT_BOARD_WIDTH`), the inspector keeps their content. The `x_k` label sits just above the axis to the right of the drop line, off the tick labels below the axis. Because JSXGraph keeps the larger pixel-per-unit when it applies a box with equal units, each example's box is 2.4 times wider than it is tall: the height (interval square, axes and headroom above the square for the caption, 0.9 units for the affine map and 0.65 for the others) is always honored and the horizontal extent is cropped around the interval, so nothing collides at 390 px or 1280 px (first draft: a bottom-right caption sat on the axis tick labels, and the interval was cut off at 390 px).
- **Readout ids.** `step`, `x0`, `current`, `delta`, `tolerance`, `q`, `a-priori`, `a-posteriori`, `end`. `q`, `a-priori` and `a-posteriori` read "skrito" / "hidden" until Show error bound; afterwards they are numbers for the contractions (`a-posteriori` is an em dash at step 0) and "ni ocene (ni skrčitve)" / "no bound (not a contraction)" for `reflection`. `end` is "se nadaljuje" / "continues" or one of the termination reasons. Statuses (words, stable ids `data-fixed-point-status`): the termination (`threshold`, `iteration-limit`, `fixed-point`, `stagnation`), `cycle` (the exact two-cycle of `reflection`, stated without a divergence claim), then `bound-hidden`, or `no-bound` (reflection), or `hypotheses` (closed interval, self-map with its image, `q` with its reason), `bound-a-priori` and `bound-a-posteriori` / `bound-pending`. A stop at the threshold says the bound is below the threshold and never that the iterate is an exact fixed point.
- **Controls.** Example select (the map and its interval); native number fields for `x0` (step 0.01, range of the example) and the tolerance digits `d` (step 1, range 1..8) with rejected hints; a native group of Next step, Play/Pause (label swap, no `aria-pressed`) and Reset to `x_0` (`data-action="next-step"`, `"play-pause"`, `"reset"`, `aria-disabled` rather than `disabled` so keyboard focus survives the end of the iteration or the start of playback); a native Show/Hide error bound button (`data-action="toggle-fixed-point-bound"`, `data-revealed`). It uses the shared `demo-actions` / `demo-status` styles.
- **Lesson.** Seven steps (`fixed-point-guided`; frames 2 + 2 + 3 + 2 + 2 + 2 + 2 = 15): (1) a fixed point and the cobweb for `(x + 1)/2` from `x_0 = 0` at step 0 (prerequisites: composition, sequence convergence); (2) prediction of `x_2` from step 1, then Next step; (3) the contraction `q = 1/2` with the bound shown at step 3, the worked example `x_k = 1 - 2^-k` and the threshold stops at step 10 (the one step whose scene reveals, with the calculation frame); (4) `cos x` on `[0, 1]` at step 8: self-map, `q = sin 1`, the a posteriori and a priori bounds against the actual error (the bounds are valid but loose); (5) `d = 8`, step 27: the six-decimal readout shows 1 though the iterate is `1 - 2^-27`, so a stop at a threshold or equal rounded values never prove an exact fixed point (stagnation is treated conceptually, as it cannot occur with the app's limits); (6) `1 - x` at step 4: the two-cycle, no bound, no divergence claim, and `x_0 = 1/2` as the only fixed start; (7) the summary of the hypotheses and `cos x` from `x_0 = 1` (stops at step 21). Prediction steps hide the bound, ask the learner to press the graph's own Next step or Show error bound, and carry no calculation frame; results are in `expectedObservations` and recapped in the next step. Inline formulas stay short (longest 136 px at 390 px; the first draft had a 310 px chain that overflowed the panel). Source: Globevnik and Brojan, Analiza I, §8.6 (printed pp. 284-286), taken from `docs/research/analiza-i-guided-lesson-candidates.md` and not checked in the PDF; listed in `unresolvedQuestions`.
- **Not done.** No proof of the uniqueness of the fixed point, no Banach theorem in a general metric space, no Newton's method as an iteration; the user cannot enter their own map; the preview image is a placeholder; capabilities and architecture documents are left to the Batch C release task.
- **Verification done.** `npx tsc --noEmit --pretty false`, `npx vitest run` (whole suite, 132 files, 2295 tests) and `npm run build` pass; `ph-golden.test.ts.snap` was restored with `git checkout`. The smoke row `fixed-point` in `tests/guided-lessons.smoke.spec.cjs` was run against the built `build/` with `npx playwright test tests/guided-lessons.smoke.spec.cjs -g fixed-point` (3 tests: Slovenian forward walk, English exit and re-entry, 390 px viewport) and passed three times in a row and 12 of 12 with `--repeat-each 4 --workers 6`. Board screenshots at 1280 px and 390 px (English) were reviewed for the affine map (step 3 with bound at 1280 px, step 10 at 390 px), the cosine map (step 8 with bound, both widths) and the reflection (step 4 with bound, both widths); the start step of each example and the reflection at step 1 were captured but not inspected. No caption or marker collisions with axes, tick labels or the cobweb were found; Slovenian screenshots were not taken (the SL strings are the same layout, but caption widths differ by a few characters).

## Acceptance criteria

- `affine` has fixed point `1` and `q = 1/2`. From `x0 = 0`: `x_k = 1 - 2^-k`.
- `cosine` has `q = sin 1 < 1` and its bounds contain the true error, measured against an independent reference fixed point, at every step shown.
- `reflection` shows a two-cycle from `x0 != 1/2`, no bound, and no claim of divergence.
- Playback stops at the iteration limit, the requested threshold or stagnation, with the reason stated. No exact root is declared from rounded equality.
- Next step k times and k played steps give the same model. Playback pauses on edits, scene changes and capture, and never starts on preset load.
- Controls and lesson actions give equivalent configurations. Presets round-trip, and invalid data gets an actionable error.
- **Review round (Batch C fixes).** Wording: the error bounds are "guaranteed only when" `T` is a contraction on a closed interval it maps into itself (not "hold only"); the two-cycle status gives the cause `T(T(x)) = x` and says that `|T'| = 1` means `T` is not a contraction, so the theorem does not apply, which by itself does not prove divergence. In Slovenian the app now says "negibna tocka" (lesson title "Negibna tocka in iteracija"). The iteration-controller wiring is shared with bisection and sequence convergence in `IterativeFunctionGraph`; Play/Pause refreshes when a scene replaces the board while playing; `x0` is snapped with the shared `gridValue` (noise snapped, real off-grid values rejected).
- **Layout round.** The `cosine` and `reflection` views are `[-1.72, 1.75, 2.72, -0.2]` (0.1 more height), which moves the x tick numbers at the 390 px edges (`-0.6`, `1.6`) inside the board. The view is still centred on the interval, so the edges can clip a tick label again at a different board width.
