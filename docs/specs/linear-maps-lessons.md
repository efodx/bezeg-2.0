# Linear maps of the plane (Linearne preslikave ravnine)

**Status:** proposed, 2026-10-31. Specification only; implementation not scheduled.
**Agreed:** 2026-10-31 (owner approved the family; details below are proposals for owner review).
**Source:** [expansion candidates, E1](../research/lesson-family-candidates-2026-10-31-expansion.md) (anchors, lesson list, pitfalls) and its "Sources" section. Read for this spec: the FMF *Algebra 1 (111)* page (2025 programme; its Vsebina lists *linearne preslikave*, *determinante*, *lastne vrednosti*, *sebi adjungirani endomorfizmi*, *kvadratni funkcionali* and *krivulje in ploskve drugega reda*) and the matura catalogue M-MAT-2026 §4.6 (*vzporedni premik, zrcaljenje, vrtež, orientacija trikotnika*, *središčni razteg*) and §4.8 (*linearna kombinacija*, *baza v ravnini*; *linearna neodvisnost* is a higher-level (VR) item by the text-extraction indentation rule of the research note, not visually confirmed). The catalogue text contains no occurrence of *matrika*; matrices are not a matura topic, so Lessons L1 and L2 reach the matura only through vectors, bases and rigid motions, and L3–L5 are university content. Textbooks named in the FMF page (Dobovišek–Kobal–Magajna, *Naloge iz algebre I*, and the others the page lists) are cited, not opened; no section numbers are given. Part of the [new lesson families](new-lesson-families.md) index (the index entry is added by the handler).

## Problem Statement

Bezeg shows that an affine transformation of a Bézier curve acts on its control points ([the affine lesson](../../src/learning/content/expansionGuidedLessons.ts), demonstration `affine`, route `/bezier/affine`), and that lesson lists "basic familiarity with planar linear transformations" as a prerequisite. The app has nothing that teaches that prerequisite. A learner cannot drag the images of the basis vectors and watch the whole plane follow, cannot see why the determinant is a signed area, cannot find the directions a matrix leaves fixed (or see that a rotation has none), and cannot see why the image of a circle is an ellipse whose axes are not the eigenvectors of a general matrix. These are first-year university core (FMF Algebra 1) and the geometric meaning behind the matura vector topics, and they are best learned by dragging.

## Solution

Add a Learn chapter **Linearne preslikave ravnine / Linear maps of the plane** with five chapter-owned guided activities, each backed by a catalog Demonstration that stays available for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). Audience: upper secondary (L1, L2 readable with vectors and bases) to first-year university (L3–L5). Each lesson is 5–7 steps, predicts before it reveals, and ends in free exploration. No exercises, grading or progress. Pictures show instances; every "always" statement (determinant as area scale, eigen-directions, the circle-to-ellipse theorem) is stated with a source as a theorem and the drag is labelled an illustration.

Chapter order: L1, L2, L3, L4, L5. The chapter sits before or beside the existing affine lesson and links to it from L5.

### Release batches

| Batch | Lessons | Release condition |
| --- | --- | --- |
| 0 (foundation) | The 2×2 kernel below (matrix model, snapping policy, eigen classification, singular values, grid image) with unit tests; ADR 1 and ADR 2 accepted | Kernel tests pass; no learner-visible route is required |
| A | L1 Matrix as the image of a basis; L2 Determinant as signed area | Batch 0 done; basis-handle graph passes the batch gate |
| B | L3 Eigenvectors and eigen-directions; L4 Symmetric matrices, ellipses, singular directions | Batch A released; ADR 3 accepted; L4 depends on the L3 graph mode |
| C | L5 Composition and affine maps | Batch B released; the existing `affine` Demonstration and lesson unchanged |

Publish batches separately. Do not expose unimplemented Demonstrations or advertise unreleased lessons.

### Reuse and new modules

Verified by search in this worktree:

- `AffineTransformBezierCurveGraph` (`src/graphs/curves/bezier/AffineTransformsBezierCurveGraph.tsx:30`, registered as `'affine'` at `src/graphs/graphFactories.ts:69`, route in `src/demonstrations.ts:33`) applies graph-owned operations (`translate-x/y`, `scale`, `rotate`, `reflect-x/y`, registered with `registry.on('affine-transform', ...)` at lines 38–46) to the first curve, with the curve operations disabled on imported curves (line 32). Its lesson `affine` lives in `src/learning/content/expansionGuidedLessons.ts:267` and works with the fixture \(P=(1,0),(2,3),(4,2),(5,-1)\).
- The curve API `src/bezeg/api/curve/point-controlled-curve.ts` has `scale`, `moveFor`, `flip`, `rotate` (lines 21–35) and the general `transform(A, b, center)` (line 41), implemented in `src/bezeg/impl/curve/abstract-point-controlled-curve.ts:108`. **Reuse caveat (verified in the implementation):** `rotate` and `flip` use the default centre `getPointsCenter()` (the mean of the control points, lines 108–111 and 120), while `scale` uses the projected bounding-box centre (line 62), so none of them is a linear map about the origin. They also mutate the points in place and skip points whose coordinates are fixed by others (`isXFunction`, line 140). For the fixture the mean is \((3,1)\) and the bounding-box centre is \((3,3/2)\) (checked), so rotation and scaling in the affine graph use different pivots. The kernel therefore does not call these operations: it keeps a source curve fixed and derives the image from the matrix each time, so repeated drags do not accumulate error. `transform(A, [0,0], [0,0])` would compute \(AP\) about the origin and may be used by the adapter to write the derived image points.
- `src/analysis/complex.ts` and `ComplexMultiplicationGraph` (`src/graphs/complex/`) are the precedent for a model with a closed example list, grid-snapped coordinates (`COMPLEX_COORDINATE_STEP`, `snapComplexCoordinate`) and a typed model/parse split. Multiplication by \(a+bi\) is the matrix \(\begin{pmatrix}a&-b\\b&a\end{pmatrix}\); the complex-map kernel is owned by [complex-maps-lessons.md](complex-maps-lessons.md) and is not a dependency of this spec.
- The scene-action registry (`registerLessonActions`, as in `AffineTransformsBezierCurveGraph.tsx:36`) and ADR 0013's typed scene-action pattern carry lesson steps (set the matrix, set the test vector, set the shown example).

New modules (names are suggestions): `src/linear/matrix2.ts` (the 2×2 kernel), `src/linear/eigen2.ts`, `src/linear/singular2.ts`, `src/linear/gridImage.ts`, `src/linear/linearMapModel.ts` (parse/validation of graph state and Presets), `src/graphs/linear/LinearMapGraph.tsx` and its tests. Pure maths stays free of React, JSXGraph and localization. The module path `src/linear/` is a proposal (ADR 1).

### Decisions needing an ADR

1. **Graph shape and placement.** (a) One `LinearMapGraph` with a mode (basis / determinant / eigen / ellipse / composition) and one shared state; (b) a graph per lesson; (c) extend `AffineTransformBezierCurveGraph`. (a) shares the kernel, snapping and Preset format, and lets scenes switch modes in one tick; (b) keeps each graph simple but duplicates handles and grid; (c) would change the existing affine route and stored `affine` Presets and mixes a button-driven curve operation graph with a handle-driven matrix graph. Recommended: (a), a new family or placement for the Demonstration (`basics` is the other option, as for `complex-multiplication`, `src/demonstrations.ts:29`) decided in the same ADR. Decide before Batch A.
2. **Matrix state and exactness.** Options: (a) matrix entries snapped to a grid of \(1/4\), range \([-4,4]\), so \(\det\), trace and the eigenvalue discriminant are exact in doubles (see Correctness Notes) and orientation, singularity and "real eigenvalues" are exact discrete outcomes; (b) continuous entries with stated tolerances everywhere; (c) rational arithmetic. Recommended: (a) for matrix entries (handles are the images of \(e_1,e_2\), so the columns are snapped), consistent with the shared predicate policy in [new-lesson-families.md](new-lesson-families.md#shared-constraints). Decide before Batch A.
3. **Eigen-direction predicate for the dragged test vector** (Batch B): (a) \(v\) on the \(1/4\) grid with the exact test \(\det(v,Av)=0\), which succeeds only for rational eigen-directions; (b) continuous \(v\) with a stated sine tolerance plus a "snap \(v\) to the eigen-direction" action; (c) both. This spec works with (c); decide with the measurement of drag feel.
4. **Grid drawing approach** (after measurement, any batch): see Testing Decisions. Linear maps send lines to lines, so the image grid needs two endpoints per line and no curve sampling; whether to use JSXGraph line elements, one polyline-array curve or an overlay is decided only after measurement.

## Shared 2×2 kernel (owned by this spec)

Free of React, JSXGraph, localization and graph-global state. A phase-portrait family (research candidate E5, not yet specified) is expected to reuse the trace/determinant/discriminant classification of `eigen2.ts`; the homogeneous-coordinate kernel is owned by [projective-conics-lessons.md](projective-conics-lessons.md), which treats a linear map as the upper-left \(2\times2\) block of a \(3\times3\) matrix. Neither is a dependency of this spec. The contract below is the part to keep stable.

1. **Matrix model.** `type Mat2 = readonly [readonly [number, number], readonly [number, number]]`; columns are the images of \(e_1=(1,0)\) and \(e_2=(0,1)\): \(A(x,y)=x\,a_1+y\,a_2\). Functions: `apply`, `multiply` (composition \(BA\): first \(A\), then \(B\)), `det`, `trace`, `inverse` (returns `undefined` when \(\det=0\), never divides), `transpose`, `symmetricPart` \((A+A^T)/2\). Entries are validated finite and, for graph state, snapped (ADR 2).
2. **Orientation and area.** `orientationSign(A)` is the sign of \(\det A\) (exact on snapped entries). `unitSquareImage(A)` returns the four vertices; the area equals \(|\det A|\) and is computed by the shoelace formula in tests as an independent check.
3. **Eigen classification.** With \(\tau=\operatorname{tr}A\), \(\delta=\det A\), the discriminant \(\Delta=\tau^2-4\delta\). `classifyEigen(A)` returns one of: `distinct-real` (\(\Delta>0\)), `repeated` (\(\Delta=0\)) with sub-case `scalar` (\(A=\lambda I\), every direction) or `defective` (one direction, e.g. a shear), `complex` (\(\Delta<0\), no real eigen-direction; eigenvalues \(\tfrac{\tau}{2}\pm\tfrac{\mathrm i}{2}\sqrt{-\Delta}\)). Sign of \(\Delta\) is exact on snapped entries. Eigenvectors are computed in floating point and are labelled computed.
4. **Singular values and axes.** `singular(A)` returns \(\sigma_1\ge\sigma_2\ge0\) as the square roots of the eigenvalues of \(A^TA\) (symmetric, so always real), with the right singular directions (orthogonal, in the domain) and the left singular directions \(Av_i/\sigma_i\) (orthogonal, in the image) when \(\sigma_i>0\). \(\sigma_1\sigma_2=|\det A|\). When \(\sigma_2=0\) the image is a segment or a point and no ellipse is drawn. When \(\sigma_1=\sigma_2\) the image of a circle is a circle and the axes are not unique.
5. **Grid image.** `gridImage(A, range, step)` returns line endpoints for the images of the integer grid lines \(x=k\) and \(y=k\) over the window (lines to lines). Window \([-6,6]^2\) with integer lines gives 13 vertical and 13 horizontal lines, 26 in all (arithmetic only). The image of a window point may lie far outside the view; endpoints are clipped to the view box or infinite lines are used (ADR 4).
6. **Discrete outcomes** (singular, orientation sign, eigen class, real eigenvalues) are decided on snapped entries with exact doubles and never by a tolerance; tolerances appear only in the dragged-vector parallelism test of L3 and are named there.

## Concept contracts and acceptance criteria

Examples are implementation defaults; equivalents may replace them if the learning goal, edge cases and independent checks are kept. All numbers below were checked by the author in Python (`python -I`, stdlib, exact `Fraction` arithmetic where marked "exact"; script kept outside the repository); items marked "by hand" were not run.

### L1. Matrix as the image of a basis

- Learning goal: a linear map of the plane is fixed by the images of \(e_1\) and \(e_2\); the matrix columns are those images; every point and every Bézier control point follows by linear combination, and lines stay lines.
- Prerequisites: vectors, linear combination and basis (PIK §4.8), the [Bézier evaluation lesson](../../src/learning/content/bezierChapter.ts) optional. Not a prerequisite of anything else except L2–L5.
- Default example: handles at \(a_1=(2,1)\) and \(a_2=(-1,1)\), \(A=\begin{pmatrix}2&-1\\1&1\end{pmatrix}\), \(A(1,1)=(1,2)\) (exact). Object: the fixture curve \(P=(1,0),(2,3),(4,2),(5,-1)\); the image control points are \((2,1),(1,5),(6,6),(11,4)\), and \(A\,B(\tfrac12)=(\tfrac{17}{4},\tfrac{19}{4})=B_A(\tfrac12)\) where \(B_A\) is the curve through the image control points (exact; the source \(B(\tfrac12)=(3,\tfrac74)\) matches the worked example of the affine lesson). The image of the midpoint of \(P_0P_3\) is the midpoint of the image points, \((\tfrac{13}{2},\tfrac52)\) (exact).
- Steps: (1) the unit grid, \(e_1,e_2\) and a point \(p=(1,1)\); predict where \(p\) goes if \(e_1\) moves to \((2,1)\); (2) drag \(a_1\) and see the vertical grid lines move; (3) drag \(a_2\); (4) show \(A(1,1)=a_1+a_2\) as the diagonal of a parallelogram; (5) the Bézier curve follows because its control points do; (6) the origin never moves, parallel grid lines stay parallel and equally spaced; (7) free exploration.
- Graph needs: two draggable basis handles with grid snap (\(1/4\)), numeric entries as an accessible alternative, Reset, the source and image grid, the unit square and its image, a point probe, the fixture curve and its image with control polygons, a readout of the matrix; keyboard and touch alternatives for the handles.
- Acceptance:
  1. The default numbers above match in unit tests (exact fractions for the matrix action; \(10^{-12}\) for the doubles pipeline).
  2. The image grid has lines through the images of the integer grid points; the image of any grid line direction is the corresponding column (unit test, 26 lines in the default window).
  3. `A B(1/2)` equals the evaluation of the image control points to \(10^{-12}\) for the fixture and the default matrix; the prose states this as the linearity of evaluation (a theorem, with the Bernstein sum as the argument) and the picture as an illustration.
  4. A matrix with \(\det A=0\) is accepted: the grid collapses onto a line or a point and is drawn as such with a text status; nothing divides by the determinant.
  5. Entries outside \([-4,4]\) or non-multiples of \(1/4\) are rejected or snapped at input with a message; the graph never holds a non-finite entry.
  6. Reset restores the identity map; a reopened Preset restores the handles; scene capture and restore on lesson exit pass the lifecycle tests.
  7. Slovenian and English complete; existing routes and stored Presets keep working; the new Demonstration adds a new Preset collection.

### L2. Determinant as signed area

- Learning goal: the image of the unit square has area \(|\det A|\); the sign tells whether orientation is kept; \(\det A=0\) means the plane is flattened onto a line or a point.
- Prerequisites: L1; the shoelace formula or area of a parallelogram helps.
- Default example (all exact): \(A=\begin{pmatrix}2&-1\\1&1\end{pmatrix}\): unit square vertices go to \((0,0),(2,1),(1,2),(-1,1)\), shoelace area \(3=\det A\), counter-clockwise. \(B=\begin{pmatrix}1&2\\2&1\end{pmatrix}\): \(\det=-3\), image area 3 with clockwise vertex order (signed shoelace \(-3\)). Singular \(C=\begin{pmatrix}1&2\\1/2&1\end{pmatrix}\): \(\det=0\), the square lands on the segment from \((0,0)\) to \((3,3/2)\); \(C(2,-1)=(0,0)\) (the kernel direction). Product rule \(\det(AE)=\det A\cdot\det E=30\) for \(E=\begin{pmatrix}4&1\\2&3\end{pmatrix}\) (checked).
- Steps: (1) the square and its image parallelogram; predict its area; (2) read the signed area and the shoelace sum; (3) drag \(a_2\) across the line through \(a_1\) and watch the orientation label (the vertex labels \(0,e_1,e_1{+}e_2,e_2\) reverse) flip exactly when the three points \(0,a_1,a_2\) become collinear; (4) the collapse: the image is a segment and some direction is sent to \(0\); (5) a second matrix \(E\) and the product rule on areas; (6) a grid cell grows by the same factor everywhere (linear, so uniform); (7) free exploration.
- Graph needs: the unit square and its image with ordered vertex labels, an area readout (signed and absolute), the determinant formula with the numbers, a status line (positive, negative, zero), and an optional second matrix for the product.
- Acceptance:
  1. Areas and signs above match; the area readout equals \(|\det A|\) and the shoelace area of the four image vertices in a unit test over the \(1/4\) grid.
  2. The orientation label changes exactly when \(\det A\) changes sign, which on the \(1/4\) grid with \(|entries|\le8\) is decided exactly (1e5 random matrices in the checked script: products and differences of quarter-grid entries equal the exact rational value in doubles). The status for \(\det A=0\) never says positive or negative.
  3. For \(\det A=0\) the graph draws the image segment (or point) and names the collapse; the inverse is not offered.
  4. The prose states "area scales by \(|\det A|\) for every region" as a theorem (e.g. area of the image of the unit square times additivity) and the unit square as a picture of one region.
  5. Handles one step from collinear (e.g. \(\det=\pm1/16\) on the \(1/4\) grid) show a thin but non-degenerate parallelogram, not a collapse.
  6. Both languages complete; Reset, Preset and restore pass.

### L3. Eigenvectors and eigen-directions

- Learning goal: a nonzero vector \(v\) with \(Av=\lambda v\) keeps its direction; for a \(2\times2\) matrix the real eigen-directions come from the characteristic polynomial \(\lambda^2-\tau\lambda+\delta\); a rotation has none; a shear has one; the eigenvectors of a non-symmetric matrix need not be perpendicular.
- Prerequisites: L1, L2 (determinant and trace); linear independence (PIK §4.8, VR) helps.
- Default example: \(E=\begin{pmatrix}4&1\\2&3\end{pmatrix}\): \(\tau=7\), \(\delta=10\), \(\Delta=9\), eigenvalues \(5,2\), eigenvectors \((1,1)\) with \(E(1,1)=(5,5)\), and \((1,-2)\) with \(E(1,-2)=(2,-4)\); the angle between them is \(108.43^\circ\) (acute \(71.57^\circ\)), so they are not perpendicular (all checked). Contrasts: the quarter-turn \(R=\begin{pmatrix}0&-1\\1&0\end{pmatrix}\): \(\Delta=-4<0\), eigenvalues \(\pm\mathrm i\), no real eigen-direction; the shear \(S=\begin{pmatrix}1&1\\0&1\end{pmatrix}\): \(\Delta=0\), one eigenvalue \(1\), one direction \((1,0)\) with \(S(1,0)=(1,0)\) (checked); \(C=\begin{pmatrix}1&2\\1/2&1\end{pmatrix}\) has eigenvalues \(0\) and \(2\), kernel \((2,-1)\), and \(C(2,1)=(4,2)\) (by hand).
- Steps: (1) a unit test vector \(v\) on the circle and \(Av\); predict when they are parallel; (2) rotate \(v\) and watch the angle between \(v\) and \(Av\); (3) the two parallel positions and the eigenvalues as stretch factors; (4) reveal the characteristic polynomial and the discriminant; (5) switch to the quarter-turn: nothing is parallel, the status says "no real eigen-direction, eigenvalues \(\pm\mathrm i\)"; (6) the shear (one direction) and the scalar matrix (every direction); (7) free exploration.
- Graph needs: a test vector on the unit circle (angle slider or drag), \(Av\) drawn from the origin, a "parallel" indicator, the angle between \(v\) and \(Av\), eigen-direction lines drawn when real, a discriminant and eigenvalue readout including complex values as text, an example chooser (the matrices above) alongside free handles.
- Acceptance:
  1. Eigenvalues, eigenvectors and the \(108.43^\circ\) angle match (unit tests, \(10^{-12}\) on doubles; \(E(1,1)\) and \(E(1,-2)\) exact).
  2. **Parallel tolerance.** The dragged test vector is continuous, so "parallel" is a stated tolerance: \(|\sin\angle(v,Av)|<0.01\), a window of about \(\pm0.95^\circ\) around each eigen-direction for \(E\) (checked: \(\sin=0.0105\) at \(44^\circ\), \(0.0010\) at \(44.9^\circ\)). The indicator says "approximately parallel" and shows the sine; an action "snap \(v\) to the eigen-direction" places \(v\) at the computed direction. The tolerance and its constant are named in the code and the prose; it is never presented as exact. Exact parallelism is claimed only where \(v\) and the eigenvector are on the \(1/4\) grid and \(\det(v,Av)=0\) holds in exact arithmetic (e.g. \(v=(1,1)\) for \(E\): \(1\cdot5-1\cdot5=0\)).
  3. **Complex eigenvalues.** When \(\Delta<0\) (exact on snapped entries) the graph draws no eigen-direction lines, shows the text status above, and gives eigenvalues \(\tfrac\tau2\pm\tfrac{\mathrm i}2\sqrt{-\Delta}\); the readout never shows an empty graph state without an explanation. For a rotation by angle \(\theta\) the prose may state \(\lambda=\cos\theta\pm\mathrm i\sin\theta\) as a theorem, and rotation by \(\pi\) (\(-I\)) as the scalar case where every direction is an eigen-direction with \(\lambda=-1\).
  4. \(\Delta=0\) distinguishes scalar from defective: \(S\) shows one direction, \(2I\) shows all directions; no divide by zero when computing the eigenvector of a repeated eigenvalue.
  5. \(\det A=0\) is shown as eigenvalue \(0\) with the kernel as an eigen-direction; a zero matrix is the scalar case with \(\lambda=0\).
  6. The prose states the eigenvector facts as theorems about linear maps and the picture as an illustration of one \(A\); it does not claim eigenvectors are perpendicular (they are for symmetric matrices only, see L4).
  7. Reset, Preset, restore and both languages pass.

### L4. Symmetric matrices, ellipses and singular directions

- Learning goal: the image of the unit circle under \(A\) is an ellipse (or a segment or point when \(\det A=0\)); its semi-axes are the singular values and its axes the singular directions (computed from \(A^TA\)), which coincide with eigenvectors only for symmetric \(A\); for symmetric \(A\) the eigenvectors are perpendicular, and the quadratic form \(x^TAx=1\) is a conic whose axes are those eigen-directions.
- Prerequisites: L3. The conic classification in the FMF page (*krivulje drugega reda*) is the next step, not a prerequisite; the matura catalogue's conics §4.11 are not required.
- Default example: symmetric \(S_y=\begin{pmatrix}2&1\\1&2\end{pmatrix}\): eigenvalues \(3,1\) with eigenvectors \((1,1)\) and \((1,-1)\); image of the unit circle has maximum norm \(3\) and minimum norm \(1\) (numeric scan, \(2\cdot10^5\) points, \(3.0000000000000004\) and \(1.0\)) along those directions; the form \(2x^2+2xy+2y^2=1\) has semi-axes \(1/\sqrt3\approx0.57735\) (along \((1,1)\), the larger eigenvalue) and \(1\) (along \((1,-1)\)) (the point \((s,s)/\sqrt2\) with \(s=1/\sqrt3\) satisfies the form to \(10^{-15}\)). Non-symmetric contrast \(N=\begin{pmatrix}2&1\\0&1\end{pmatrix}\): eigenvalues \(2,1\), eigenvectors \((1,0)\) and \((1,-1)\) (\(45^\circ\) apart, not perpendicular); singular values \(\sqrt{3\pm\sqrt5}=2.2882,\ 0.8740\) (product \(2=\det N\), checked; the numeric scan of the image of the circle gives \(2.28825\) and \(0.87403\)); the major image axis points at \(13.28^\circ\) and the corresponding domain direction at \(31.72^\circ\), neither of which is an eigen-direction.
- Steps: (1) the unit circle and its image for \(S_y\); predict the long axis; (2) the axes along \((1,1)\) and \((1,-1)\) with lengths \(3\) and \(1\) equal the eigenvalues; (3) the quadratic form as a conic, with the short axis along the large eigenvalue; (4) switch to \(N\): the image is still an ellipse but the eigenvectors are not its axes; (5) the singular directions and \(\sigma_1\sigma_2=|\det A|\); (6) a rotation: the ellipse is a circle (all singular values equal); (7) free exploration.
- Graph needs: the unit circle, the image ellipse sampled or drawn from the singular decomposition, axes with labels, eigen-directions as dashed lines for real eigenvalues, a toggle between "image of the circle" and "conic \(x^TAx=1\)" for the symmetric part, readouts of \(\sigma_1,\sigma_2,\det\), a symmetric/non-symmetric status, and a view that keeps the ellipse in frame.
- Acceptance:
  1. Singular values, axes and the scan agree to \(10^{-9}\) for the examples; \(\sigma_1\sigma_2=|\det A|\) to \(10^{-12}\) (unit test).
  2. For symmetric \(A\) the eigenvectors are perpendicular (dot product \(0\) to \(10^{-12}\)) and equal the singular directions up to sign and, for negative eigenvalues, a swap; for \(N\) they are not.
  3. For non-symmetric \(A\) the graph uses the SVD axes, not the eigenvectors, and says so in a status; the conic toggle is offered only for the symmetric part \((A+A^T)/2\) (for \(N\): \(\begin{pmatrix}2&1/2\\1/2&1\end{pmatrix}\), by hand), because \(x^TAx=x^T\tfrac{A+A^T}2x\) for any \(A\); an indefinite or singular symmetric part (a hyperbola, parabola or line pair) is described in words and drawn only if sampling is added, otherwise the status says the conic is not drawn.
  4. \(\sigma_2=0\) draws a segment or point with a status, never an ellipse with a zero axis; \(\sigma_1=\sigma_2\) draws a circle with "axes not unique".
  5. The prose states "the image of the unit circle is an ellipse" and the SVD facts as theorems with sources (the FMF algebra course; textbook cited, not opened), and the drawn ellipse as an illustration.
  6. Reset, Preset, restore, drag interactivity (measured, ADR 4) and both languages pass.

### L5. Composition and affine maps

- Learning goal: applying \(A\) then \(B\) is the product \(BA\), and the order matters; reflections and rotations compose to give other reflections and rotations; adding a translation gives an affine map, which keeps lines, ratios along lines and, through the Bernstein sum, Bézier curves.
- Prerequisites: L1, L2; the existing affine lesson is the next step.
- Default example (exact): \(R=\begin{pmatrix}0&-1\\1&0\end{pmatrix}\) (quarter-turn), \(F=\begin{pmatrix}1&0\\0&-1\end{pmatrix}\) (reflection in the \(x\)-axis): \(RF=\begin{pmatrix}0&1\\1&0\end{pmatrix}\) (reflection in \(y=x\)) and \(FR=\begin{pmatrix}0&-1\\-1&0\end{pmatrix}\) (reflection in \(y=-x\)); \(\det=-1\) for both, \(RR=-I\). Affine step: the quarter-turn about \(c=(3,1)\), \(T(P)=c+R(P-c)\), sends the fixture control points to \((4,-1),(1,0),(2,2),(5,3)\) and \(T(B(\tfrac12))=(\tfrac94,1)=B_T(\tfrac12)\), as in the worked example of the existing affine lesson (checked; for the fixture \(c\) is also the mean of the control points).
- Steps: (1) set \(R\) then \(F\) and read the product; predict whether the order matters; (2) reveal \(RF\ne FR\); (3) the picture of \(RF\) as a mirror line; (4) add a translation \(b\): \(T(P)=AP+b\) and a rotation about a point as \(T(P)=c+A(P-c)\); (5) the Bézier curve follows, and midpoints of control points map to midpoints of images; (6) link to the affine Demonstration; (7) free exploration with two chained matrices.
- Graph needs: two matrices \(A\), \(B\) (each as handles or a chosen element: rotation by a quarter-turn or snapped angle, reflection, scale, shear), a combined image, the product matrix readout, an optional translation vector, and the Bézier fixture; the rotation angle is limited to a snapped set (multiples of \(15^\circ\) are an editorial proposal) because a rotation matrix is not on the \(1/4\) grid except special angles.
- Acceptance:
  1. \(RF\), \(FR\), \(RR\) and their determinants match exactly (integer matrices); the product matrix readout equals the composition of the two applied images to \(10^{-12}\) on random points.
  2. The affine step matches the worked-example numbers above, and the result is compared with the existing affine graph's quarter-turn only for the fixture whose mean is the pivot; the prose does not claim the existing `rotate` button turns about the origin.
  3. The lesson states that the existing affine buttons use the mean of the control points (rotation, reflection) and the bounding-box centre (scale) as pivots, so a reader who repeats the lesson with buttons gets a pivot matching this lesson only when stated.
  4. Rotation matrices at non-special angles are not claimed exact; their determinant is \(1\) to \(10^{-15}\) and any orientation decision uses the snapped angle set, not a computed float.
  5. The Bézier invariance is stated as a theorem (affine maps pass through the Bernstein sum) and tied to the existing lesson; the drag is an illustration.
  6. Existing `affine` route, lesson and stored Presets are unchanged (smoke check).
  7. Both languages, Reset, Preset and restore pass.

## User Stories

1. As a student, I drag the arrow ends for \(e_1\) and \(e_2\) and watch the whole grid follow.
2. As a student, I see the area of the image square and its sign, and why it becomes a line when the determinant is zero.
3. As a student, I find the directions a matrix leaves fixed and see a rotation has none.
4. As an educator, I show the image of a circle as an ellipse and explain why a general matrix's eigenvectors are not its axes.
5. As an educator, I compose two maps in both orders on a projected graph.
6. As a reader on a phone or keyboard, I enter matrix entries numerically and step through the lesson with large controls and text statuses.

## Terms (proposals, to be settled by localization.md#choosing-new-terms)

Search of `src/localization/sl.ts` found no existing matrix or eigenvalue terms. The FMF Algebra 1 page (read) supplies *linearne preslikave*, *determinante*, *lastne vrednosti*, *diagonalizacija*, *kvadratni funkcionali*, *krivulje drugega reda*, *sebi adjungirani endomorfizmi*; the PIK (read) supplies *zrcaljenje*, *vrtež*, *orientacija trikotnika*, *razvoj po bazi*, *linearna neodvisnost*. The rest is a proposal.

| English | Slovenian proposal | Basis |
| --- | --- | --- |
| linear map | linearna preslikava | FMF "linearne preslikave" |
| matrix | matrika | FMF; standard |
| image of the basis | slika baze | PIK "baza"; proposal |
| determinant; signed area | determinanta; predznačena ploščina | FMF "determinante"; area term is a proposal |
| orientation (kept / reversed) | orientacija (ohranjena / obrnjena) | PIK "orientacija trikotnika" |
| eigenvalue; eigenvector; eigen-direction | lastna vrednost; lastni vektor; lastna smer | FMF "lastne vrednosti"; the others are proposals |
| characteristic polynomial | karakteristični polinom | FMF |
| trace | sled | proposal; check FMF usage |
| symmetric matrix | simetrična matrika | standard; FMF "sebi adjungirani" for the general case |
| singular values; singular value decomposition | singularne vrednosti; singularni razcep | proposal, to research |
| quadratic form | kvadratna forma | FMF "kvadratni funkcionali"; proposal, to settle |
| conic (second-order curve) | stožnica (krivulja drugega reda) | FMF; PIK §4.11 |
| composition | kompozitum (zloženka) | proposal, to research |
| reflection; rotation | zrcaljenje; vrtež | PIK; the app's existing buttons say "Rotiraj" and may differ |
| affine map | afina preslikava | FMF *Afina in projektivna geometrija*; existing lesson |
| kernel; rank | jedro; rang | FMF |

Final wording and its sources are recorded in the implementing change.

## Implementation Decisions

- The kernel lives in a new pure module family (`src/linear/`, ADR 1); graphs adapt it. No graph-global cache state.
- Graph state: matrix entries (snapped), mode, test-vector angle, chosen example; derived values (image, eigen data, singular data) are recomputed from validated state, never trusted from a Preset.
- Lesson scenes use typed actions (`set-matrix`, `set-test-vector`, `set-mode`) registered through the lesson-action registry as in `AffineTransformsBezierCurveGraph.tsx:36`; multi-action scenes run synchronously in one tick and are unit tested that way. No playback is needed, so `LESSON_ANIMATION_IDS` stays unchanged.
- Closed example list of matrices (identity, default \(A\), \(B\), \(C\), \(E\), \(R\), \(S\), \(S_y\), \(N\), \(F\)); no formula parser.
- The fixture Bézier curve is used read-only; the image control points are derived. The graph does not call `rotate`, `scale` or `flip` of the curve API (pivot and in-place caveats above).
- Routes and Presets are additive: a new Demonstration, route and Preset collection; existing routes (including `/bezier/affine`) and stored Presets keep working. No breaking change, so no migration is recorded.
- Chapter content and activities follow the chapter-owned model; the Demonstration is registered through the catalogue and family chapters as for the other new families. Lesson prose follows the notation rules (wrap symbols in `\(...\)`, `{,}` for decimal commas in Slovenian, undelimited `latex` fields); `t()` calls are type checked per key and `sl.ts` and `en.ts` stay in lockstep.
- Hosting and app-shell concerns stay separate from the mathematics.

## Testing Decisions

- Kernel tests: matrix action and composition (exact fractions); determinant, trace, discriminant and eigen class on the examples, including repeated, scalar, complex and singular cases; singular values (\(\sigma_1\sigma_2=|\det|\)) and axes, with a numeric scan of the circle image as an independent oracle; grid line counts and endpoints; inverse refusing \(\det=0\); the snapped-entry exactness property (property test over random quarter-grid matrices, comparing doubles with `Fraction`-equivalent integer arithmetic scaled by 16).
- Unsnapped counter-example kept as a test: \(\det\begin{pmatrix}0.1&0.3\\0.3&0.9\end{pmatrix}\) is mathematically \(0\) but \(0.1\cdot0.9-0.3\cdot0.3=-1.39\cdot10^{-17}\) in doubles (checked), which is why unsnapped input never decides singularity.
- Scene tests: apply multi-action scenes in one synchronous tick; reject unsupported or out-of-range entries; mode switch keeps the matrix.
- Preset tests: save/reopen, export/import, malformed or out-of-range entries, an old preset format absent (new collection only).
- Lesson/content tests: step counts, both languages in lockstep, `lessonMathNotation.test.ts` unchanged and passing, `tsc --noEmit` after localization changes.
- Browser: a smoke row per lesson (default scene, handle drag, numeric entry, singular and complex cases, restore, catalog link, refresh, narrow viewport, keyboard, touch alternatives); the existing `/bezier/affine` route is smoke checked once in Batch C.
- Performance (ADR 4): a drag moves two handles and updates 26 image grid lines, the unit square, up to one ellipse (about 100 sampled points or a few arcs) and the Bézier fixture. Before choosing a drawing approach, measure on the target classroom device with [the performance plan](../performance-plan.md): per-line JSXGraph elements against one polyline curve, with and without the ellipse; record frame times and the threshold used. Do not replace JSXGraph on this evidence alone.

### Batch-wide acceptance gate

1. Each Demonstration opens directly and after refresh, with its chapter-owned guided activity and a static preview.
2. The concept contracts above are met with checked examples and honest guarantees (exact on snapped entries, named tolerance only for the dragged test vector, no tolerance shown as exact).
3. Both languages, accessible numeric inputs for every handle, projection readability, restore on exit, Presets and figure export pass.
4. Existing routes, Presets and the existing affine lesson behave as before.
5. TypeScript, unit and content tests, production build, smoke checks and mathematics review pass; commit and push follow the repository workflow.

## Correctness Notes

- Exactness: with entries on the \(1/4\) grid and \(|entry|\le8\), every product is a multiple of \(1/16\) below \(64\) and every sum and difference stays within \(2^{53}\) granularity, so \(\det\), \(\operatorname{tr}\), \(\operatorname{tr}^2-4\det\) are exact in doubles; a property test over \(10^5\) random matrices agreed with exact rational arithmetic (checked). The policy range is \([-4,4]\), well inside. Eigenvalues, eigenvectors and singular data involve square roots and are computed values, displayed rounded, not exact.
- \(\det A=0\): the image is a line or a point. The map is drawn, the inverse is refused, and the eigen readout names eigenvalue \(0\); no formula divides by \(\det\).
- Complex eigenvalues have no real eigen-direction; the lesson says so and names the eigenvalues instead of drawing nothing. The rotation by \(\theta\) has eigenvalues \(\cos\theta\pm\mathrm i\sin\theta\), real only for \(\theta\in\{0,\pi\}\) (scalar \(\pm I\)).
- Eigenvectors versus SVD: the eigenvectors of a general \(A\) are not orthogonal and are not the axes of the image of the circle; the axes come from the singular value decomposition. For symmetric \(A\) the two coincide (spectral theorem; source: FMF Algebra 1 syllabus, textbook cited, not opened).
- Tolerance for "parallel": a dragged vector cannot be exactly parallel to an irrational direction, so L3 uses \(|\sin\angle(v,Av)|<0.01\) and says "approximately"; discrete outcomes (singular, orientation, eigen class) never use a tolerance.
- The conic \(x^TAx=1\) uses only the symmetric part of \(A\); the drawn ellipse needs a positive definite symmetric part, otherwise the status says what the conic is (hyperbola, parabola or line pair) or that it is not drawn.
- Existing affine buttons use different pivots (see Reuse), which is a presentation hazard in L5, not a bug in this family.
- Pictures illustrate instances; every "always" statement is a theorem with a source.

## Out of Scope

- Backend, accounts, assessment, grading, progress tracking, adaptive paths.
- Three-dimensional linear maps, matrices larger than \(2\times2\), diagonalization and Jordan form beyond the repeated-eigenvalue cases shown, matrix exponentials.
- Phase portraits and stability classification (a future family; the eigen classification kernel may be reused), complex Möbius maps ([complex-maps-lessons.md](complex-maps-lessons.md)), homogeneous coordinates and projective maps ([projective-conics-lessons.md](projective-conics-lessons.md)), covariance ellipses ([probability-statistics-lessons.md](probability-statistics-lessons.md) may reuse the L4 ellipse, not required).
- Conic classification and the full \(x^TAx=1\) hyperbola/parabola drawing beyond a status message.
- Linear algebra proofs (the spectral theorem, existence of the SVD).
- Free-text matrix input, symbolic eigenvalue computation, a formula parser.
- Changing the existing affine graph, its pivot behaviour or its Presets.
- Renderer replacement or build-tool changes.

## Further Notes

Not verified: the VR marker of §4.8 *linearna neodvisnost* beyond the research note's text-extraction rule; current FMF 2026 syllabi and textbook section numbers (cited, not opened); the Slovenian terms; whether the \(1/4\) snap resolution is pleasant for dragging; whether a \(15^\circ\) rotation set is the right editorial choice; the performance of the grid image on the target device. Not run: the by-hand items marked above. The sibling specs named here were being written in parallel and were not read.
