# 13. Complex multiplication

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md), C4

**Dependencies:** Batch B released ([09](09-batch-b-release.md))

**Status:** not started

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

## Acceptance criteria

- `(1 + i) i = -1 + i`. Multiplication by `1` preserves the point, multiplication by `-1` rotates it by `pi`, and `|zw| = |z||w|` holds (tested across a grid against independent values).
- A zero operand gives the product `0`, and its argument reads "undefined", never `0`.
- Arguments are reported modulo `2 pi`, with the reduction stated.
- Cartesian and polar controls and lesson actions give equivalent configurations. Presets round-trip, and invalid data gets an actionable error.
