# Guided-lesson candidates from *Analiza I*

**Status:** research report, 2026-10-14
**Scope:** Ranked interactive lesson proposals, current Bezeg fit, and a suggested first batch. Not an implementation spec or feature decision.

## Source and current coverage

Primary source: Josip Globevnik and Miha Brojan, [*Analiza I*](https://users.fmf.uni-lj.si/globevnik/skripta.pdf), Slovenian university mathematics notes. The book describes itself as supporting lectures, not replacing them. The PDF preface prohibits commercial use ([PDF p. 5](https://users.fmf.uni-lj.si/globevnik/skripta.pdf#page=5)); proposals here are original, and its prose or figures should not be reproduced without permission.

Page references below show printed pages and PDF viewer pages. The PDF has ten preliminary pages, so viewer page = printed page + 10; this mapping was checked against extracted page markers and the table of contents. PDF screenshots failed with a web-tool cache-miss error, so math review used extracted text rather than page images.

Bezeg already has lessons for linear/exponential/trigonometric functions, continuity, secants and tangents, definite integrals, area between curves, and arc length ([function-concepts spec](../specs/function-concepts.md), [lesson content](../../src/learning/content/functionGuidedLessons.ts)). Its derivative route has a secant and a tangent anchored at the secant base point ([lesson](../../src/learning/content/functionGuidedLessons.ts#L1049), [analysis](../../src/analysis/derivative.ts)); its integral route shows signed sums and exact values ([lesson](../../src/learning/content/functionGuidedLessons.ts#L1295), [analysis](../../src/analysis/riemann.ts)). Lesson lookup is keyed by demonstration ID ([lookup](../../src/learning/content/guidedLessons.ts#L720)), so expanding an existing topic or adding a second lesson needs an explicit route/content decision.

## Ranked shortlist

| Rank | Source and proposed interaction | Fit with current app |
| --- | --- | --- |
| 1 | **IVT and bisection**, §3.5, printed pp. 80–82 / PDF pp. 90–92 ([source](https://users.fmf.uni-lj.si/globevnik/skripta.pdf#page=90)). Plot a continuous function, mark opposite endpoint signs, reveal successive midpoints, and retain the half-interval that still brackets a zero. | **New graph/analysis.** No current route owns a root bracket or bisection state. The theorem guarantees a zero, not uniqueness. |
| 2 | **Mean Value Theorem**, §4.4, pp. 115–117 / PDF pp. 125–127 ([source](https://users.fmf.uni-lj.si/globevnik/skripta.pdf#page=125)). Compare the endpoint secant with a separately movable tangent at \(c\); let the learner find matching slopes. | **Partial.** Derivative graphics are relevant, but the tangent is anchored at the secant point; MVT needs endpoints and independent \(c\). |
| 3 | **Accumulated integral and FTC**, §§5.5–5.6, pp. 175–180 / PDF pp. 185–190 ([source](https://users.fmf.uni-lj.si/globevnik/skripta.pdf#page=185)). Move \(x\), shade signed area from fixed \(a\), and compare \(A(x)=\int_a^x f(t)\,dt\) with its slope \(f(x)\). | **Partial.** Existing integral controls move bounds and report values, but do not graph \(A(x)\) or connect its slope to \(f\). |
| 4 | **Taylor polynomials and remainder**, §§7.1, 7.3, pp. 251–260 / PDF pp. 261–270 ([formula](https://users.fmf.uni-lj.si/globevnik/skripta.pdf#page=261), [series](https://users.fmf.uni-lj.si/globevnik/skripta.pdf#page=268)). Overlay \(f\), \(T_n\), and vertical error; change center, degree, and \(x\). | **New graph/analysis.** Existing \(e^x\) and \(\sin x\) functions have no polynomial coefficients, partial sums, or error view. |
| 5 | **Darboux sums**, §5.3, pp. 161–170 / PDF pp. 171–180 ([source](https://users.fmf.uni-lj.si/globevnik/skripta.pdf#page=171)). Draw lower/upper rectangles from interval infima/suprema, then increase partition count and show the integral trapped between totals. | **Partial.** Current left/right/midpoint/trapezoid samples are not generally exact interval infima/suprema; use functions with known extrema or label approximations accurately. |
| 6 | **Extrema and graph sketching**, §§4.5–4.7, pp. 118–129 / PDF pp. 128–139 ([extrema](https://users.fmf.uni-lj.si/globevnik/skripta.pdf#page=128), [sketching](https://users.fmf.uni-lj.si/globevnik/skripta.pdf#page=136)). Show \(f'\) sign intervals, stationary points, endpoint values, and local/global classifications. | **Partial.** Derivative lesson has fixed functions and tangents, not critical-point detection, sign charts, or endpoint comparisons. |
| 7 | **Convexity and concavity**, §4.6, pp. 123–126 / PDF pp. 133–136 ([source](https://users.fmf.uni-lj.si/globevnik/skripta.pdf#page=133)). Move two endpoints and compare the graph with its secant chord; reveal second-derivative signs as a test. | **New graph feature.** Current function routes do not show chord comparison or second derivatives. |
| 8 | **Sequence limits and \(\varepsilon\)–\(N\)**, §§2.4–2.5, pp. 36–44 / PDF pp. 46–54 ([source](https://users.fmf.uni-lj.si/globevnik/skripta.pdf#page=46)). Put \(a_n\) on a number line with an \(\varepsilon\)-band; contrast \(1/n\to0\) with \((-1)^n\). | **New graph.** No sequence view exists. A finite slider illustrates examples but cannot prove behavior for all later terms. |
| 9 | **Uniform convergence**, §§6.7–6.8, pp. 237–242 / PDF pp. 247–252 ([source](https://users.fmf.uni-lj.si/globevnik/skripta.pdf#page=247)). Plot \(f_n\), its limit, and maximum error on a fixed interval. Contrast \(x^n\to0\) uniformly on \([0,r]\), \(r<1\), with pointwise nonuniform convergence on \([0,1]\). | **Longer-term new graph.** Needs function sequences, domain selection, and a trustworthy maximum-error display. |
| 10 | **Banach fixed point**, §8.6, pp. 284–286 / PDF pp. 294–296 ([source](https://users.fmf.uni-lj.si/globevnik/skripta.pdf#page=294)). Draw \(y=T(x)\), \(y=x\), and the cobweb iterates \(x_{n+1}=T(x_n)\). | **Longer-term new graph.** The lesson must show a complete interval mapped into itself and a contraction factor \(q<1\); a converging-looking orbit alone is insufficient. |

**Cross-topic stretch:** complex multiplication as rotation and scaling (§1.7.1, pp. 28–30 / PDF pp. 38–40, [source](https://users.fmf.uni-lj.si/globevnik/skripta.pdf#page=38)). A draggable point multiplied by a unit complex number would show a pure rotation; a general multiplier also scales. This would introduce a new topic family.

## Suggested first batch: sample sequences

These examples and lesson flows are proposals; numerical values were checked independently.

1. **Bisection, \(f(x)=x^2-2\), \([1,2]\).** Start with endpoint values \(-1,2\), so a zero is bracketed. Midpoint \(1.5\) has value \(0.25\), giving \([1,1.5]\). Midpoint \(1.25\) has value \(-0.4375\), giving \([1.25,1.5]\). Midpoint \(1.375\) has value \(-0.109375\), giving \([1.375,1.5]\). Ask learners to predict each retained half and report its width.
2. **MVT, \(f(x)=x^2\), \([0,2]\).** Draw the secant slope \(2\); reveal \(f'(x)=2x\), so \(c=1\) gives a parallel tangent. Then use \(x^3\) on \([-1,1]\): secant slope \(1\), with two valid points \(c=\pm1/\sqrt3\). This shows the theorem promises existence, not uniqueness.
3. **Accumulation and FTC, sine with lower bound zero.** Move the upper bound through \(0\), \(\pi\), and \(2\pi\). Plot \(A(x)=1-\cos x\): accumulated signed area grows to \(2\) and then returns to \(0\). Compare the slope of \(A\) with the height of the integrand, including its negative region. This needs an accumulation curve and tangent display; the existing integral route supplies the starting area view.

**Next larger addition: Taylor, \(e^x\) at \(0\).** Compare \(T_1(1)=2\), \(T_3(1)\approx2.6667\), and \(T_6(1)\approx2.7181\) with \(e\approx2.7183\); move \(x\) as degree changes. A later caution can show the smooth function \(e^{-1/x}\) for \(x>0\), zero for \(x\le0\), whose Taylor series at zero is not the function to the right.

## Correctness notes and limits

- Bisection needs continuity and opposite endpoint signs. MVT needs continuity on the closed interval and differentiability inside. Its matching point need not be unique.
- A stationary point can be an inflection (\(x^3\) at zero); \(|x|\) can have an extremum without a derivative. For convexity, \(f''(c)=0\) alone does not establish an inflection.
- FTC claims need hypotheses: \(A(x)=\int_a^x f\) is continuous for integrable \(f\), and \(A'(x)=f(x)\) where \(f\) is continuous. The endpoint formula assumes an antiderivative.
- A sampled height is not necessarily an interval infimum or supremum. Taylor series need not equal every smooth function. Uniform-convergence visuals must keep the domain fixed and distinguish one shared \(N\) from an \(N\) that depends on \(x\).
- The derivative chapter’s cusp discussion appears to state “no tangent” for \((t^3,t^2)\) without distinguishing a limiting vertical tangent from a regular derivative-based tangent. Its printed derivative of \(t\sin t\) on p. 146 also appears erroneous. Recompute such formulas independently before reuse.
- Inspected sections: §§1.7.1, 2.4–2.5, 3.5, 4.1.1, 4.4–4.7, 5.3, 5.5–5.6, 5.11–5.12, 6.7–6.8, 7.1–7.3, and 8.6. This is selective research from a 306-page text; screenshot rendering remained unavailable.
