# 01 Homogeneous-coordinate kernel (F1, Batch A)

Spec: [reuse and new modules](../../specs/projective-conics-lessons.md#reuse-and-new-modules), K1, and the kernel tests in [testing decisions](../../specs/projective-conics-lessons.md#testing-decisions). Decisions: [ADR 0033](../../adr/0033-projective-conics-exact-kernel-and-family.md) §1 and §5.

Scope: `src/projective/homogeneous.ts` and its test file. No React, JSXGraph or localization. Do not edit `src/compgeo/` or the rational Bézier kernels.

Acceptance:

1. `Hom = readonly [bigint, bigint, bigint]` for points and lines. A constructor from integer (or scaled quarter-unit) coordinates rejects non-integers and the zero triple with a `RangeError`. Normalization divides by the gcd and fixes the sign, so equal points compare equal.
2. `join`, `meet` (the cross product), `det3`, `isIdeal`, `lineAtInfinity`, and exact `collinear`, `concurrent` and `equal` predicates. `toAffine` returns a discriminated result: `finite` (exact fraction coordinates plus a double view) or `ideal` (a direction). It never returns NaN or Infinity.
3. `crossRatio(a, b, c, d)` on four collinear points returns an exact fraction. Coincident points and non-collinear input return a typed status. With one ideal point it uses the limiting formula and reports that it did. `isHarmonic` is exact.
4. `project(centre, from, to, p)` is the central projection between two lines. A centre on either line gives a typed status, and an image at infinity gives an ideal point. Neither case divides.
5. K1 checks:
   - The points \(0,1,3,4\) give \(\tfrac98\).
   - Their images from \((0,5)\) on \(y=1+\tfrac x2\) are \((0,1)\), \((\tfrac8{11},\tfrac{15}{11})\), \((\tfrac{24}{13},\tfrac{25}{13})\) and \((\tfrac{16}7,\tfrac{15}7)\), again with cross-ratio \(\tfrac98\).
   - \(0,6,2,-6\) is harmonic.
   - \(D=-10\) projects to the ideal direction \((-40,-20,0)\), and \((0,1;3,-10)=\tfrac{33}{20}\) equals the limit formula on the image.
6. Further tests:
   - A fixed-seed property test: the cross-ratio is invariant under projection over sampled grid placements.
   - An exactness test with coordinates near \(2^{12}\), whose degree-ten products exceed \(2^{53}\).
   - A cross-test: the sign of `det3` with \(w=1\) equals `orient` from `src/compgeo/predicates.ts` on sampled grid points.

Checks: `just unit src/projective`, then the full suite once, and `just typecheck`. Report mutation evidence for each new assertion.
