# Fourier series

**Status:** scheduled, 2026-10-31 (feature stream `functions`). Tasks: [docs/tasks/fourier-series](../tasks/fourier-series/README.md); ADR decisions: [ADR 0034](../adr/0034-fourier-series-models-handles-and-closed-loop.md); Slovenian terms settled in the task README (*amplitudni spekter*; *Gibbsov pojav* with *Gibbsov fenomen* glossed once).
**Agreed:** 2026-10-31 (owner approved the family; details below are proposals for owner review).
**Source:** [lesson-family candidates, expansion, §E6 Fourier series](../research/lesson-family-candidates-2026-10-31-expansion.md) (lessons, pitfalls, sample numbers), which cites the FMF syllabi *Analiza 2b* (117: "Fourierove vrste") and *Analiza 4* (119: Fourier and Laplace transforms). I opened both course pages (2025 copies, saved as c117.html and c119.html) and confirmed those two lines; I did not open textbooks, so the theorems below are cited from standard references (Zygmund, *Trigonometric Series*; Körner, *Fourier Analysis*), cited, not opened. Part of the [new lesson families](new-lesson-families.md) index.

## Problem Statement

Bezeg teaches sine waves (`TrigonometricFunctionsGraph`), pointwise versus uniform convergence of a function sequence (`UniformConvergenceGraph`) and Taylor series, and it teaches closed and open Bézier splines as geometry. It does not show the third classic series: how a periodic function is rebuilt from sines and cosines, why a jump gives an overshoot that never goes away, why smoother functions need fewer terms, and how a closed planar curve is a sum of rotating circles. These topics are in FMF *Analiza 2b* and *Analiza 4*, and the last one connects the curve chapters to analysis.

## Solution

Add a Learn chapter **Fourierove vrste / Fourier series** with five chapter-owned guided activities, each backed by a catalog Demonstration that stays available for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). Audience University; lessons F1 and F5 are readable at upper-secondary level as enrichment. Prose states theorems with hypotheses and sources; the pictures show one function or one curve at a time and are labelled illustrations, never proofs. Each lesson is 5–7 steps, predicts before it reveals, and ends in free exploration. No exercises, grading or progress.

### Release batches

| Batch | Lessons | Release condition |
| --- | --- | --- |
| A | F1 Partial sums of a square wave; F3 The Gibbs phenomenon | Closed-form partial sums only; no quadrature needed; existing routes and Presets unchanged |
| B | F2 Coefficients as projections; F4 Smoothness and coefficient decay | Batch A released; the coefficient kernel and its tests are merged |
| C | F5 Epicycles | Batch B released; the rendering measurement and the resulting ADR below are recorded before any drawing code is merged |

### Reuse and new modules

Verified to exist in this worktree:

- `src/graphs/functions/TrigonometricFunctionsGraph.tsx` (class `TrigonometricFunctionsGraph`, one wave \(A\,g(\omega x+\varphi)+B\)) with `src/analysis/trigonometric.ts` (`TrigParameters`, `tangentBranches`, slider constants) supplies the wave-drawing style, slider/readout conventions and the model file pattern. It plots a single wave, so a sum of harmonics is **new** drawing code, not a parameter of this graph.
- `src/graphs/functions/UniformConvergenceGraph.tsx` and `src/analysis/uniformConvergence.ts` supply the sequence \(f_n\), the limit, the band \(f\pm\varepsilon\), the pointwise error and an analytic supremum. They use a **closed example list** `UNIFORM_EXAMPLE_IDS = ['power', 'scaled']`, `UNIFORM_MAX_N = 50` and closed-form suprema ("never a maximum over sampled points"). So F3 cannot just select a Fourier example there: the square-wave partial sums need \(n\) up to 1001, and the supremum of \(|S_N-f|\) is not a closed form that module offers. F3 reuses the vocabulary, the band drawing and the lesson link, with its own model (see ADR 1).
- `src/analysis/complex.ts` has `Complex`, `complexMultiply`, `complexModulus`, `complexArgument`, but its operands are restricted to a \(0.05\) grid in \([-2,2]\) (`COMPLEX_COORDINATE_STEP`); it is for the complex-arithmetic lesson and is not reused for coefficients, which are unrestricted doubles. The kernel defines its own small complex type or plain pairs. [complex-maps-lessons.md](complex-maps-lessons.md) (E2) may introduce a shared complex type; align when both are scheduled.
- Curve sampling for F5: `src/bezeg/impl/curve/bezier-spline.ts` (`BezierSpline`, `eval(t)`, `getAllCurvePoints()`) and `polynomial-bezier-curve.ts` evaluate **open** splines whose parameter is chord-length knots (`chordKnots`, `getU`). **There is no closed-spline support** (a search for `closed` in `src/bezeg` finds nothing relevant). F5 therefore owns a small closed loop of Bézier spans in pure maths and may sample it with the de Casteljau evaluator; it does not change `BezierSpline`.
- Routes, chapter and Preset registration follow the Analysis family (`src/learning/chapter/familyChapters`-style registration, ADR 0011, ADR 0016); `LESSON_ANIMATION_IDS` in `src/learning/model.ts` would gain an id only if F1 or F5 play an animation (ADR 0012, ADR 0013).

New modules (names are suggestions): `src/analysis/fourier.ts` (**the Fourier coefficient kernel**: partial sums, breakpoint-aware quadrature, real and complex coefficients, spectra), `src/analysis/fourierExamples.ts` (closed example list), `src/analysis/closedSpline.ts` (loop of Bézier spans, parametrization, epicycle chain), model/parse files, `src/graphs/functions/FourierSeriesGraph.tsx`, `FourierCoefficientsGraph.tsx`, and an epicycle graph (curves family). Pure mathematics stays free of React, JSXGraph and localization.

**Sibling specs.** This spec owns the Fourier coefficient kernel. [complex-maps-lessons.md](complex-maps-lessons.md) (E2) owns the complex Möbius kernel and is the natural home for a shared complex type; [linear-maps-lessons.md](linear-maps-lessons.md) (E1) is independent. [probability-statistics-lessons.md](probability-statistics-lessons.md) (E4) owns density/convolution and may reuse the quadrature routine; [advanced-bezier-lessons.md](advanced-bezier-lessons.md) (E8) must not assume a closed spline from here until this family is scheduled. [convexity-hulls-lessons.md](convexity-hulls-lessons.md) shows the shared-core style.

### Decisions needing an ADR

1. **Gibbs / uniform convergence: new model or extend `UniformConvergenceGraph`.** (a) A Fourier-specific graph that borrows the band drawing and links to the uniform-convergence lesson; (b) add a Fourier example id to the closed example list, raising `UNIFORM_MAX_N` and giving it a numeric supremum; (c) leave the uniform lesson untouched. (b) changes released Presets and the "supremum is analytic" rule; this spec works with (a). Decide before Batch A.
2. **Function source for F2.** (a) A piecewise-linear function through draggable handles with fixed breakpoints (default); (b) a closed list of named functions only. (a) is needed for "drag a shape". Which functions with jumps may the handles produce is decided in the ADR (see F2 acceptance 3).
3. **Epicycle rendering** (Batch C): see F5; decided only after measurement.
4. **Closed loop representation.** (a) a new closed list of Bézier spans in pure maths (default); (b) extend `BezierSpline` with a closed scheme under ADR 0010; (b) also changes the Bézier curve chapters and is out of scope here.

## Concept contracts and acceptance criteria

Examples are implementation defaults; equivalents may replace them if the learning goal, edge cases and independent checks are kept. Every number below was recomputed in Python (pure standard library, Gauss–Legendre nodes, marked "checked") and is reproducible with the independent partial-sum and quadrature formulas given. The research note's sample (square wave maxima 1.18130, 1.17901, 1.17898, limit 1.17898, overshoot about 8.95 %) was reproduced.

Conventions: functions are \(2\pi\)-periodic, defined on \([-\pi,\pi)\); the real series is \(\tfrac{a_0}{2}+\sum_{k\ge1}(a_k\cos kx+b_k\sin kx)\) with \(a_k=\tfrac1\pi\int_{-\pi}^{\pi}f\cos kx\,dx\), \(b_k=\tfrac1\pi\int_{-\pi}^{\pi}f\sin kx\,dx\); the partial sum \(S_N\) keeps terms with \(k\le N\). Exact decisions: all values below are tolerance comparisons on doubles with the stated tolerances; nothing is presented as exact unless it is a closed form in a unit test.

### F1. Partial sums of a square wave

- Learning goal: a square wave is a sum of odd sines with weights \(1/k\); adding terms makes the sum follow the wave more closely, and at the jump the sum equals the midpoint \(0\) of the values \(-1\) and \(1\).
- Prerequisites: [trigonometric functions](function-concepts.md) (amplitude, frequency), sequences of functions.
- Default example: \(f(x)=-1\) on \((-\pi,0)\), \(f(x)=1\) on \((0,\pi)\); \(S_N(x)=\tfrac4\pi\sum_{k\ \mathrm{odd}\le N}\tfrac{\sin kx}{k}\). Checked: \(S_N(0)=0\) for every \(N\); at \(x=\pi/2\): \(S_3=0.84883\), \(S_5=1.10347\), \(S_{11}=0.94730\), \(S_{101}=1.00624\); pointwise error at \(x=0.5\) is \(0.09759\), \(0.00981\), \(0.00011\) for \(N=11,101,1001\). A sawtooth \(f(x)=x\) has \(b_k=2(-1)^{k+1}/k\) (checked for \(k=1,2,3\) by quadrature) and \(S_N(\pi)=0\), the midpoint of \(-\pi\) and \(\pi\).
- Steps: (1) the wave and one sine; predict the second term needed; (2) add the term \(k=3\); (3) a slider for \(N\) up to 50 with the term list; (4) read the error at a chosen \(x\); (5) the jump: mark the value \(0\) and the one-sided limits \(\pm1\); (6) switch to the sawtooth; (7) free exploration.
- Graph needs: curve of \(S_N\) over \([-2\pi,2\pi]\), dashed wave, \(N\) slider/number input, readout of \(S_N(x)\) and \(|f-S_N|\) at a point, term list as text; sampling density that resolves \(\sin(Nx)\) (at least about 8 samples per period; checked as a budget rule only).
- Acceptance:
  1. The values above match to 5 decimals in a unit test against a direct sum; the kernel's \(b_k\) equals \(4/(\pi k)\) for odd \(k\) and \(0\) for even \(k\) to \(10^{-12}\) (quadrature split at \(0\)).
  2. At a jump the status says "the series converges to the midpoint of the one-sided limits", stated as a theorem (Dirichlet; piecewise smooth \(f\); Zygmund, cited, not opened), not read off the picture.
  3. \(N\) is an integer in a closed range with a rejection hint; no silent rounding; even \(N\) for the square wave equals \(N-1\) and the prose says why.
  4. The prose says: the partial sums of a piecewise smooth function converge pointwise at every point; this is not claimed for every continuous function (there are continuous functions whose series diverge at a point; cited, not opened).
  5. Preset round trip (example, \(N\), point); invalid data rejected with an actionable message; Slovenian and English complete.

### F2. Coefficients as projections

- Learning goal: \(a_k\) and \(b_k\) measure how much the shape contains \(\cos kx\) and \(\sin kx\) (integral of \(f\) against the harmonic); dragging the shape changes the bar spectrum; Parseval links bars to the mean square.
- Prerequisites: F1; definite integrals ([Riemann sums](analysis-guided-lessons.md)).
- Default example: \(f(x)=|x|\) on \([-\pi,\pi]\) (piecewise linear, one handle at the tip). Checked by quadrature: \(a_0/2=\pi/2\), \(a_1=-1.27324\), \(a_2=0\), \(a_3=-0.141471\), \(a_5=-0.05093\), equal to \(-4/(\pi k^2)\) for odd \(k\) and \(0\) for even \(k\). Second example: the jump \(f=\mathrm{sign}(x-1)\): \(b_1=0.9805869033\), \(b_2=-0.4507735384\), \(b_5=0.1634409457\) (checked against the closed form \(\tfrac1\pi[-(F(1)-F(-\pi))+(F(\pi)-F(1))]\), \(F=-\cos kx/k\)). **Breakpoint pitfall (checked):** the same \(b_1\) computed by a 16-point Gauss–Legendre rule on all of \([-\pi,\pi]\) without splitting at the jump gives \(0.888871\) (error \(0.092\)); with 4 equal panels \(1.01541\) (error \(0.035\)); with 64 equal panels error \(0.0016\); splitting at the jump gives \(0.9805869033\) to 10 digits. The kernel must split at every breakpoint.
- Steps: (1) one harmonic and the overlap with the shape; predict whether \(b_1\) is positive; (2) show the integral as signed area of \(f\sin x\); (3) the spectrum as bars; (4) drag the handle and watch the bars; (5) a jump and the slow bars; (6) Parseval: \(\tfrac1\pi\int f^2\) vs \(\tfrac{a_0^2}{2}+\sum(a_k^2+b_k^2)\); (7) free exploration.
- Graph needs: piecewise-linear \(f\) through draggable handles with enforced increasing \(x\) (plus optional vertical jump handles per ADR 2), bar chart of \(a_k\), \(b_k\) (or \(|c_k|\)) for \(k\le K\) (suggested 16), shaded signed product for a selected \(k\), partial sum overlay, mean-square readout.
- Acceptance:
  1. Kernel quadrature on a function with breakpoints equals the closed form to \(10^{-10}\) for the two examples above and for random piecewise-linear shapes with 1–4 breakpoints (unit test with a fixed seed; compare against the exact integral of a polynomial times a trigonometric function).
  2. Unit test of the pitfall: the unsplit rule differs from the exact value by more than \(10^{-2}\) for the jump example, so the test fails if the kernel stops splitting.
  3. Handles are constrained so that breakpoints are strictly increasing and the shape is periodic-consistent (or the seam value is shown); a degenerate drag is rejected visibly.
  4. Parseval partial sums for the square wave \(\sum_{\mathrm{odd}\,k\le N}16/(\pi k)^2\) are \(1.62114\), \(1.80127\), \(1.93261\), \(1.99205\) for \(N=1,3,11,101\), approaching \(\tfrac1\pi\int f^2=2\) (checked); the identity itself is stated as a theorem (Parseval; cited, not opened).
  5. Dragging stays interactive on the target device per the measured thresholds recorded for this lesson; a Preset stores the handles and \(K\); malformed data are rejected; Slovenian and English complete.

### F3. The Gibbs phenomenon

- Learning goal: near a jump the partial sums overshoot by about \(8{,}95\,\%\) of the jump, and the overshoot does not shrink as \(N\) grows; it only moves toward the jump. So \(S_N\to f\) at each point but not uniformly.
- Prerequisites: F1; the [uniform convergence lesson](analysis-guided-lessons.md) (pointwise error, band, supremum).
- Default example: the square wave of F1 (jump \(2\)). Checked: the maximum of \(S_N\) on \((0,\pi)\) is at \(x=\pi/(N+1)\) (confirmed by a local scan), with values \(1.27324\) (\(N=1\)), \(1.20042\) (\(3\)), \(1.18836\) (\(5\)), \(1.18130\) (\(11\)), \(1.17901\) (\(101\)), \(1.17898\) (\(1001\)); the limit is \(\tfrac2\pi\mathrm{Si}(\pi)=1.17898\) with \(\mathrm{Si}(\pi)=1.851937052\) (quadrature), overshoot \((1.17898-1)/2=8.949\,\%\) of the jump. Maximiser locations \(0.2618,\ 0.0308,\ 0.00314\). The error \(|S_N-f|\) at \(x=10^{-6}\) for \(N=101\) is \(0.99994\): for every \(N\) the error tends to \(1\) as \(x\to0^+\), so \(\sup|S_N-f|\ge1\) and does not tend to \(0\) (uniform convergence fails).
- Steps: (1) \(N=11\); predict the overshoot after \(N=101\); (2) mark the peak and read \(1.18130\); (3) \(N=101\): peak \(1.17901\), narrower and closer to the jump; (4) a fixed point \(x=0.5\): error \(\to0\); (5) the band \(f\pm\varepsilon\): the sum leaves it near the jump for every \(N\); (6) contrast with the continuous \(|x|\) (F2), where the sup error does shrink (see F4); (7) free exploration.
- Graph needs: \(S_N\) near the jump with a zoom window that follows \(x=\pi/(N+1)\), peak marker, readouts of peak value and overshoot percentage, an \(\varepsilon\) band, fixed-point error readout.
- Acceptance:
  1. The peak positions and values above match to 5 decimals in a unit test against the closed-form location \(\pi/(N+1)\); the limit \(2\mathrm{Si}(\pi)/\pi\) is computed by quadrature and agrees with \(1.1789797\) to \(10^{-6}\).
  2. The percentage is shown as "about \(8{,}95\,\%\) of the jump in the limit"; finite-\(N\) values (\(9{,}07\,\%\) for \(N=11\), checked \(0.09065\)) are labelled as such.
  3. The statement "the overshoot does not shrink" is a theorem (Gibbs phenomenon, with the limit above; Zygmund, cited, not opened); the drag over \(N\) is called an illustration. The prose also says that \(S_N(0)=0\), the midpoint, for every \(N\), so the peak is never at the jump itself.
  4. The prose distinguishes pointwise convergence (at each fixed \(x\) the error tends to \(0\)) from uniform convergence (fails here because of the jump) and says the Gibbs overshoot is not a numerical error or a bug in the plot; sampling must be fine enough that the peak is not an artefact (a test compares the drawn maximum to the closed form).
  5. The page does not claim that the overshoot disappears for other summation methods unless a lesson shows it; Cesàro/Fejér means are out of scope.
  6. Slovenian and English complete; the link to the uniform-convergence lesson is a catalog link, not a modification of that lesson.

### F4. Smoothness and coefficient decay

- Learning goal: the smoother the periodic function, the faster its coefficients decay: a jump gives \(\sim1/k\), a corner (continuous with a jump in \(f'\)) gives \(\sim1/k^2\), an analytic function gives geometric decay.
- Prerequisites: F2; F3 helps; Taylor series for the contrast "analytic".
- Default example (closed list): square wave (\(|b_k|=4/(\pi k)\) for odd \(k\)); \(|x|\) (\(|a_k|=4/(\pi k^2)\) for odd \(k\)); \(g(x)=1/(2-\cos x)\) with \(a_k=\tfrac2{\sqrt3}r^k\), \(r=2-\sqrt3=0.2679492\). Checked: \(a_1=0.3094011\), \(a_2=0.0829038\), \(a_5=0.00159489\), \(a_{10}=2.1963\cdot10^{-6}\) by quadrature versus the formula (agree to \(10^{-9}\) absolute at \(k\le5\)). Observed log–log slopes between \(k=11\) and \(k=101\) (odd \(k\)): \(-1\) for the square wave, \(-2\) for \(|x|\) (exact, since the coefficients are pure powers). Sup error of \(S_{11}\) for \(|x|\) is \(0.05293\) (checked on a 20001-point grid), equal to the tail bound \(\sum_{k\ge13,\ \mathrm{odd}}4/(\pi k^2)=0.05293\) (checked), because the maximum is at the corner.
- Steps: (1) three functions, three spectra; predict which decays fastest; (2) the square wave: bars shrink like \(1/k\); (3) \(|x|\): like \(1/k^2\); (4) the smooth one: bars vanish after \(k\approx10\); (5) log scale on the vertical axis to read slopes; (6) link to the sup error with \(N\) (F3); (7) free exploration.
- Graph needs: spectra of two or three functions side by side with a linear/logarithmic switch, a reference curve \(c/k\), \(c/k^2\) or \(c\,r^k\), \(N\) slider and the sup error readout (analytic or high-resolution; say which).
- Acceptance:
  1. The coefficient formulas above agree with the kernel to \(10^{-10}\) at \(k\le5\) and to a stated relative tolerance (\(10^{-3}\)) at \(k=10\) where the value is close to the quadrature noise floor; the test records the tolerance.
  2. The statement is limited to the **forward direction** as a theorem: if \(f\) is \(2\pi\)-periodic, \(f^{(m-1)}\) is absolutely continuous and \(f^{(m)}\) is piecewise continuous, then \(|c_k|=O(k^{-(m+1)})\); analytic periodic functions have geometric decay (Zygmund; Körner; cited, not opened). The converse is not claimed, and the slope read from finite \(k\) is called an observation of three examples, not a law.
  3. Zero even coefficients are drawn as zero, not omitted, and the log view says that \(\log0\) is not drawn.
  4. Decay of the coefficients and uniform convergence are connected only by the cited fact that \(\sum|c_k|<\infty\) implies uniform convergence (Weierstrass M-test); \(|x|\) satisfies it and the square wave does not, and the lesson says the converse (divergent \(\sum|c_k|\) means no uniform convergence) is **not** true in general.
  5. Slovenian and English complete; the closed list is validated on import; Presets store the three selections and \(N\).

### F5. Epicycles

- Learning goal: a closed planar curve \(z(t)=x(t)+i\,y(t)\), \(t\in[0,2\pi)\), is a sum of rotating vectors \(\sum_k c_ke^{ikt}\) with complex coefficients; the partial sum with frequencies \(-N,\ldots,N\) draws a curve that approaches the original, and the coefficients depend on the chosen parametrization.
- Prerequisites: F2 (coefficients as projections); the Bézier spline chapters (closed loops of spans); complex numbers as plane points ([complex arithmetic](function-concepts.md)).
- Parametrization convention (proposal, to be recorded in the code docs): a loop of \(m\) cubic spans receives equal parameter length \(2\pi/m\) per span. The spline's own chord-length knots (`getU`) would be an alternative, and the lesson shows both give different coefficients and different drawings for the same curve. Moving the start of the loop multiplies \(c_k\) by \(e^{ik\tau}\) (a rotation of the spectrum; the drawn shape is unchanged).
- Default examples (checked, Gauss–Legendre 16 nodes per span, split at span ends):
  - Four-span cubic circle, vertices \(1,i,-1,-i\), handle factor \(\kappa=\tfrac43(\sqrt2-1)\): non-zero coefficients \(c_1=1.000126\), \(c_5=0.003672\), \(c_{-3}=-0.003641\), \(c_{-7}=-0.000662\), \(c_9=0.000547\) (others below \(10^{-9}\)); maximum parametrized error \(\max_t|z(t)-S_N(t)|\) is \(1.000273\) (\(N=0\), only \(c_0\)), \(0.007346\) (\(N=1\)), \(0.004759\) (\(3\)), \(0.001545\) (\(5\)), \(0.000596\) (\(9\)); the loop itself deviates from the unit circle by at most \(0.000273\).
  - Diamond: four straight spans (degree-1 Bézier) through \(1,i,-1,-i\): only \(k\equiv1\pmod4\) occur and \(c_k=8/(\pi^2k^2)\) with \(c_1=0.810569\) (checked: \(|c_k|k^2=0.810569\) for \(k=-7,-3,1,5,9\)); maximum parametrized error \(0.18943\), \(0.09937\), \(0.06694\), \(0.0404\) for \(N=1,3,5,9\). The corners show why a loop with corners needs many circles (decay \(1/k^2\), as in F4).
  - Single-panel pitfall (checked): for the diamond, one 16-node rule over the whole period gives \(c_1=0.806564\) instead of \(0.810569\); splitting at the span ends is required, as in F2.
- Steps: (1) the closed curve and one circle; predict the next circle's radius; (2) \(N=1\): the circle with radius \(|c_1|\); (3) add circles one at a time, ordered by \(|c_k|\) as a display choice; (4) the traced partial-sum curve against the original; (5) the diamond: corners and the decay; (6) drag a control point and watch the circles; (7) free exploration.
- Graph needs: closed loop with draggable vertices or controls (default 4–8 spans), epicycle arms and circles for the chosen \(N\), traced curve, original curve, \(N\) control, coefficient table/spectrum \(|c_k|\), and a text status. Rendering approach per ADR 3.
- Acceptance:
  1. The coefficients above match to 6 decimals in a unit test against an independent computation (de Casteljau evaluation plus quadrature on each span); for the diamond \(c_k=8/(\pi^2k^2)\) with \(k\equiv1\pmod4\) to \(10^{-10}\) (closed form from the integral of a linear function times \(e^{-ikt}\)).
  2. \(\sum_{|k|\le N}c_ke^{ikt}\) at \(t=0\) and at span ends is within the stated error of the curve; the convergence claim (pointwise at every point of a piecewise smooth \(z\), by the complex form of Dirichlet's theorem, cited, not opened) is stated as a theorem, and the drawn trace is called an illustration.
  3. Moving the start rotates the coefficients by \(e^{ik\tau}\) (unit test to \(10^{-10}\)); a different parametrization gives different coefficients and the lesson says so.
  4. Closed loop validity: \(m\ge2\) spans, finite coordinates, matching end points (the first end point equals the last); a degenerate loop (all points equal) is accepted and draws a point, no division by zero.
  5. Rendering cost within the recorded threshold (Testing Decisions); the number of circles is capped (suggested \(N\le50\), i.e. 101 terms) with a visible hint, and the animation is stopped by default and pauses on edits, exit, import and unmount.
  6. Slovenian and English complete; the Preset stores the loop, \(N\) and the parametrization choice and validates all.

## User Stories

1. As a student, I add one sine at a time and see the square wave appear.
2. As a student, I drag a shape and see which frequencies it contains.
3. As an educator, I zoom into the jump and show that the overshoot stays at 9 % however many terms I use.
4. As a student, I compare how fast the bars shrink for a jump, a corner and a smooth function.
5. As a student of the curve chapters, I see a closed Bézier loop drawn by turning circles.
6. As a reader on a phone, I step \(N\) with large buttons and read a text status of the peak and the coefficients.

## Terms (proposals, to be settled by localization.md#choosing-new-terms)

| English | Slovenian proposal | Basis to check |
| --- | --- | --- |
| Fourier series | Fourierova vrsta | FMF Analiza 2b page (opened): "Fourierove vrste"; `sl.ts` already uses "vrsta" for the series sense in the Taylor prompt |
| partial sum | delna vsota | standard; confirm against `sl.ts` before use (a search finds the singular "delna vsota" only in prompts, if at all) |
| Fourier coefficient | Fourierov koeficient | standard; search FMF syllabi |
| spectrum (bar) | spekter (stolpci) | standard; to research |
| Gibbs phenomenon | Gibbsov pojav | standard; to research (alternative: "Gibbsov pojav prenihaja") |
| pointwise / uniform convergence | točkovna / enakomerna konvergenca | `sl.ts` has "Enakomerna konvergenca", "Točkovna napaka"; keep these |
| epicycle | epiciklo (krožni sestav) | to research; propose descriptive "vrteči se krogi" in prose with the established "epicikel" as gloss |
| parametrization | parametrizacija | existing `uniform_parametrization` in `sl.ts` |
| square / sawtooth wave | pravokotni / žagasti val | to research; "val" is used for sine graphs |
| jump (discontinuity) | skok (nezveznost) | existing continuity lesson terms |

Final wording, sources and the table entry are recorded in the implementing change.

## Implementation Decisions

- The kernel is pure and has typed outputs: real coefficients \((a_k,b_k)\), complex coefficients \(c_k\), partial sums, breakpoints, and a quadrature routine that takes **explicit breakpoints** (Gauss–Legendre per piece, default 16 nodes; pieces are split at every jump and corner of the input). Callers cannot pass unsplit functions with jumps; piecewise-linear functions and Bézier spans give the breakpoints themselves.
- Closed example list; no formula parser and no symbolic differentiation (ADR 0007). Piecewise-linear shapes from handles use exact polynomial integrals where easy; quadrature otherwise.
- Quadrature accuracy is stated as tolerances (below), never as exactness. Where a closed form is available (square wave, \(|x|\), sawtooth, diamond) the unit tests compare against it.
- Partial sums are evaluated in \(O(N)\) per point by direct summation; the Dirichlet-kernel form and recurrence tricks (Clenshaw) are out of scope until measured.
- Plots sample at least 8 points per period of the highest drawn harmonic, and the peak marker in F3 uses the closed form \(x=\pi/(N+1)\), not the sampled maximum.
- Chapter, routes and Presets are additive: new routes and Presets only; existing routes (including `/uniform-convergence`) and stored Presets keep working. Registration follows ADR 0011 and ADR 0016.
- Hosting and app-shell code stay separate from the mathematics.

## Testing Decisions

- Kernel tests: coefficients of the square wave, \(|x|\), the shifted jump, \(1/(2-\cos x)\), the sawtooth, the circle and the diamond; breakpoint pitfall (unsplit rule fails by more than \(10^{-2}\)); Parseval; shift identity \(e^{ik\tau}\); Gibbs peak positions and values; random piecewise-linear shapes against exact integrals with a fixed seed.
- Scene tests: apply a multi-action scene (change \(N\), then the example, then a point) in one synchronous sequence and check the state; reject unsupported values; editing a handle updates the spectrum in the next state.
- Preset tests: save/reopen, export/import, malformed handle data, out-of-range \(N\).
- Lesson/content tests: step counts, both languages in lockstep, `lessonMathNotation.test.ts` unchanged and passing, `tsc --noEmit` after localization changes.
- Browser: a smoke row per lesson (default scene, controls, restore, catalog link, refresh, narrow viewport, keyboard, touch alternatives).
- Performance (F2, F5): per [the performance plan](../performance-plan.md) add baseline scenes: F2 drag a handle with \(K=16\) bars and a partial-sum overlay; F5 change \(N\) and drag a vertex with \(N=10,25,50\) and a trace of 400 and 2000 samples. Count first, then measure. The coefficient update is cheap: \((2N+1)\times 8\) nodes \(\times\) 4 spans, e.g. \(3232\) complex exponentials for \(N=50\) and 8 nodes (\(6464\) for 16 nodes, as the defaults above). The cost to measure is the drawing: \(2N+1\) circles and arms as individual JSXGraph objects versus one polyline array for the arm chain, circles drawn only for the first few terms or as one overlay, and the trace as one curve. Compare, record frame times and the threshold used, and cite them in the ADR. Do not replace JSXGraph on this evidence alone.

### Batch-wide acceptance gate

1. Each Demonstration opens directly and after refresh, with its chapter-owned guided activity and a static preview.
2. The concept contract above is met with checked examples and honest guarantees.
3. Both languages, accessible inputs, projection readability, restore on exit, stopped-by-default playback, Presets and figure export pass.
4. Existing routes (including the trigonometric and uniform-convergence Demonstrations), Presets and lessons behave as before.
5. TypeScript, unit and content tests, production build, smoke checks and mathematics review pass; commit and push follow the repository workflow.

## Out of Scope

- Backend, accounts, assessment, grading, progress tracking, adaptive paths.
- Fourier transforms, Laplace transforms, FFT and sampling theory (*Analiza 4* material beyond series); discrete Fourier transform of audio.
- Convergence proofs, Fejér/Cesàro summation, \(L^2\) theory beyond the cited statements, divergence examples beyond a cited remark.
- Free-text functions, a formula parser, audio playback.
- A change to `BezierSpline` or the existing Bézier chapters, and closed-curve editing beyond the loop in F5.
- Renderer replacement or build-tool changes.

## Further Notes

Correctness notes: a drag shows instances; "converges to the midpoint at a jump", "the overshoot does not shrink" and the decay orders are theorems stated with hypotheses and sources, not inferred from pictures. The Gibbs overshoot is about \(8{,}95\,\%\) of the jump in the limit, and finite-\(N\) percentages are higher (\(9{,}07\,\%\) at \(N=11\)); the sawtooth was checked only for its coefficients, not its overshoot. Epicycle coefficients depend on the parametrization and on the start of the loop, and a picture of a traced curve does not show that. A cubic circle is not a circle (deviation \(2.7\cdot10^{-4}\)). Not verified: current FMF syllabi beyond the two quoted lines, textbook statements (cited, not opened), whether 16 Gauss nodes per span suffice for every user-dragged loop (checked only for the defaults), the Slovenian terms, and all rendering costs.
