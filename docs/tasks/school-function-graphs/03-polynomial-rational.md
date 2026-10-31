# 03 Polynomial and rational kernels (F1, Batch B)

Spec: S3 and S4 concept contracts, plus [evaluation, undefined points and plotting](../../specs/school-function-graphs-lessons.md#evaluation-undefined-points-and-plotting). Depends on 01.

Scope: `poly` and `rational` catalogue kinds, `src/analysis/polynomial.ts`, `src/analysis/rational.ts`, the pole handling in the plot sampler, and tests.

Acceptance:

1. `poly` in product form: zeros \(z_i\), multiplicities \(m_i\in\{1,2,3\}\), \(k\ne0\), total degree at most 5 (rejected with a structured reason). It is never expanded for evaluation. The derivative uses the product rule. Merging two equal zeros adds their multiplicities, and the result reports the merge.
2. S3 checks: \((x+2)(x-1)^2\) has \(p(0)=2\), \(p(1)=0\), \(p'(1)=0\), \(p''(1)=6\). The sign changes at odd multiplicity only. \(p'\) vanishes at every zero of multiplicity at least 2. The \(y\)-intercept is \(k\prod(-z_i)^{m_i}\).
3. `rational` from two `poly`: common zeros are detected exactly from the factor structure as holes, with the limit value at the hole. The poles are the zeros of the reduced denominator, with their multiplicity. A polynomial-division helper gives a horizontal or oblique asymptote, oblique only when \(\deg p=\deg q+1\). S4 checks: \((x^2-1)/(x-2)\) is \(x+2+3/(x-2)\) with remainder 0.375 at \(x=10\). \((x^2-1)/(x-1)\) has a hole at (1, 2). \((2x^2+1)/(x^2-1)\) is 2.0303 at \(x=10\).
4. `value` is `undefined` at holes and poles. The plot sampler never produces a piece that spans a pole. Near a pole the pieces are clipped to the view. A denominator that is identically zero is rejected.

Checks: `just unit src/analysis`, then the full suite once, and `just typecheck`. Report mutation evidence.
