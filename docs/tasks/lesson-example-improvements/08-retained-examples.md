# 08. Verify the retained examples

**Source spec:** [Batch D](../../specs/lesson-example-improvements.md#batch-d-retain-and-verify)

**Status:** planned. **Dependencies:** 00–07. **Scope:** verify retention; no mandatory rewrites.

## Required dispositions

Record one retain/change finding for each ID below, with sufficient existing tests or observed evidence for its teaching claim. Fix regressions introduced by this plan; report unrelated issues separately before expanding implementation scope.

| Lesson ID | Behavior to retain |
| --- | --- |
| `linear-function` | Two simple points yield slope/intercept; falling and vertical lines remain distinct cases. |
| `exponential-function` | Base two, reciprocal-base decay, and reflection separate growth from decay. |
| `continuity` | The two branches have a visible jump at parameter one; parameter \(3/2\) joins values but leaves a corner. |
| `derivative` | For \(x^2\) at one, secant slope \(2+h\) approaches two from either side. |
| `definite-integral` | Quadratic left/right estimates contrast with midpoint/trapezoid; sine illustrates signed cancellation. |
| `arc-length` | A sine arch clearly separates one chord, two chords, and finer polygonal approximations. |
| `bisection` | \(x^2-2\) on \([1,2]\) supports repeated halving; jump/multiple-root examples qualify the guarantee. |
| `mean-value` | Square, cube, and absolute value demonstrate one match, multiple matches, and failed differentiability hypotheses. |
| `accumulation` | Sine illustrates increasing/decreasing accumulation, cancellation, orientation, and derivative-as-height. |
| `darboux` | The quadratic bounds the integral; sine shows an interior supremum that endpoint-only sampling misses. |
| `extrema` | Square, cube, absolute value, and sine distinguish stationary points, corners, endpoint-relative extrema, and ties. |
| `convexity` | Square, negative square, cube, and quartic distinguish curvature signs and zero second derivative without inflection. |
| `fixed-point` | Affine contraction, cosine, and reflection distinguish convergence guarantees, thresholds, and two-cycles. |
| `complex-multiplication` | Multiplication by \(i\), a real scale, and \(1+i\) separates rotation/scaling; zero has undefined argument. |
| `subdivision` | The arch splits into two same-degree pieces covering the original parameter intervals exactly. |
| `repeated-subdivision` | Halving gives \(2^k\) pieces and polygons approaching the same curve. |
| `extrapolation` | The asymmetric cubic extends beyond its endpoint; a modest main extension remains visible. |
| `bernstein` | Linear then cubic bases establish count, nonnegativity, midpoint weights, and partition of unity. |

## Acceptance and checks

- All 18 rows have an explicit outcome. Farin/circle retention is evidenced in 03 and ordinary/rational elevation in 01/03, so do not omit or duplicate their ownership.
- Reuse valid existing mathematical/content checks; add tests only for uncovered behavior or actual changes. Review any shared default/scene/view change from 00–07 against these lessons.
- Run affected regression smoke rows, and check initial scenes plus the named contrasting cases in the browser where shared changes could affect them. Include desktop/projection, 390 px, and both languages in the combined acceptance evidence; name untested combinations explicitly.
- If no implementation change is needed, complete with a concise retained-example evidence table and links. Do not manufacture code changes to close the task.
