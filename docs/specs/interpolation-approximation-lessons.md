# Interpolation and approximation lessons (Interpolacija in aproksimacija)

**Status:** scheduled 2026-10-31 by the [Curves feature stream](../tasks/feature-streams/curves.md); tasks in [docs/tasks/interpolation-approximation](../tasks/interpolation-approximation/README.md).
**Agreed:** 2026-10-31 (owner approved the family; details below are proposals for owner review).
**Source:** [lesson-family candidates](../research/lesson-family-candidates-2026-10-31.md) ("Proposed families" item 5, sample sequences 8-10, correctness notes on Runge); index: [new lesson families](new-lesson-families.md). Primary sources only as far as that note read them: Chaikin's paper and Floater's subdivision notes were **not read**; Sederberg (free use permitted) and the FMF CAGD syllabus are cited there. Related specs: [numerical-methods-lessons.md](numerical-methods-lessons.md) (defers Runge and least squares here, line 173), [b-splines-nurbs-lessons.md](b-splines-nurbs-lessons.md) (owns `uniformQuadraticSegment`, `chaikinStep`).

## Problem Statement

The Bézier chapter shows curves that *approximate* their control polygon, and the splines chapter joins pieces, but Bezeg never poses the opposite question: given points, which curve passes through them, and what does it cost? Students meet interpolation only as de Casteljau's "interpolation to curve". There is no Lagrange polynomial, no demonstration that more nodes can make things worse (Runge), no cubic Hermite or Catmull-Rom curve, no least-squares fit, and no subdivision curve. The "interpolate vs approximate" story is left half told.

## Solution

Add a Learn chapter **Interpolacija in aproksimacija / Interpolation and approximation** (audience University; L1-L3 and L4's line fit readable at upper-secondary level) with five chapter-owned guided activities, each backed by a catalog Demonstration that stays available for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). One thread: *through the points or near them?* Prose states hypotheses and what a picture proves versus illustrates.

### Release batches

| Batch | Lessons | Release condition |
| --- | --- | --- |
| A | I1 Lagrange vs Bézier; I2 Runge and Chebyshev nodes | `interpolation.ts` kernels pass the tests below; no change to existing graphs, routes or Presets |
| B | I3 Hermite and Catmull-Rom; I4 Least squares | Batch A released; ADR on the shared "points on a canvas" editing model decided |
| C | I5 Chaikin and four-point subdivision | B-splines spec has delivered `uniformQuadraticSegment` and `chaikinStep` (see below); the four-point kernel is new here |

### Reuse and new modules

Verified to exist in this worktree: `src/graphs/functions/IterativeFunctionGraph.tsx` (Next step, Play/Pause, Reset; used for the subdivision rounds); `src/graphs/functions/TaylorGraph.tsx` with `src/analysis/taylor.ts` and `taylorModel.ts` (the model for "approximation of a function by a polynomial, reveal the error"); `src/analysis/functions.ts` (function catalogue); `src/graphs/curves/bezier/DecasteljauGraph.tsx` and `SubdivisionGraph.tsx` (Bézier side of I1); `src/bezeg/impl/curve/C2CubicBezierSpline.ts` (an existing curve that interpolates its end points only, not a general interpolant); chapter registration in `src/learning/content/familyChapters.ts`, ids in `LESSON_ANIMATION_IDS` in `src/learning/model.ts`. A repository search found **no** existing Lagrange, Chebyshev, Hermite, Catmull-Rom or least-squares code, so nothing is duplicated.

From the [B-splines spec](b-splines-nurbs-lessons.md#lesson-contracts-and-acceptance-criteria) ("Uniform-limit contract"): **import** `uniformQuadraticSegment(P0,P1,P2,s)` and `chaikinStep(polygon, closed)`; this spec must not reimplement them. If Batch C ships before the B-splines work, the owner either reorders or lands those two functions first.

New pure modules (names are suggestions, free of React, JSXGraph and localization): `src/analysis/interpolation.ts` (barycentric Lagrange, node sets, error sampling), `src/analysis/hermite.ts` (cubic Hermite and Catmull-Rom tangents), `src/analysis/leastSquares.ts`, `src/analysis/subdivision.ts` (`fourPointStep`), and one Demonstration per lesson (suggested: `InterpolationGraph`, `RungeGraph`, `HermiteGraph`, `LeastSquaresGraph`, `SubdivisionGraph2`; avoid the name clash with the existing `SubdivisionGraph`).

### Decisions needing an ADR

1. **Point editing model.** (a) Free draggable points on the canvas with a typed list in the side panel; (b) a fixed number of points with numeric entry only; (c) function-graph dragging with node positions fixed by the node rule. I1, I3, I4 and I5 need draggable data points; I2 needs nodes chosen by a rule. Decide before Batch B so Presets store one shape.
2. **Curve form for I1 and I3.** (a) Treat the data as a parametric curve with a parameter choice (uniform, chord-length) and interpolate each coordinate; (b) show function interpolation \(y=p(x)\) only. (a) is needed to compare with Bézier; (b) is simpler and enough for Runge. Recommendation: (a) for I1 and I3, (b) for I2 and I4 (they are functions of \(x\)).
3. **Least-squares solver.** (a) normal equations in the UI with exact small cases; (b) QR or an SVD-free orthogonal solve. See robustness notes; decide before Batch B.

## Concept contracts and acceptance criteria

Common to all lessons: prerequisites link the Bézier study chapter, `splines`, and (for I2) the `analysis` chapter's Taylor lesson; every guide ends in free exploration; every guided step asks the student to **predict before the reveal**; Slovenian and English copy are in lockstep; formulas follow `lessonMathNotation.test.ts`; both languages are browser-checked including the live language switch. Reset restores default points, nodes, degree and round. Numbers below are checked unless marked **new**; every **new** number was computed with `python -I` in plain Python (no numpy), method named.

### I1. Lagrange interpolation versus Bézier approximation (Skozi točke ali blizu njih)

- **Goal.** Through-the-points (interpolating) and near-the-points (approximating) curves answer different questions; the interpolant can leave the control polygon, the Bézier curve cannot.
- **Prerequisites.** Bézier study chapter (de Casteljau, convex hull); the parametric curve idea.
- **Default.** Points \(P_0..P_3=(0,0),(1,2),(3,3),(4,0)\) with uniform parameters \(t=0,1,2,3\). The Lagrange cubic at \(t=\tfrac32\) has weights \(-\tfrac1{16},\tfrac9{16},\tfrac9{16},-\tfrac1{16}\) and gives \((2,\,2.8125)\) **(new; weights and sum computed in Python from the Lagrange basis)**. The Bézier cubic with the same four points as control points at \(t=\tfrac12\) has weights \(\tfrac18,\tfrac38,\tfrac38,\tfrac18\) and gives \((2,\,1.875)\) **(new)**. At \(t=\tfrac12\) the Lagrange weights are \(0.3125,\,0.9375,\,-0.3125,\,0.0625\) **(new)**, one negative, hence not a convex combination.
- **Steps.** (1) Predict whether a curve through four points stays inside their hull. (2) Reveal the Lagrange curve and the hull; drag a point to push the curve out. (3) Show the Bézier curve on the same points. (4) Basis view: Lagrange basis polynomials (value 1 at their node, 0 at the others) beside Bernstein. (5) Predict the effect of dragging one point on distant parts of each curve (both are global), reveal. (6) Add a fifth point. (7) Free exploration.
- **Capabilities.** Draggable points, parameter choice (uniform default; chord-length optional), Lagrange and Bézier overlays, basis plot, hull toggle, weights readout at a chosen \(t\).
- **Acceptance.**
  1. Lagrange curve passes through every data point (error \(\le10^{-12}\)) and reproduces any polynomial of degree \(\le n\) on \(n+1\) points.
  2. Weights sum to 1 (partition of unity) and the defaults above are reproduced.
  3. The hull toggle shows the interpolant leaving the polygon on the default while the Bézier curve stays inside.
  4. Coincident parameters are rejected with an actionable message (division by zero otherwise); at least 2 and at most a documented maximum (suggest 12) points.
  5. Reset, restore, Preset round trip and both languages pass.

### I2. Runge's phenomenon and Chebyshev nodes (Rungejev pojav)

- **Goal.** More equispaced nodes can make polynomial interpolation worse; Chebyshev nodes cure this for this function.
- **Prerequisites.** Taylor lesson (`analysis` chapter); I1.
- **Default.** \(f(x)=\dfrac1{1+25x^2}\) on \([-1,1]\). **Convention: \(n\) is the degree, with \(n+1\) nodes.** Chebyshev nodes are the first-kind nodes \(x_j=\cos\frac{(2j+1)\pi}{2(n+1)}\). Maximum error on a dense grid:

| Degree \(n\) | Equispaced | Chebyshev (first kind) | Source |
| --- | --- | --- | --- |
| 10 | 1.9157 | 0.1092 | research sample 9 |
| 15 | 2.1076 | 0.0831 | research sample 9 |
| 20 | 59.82 | 0.01533 | **new** |

  The new row: 20001 equispaced evaluation points, barycentric formula; the degree-10 row recomputed with the same method matches the note (1.91566, 0.10915). The equispaced maximum for \(n=10\) lies near \(x=\pm0.94\) (**new**, at \(-0.9402\)), at the end of the interval; \(n=20\) at \(x\approx0.975\) (**new**). Chebyshev nodes of the second kind (extrema \(\cos\frac{j\pi}{n}\)) give 0.1322 and 0.01774 at \(n=10,20\) (**new**), so the lesson names the kind. At \(n=5\) Chebyshev is *worse* in max norm (0.556 vs 0.433): do not use it.
- **Steps.** (1) Predict what happens to the error as the degree grows. (2) Raise the degree stepwise (equispaced) and watch the ends. (3) Show the error curve and its maximum. (4) Predict the node set that helps, reveal Chebyshev (nodes as projections of equally spaced points on a semicircle). (5) Compare maxima for \(n=10,20\). (6) Free exploration: change the function (catalogue below), degree and node rule.
- **Capabilities.** Function choice from a closed list (Runge \(1/(1+25x^2)\), \(|x|\), \(\sin x\) as a well-behaved contrast), degree control, node rule (equispaced, Chebyshev), error curve, maximum readout, node markers.
- **Acceptance.**
  1. Maximum errors above reproduced to four significant figures by the kernel on the stated grid.
  2. Evaluation uses the **barycentric formula** (see robustness); monomial/Vandermonde evaluation is not used for the plotted curve.
  3. Prose says what it proves: divergence is shown for this \(f\); Chebyshev minimizes the node polynomial, not the error at every degree.
  4. Degree is capped (suggest 40); the readout says "grid maximum", not the true supremum.
  5. Reset, restore, Preset round trip and both languages pass.

### I3. Hermite and Catmull-Rom curves (Hermiteova krivulja in Catmull-Rom)

- **Goal.** Prescribing positions *and* tangents gives local, \(C^1\) interpolation; Catmull-Rom chooses the tangents from the neighbours.
- **Prerequisites.** `splines` chapter (tangent continuity); I1.
- **Default.** Points \((0,0),(1,2),(3,3),(4,0)\). Uniform Catmull-Rom tangent \(m_i=\tfrac12(P_{i+1}-P_{i-1})\): at \((1,2)\) it is \((1.5,1.5)\) (research sample 8); at \((3,3)\) it is \((1.5,-1)\) **(new, same formula)**. The cubic Hermite segment from \((1,2)\) to \((3,3)\) has midpoint \(\tfrac12(P_1+P_2)+\tfrac18(m_1-m_2)=(2,\,2.8125)\) **(new)**: the same point as the four-point rule and the interior Lagrange midpoint of I1, which is no coincidence for uniform Catmull-Rom (midpoint weights \(-\tfrac1{16},\tfrac9{16},\tfrac9{16},-\tfrac1{16}\)).
- **Steps.** (1) Predict the shape of the curve through two points with given tangents. (2) Drag a tangent handle. (3) Predict the tangent that makes a smooth chain, reveal Catmull-Rom. (4) Move one point: only adjacent segments change (locality, unlike I1). (5) Compare with the cubic spline of the `splines` chapter (\(C^2\), global). (6) Free exploration with a tangent scale (tension) and parameter choice.
- **Capabilities.** Draggable points, tangent handles, Hermite and Catmull-Rom modes, Bézier conversion (control points \(P_i+\tfrac13m_i\) shown), uniform/chord-length parameter choice, end-condition note (end tangents one-sided).
- **Acceptance.**
  1. Hermite segment matches the value and derivative at both ends; conversion to Bézier form gives control points \(P_0,\,P_0+\tfrac13m_0,\,P_1-\tfrac13m_1,\,P_1\) and identical sampled curves (\(10^{-12}\)).
  2. Catmull-Rom is \(C^1\) at interior points and only \(C^1\) (second derivatives differ in general); prose states it, and uniform-parameter overshoot or loops are shown with a stated example.
  3. Locality: moving one point changes at most two segments (tested).
  4. Duplicate consecutive points (zero chord) are handled or rejected for chord-length parameters.
  5. Reset, restore, Preset round trip and both languages pass.

### I4. Least squares (Metoda najmanjših kvadratov)

- **Goal.** Fitting a model to more points than parameters: minimize the sum of squared vertical residuals; the normal equations give the answer; residuals are orthogonal to the model space.
- **Prerequisites.** Linear function and derivative chapters; vectors.
- **Default.** Data \((0,1),(1,2),(2,2),(3,4)\). Best line \(y=0.9x+0.9\), residuals \(0.1,\,0.2,\,-0.7,\,0.4\) (sum zero), sum of squares \(0.7\) (research sample 10; residuals **new**). Quadratic fit \(y=1.15+0.15x+0.25x^2\), sum of squares \(0.45\) **(new)**. Cubic: passes through all four points, \(y=1+2.5x-2x^2+0.5x^3\), residuals \(\approx0\) **(new)**; this ties back to I1 (interpolation is the zero-residual fit). Sensitivity: replacing \((3,4)\) by \((3,8)\) gives \(y=2.1x+0.1\), sum of squares \(8.7\) **(new)**. All **new** values from the normal equations solved by Gaussian elimination with pivoting in Python.
- **Steps.** (1) Predict the line by eye, then reveal the best line and the squares of the residuals. (2) Drag the line's slope and intercept and watch the total fall to its minimum. (3) Predict the effect of moving one point far away, reveal (sensitivity to outliers). (4) Show the normal equations for the default and the solution. (5) Raise the degree: error falls, curve starts to wiggle (link to I2). (6) Free exploration.
- **Capabilities.** Draggable data points, degree 1 to \(\min(\text{points}-1,\,5)\), residual segments and squares, sum-of-squares readout, normal equations display, manual line mode.
- **Acceptance.**
  1. Defaults above reproduced; the residual vector is orthogonal to the columns of the design matrix (inner products \(\le10^{-10}\)).
  2. A fit of degree \(\ge\) points is rejected or flagged underdetermined; all-equal \(x\) (vertical data) is rejected with a reason; fewer than 2 points disabled.
  3. Prose states that squared vertical residuals are a modelling choice (not the geometric distance) and what outliers do.
  4. Solver follows the ADR decision; for degrees \(\le 5\) with the closed example it is checked against an independent exact rational solve.
  5. Reset, restore, Preset round trip and both languages pass.

### I5. Chaikin and four-point subdivision (Subdivizijske krivulje)

- **Goal.** Repeated local rules produce a smooth limit curve; Chaikin *approximates* (limit is the uniform quadratic B-spline), the four-point rule *interpolates* (the old points stay).
- **Prerequisites.** Bézier subdivision lesson; B-splines family (L1, uniform quadratic) recommended; I3.
- **Kernels.** `chaikinStep` and `uniformQuadraticSegment` imported (B-splines spec). New: `fourPointStep(polygon, closed, w=1/16)` keeps every old vertex and inserts for each edge \(p_ip_{i+1}\) the point \(\frac{-p_{i-1}+9p_i+9p_{i+1}-p_{i+2}}{16}\) (general form \((\tfrac12+w)(p_i+p_{i+1})-w(p_{i-1}+p_{i+2})\)). Open polygons: the default shortens the rule at the ends (documented end rule: insert the edge midpoint on the two end edges), or the lesson uses closed polygons only; owner choice.
- **Default.** Points \((0,0),(1,2),(3,3),(4,0)\). Four-point inserts \((2,\,2.8125)\) on edge \(p_1p_2\) (research sample 8). Chaikin replaces edge \(p_1p_2\) by \((1.5,2.25)\) and \((2.5,2.75)\). Identity check (**new**, \(P_0..P_2=(0,0),(1,2),(3,3)\)): the midpoint of the Chaikin points \(\tfrac14P_0+\tfrac34P_1=(0.75,1.5)\) and \(\tfrac34P_1+\tfrac14P_2=(1.5,2.25)\) is \((1.125,1.875)\), equal to `uniformQuadraticSegment(P0,P1,P2,½)`. Four-point reproduces cubic data: on samples of \(x^3\) at \(-3,-1,1,3\) the inserted value is \(0\) (**new**; the cubic through them is odd, so the exact midpoint value is also \(0\)).- **Steps.** (1) Predict the shape after many Chaikin rounds from a corner polygon. (2) Next step: round 1, 2, 3 (Next step / Play). (3) Show that the limit is the quadratic B-spline (segment midpoint check). (4) Switch to four-point: predict whether old points move, reveal that they stay. (5) Compare smoothness and overshoot of the two. (6) Free exploration with a closed polygon.
- **Capabilities.** Draggable polygon, rule choice (Chaikin, four-point), round counter with Next step / Reset, vertex-count readout, optional limit-curve overlay for Chaikin.
- **Acceptance.**
  1. The Chaikin identity above holds against the imported kernels; it is a test, not a copy.
  2. Four-point reproduces polynomials of degree \(\le3\) sampled uniformly (tested on \(x^3\)); old vertices are unchanged after every round.
  3. Vertex counts after \(k\) rounds are exact (closed polygon of \(n\) vertices: \(2^kn\) for both rules); the round cap (suggest 6) is stated.
  4. Prose states smoothness only as far as sources were read: the Chaikin limit is the quadratic B-spline (\(C^1\)); the \(C^1\) claim for the four-point limit with \(w=\tfrac1{16}\) was **not read from a primary source** in the research note and is marked "to verify" before it ships.
  5. Playback is stopped by default and pauses on edit, scene change, exit, import, capture and unmount; reset restores the initial polygon.
  6. Reset, restore, Preset round trip and both languages pass.

## User Stories

1. As a student, I see a curve through my points leave their hull while the Bézier curve cannot, so I understand why design curves approximate.
2. As a student, I raise the degree and watch the ends of an interpolant blow up, then fix it with Chebyshev nodes.
3. As a teacher, I drag a point and show the locality of Catmull-Rom against the global Lagrange curve.
4. As a student, I fit a line to four points, see the squared residuals, and see one outlier move it.
5. As a student, I run subdivision rounds and tell an approximating rule from an interpolating one.

## Terms (proposals, to be settled by localization.md#choosing-new-terms)

| English | Slovenian proposal | Basis to check |
| --- | --- | --- |
| interpolation / approximation | interpolacija / aproksimacija (približek) | FMF syllabus wording; `interpolation_to_curve` in `sl.ts` |
| Lagrange interpolation polynomial | Lagrangeev interpolacijski polinom | textbooks |
| interpolation node | interpolacijska točka | "vozel" clashes with spline knot |
| Runge's phenomenon | Rungejev pojav | to research |
| Chebyshev nodes | Čebiševe točke | transliteration rule to check |
| Hermite interpolation | Hermiteova interpolacija | to research |
| Catmull-Rom spline | Catmull-Romov zlepek | keep names untranslated |
| least squares / residual | metoda najmanjših kvadratov / ostanek | to research |
| normal equations | normalni sistem | to research |
| subdivision curve | subdivizijska krivulja | check existing Bézier "subdivision" string |

Final wording is recorded in the implementing change.

## Implementation Decisions

- Mathematics lives in pure typed modules; fits and histories are derived from validated fields, not trusted arrays (see `bisection.ts`).
- Lagrange evaluation uses the barycentric second form; closed function lists (ADR 0007, no parser); catalogue and Preset registration as for the Analysis family (`familyChapters.ts`, ADR 0011, ADR 0016); routes and existing Presets are additive.
- I5 reuses `IterativeFunctionGraph` with one typed scene action per animation id added to `LESSON_ANIMATION_IDS` (ADR 0013 pattern).
- Hosting and app-shell code stay separate from the mathematics.

## Testing Decisions

- Kernel tests: Lagrange basis (cardinality, partition of unity, exactness on degree \(\le n\)); the Runge table (relative tolerance \(10^{-3}\)); Hermite end conditions and Bézier conversion; Catmull-Rom tangents; locality; normal equations and residual orthogonality; `fourPointStep` on the default and on cubic data; the Chaikin identity via imported kernels; invalid input (duplicate parameters, vertical data, underdetermined fit, caps).
- Scene tests: multi-action scenes in one synchronous tick (several `next-step` actions, point edits); editing clears history.
- Preset tests: save/reopen, export/import, malformed or out-of-range data.
- Lesson/content tests: step counts, languages in lockstep, `lessonMathNotation.test.ts` unchanged and passing, `tsc --noEmit` after localization changes.
- Browser: a smoke row per lesson (default scene, controls, reveal, restore, catalog link, refresh, narrow viewport, keyboard, touch alternatives); the full checklist only if shared catalogue or lesson runtime changes.
- Performance: I2 error curves to degree 40 and I5 at 6 rounds are small; measure dragging in I1/I3 against [the performance plan](../performance-plan.md) before any optimization.

### Batch-wide acceptance gate

1. Each Demonstration opens directly and after refresh, with its guided activity and a static preview.
2. Concept contracts are met with checked examples and honest guarantees.
3. Both languages, accessible inputs, projection readability, restore on exit, stopped-by-default playback, Presets and figure export pass.
4. Existing routes, Presets and chapters behave as before.
5. TypeScript, unit and content tests, production build, smoke checks and mathematics review pass; commit and push follow the repository workflow.

## Correctness Notes

- **Hypotheses.** Lagrange needs distinct nodes. Runge's divergence is a statement about this \(f\) with equispaced nodes; the error \(f(x)-p(x)=\frac{f^{(n+1)}(\xi)}{(n+1)!}\prod_j(x-x_j)\) involves a derivative that grows here. A plot proves nothing about all \(f\).
- **Robustness.** The Vandermonde matrix is ill conditioned as the degree grows (conditioning was not measured here; no numpy); never solve it for the plotted curve. Barycentric Lagrange is the plotted path. Normal equations square the condition number of the design matrix, so QR is preferable for higher degrees; for degree \(\le5\) with small integer data they are acceptable and instructive, with a note. Grid maxima are lower bounds of true maxima.
- **Degenerate cases.** Repeated parameters, coincident Catmull-Rom points (zero chord), collinear data, vertical data in a fit, subdivision end rules for open polygons.
- **Illustrates vs proves.** Subdivision pictures illustrate convergence; limit-smoothness claims rest on cited theory. Parameter values change interpolants: uniform parameters can overshoot or loop on uneven data.

## Out of Scope

Assessment, accounts, server storage; \(C^2\) interpolating splines beyond the `splines` chapter; Newton divided differences (prose only); Chebyshev minimax theory; trigonometric and rational interpolation; weighted, total or nonlinear least squares; B-spline fitting; subdivision surfaces; space curves.

## Further Notes

Chapter order follows the batches. The numerical-methods spec (line 173) defers Runge and least squares here; I2 and I4 fulfil that. The uniform-limit contract is a hard dependency of I5 only.
