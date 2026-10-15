# 7. Darboux sums

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md) — B3

**Dependencies:** Batch A released ([04](04-batch-a-release.md))

**Status:** released 2026-10-16 ([09](09-batch-b-release.md))

## Part A — mathematics (`src/analysis/darboux.ts`, `darbouxModel.ts`)

- Named examples: `x^2` on `[0, 2]` (default) and `sin x`, with the exact integral from an antiderivative.
- Equal partitions of `[a, b]`, `a < b`, in a documented range that contains `[0, 2 pi]`, with `n` subintervals. `n` is from `1` to a documented limit (for example `128`); **Refine** doubles `n` (bisecting every subinterval, so the partition is nested) and is unavailable at the limit.
- Exact infimum and supremum on each subinterval from the endpoint values and the critical points inside it (`0` for `x^2`, `pi/2 + k pi` for `sin`); no sampling.
- Lower sum, upper sum, exact integral, and the gap `U - L`.
- Model: `{example, a, b, n, lowerVisible, upperVisible}` (or equivalent) validated by the parser (reject, never clamp).

## Part B — graph (`src/graphs/functions/DarbouxGraph.tsx`)

- Draggable `a`, `b` with number fields; an `n` field and a **Refine** button; example select.
- Lower and upper rectangles distinguishable by pattern or outline as well as colour, totals, the exact integral, and the gap in a readout.
- Never call left/right sample sums lower/upper sums; the readout names the rectangles by infimum and supremum.

## Part C — lesson

5–7 steps: prerequisites (partition, infimum and supremum); `x^2` on `[0, 2]`, `n = 4`, predict which totals trap the integral, then `1.75 <= 8/3 <= 3.75`; refine and watch `L` increase and `U` decrease; `sin x` with a subinterval containing an interior maximum (the supremum is `1`, not an endpoint value), contrasting a left sample; handoff. `sl`/`en` content, tests, smoke row.

## Acceptance criteria

- `x^2` on `[0, 2]` with `n = 4`: `L = 1.75`, `U = 3.75`, integral `8/3`.
- For every example and valid input: `L <= integral <= U`; under refinement `L` is nondecreasing and `U` nonincreasing (tested over a sequence of refinements up to the limit).
- `sin x` on `[0, pi]` with `n = 1`: supremum `1` at `pi/2`, infimum `0`.
- Controls and lesson actions produce equivalent configurations; presets round-trip; invalid data (non-integer or out-of-range `n`, `a >= b`) is rejected with an actionable error.

## Implementation notes

- **Model.** `{example, a, b, n, lowerVisible, upperVisible}` (`src/analysis/darbouxModel.ts`). The visibility flags are saved with presets and lesson checkpoints, so a reopened preset and a restored checkpoint show the same scene; infima, suprema, sums, the integral and the gap are recomputed from the model (`darbouxSubintervals`, `darbouxTotals`), never stored. `DARBOUX_EXAMPLE_MODELS` holds each example's starting model: `x^2` on `[0, 2]` and `sin x` on `[0, 2 pi]` (stored exactly), both with `n = 4`. Choosing an example loads its `a`, `b` and `n` and keeps the visibility flags, and switches to the example's own board view (`EXAMPLE_VIEWS`); a preset of another example without a stored view does the same.
- **Reject, never clamp.** `setA`, `setB`, `setCount` (so also number fields, lesson actions and drags) throw `DomainError` and leave the model unchanged for a value outside `[-7, 7]`, `a >= b`, or an `n` that is not an integer from `1` to `128`. A drag is clamped to one grid step (`0.01`) short of the other endpoint, which the model accepts. The number fields carry the ranges and ordering hints (`rejectedHint`).
- **Refine.** A native button (`data-action="refine"`) sets `n` to `refine(n)` through the same setter as the `darboux-n` lesson parameter. At `n = 128` it is `disabled`, `aria-describedby` points at the visible explanation (`darboux-refine-help`) and the status `limit` is shown; the `n` field still works. The partition is drawn as a thin dashed line from the axis to the graph at every node, always visible.
- **Rectangles.** The lower rectangles (height = infimum, filled, solid outline) and the upper rectangles (height = supremum, nearly transparent, dashed outline) are two `curve` objects with NaN-separated outlines, rebuilt in `updateDataArray`; the object count does not depend on `n` (7 objects). A third curve is the partition. The inspector legend names them in words (`FunctionLegend` gained the kind `dashed`), and the board caption ends with a one-line key (filled: lower sum, dashed: upper sum). The wording never calls the sums left or right sums.
- **Hiding.** While a sum is hidden its rectangles, its readout and the gap `U - L` are hidden (the readout shows the word "skrito" / "hidden"); the partition, the graph and the exact integral stay. The board caption states `L = skrito` the same way.
- **Readout ids.** `a`, `b`, `n`, `lower`, `upper`, `integral`, `gap`. Statuses (no changing numbers, so the live region is quiet while dragging): `hidden` (at least one sum hidden), `trapped` (both shown: `L <= integral <= U`), `limit` (`n = 128`).
- **Closed vocabulary.** Parameters `darboux-a`, `darboux-b`, `darboux-n`; visibility targets `lower-sum`, `upper-sum`; choice `darboux-example` (`square`, `sine`). `src/graphs/base/presets/PresetImport.ts` registers collection `darboux` with its own diagnosis: the example list, the range `[-7, 7]`, `a < b`, the count range and the visibility fields each get a specific actionable message; wrong types keep the generic function-data message.
- **Lesson.** Six steps (`darboux-guided`): prerequisites with both sums hidden and the prediction on `x^2` (`n = 4`), the reveal `1.75 <= 8/3 <= 3.75`, refinement to `n = 8` (`L = 2.1875`, `U = 3.1875`, then the learner presses Refine to `n = 16`: `2.4219`, `2.9219`), `sin x` on `[0, pi]` with `n = 1` hidden for the prediction, the reveal (`L = 0`, `U = pi`, integral `2`; supremum `1` at the interior `pi/2`; the left-endpoint value `0 * pi = 0` is not an upper estimate), and the handoff on `sin x` over `[0, 2 pi]` with `n = 4` (`L = -pi`, `U = pi`, integral `0`), hidden for a last prediction. Frames: 2 + 3 + 2 + 2 + 3 + 2. Source: Globevnik and Brojan, Analiza I, §5.3 (printed pp. 161-170); prose is original.
- **Not done.** No visual marker of the point where the supremum is attained (the contrast with a left sample is argued in prose and numbers, not drawn); a Riemann-non-integrable counterexample is listed as an unresolved question in the lesson.
- **Preview image.** `catalog/darboux.png` is a placeholder copy of the accumulation preview (the preview assets map is `Record<DemonstrationId, string>`); the Batch B release task regenerates previews and the manifest.
- **Verification done.** `npx tsc --noEmit`, `npx vitest run` (whole suite) and `npm run build` pass. The browser smoke row `darboux` is added to `tests/guided-lessons.smoke.spec.cjs` and syntax-checked (`node --check`) only; it has not been run, and no browser verification (dragging, labels and caption overlap on the board, the dashed/filled distinction at small and large `n`, narrow viewport, SL/EN live switch) was performed.
- **Review fixes.** The gap for `x^2` on `[0, 2]` is `U - L = 8/n` (the lesson said `4/n`; `analysis/darboux.test.ts` now asserts `8/n` for every `n`). The learning goal says `L` never decreases and `U` never increases. The board key is shown only at board width 520 px or more. `setA`/`setB` remove floating-point noise (`cleanNoise`, which keeps `pi` exact) and compare the cleaned value. Shared helpers moved to `BaseFunctionGraph`; the upper-rectangle legend keeps the boxed `dashed` swatch.
