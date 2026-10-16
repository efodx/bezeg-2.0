# 13. Complex multiplication

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md), C4

**Dependencies:** Batch B released ([09](09-batch-b-release.md))

**Status:** released 2026-10-16 ([14](14-batch-c-release.md))

## Placement

The spec places this demonstration in **Foundations** (family id `basics`, next to the Bernstein polynomials), not in **Analysis**. The approved placement supersedes the research report and the "eleven topics" wording of ADR 0011, which the Batch C release corrects. The route is `/bezeg-2.0/complex-multiplication` (Foundations routes have no family segment, as with `/bezeg-2.0/bernstein`), the demonstration id is `complex-multiplication`, and the lesson content lives in `src/learning/content/foundationGuidedLessons.ts`.

The complex plane is not a function graph. It still reuses `BaseFunctionGraph` as its generic flat-model coordinate board, which provides the synchronous model, presets, lesson capture and restore, the caption, and owned objects. The graph lives in `src/graphs/complex/ComplexMultiplicationGraph.tsx`. If `BaseFunctionGraph` carries function-only assumptions that get in the way, report them rather than forking the base class.

## Part A: mathematics (`src/analysis/complex.ts`, `complexModel.ts`)

- Complex numbers as `{re, im}`: product, modulus and argument.
- The principal argument lies in `(-pi, pi]` and is undefined for `0`. Return `undefined` and never `0` or `NaN` presented as a number.
- `arg z + arg w` reduced modulo `2 pi` into `(-pi, pi]`, plus a flag when the reduction changed the sum.
- Polar to Cartesian and back for an operand with modulus `> 0`.
- Named examples (choice values), each setting both operands:
  - `rotation-i`: `z = 1 + i`, `w = i`, product `-1 + i` (default);
  - `identity`: `w = 1`;
  - `negation`: `w = -1` (rotation by `pi`);
  - `scaling`: `w = 2`;
  - `general`: for example `w = 1 + i`, which rotates by `pi/4` and scales by `sqrt 2`;
  - `zero`: `w = 0`.
- Operand coordinates lie in `[-2, 2]` on a `0.05` grid.
- Model: `{example, zRe, zIm, wRe, wIm, productVisible, anglesVisible}`. Reject invalid values; never clamp them.

## Part B: graph

- The complex plane with labelled axes (`Re`, `Im`). Draggable `z` and `w` with arrows from the origin; the product `zw` with its arrow, shown only when revealed (Show product); optional argument arcs for `z`, `w` and `zw`.
- Polar controls apply to `w`. With `w = 0`, the argument field is disabled with a visible explanation ("the argument of 0 is undefined").
- Readouts: Cartesian and polar forms of `z`, `w` and `zw`; `|zw| = |z||w|`; `arg zw ≡ arg z + arg w (mod 2 pi)` with the reduction shown when it happens; "undefined" for the argument of `0`.
- Controls: example select, native number fields for `Re`/`Im` of both operands and the modulus/argument of `w`, Show product and Show arguments buttons.
- The view keeps every product of in-domain operands visible (`|zw| <= 8`), or the worker documents an off-view indicator.

## Part C: lesson

5–7 steps:
1. Prerequisites: Cartesian coordinates. Introduce `i`, modulus and argument.
2. Predict `(1 + i) i`, then reveal `-1 + i`: multiplying by `i` rotates by `pi/2`.
3. Multiplying by `1` and by `-1`.
4. A positive real factor `2` scales without rotating.
5. A general `w`: rotation plus scaling, with the modulo-`2 pi` reduction.
6. Multiplying by `0`: the product is the origin and its argument is undefined.
7. Handoff.

Add `sl`/`en` content, tests and a smoke row.

## Vocabulary (closed names)

- Parameters: `complex-z-re`, `complex-z-im`, `complex-w-re`, `complex-w-im`, `complex-w-modulus`, `complex-w-argument`.
- Visibility targets: `complex-product`, `complex-arguments`.
- Choice: `complex-example` with the six ids above.
- Preset collection `complex-multiplication`.

## Implementation notes

- **Part A.** `src/analysis/complex.ts` and `complexModel.ts`. Products of grid operands are computed in integer units of `1/20`, so real or zero products have an exactly zero imaginary part (argument exactly `pi`, or undefined for `0`); `-0` is normalised. `snapPolarToGrid` rounds `r(cos t + i sin t)` to the `0.05` grid and rejects results outside `[-2, 2]` or at the origin; the polar fields of an on-grid `w` reproduce it exactly, and the graph re-derives the polar fields from the snapped `w`. Every example uses `z = 1 + i`; `general` (`w = 1 + i`) needs no reduction, so the lesson's reduction scene sets its own operands (for example `z = -1 + i`, `w = i`, sum `5pi/4` reduced to `-3pi/4`). Either operand may be `0`. After a drag the stored `example` is only the last chosen example's label, as in Taylor.
- **Model and vocabulary.** The model is `{example, zRe, zIm, wRe, wIm, productVisible, anglesVisible}` (Part A). Closed vocabulary as listed above (parameters `complex-z-re`, `complex-z-im`, `complex-w-re`, `complex-w-im`, `complex-w-modulus`, `complex-w-argument`; visibility `complex-product`, `complex-arguments`; choice `complex-example`). `src/graphs/base/presets/PresetImport.ts` registers collection `complex-multiplication` with its own diagnosis: the example list, one message per coordinate field naming the field and the grid and range ("multiple of 0.05 between -2 and 2") and one per visibility flag each get a specific actionable message; wrong types and missing fields keep the generic function-data message. Route `/bezeg-2.0/complex-multiplication` (no family segment), Foundations family entry placed right after Bernstein (2 entries, 45 routes), lesson availability and a placeholder preview (`catalog/complex-multiplication.png`, a copy of the uniform-convergence placeholder; the Batch C release task regenerates previews). `basics` already retains axes and grid in previews (`coordinateContextPolicy`), so no policy change; no test counts Foundations entries beyond `demonstrations.test.ts`.
- **Reuse of `BaseFunctionGraph`.** No function-only assumption got in the way: the synchronous model, presets, lesson capture and restore, caption, owned objects and language refresh all worked unchanged for a flat coordinate model, and `equalAxisUnits` keeps its default `true`. Two additive helpers outside the mathematics of `src/analysis/complex.ts` and `complexModel.ts`: `src/analysis/complexFormat.ts` (text of `a + bi` and of an argument as a multiple of pi, pure and unit-tested) and an additive `applyOn="confirm"` prop on the shared `NumberInput`.
- **Mathematics used.** Products come from `complexMultiply` (exact on the grid), arguments from `complexArgument` (undefined for 0, never 0), the reduction from `argumentSum`. Polar input for `w` goes through `snapPolarToGrid`: the modulus field keeps the argument of the current `w` (the positive real axis when `w = 0`; a modulus of exactly 0 gives `w = 0`), the argument field keeps the modulus of the current `w` and accepts any angle within `[-2 pi, 2 pi]`; a result outside the square or at the origin is rejected with a hint, never clamped, and both polar fields are afterwards derived from the snapped `w`. Because the snap rewrites what was typed, the two polar fields apply on Enter or blur (`NumberInput applyOn="confirm"`; the arrow keys still step at once); otherwise typing "1.5" would be replaced by the snapped modulus after the first digit. With `w = 0` the argument field is disabled and empty, and `aria-describedby` points at a visible explanation that also says what a modulus above 0 does.
- **Board.** Fixed pool of 12 objects whatever the example, reveal or operand: three argument arcs (curves with a data array, radii 30, 44 and 58 px so they stay readable at any zoom and never exceed 80 % of their arrow), three arrows (straight parametric curves with an arrowhead, so each is a rendered path of the board, as the generic workspace smoke check requires), the product marker, the draggable `z` and `w`, the axis names `Re` and `Im` and one caption. `z` is a solid arrow with a circle, `w` a dashed arrow with a square and `zw` a thicker arrow with a diamond, each with its name as a point label, so they differ by shape, pattern and label as well as colour. The view is the square `[-4.5, 4.5]^2` with equal axis units, which shows the operands large and the usual products. Products with `|zw|` up to 8 can leave it: the inspector status `off-view` says so and tells how to zoom out, and the board adds the line "zw is outside the view" from the live bounding box; both appear only after Show product, so nothing about a hidden product leaks. The caption (bottom-left, clear of the axis names and the tick labels) has the operands, the product or the word hidden, the argument sum with its reduction (only while both Show buttons are on) and a key; the argument line and the key disappear below 520 px. Labels sit away from the origin and never on an axis; when tips coincide the later label takes another side (mirrored, then flipped, then opposite). Dragging limits the pointer to the square, snaps to the 0.05 grid and writes both coordinates in one commit; a dragged position is not an entered value, so this limit is the only place a position is limited rather than refused.
- **Readout ids and statuses.** `z`, `z-modulus`, `z-argument`, `w`, `w-modulus`, `w-argument`, `product`, `product-modulus`, `product-argument`, `modulus-rule` (`|z| · |w| = |zw|` with "=" or "≈" depending on whether the rounded factors multiply to the rounded product) and `argument-rule` (`arg z + arg w`, followed by the reduced value when the reduction happens); the five product rows read "skrito" / "hidden" until Show product. Arguments read as radians with the multiple of pi where there is one ("3π/4 ≈ 2,356") and "≈ 0,464" otherwise; an undefined argument reads "ni definiran" / "undefined". Statuses (`data-complex-status`): `hidden`, `z-zero`, `w-zero`, `product-zero`, `reduced` (states the sum and the reduced value), `not-reduced`, `off-view`.
- **Controls.** Example select (loads both operands and hides the product and the arcs; editing numbers afterwards keeps the stored example as the last chosen label), a native group of Show/Hide product and Show/Hide arguments (`data-action="toggle-complex-product"` and `"toggle-complex-arguments"`, `data-revealed`), native number fields for `Re z`, `Im z`, `Re w`, `Im w` (step 0.05, range hint, off-grid refusal hint) and for the modulus and argument of `w`.
- **Lesson.** Seven steps (`complex-multiplication-guided`; frames 2 + 2 + 2 + 2 + 2 + 3 + 2 = 15), merging the task's zero step and handoff into step 7 to stay within seven: (1) `z = 1 + i`, `w = i`, modulus and argument with the arcs; (2) prediction of `(1 + i) i`, observation `-1 + i`; (3) `w = -1` then `w = 1`; (4) `w = 2`; (5) the `general` example `w = 1 + i` (`zw = 2i`); (6) the reduction scene sets its own operands with `general`, `complex-z-re -1` and `complex-w-re -1` in one synchronous sequence (`z = w = -1 + i`, sum `3 pi / 2` reduced to `-pi / 2`, `zw = -2i`), with the worked example, and is the one step whose scene shows the product; (7) `w = 0`, the product 0 with an undefined argument, and the handoff to free exploration. Prediction steps (2-5 and 7) hide the product and ask the learner to press the graph's own Show product; results are in `expectedObservations` and recapped in the next step. Step 3 notes that `5 pi / 4` leaves `(-pi, pi]` and defers the explanation to step 6. The Foundations lesson test now allows up to seven steps. Source: Globevnik and Brojan, Analiza I, §1.7.1 (printed pp. 28-30), taken from the "cross-topic stretch" of `docs/research/analiza-i-guided-lesson-candidates.md` and not checked in the PDF; listed in `unresolvedQuestions` together with the Slovenian terms "vrtež" and "raztegnitev". The prose is original.
- **Not done.** No degrees, de Moivre formula or roots of unity; no keyboard-operable dragging of `z` and `w` (the number fields are the keyboard path); `z` and `w` at the same point overlap, so the lower one cannot be grabbed (use the fields); the preview image is a placeholder; capabilities and architecture documents are left to the Batch C release task.
- **Verification done.** `npx tsc --noEmit --pretty false`, `npx vitest run` (whole suite, 138 files, 2417 tests) and `npm run build` pass; `ph-golden.test.ts.snap` was restored with `git checkout`. The smoke row `complex-multiplication` in `tests/guided-lessons.smoke.spec.cjs` was run against the built `build/` with `npx playwright test tests/guided-lessons.smoke.spec.cjs -g complex-multiplication` (3 tests: Slovenian forward walk, English exit and re-entry, 390 px viewport) and passed. `tests/demonstrations.smoke.spec.cjs` passes (including the new route's render check) except two checks that this task does not cause: the catalogue test asserts `loading="lazy"` for every card while the first three cards are `eager` (committed in `17eb955`), and the preview manifest check requires a generated capture for every active demonstration (the Batch C release task generates them). Board screenshots at 1280 px and 390 px (Slovenian) were reviewed for the default scene, the identity example (coinciding tips) and `z = w = 2 + 2i` (product off view): no caption, label or axis-name collisions were found; the English board text was checked by unit and host tests, not by a screenshot.

## Acceptance criteria

- `(1 + i) i = -1 + i`. Multiplication by `1` preserves the point, multiplication by `-1` rotates it by `pi`, and `|zw| = |z||w|` holds (tested across a grid against independent values).
- A zero operand gives the product `0`, and its argument reads "undefined", never `0`.
- Arguments are reported modulo `2 pi`, with the reduction stated.
- Cartesian and polar controls and lesson actions give equivalent configurations. Presets round-trip, and invalid data gets an actionable error.
- **Review round (Batch C fixes).** Slovenian wording: "zmnozek" instead of "produkt" in the UI and the lesson (ids such as `complex-product` are unchanged), the argument buttons and help both say "argumente", and the reduction case reads "pade na -pi ali pod". The argument-sum statuses state an approximate sum with "≈" alone (never "= ≈"). The shared `COMPACT_BOARD_WIDTH`, display-width closures and `stateSnapshot` now come from `BaseFunctionGraph`. The foundation lesson test bounds the other foundation lessons at six steps and asserts seven only for `complex-multiplication`. `NumberInput applyOn="confirm"` now applies a native spinner step at once (typing, paste and undo wait for Enter or blur) and shows the model value again after Enter when the model snapped the typed value back to the unchanged one.
- **Layout round.** Point labels use the `complex-point-label` class, which removes the MathJax block margins (`FunctionReadout.css`), so each label sits next to its own marker instead of about 35 px above it. The `Modul |w|` field keeps the 34 px height of its siblings (`complex-w-grid`). Remaining: at 390 px in `zero`, the product label `zw` (both points at the origin) touches the x tick `1`.
