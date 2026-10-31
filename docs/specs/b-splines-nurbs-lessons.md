# B-splines and NURBS lessons (B-zlepki in NURBS)

**Status:** scheduled 2026-10-31 by the [Curves feature stream](../tasks/feature-streams/curves.md); tasks in [docs/tasks/b-splines-nurbs](../tasks/b-splines-nurbs/README.md).
**Agreed:** 2026-10-31 (owner approved the family; details below are proposals for owner review).
**Source:** [lesson-family candidates](../research/lesson-family-candidates-2026-10-31.md) (CAGD rows 1-4, "Proposed families" item 3, sample sequences 6 and 7, correctness notes on B-splines and NURBS, "Gaps"); index: [new lesson families](new-lesson-families.md). Primary sources only as far as that note read them: Sederberg, *Computer Aided Geometric Design* (ch. 6: polar form 6.1, knot vectors 6.2, multiple knots 6.4, knot insertion 6.7, de Boor 6.8, basis functions 6.14; mirror page numbers); Prautzsch-Boehm-Paluszny (contents only: 3.1-3.2, 5.3, 5.4, 6.1); Floater, *An introduction to spline theory* (ch. 3, 5, 8); FMF *Računalniško podprto (geometrijsko) oblikovanje* syllabus. The note read **no curve-level NURBS source**: the circle construction is verified numerically only. Related spec: [curve-geometry-lessons.md](curve-geometry-lessons.md) (curvature kernel, reused here).

## Problem Statement

B-splines are the only block of the FMF CAGD syllabus Bezeg does not cover, and the standard curve representation in CAD. Bezeg has polynomial and rational Bézier curves and splines in Bézier form, but no basis-function view of a spline, no knot vector, no de Boor algorithm and no way to see why a repeated knot lowers smoothness. Students cannot connect "a spline is pieces joined with continuity" (splines chapter) to "a spline is one curve with local basis functions".

## Solution

One bilingual chapter, **B-zlepki in NURBS / B-splines and NURBS**, in Learn: readable prose interleaved with chapter-owned guided graph activities ([chapter-owned guided learning](chapter-owned-guided-learning.md)), each backed by a catalog Demonstration that stays available for free exploration. Six lessons share one new **knot-vector and de Boor kernel** (contract below) and are released in three batches. Nothing is graded or tracked.

### What the Bézier chapters already cover (no duplication)

- The Bézier study chapter ([bezier-study-chapter.md](bezier-study-chapter.md)) covers de Casteljau, Bernstein polynomials, convex hull and affine invariance; it defers splines, rational curves and PH curves to later chapters (line 102).
- The `rational-curves` chapter (`src/learning/content/familyChapters.ts`, id `rational-curves`) already teaches weights, homogeneous coordinates, rational de Casteljau, Farin points and the quarter-arc \(w_1=\tfrac{\sqrt2}{2}\) by a hand-checked midpoint, with `RationalBezierCurveCircleGraphN` assembling a circle from several separate rational Bézier arcs. L5 does **not** repeat weights or the quarter arc; it shows the same circle as **one** curve with a knot vector and explains what the knot vector adds.
- The `splines` chapter covers C0/C1/C2/G1 joins of Bézier pieces. L3 and L4 connect to it: knot multiplicity is the B-spline account of the same continuity drop, and Bézier extraction turns a B-spline back into that chapter's pieces.

### Release batches

| Batch | Lessons | Release condition |
| --- | --- | --- |
| A | L1 basis, L2 de Boor | Kernel basis, evaluation and validation tests pass; ADR accepted; new curve object and preset collection import/export round-trip. |
| B | L3 knot insertion and multiplicity, L4 Bézier extraction | Batch A released; curvature kernel from the curve-geometry family available (L3 comb); otherwise L3 ships with a tangent-only continuity check and the comb step is dropped. |
| C | L5 NURBS circle, L6 blossoming (optional) | Batch B released; rational kernel tests pass. L6 is dropped without changing L1-L5. |

### Reuse and new modules (verified by search in this worktree)

- **Reuse:** `src/graphs/bernstein/BernsteinGraph.tsx` (basis-plot template); `src/graphs/curves/bezier/DecasteljauGraph.tsx` and `DecasteljauAnimationControls.tsx` (triangle animation styling; `'decasteljau'` in `LESSON_ANIMATION_IDS`, `src/learning/model.ts:53`); `src/graphs/curves/rational/` (weight UI, `RationalBezierCurveCircleGraphN.tsx` for the comparison); Bézier classes `src/bezeg/impl/curve/polynomial-bezier-curve.ts`, `rational-bezier-curve.ts`, `bezier-spline.ts` (with `chordKnots` in `geometry.ts`) and `GenericBezierSpline.ts`, which already carry a per-span `knots` array but only as a *derived* parametrization of Bézier pieces; point-controlled-curve bases `abstract-point-controlled-curve.ts` and `src/graphs/curves/object/AbstractJXGPointControlledCurve.ts`; curve preset collections `src/graphs/curves/curvePresetCollections.ts` on `src/graphs/base/presets/PresetCollection.ts` ([ADR 0016](../adr/0016-preset-collections-owned-by-graph-families.md)); the curvature kernel `curvature.ts` and its `DerivativeSource`, `sampleComb` and `combAtJoin` from [curve-geometry-lessons.md](curve-geometry-lessons.md#curvature-kernel-this-spec-owns-it).
- **Not reusable as found:** `grep knot` finds no user-editable knot vector and no basis recursion; `GenericBezierSpline` computes Bézier spans from point triples and cannot represent a clamped B-spline with arbitrary multiplicities.
- **New:** the kernel (below), a B-spline curve object and JSXGraph wrapper, a basis-plot graph, a de Boor graph, a knot-vector editor control, one preset collection, one chapter definition in `familyChapters.ts`, and one new entry per animation in `LESSON_ANIMATION_IDS` (`'deboor'`).

## Knot-vector and de Boor kernel (this spec owns it)

A pure module (proposed `src/bezeg/impl/curve/bspline/`, files `knot-vector.ts`, `basis.ts`, `deboor.ts`, `insertion.ts`, `extraction.ts`, `rational.ts`) on plain numbers: no React, JSXGraph, `Point` objects or caches; planar and 3D points as `number[]` of equal length. Conventions (ADR (b) records the alternatives):

- **Degree, not order.** Degree \(k\ge1\); order \(k+1\). Knots \(u_0\le\dots\le u_{m}\), \(m=n+k+1\) for \(n+1\) control points. Basis \(N_{i,0}(t)=1\) on the half-open \([u_i,u_{i+1})\), \(N_{i,k}=\frac{t-u_i}{u_{i+k}-u_i}N_{i,k-1}+\frac{u_{i+k+1}-t}{u_{i+k+1}-u_{i+1}}N_{i+1,k-1}\) with \(0/0:=0\). Valid domain \([u_k,u_{n+1}]\); at the right end the last non-empty span is used (the closed-end special case), never a zero vector.
- **Clamped by default,** end knots of multiplicity \(k+1\) (curve interpolates the end points and starts as a Bézier piece). **Unclamped/uniform** vectors are allowed for L1 and the uniform-limit contract below.
- **Raw parameter** as the user enters it; a display toggle shows the domain rescaled to \([0,1]\). Knots are always non-decreasing; the editor enforces order by clamping a dragged knot between its neighbours.
- **`validateKnotVector(u, k, n)`** returns `{ok:true}` or `{ok:false, reason}` with a code (`wrong_length`, `decreasing`, `multiplicity_too_high` for \(>k+1\), `empty_domain` for \(u_k=u_{n+1}\), `not_finite`); interior multiplicity \(k+1\) is allowed (a break), multiplicity \(>k+1\) is not.
- **`basisValues(u, k, t)`** returns `{span, values}` for the \(k+1\) non-zero \(N_{i,k}\), \(i=\text{span}-k..\text{span}\); partition of unity and non-negativity are tested, not assumed. **`basisAll`** returns all \(n+1\) functions for plotting.
- **`deBoorTriangle(u, k, P, t)`** returns the triangle of intermediate points, level \(r=0..k\), each entry carrying its \(\alpha\) and the knot pair used, so the animation shows the same numbers the kernel computed. **`evaluate`** is its last point.
- **`insertKnot(u, k, P, x)`** (Boehm): returns the new knot vector and control points; the curve is unchanged (tested by sampling). **`insertToMultiplicity`** repeats it; **`bezierPieces(u, k, P)`** inserts every interior knot to multiplicity \(k\), and for an unclamped vector also the domain ends \(u_k\) and \(u_{n+1}\) (otherwise the first and last pieces are not Bézier pieces; amended after the BS-1b review) and returns the Bézier pieces with their parameter intervals (the extraction), plus the row operator mapping old to new points.
- **`derivativeSource(u, k, P)`** gives \(r'\) and \(r''\) per span for the curvature kernel; uses \(Q_i=k\frac{P_{i+1}-P_i}{u_{i+k+1}-u_{i+1}}\) (a degree \(k-1\) B-spline), with zero-length knot intervals skipped. The comb at a knot is computed one-sided per span (`combAtJoin`), never by sampling across it.
- **Rational (NURBS).** `rational.ts` lifts \((w_iP_i,w_i)\), runs the polynomial kernel, projects. Weights must be finite and positive; zero or negative weights are rejected with a reason (convex-hull and positive-denominator arguments need \(w_i>0\)).
- **Uniform-limit contract (for interpolation and approximation).** `uniformQuadraticSegment(P0,P1,P2,s)` returns \(\tfrac12[(1-s)^2P_0+(1+2s-2s^2)P_1+s^2P_2]\), \(s\in[0,1]\), i.e. the unclamped uniform quadratic B-spline (knots \(0,1,2,\dots\)); `chaikinStep(polygon, closed)` returns the \(\tfrac34,\tfrac14\) corner cuts. The tested identity: the midpoint of the edge joining the two points of the first Chaikin step that straddle \(P_1\) equals `uniformQuadraticSegment(P0,P1,P2,½)` (numbers below). The [interpolation-approximation family](new-lesson-families.md) imports these two functions; it must not reimplement them.
- **Verification of the contract.** Unit tests: partition of unity and local support (\(N_{i,k}=0\) outside \([u_i,u_{i+k+1})\)); Cox-de Boor against the Bernstein basis for knots \((0^{k+1},1^{k+1})\); de Boor against basis-sum evaluation; knot insertion leaves 1000 samples unchanged (1e-12); extraction pieces equal the original on their intervals; derivative against central differences; invalid knot vectors; NURBS circle radius within 1e-12; rejection of nonpositive weights.

## Lesson contracts and acceptance criteria

Common to all lessons: prerequisites link the Bézier study chapter, `splines`, `rational-curves`; every guide ends in free exploration; every guided step asks the student to **predict before the reveal**; Slovenian and English copy are in lockstep; formulas follow `lessonMathNotation.test.ts`; both languages are browser-checked including the live language switch. Reset restores the lesson default knots, weights, points and parameter.

### L1. B-spline basis (Bazne funkcije B-zlepka)

- **Goal.** A B-spline is a sum of local bumps; knots decide where each bump lives, and the bumps sum to one.
- **Prerequisites.** Bernstein basis (`BernsteinGraph`); piecewise polynomials.
- **Defaults.** Quadratic, knots \((0,0,0,1,2,2,2)\), 4 basis functions. At \(t=0.5\): \(0.25,\,0.625,\,0.125,\,0\); at \(t=1\): \(0,\,0.5,\,0.5,\,0\); at \(t=1.5\): \(0,\,0.125,\,0.625,\,0.25\) (new, mirror of 0.5). Uniform cubic at a knot: \(\tfrac16,\tfrac46,\tfrac16\). Uniform quadratic (unclamped) shown as the Chaikin limit.
- **Steps.** (1) Predict the shape of one hat of degree 1, then degrees 0-3. (2) Slide \(t\): readout of \(k+1\) active values and their sum. (3) Predict which functions are nonzero at \(t=1.5\), reveal. (4) Edit one interior knot: only nearby functions change (locality). (5) Make the vector Bézier-like \((0,0,0,1,1,1)\) and see Bernstein. (6) Free exploration.
- **Graph.** New basis-plot graph (template `BernsteinGraph`), knot editor, degree 0-3, clamped/unclamped toggle.
- **Acceptance.** (1) Values at \(t=0.5,1,1.5\) above match the kernel to 1e-12 and sum to 1. (2) Support of \(N_{i,k}\) is exactly \([u_i,u_{i+k+1})\). (3) With \((0,0,0,1,1,1)\) the plot equals Bernstein \(B_i^2\). (4) Non-monotone or too-short vectors are refused with a localized reason. (5) Dragging a knot never reorders knots. (6) Reset and language switch keep state consistent.

### L2. B-spline curve and de Boor's algorithm (Curva B-zlepka in de Boorov postopek)

- **Goal.** The curve point is a repeated linear interpolation of \(k+1\) active control points, with weights taken from the knots (a de Casteljau with knot-dependent ratios).
- **Prerequisites.** L1; de Casteljau in the Bézier chapter.
- **Defaults.** Knots \((0,0,0,1,2,2,2)\), points \((0,0),(1,2),(3,2),(4,0)\). At \(t=0.5\) (span \([0,1)\)): level 0 \((0,0),(1,2),(3,2)\); level 1 \((0.5,1),(1.5,2)\); result \((1,1.5)\). At \(t=1.5\): \((1,2),(3,2),(4,0)\) to \((2.5,2),(3.5,1)\) to \((3,1.5)\) (new). At \(t=1\) the point is \((2,2)\).
- **Steps.** (1) Predict which control points matter at \(t=0.5\). (2) Slide \(t\); highlight the \(k+1\) active points. (3) Animate the triangle; show each \(\alpha\). (4) Drag \(P_0\) and note the curve for \(t>1\) does not move. (5) Predict how many pieces the curve has, reveal. (6) Free exploration.
- **Graph.** New de Boor graph with the `DecasteljauGraph` look; new animation id `'deboor'`, iterative next-step and reset as for `'decasteljau'`.
- **Acceptance.** (1) Result \((1,1.5)\) at 0.5 and \((3,1.5)\) at 1.5 equal the basis-sum value. (2) Exactly \(k+1\) points highlighted. (3) Moving \(P_0\) leaves the curve unchanged for \(t>1\) (local control), checked by sampling. (4) Convex-hull property: curve inside the hull of every span's active points. (5) Next-step and reset follow the iterative-animation lifecycle; disposal leaves no board objects.

### L3. Knot insertion and multiplicity (Vstavljanje vozla in večkratnost)

- **Goal.** Inserting a knot changes the control polygon but not the curve; a knot of multiplicity \(m\) gives \(C^{k-m}\) continuity of the parametrization, and curvature can jump while the curve stays \(C^1\).
- **Prerequisites.** L2; `splines` chapter (continuity); curvature kernel.
- **Defaults.** Insert \(u=1\) into the L2 example: points \((0,0),(1,2),(2,2),(3,2),(4,0)\), two Bézier pieces joined at \((2,2)\). Insert \(u=0.5\): knots \((0,0,0,0.5,1,2,2,2)\), points \((0,0),(0.5,1),(1.5,2),(3,2),(4,0)\) (new; \((0.5,1),(1.5,2)\) are the de Boor level-1 points at 0.5, so the curve point is \((1,1.5)\)). Continuity demo, cubic, knots \((0,0,0,0,1,2,2,3,3,3,3)\), points \((0,0),(1,2),(2,3),(3,1),(4,1),(5,3),(6,0)\): after extraction the pieces are \([(0,0),(1,2),(1.5,2.5),(2,2.25)]\), \([(2,2.25),(2.5,2),(3,1),(3.5,1)]\), \([(3.5,1),(4,1),(5,3),(6,0)]\); \(\kappa\) is \(-1.4311\) on both sides of the simple knot \(u=1\) and jumps from \(\tfrac83\approx2.6667\) to \(\tfrac{16}{3}\approx5.3333\) at the double knot \(u=2\), with equal tangent \((1.5,0)\) on both sides (all new).
- **Steps.** (1) Predict what happens to the curve when a knot is inserted. (2) Insert \(u=1\) and watch one point split on the old polygon; the curve is unchanged. (3) Insert \(u=0.5\), compare with the de Boor level. (4) Switch to the cubic and raise a knot to multiplicity 2; predict which derivative breaks. (5) Show the curvature comb: continuous at the simple knot, jump at the double knot. (6) Free exploration.
- **Graph.** Same curve object; insertion control with the knot value chosen on the domain, multiplicity control, comb overlay from the curvature kernel.
- **Acceptance.** (1) Inserted control points equal the numbers above to 1e-12. (2) Curve sampled before and after insertion differs by less than 1e-12. (3) At multiplicity \(m\) the one-sided derivatives of order \(<k-m+1\) agree and order \(k-m+1\) differs (cubic, \(m=2\): tangent equal, \(\kappa\) differs by \(\tfrac83\)). (4) Insertion is refused outside the domain; multiplicity above \(k+1\) refused. (5) The comb is computed per span with the jump reported, not sampled across the knot. (6) Reset restores the original knots and points.

### L4. Bézier extraction (Izvlek Bézierjevih odsekov)

- **Goal.** Inserting knots to multiplicity \(k\) turns a B-spline into ordinary Bézier pieces, which links this chapter to the Bézier and spline chapters.
- **Prerequisites.** L3; `splines` chapter.
- **Defaults.** L2 example: pieces \((0,0),(1,2),(2,2)\) on \([0,1]\) and \((2,2),(3,2),(4,0)\) on \([1,2]\); the new junction point is \(b_2=b_0'=\tfrac12P_1+\tfrac12P_2=(2,2)\) (the ratio \(\tfrac12\) is \((1-0)/(2-0)\)). The cubic of L3 yields three pieces (listed above).
- **Steps.** (1) Predict how many Bézier pieces the curve has. (2) Extract; colour pieces. (3) Open one piece in the ordinary Bézier graph. (4) Move a control point and watch the affected pieces only. (5) Compare piece count with the number of distinct interior knots plus one. (6) Free exploration.
- **Graph.** Same curve object with a piece-colouring overlay and an "open as Bézier" link (a navigation to the existing Bézier Demonstration with preset points).
- **Acceptance.** (1) Piece points equal those above to 1e-12. (2) Each piece, evaluated as a Bézier, equals the B-spline on its interval within 1e-12. (3) Piece count equals distinct interior knots plus one. (4) The extraction operator rows each sum to 1. (5) A knot vector with an existing break (multiplicity \(k+1\)) is handled without division by zero.

### L5. NURBS and the circle as one curve (NURBS in krog)

- **Goal.** Weights make B-splines rational; with the right knot vector and weights a single quadratic NURBS is exactly a circle, though not parametrized by angle.
- **Prerequisites.** L3; `rational-curves` chapter (weights, quarter arc).
- **Defaults.** Quadratic, nine points \((1,0),(1,1),(0,1),(-1,1),(-1,0),(-1,-1),(0,-1),(1,-1),(1,0)\), weights \(1,\tfrac{\sqrt2}{2},1,\tfrac{\sqrt2}{2},1,\dots\), knots \((0,0,0,\tfrac14,\tfrac14,\tfrac12,\tfrac12,\tfrac34,\tfrac34,1,1,1)\); maximum radial deviation over 1001 samples \(2.2\cdot10^{-16}\) (research sample 7). Not angle-uniform: at \(t=\tfrac1{16}\) the point is \((0.92979,0.36809)\) at \(21.598^\circ\), not \(22.5^\circ\); \(t=\tfrac18\) gives \((\tfrac{\sqrt2}2,\tfrac{\sqrt2}2)\) at \(45^\circ\) (both new).
- **Steps.** (1) Predict whether any polynomial B-spline can be a circle (it cannot; reveal with radial error). (2) Show the polynomial version of the same points and its radial error. (3) Set corner weights to \(\tfrac{\sqrt2}2\); the error drops to rounding. (4) Predict the angle at \(t=\tfrac1{16}\), reveal \(21.6^\circ\). (5) Compare with `RationalBezierCurveCircleGraphN`: same circle, one curve vs four joined arcs. (6) Free exploration of the weight and a knot.
- **Graph.** The same curve object with weights shown and editable, radial-error readout, and an optional unit-circle overlay.
- **Acceptance.** (1) Max radial error below 1e-12 for the defaults and above 1e-2 for unit weights. (2) Point and angle values above match to 1e-4 (angle) and 1e-12 (point). (3) Weights are positive; nonpositive input refused with the reason. (4) Scaling all weights by a positive factor leaves the curve unchanged. (5) The text says the picture illustrates exactness at the sampled parameters and the proof is the rational identity from the `rational-curves` chapter; sampling alone does not prove it.

### L6. Blossoming as the bridge from de Casteljau (Cvetenje; optional)

- **Goal.** One symmetric function of \(k\) arguments, the blossom, gives de Boor and de Casteljau points and the control points themselves; de Boor is "blossom evaluated at \((t,\dots,t)\)".
- **Prerequisites.** L2, L4.
- **Defaults.** L2 example, blossom \(f(a,b)\): control points \(f(0,0)=(0,0)\), \(f(0,1)=(1,2)\), \(f(1,2)=(3,2)\), \(f(2,2)=(4,0)\) (control point \(d_i=f(u_{i+1},u_{i+2})\)); \(f(0,\tfrac12)=(0.5,1)\), \(f(\tfrac12,1)=(1.5,2)\), \(f(\tfrac12,\tfrac12)=(1,1.5)\) (the de Boor triangle at 0.5); Bézier piece on \([0,1]\): \(f(0,0),f(0,1),f(1,1)=(0,0),(1,2),(2,2)\).
- **Steps.** (1) Predict \(f(0,1)\) from the picture. (2) Choose any pair \((a,b)\); show \(f(a,b)\) by two interpolations. (3) Set \(a=b\): the curve point. (4) Show symmetry \(f(a,b)=f(b,a)\). (5) Read off the Bézier points of an interval. (6) Free exploration.
- **Acceptance.** (1) The listed values match the kernel. (2) Symmetry holds to 1e-12 for random pairs. (3) \(f(t,t)\) equals the curve. (4) Only degree 2 and 3 are offered; higher degrees are out of scope.

## Slovenian terms (proposals, per [choosing new terms](../localization.md#choosing-new-terms))

| English | Slovenian proposal | Note |
| --- | --- | --- |
| B-spline | B-zlepek | "zlepek" already used in the `splines` chapter. |
| knot, knot vector | vozel, vozelni vektor | "Vozel" is the established CAGD word. |
| multiplicity | večkratnost (vozla) | |
| basis function | bazna funkcija | cf. Bernsteinove bazne funkcije. |
| de Boor's algorithm | de Boorov postopek | follows "De Casteljaujev postopek". |
| knot insertion | vstavljanje vozla | |
| Bézier extraction | izvlek Bézierjevih odsekov | working name. |
| clamped (open) | pritrjen vozelni vektor | working name; check with owner. |
| degree / order | stopnja / red | |
| blossom, polar form | cvetenje; polarna oblika | "cvetenje" is a literal rendering, owner review. |
| NURBS | NURBS (neenakomerni racionalni B-zlepek) | acronym kept. |

## User Stories

- As a student, I slide the parameter and see which basis functions are active, so B-spline locality is concrete.
- As a student, I animate de Boor next to what I know from de Casteljau, so the new algorithm is a variation.
- As a teacher, I insert a knot and show that the curve does not move while the polygon does.
- As a teacher, I raise a knot multiplicity and show the curvature comb jump, so \(C^{k-m}\) has a picture.
- As a student, I see a circle built from one rational curve and learn why it is exact but not angle-uniform.
- As an educator, I save a B-spline Preset with knots and weights and re-import it in the classroom.

## Implementation Decisions

- The kernel above is pure and imported by graphs and tests; graphs never reimplement basis or de Boor.
- **ADR required before Batch A.** Alternatives:
  - **(a) Curve representation.** (1) *New `BSplineCurve` class* beside `PolynomialBezierCurve` (recommended: the state is points plus knots plus optional weights, which `PolynomialBezierCurve` and `GenericBezierSpline`, built from point triples with derived knots, cannot hold). (2) Extend `RationalBezierCurve` (`rational-bezier-curve.ts`) with a knot field: reuses weights but entangles Bézier and B-spline evaluation. (3) Represent a B-spline only as its extracted Bézier pieces inside `BezierSpline`: no new class, but loses knot editing and basis plots.
  - **(b) Convention.** Degree versus order (degree matches Bezeg's Bézier code); clamped versus unclamped by default (clamped interpolates ends; unclamped needed for the Chaikin limit, so both exist); raw versus normalized parameter (raw keeps the lesson numbers; normalized is a display toggle).
  - **(c) Preset format and import validation.** (1) New collection key with DTO `{degree, knots, points, weights?}` checked by `validateKnotVector` and weight positivity through `PresetCollection.check` (recommended; ADR 0016 pattern). (2) Store only extracted Bézier pieces: always valid, but loses knots. (3) Store normalized knots only: forbids multiplicities not expressible after normalization of a degenerate domain. Unsupported files give an actionable reason (wrong length, decreasing knots, multiplicity too high, nonpositive weight).
- Existing routes and stored Presets are unchanged (not a breaking change); new Demonstrations add routes and one Preset collection.
- Knot dragging snaps to a 0.01 grid by default to keep multiplicities exact; exact equal values mean a repeated knot.
- Basis plots and sampled combs are measured against the [performance plan](../performance-plan.md) before choosing a drawing approach.

## Testing Decisions

- Kernel unit tests as listed in its verification bullet, plus golden numbers of L1-L6 (every value stated here is asserted).
- Scene tests per lesson: step actions in one synchronous sequence, reset, and predict-reveal state; `lessonMathNotation.test.ts` passes unmodified.
- Preset tests: round-trip, plus each rejection reason in both languages.
- Smoke: `$smoke-tester` with [the browser checklist](../smoke-tests.md) on the new routes, the chapter, drag of knots and points, animation next-step, SL/EN live switch; full checklist not required.
- **Batch-wide acceptance gate.** All numbered criteria of the batch pass; `npx tsc --noEmit --pretty false`, lint, unit tests and the production build pass; both languages checked in the browser; dispose test shows no leaked board objects.

## Out of Scope

- Assessment, exercises, accounts, progress tracking, backend.
- Interpolation by B-splines (global fitting), least-squares fitting, variation diminishing, surfaces and NURBS surfaces, T-splines, isogeometric analysis, B-spline curves in 3D views (kernel is dimension-agnostic, no 3D graph).
- Subdivision lessons themselves (interpolation-approximation family; only the uniform-limit functions are provided here).
- Non-uniform parametrization choices (chord length, centripetal) beyond what the splines chapter shows.
- Open/closed periodic B-splines other than as the uniform unclamped case.

## Further Notes

- **Correctness.** Half-open basis intervals with the right-end special case; \(0/0:=0\) for repeated knots; multiplicity \(m\) gives \(C^{k-m}\) *parametrization*, so the picture can still look smooth or have a cusp; knot insertion leaves the curve unchanged and is not subdivision of a different curve. Weights must stay positive. The NURBS circle is exact but not angle- or arc-length-uniform. A picture of a single circle illustrates exactness at samples; the proof is the rational identity. The comb at a knot is one-sided.
- **Hypothesis checks.** Cubic default needs at least 4 points; \(u_k<u_{n+1}\); finite knots and weights; multiplicity at most \(k+1\).
- **New numbers (computed with `python -I`):** basis at \(t=1.5\); de Boor triangle at \(t=1.5\); insertion at \(u=0.5\); cubic extraction pieces and one-sided curvatures (\(-1.4311\), \(\tfrac83\), \(\tfrac{16}{3}\)); NURBS circle at \(t=\tfrac1{16}\) (angle \(21.598^\circ\)); Chaikin identity midpoint \((1.125,1.75)\) for \(P=(0,0),(1,2),(3,2)\) both from the uniform quadratic segment at \(s=\tfrac12\) (weights \(\tfrac18,\tfrac68,\tfrac18\)) and as the midpoint of the first Chaikin edge. Re-verify when implementing.
- Sources not opened: Farin, a curve-level NURBS text, Chaikin's 1974 paper.
