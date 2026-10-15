# 5. Extrema

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md) — B1

**Dependencies:** Batch A released ([04](04-batch-a-release.md))

**Status:** implemented, not released

## Part A — mathematics (`src/analysis/extrema.ts`, `extremaModel.ts`)

- Named examples: `x^2` (default), `x^3`, `|x|`, `sin x`. Each provides value, derivative (`undefined` where it does not exist), and analytic stationary points and corners in an interval; no sampling.
- For a closed interval `[a, b]`, `a < b`, both in a documented bounded range (for example `[-4, 4]`, which holds the extrema `+-pi/2` of `sin`): the candidate list is the endpoints, the interior stationary points (`f' = 0`) and the interior corners (`f'` undefined), ascending and without duplicates.
- Derivative sign on each open piece between consecutive candidates (positive, negative, or zero for a constant piece) from the analytic derivative at an interior point of the piece.
- Classification of every candidate, **relative to the selected interval** (one-sided neighbourhoods at the endpoints; the module and the UI state this convention): local minimum, local maximum, or neither; global minimum and global maximum with ties (all candidates attaining the extreme value, compared with a documented tolerance that is far below the display precision).
- Model: `{example, a, b, revealed}` with `a < b`, validated by the parser (reject, never clamp).

## Part B — graph (`src/graphs/functions/ExtremaGraph.tsx`)

- Draggable `a`, `b` on the x-axis with native labelled number fields; an example select.
- Show endpoint values, stationary points, corners (marked as "derivative does not exist"), and derivative signs per piece (text such as `+`/`−` marks and a readout, not colour only).
- **Show classification** (`revealed`) reveals local/global labels after exploration; before the reveal, candidates are marked but not classified.

## Part C — lesson

5–7 steps: prerequisites and the convention (local relative to the interval); `x^2` on an interval with an endpoint maximum, prediction before reveal; `x^3` at `0` (stationary, not an extremum); `|x|` at `0` (minimum without a derivative); `sin x` with several extrema and a tie (for example `[0, pi]`, where both endpoints share the global minimum `0`); handoff. `sl`/`en` content, tests, smoke row.

## Acceptance criteria

- `x^2` on `[-1, 2]`: candidates `-1, 0, 2`; global minimum `0` at `x = 0`, global maximum `4` at `x = 2`, `x = -1` a local maximum relative to the interval.
- `x^3` on `[-1, 1]`: `0` is stationary and neither a local minimum nor maximum.
- `|x|` on `[-1, 1]`: `0` is a corner with undefined derivative and the global minimum; `-1` and `1` tie as global maximum.
- `sin x` on `[-4, 4]`: stationary points `+-pi/2`; the global maximum `1` at `pi/2` and minimum `-1` at `-pi/2`; endpoint values are included in the comparison.
- Setting `a`, `b`, the example, and the reveal through controls and through lesson actions yields equivalent configurations; presets round-trip and invalid data (`a >= b`, out of range) is rejected with an actionable error.

## Implementation notes

- **Model and vocabulary.** The model is `{example, a, b, revealed}` (Part A). Closed vocabulary: parameters `extrema-a`, `extrema-b`; visibility target `extrema-classification`; choice `extrema-example` (`square`, `cube`, `abs`, `sine`). `src/graphs/base/presets/PresetImport.ts` registers collection `extrema` with its own diagnosis: the example list, the range `[-4, 4]`, `a < b` and the `revealed` flag each get a specific actionable message; wrong types keep the generic function-data message. Route `/analysis/extrema`, Analysis family entry, lesson availability and a placeholder preview (`catalog/extrema.png`, a copy of the Darboux placeholder; the Batch B release task regenerates previews).
- **Reject, never clamp.** `setA`, `setB` (so also number fields, lesson actions and drags) throw `DomainError` and leave the model unchanged for a value outside `[-4, 4]` or `a >= b`; a drag is clamped to one grid step (`0.01`) short of the other endpoint. `setExample` loads the example's model (`EXTREMA_EXAMPLE_MODELS`) with `revealed = false` and switches to the example's own board view (`EXAMPLE_VIEWS`); a preset of another example without a stored view does the same. Editing `a` or `b` keeps `revealed`.
- **Board.** Fixed pool of objects whatever the example (25 objects): five vertical dashed dividers at the candidates, two horizontal dashed lines at the global values (visible only once revealed), the function, four sign texts, a marker plus label per slot (endpoint 2, stationary 2, corner 1; the candidates of every example and interval in the range fit, checked by a grid scan in the graph test), draggable `a` and `b`, one caption. Kinds differ by shape and text, not colour only: endpoint `[]` square "krajisce / endpoint", stationary `<>` diamond "f' = 0", corner `^` triangle "f' ne obstaja / f' does not exist"; an endpoint that is also stationary or a corner stays one endpoint marker and its second line adds ", f' = 0" or the corner phrase. Label lines: `f(x) = value`, the kind, and (revealed) "local minimum/maximum or not a local extremum" plus "global minimum/maximum" per candidate. The derivative sign of each piece is a bold `+`, `−` or `0` in a row at the top of the view, centred on the piece; the caption ends with a key for the shapes and the sign row. Before the reveal the caption says "classification: hidden" and the global lines are hidden; after it the caption states the global values and their positions (ties list every position).
- **Readout ids.** `a`, `b`, `candidate-i` (value, f', and once revealed the classification), `piece-i` (sign word with the inequality), `global-minimum`, `global-maximum` (the word "skrito" / "hidden" until revealed). Statuses (no changing numbers): `hidden` or `revealed` (the convention), `corner` (a corner is among the candidates), `tie` (revealed and a tied extreme).
- **Show classification.** A native button (`data-action="toggle-classification"`, `data-revealed`), label flips to Hide; the inspector help states the convention (local relative to the selected interval, endpoints one-sided, ties all global).
- **Lesson.** Seven steps (`extrema-guided`; frames 2 + 3 + 2 + 2 + 2 + 2 + 3): (1) `x^2` on `[-1, 2]`, candidates and the convention, classification hidden, prediction; (2) reveal: global minimum `0` at `0`, global maximum `4` at `2`, `-1` a local maximum relative to the interval (`f(-1) = 1`; `f(-1,1) = 1,21 > 1` shows it is not one on the whole line) with the worked example; (3) `x^3` on `[-1, 1]` hidden, prediction; after the press `0` is neither, global values `-1` and `1` at the endpoints; (4) `|x|` on `[-1, 1]` hidden: corner `0` global minimum, endpoints `-1` and `1` tie as global maxima; (5) `sin x` on `[-4, 4]` hidden: `+-pi/2` global minimum `-1` and maximum `1`, `f(-4) = 0,7568` local maximum and `f(4) = -0,7568` local minimum, no endpoint global; (6) `sin x` on `[0, pi]` hidden, prediction of the tie; (7) reveal with the worked example (endpoints `0` and `pi` tie as global minima with value `0`, global maximum `1` at `pi/2`) and the handoff. Prediction steps (1, 3, 4, 5, 6) hide the classification, ask the learner to predict and then press the graph's own Show classification, and carry no calculation frame; the results are in `expectedObservations` and recapped in the next step's prose. Source: Globevnik and Brojan, Analiza I, chapter on the applications of the derivative (local extrema), cited without a section number (listed as an unresolved question); prose is original.
- **Not done.** No second-derivative test (waits for the convexity lesson); the lesson does not teach a non-continuous function. Preview image is a placeholder.
- **Verification done.** `npx tsc --noEmit`, `npx vitest run` (whole suite, 119 files, 1830 tests) and `npm run build` pass; `ph-golden.test.ts.snap` was restored with `git checkout`. The smoke row `extrema` is added to `tests/guided-lessons.smoke.spec.cjs` and syntax-checked (`node --check`) only. It has not been run, and no browser verification (marker label placement and overlap with the curve, the caption and the sign row at several example views, dragging, narrow viewport, SL/EN live switch) was performed.
- **Review fixes.** Legend: the dashed lines use the new `dashed-line` swatch and the global values the `dotted-line` swatch (a box was misleading). The two keys on the board are shown only at board width 520 px or more (their content is in the inspector). Slovenian: corner is `ostri vogal`, the plain-text derivative sign is `f′`. Shared helpers (`escapeHtml`, label and sign styles, `axisPoint`, the example view on import, `memoView`) live in `BaseFunctionGraph`; the view is memoised by model values so the board and the inspector share one entry. `setA`/`setB` remove floating-point noise (`cleanNoise`, which keeps `pi` exact) and compare the cleaned value.
