# 04 Geometric series and conic kernels (F1, Batch C)

Spec: S5 and S6 concept contracts. Decision: ADR 0025 §2 and §4 (\(\varepsilon\) for the ratio).

Scope: `src/analysis/geometricSeries.ts`, `src/analysis/conic.ts` and tests.

Acceptance:

1. Series: \(S_n\) matches the closed form to 1e-12. For \(q=1\), \(S_n=na\) with no division. The limit exists only for \(|q|<1\) (and \(a\ne0\)). A term cap is a named constant. Spec values: \(S_1..S_5\) for \(a=1\), \(q=\tfrac12\); the error first falls below 0.01 at \(n=8\); \(q=-\tfrac12\) gives \(S_4=0.625\) and limit \(\tfrac23\); \(0.\overline3\) and \(0.\overline9\).
2. Conic from focus, directrix and \(\varepsilon\), classified as ellipse, parabola or hyperbola (\(\varepsilon=1\) exactly gives a parabola). \(\varepsilon=0\) is a circle given by centre and radius, without a directrix. A parametric sampler gives ellipse points, both hyperbola branches and parabola points; there is no implicit solver.
3. Spec values: ellipse \(a=5\), \(b=3\) (\(c=4\), \(\varepsilon=0.8\), directrix 6.25, at (0, 3): 5, 6.25, focal sum 10); parabola \(y^2=4x\) at (1, 2); hyperbola \(x^2/9-y^2/16=1\) at \((6,\sqrt{48})\) (7, 4.2, 13, difference 6). The ratio \(|PF|/|Pd|\) equals \(\varepsilon\) within 1e-9 at sampled points.
4. Bézier bridge: the quarter ellipse as a rational quadratic with control points (5, 0), (5, 3), (0, 3) and weights \(1,\tfrac{\sqrt2}{2},1\) has its point at \(t=\tfrac12\) at (3.5355, 2.1213), on the ellipse. A max-deviation helper against the definition is below 1e-9. The weight classification (\(<1\), \(=1\), \(>1\)) matches the conic type. Reuse the existing rational Bézier evaluation if there is a pure one. Search before writing a new one.

Checks: `just unit src/analysis`, then the full suite once, and `just typecheck`. Report mutation evidence.
