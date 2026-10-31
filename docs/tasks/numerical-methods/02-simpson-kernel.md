# 02 Simpson kernel (F1, Batch B)

Spec: N4 in [numerical-methods-lessons.md](../../specs/numerical-methods-lessons.md#n4-trapezoid-and-simpson-rules). Decision: ADR 0021 §3. `SUM_METHODS`, `riemannSum`, `subintervals` and `fillData` stay unchanged.

Scope: additive exports in `src/analysis/riemann.ts` (or a sibling `quadrature.ts` that imports it) and tests.

Acceptance:

1. `simpsonRule(fn, a, b, n)` rejects odd or out-of-range `n`. It does not round. It returns `(h/3)(f0 + 4f1 + 2f2 + … + fn)`.
2. Parabola overlay data: for each pair of subintervals, the parabola through its three nodes, as coefficients or sample points. A test shows that it interpolates all three nodes.
3. For `sin` on [0, π]: trapezoid errors at n = 2, 4, 8, 16 are 0.4292, 0.1039, 0.0258, 0.00643, and Simpson errors are 0.0944, 0.00456, 0.000269, 1.66e-5, to 4 significant digits. A helper for the ratio of successive errors returns 20.7 and 16.9 for Simpson.
4. Simpson is exact (error < 1e-12) for `square` on [0, 3]. A local cubic in the test (value plus exact antiderivative) shows exactness for cubics.
5. Existing `riemann.test.ts` passes unchanged.

Checks: `just unit src/analysis`, then the full unit suite once. Report an observed failure of each new assertion against a mutation.
