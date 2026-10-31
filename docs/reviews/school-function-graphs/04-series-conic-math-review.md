# 04 Geometric series and conic kernels: mathematical review

2026-10-31. Implementation: `bezeg-worker` (Sonnet 5.5, `medium`). Review: `bezeg-reviewer` (Sonnet 5.5, `medium`). Repairs: handler. Scope: `geometricSeries.ts`, `conic.ts` and their tests.

## Findings and disposition

There were no blockers and no should-fix findings.

- **Fixed: degenerate second branch.** When \(\varepsilon\) is just above 1 (for example 1.01 with focus–directrix distance 1 and `maxRadius` 50), the far angle clamped to \(\pi\). The second hyperbola branch then became \(n+1\) copies of one point beyond `maxRadius`. The fix: when the branch's nearest point \(\varepsilon s/(\varepsilon-1)\) lies beyond `maxRadius` (\(\delta\ge\varepsilon-1\)), the sampler returns one branch only. A new test fails without the guard (observed: 1 failed, 13 passed).
- **Fixed: parabola cut assertion.** The assertion had no upper bound. Parabola sample distances are now bounded by `maxRadius`, and hyperbola samples are checked against \(|r|\le\) `maxRadius`.
- **Fixed: series tolerance.** The closed-form test used an absolute tolerance of 1e-12. It is now relative, \(10^{-12}\max(1,|S_n|)\), and \(q=1.3\) is tested again.
- **Accepted: cancellation near \(q=1\).** \(1-q^n\) cancels badly for \(q\) near 1, such as 0.999. The error is negligible at the slider's resolution.
- **Accepted: `classifyMiddleWeight`.** It assumes end weights of 1, which its doc comment states. The general criterion is \(w_1^2\) compared with \(w_0w_2\).
- **Accepted: circle metrics.** `secondFocus` equals the centre for a circle, and no test covers it.

## Cleared

The following checks were cleared:

- **Series:** the closed form, the \(q=1\) branch without division, the limit rule, the term cap, and the \(n=8\) threshold, checked on both sides.
- **Conic construction:** the focus–directrix construction with its orientation flip, ellipse and hyperbola metrics (re-derived), and the polar sampler's branch assignment and asymptote gap.
- **Spec values:** all reproduced independently.
- **Bézier bridge:** the midpoint (3.5355, 2.1213) lies on the ellipse to 1e-12, and the deviation is above 1e-3 for a wrong weight.

Worker decisions:

- No pure rational Bézier evaluator existed, so `conic.ts` has a local one.
- \(\varepsilon=0\) must be routed to `circleConic`, because `conicFromFocusDirectrix` throws for it.
- `maxConicDeviation` measures the residual \(\bigl||PF|-\varepsilon|Pd|\bigr|\), not a geometric distance.
