# Advanced Bézier topics

**Status:** scheduled 2026-10-31 by the [Curves feature stream](../tasks/feature-streams/curves.md); tasks in [docs/tasks/advanced-bezier](../tasks/advanced-bezier/README.md).
**Agreed:** 2026-10-31 (owner approved the family; details below are proposals for owner review).
**Source:** [lesson-family candidates, expansion, §E8](../research/lesson-family-candidates-2026-10-31-expansion.md) (anchor: FMF *Računalniško podprto geometrijsko oblikovanje* 2025, course page d1718, which lists "odvod, razcvet, subdivizija, ekstrapolacija, višanje/nižanje stopnje" and "uvod v konstrukcijo gibanj togih teles"; page read, books cited but not opened). The research note says this family collects leftovers: Bézier clipping (excluded by [convexity A6](convexity-hulls-lessons.md), see its Out of Scope), arc-length reparametrization and Coons patches. Part of the [new lesson families](new-lesson-families.md) index.

## Problem Statement

Bezeg teaches the Bézier basics, de Casteljau, subdivision and degree elevation (`/bezier/elevation`), PH curves with their exact arc length, and tensor-product patches. It does not answer four questions an advanced CAGD student meets next: elevation is exact, so can the degree be lowered again and what does "best" mean when it cannot; how does one find where two Bézier curves meet to a stated precision using only subdivision and hulls (the step [convexity A6](convexity-hulls-lessons.md) deliberately stops short of); what does it take to travel along a curve at constant speed, and why is that easy to measure but never a polynomial; and how are four boundary curves filled with a surface (a Coons patch). The FMF course lists degree reduction and blossoming; the other lessons are the natural continuations of material already in the app.

## Solution

Add a Learn chapter **Napredne Bézierjeve teme / Advanced Bézier topics** (audience University) with four chapter-owned guided activities, each backed by a catalog Demonstration that remains available for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). Prose states hypotheses and the norm or tolerance each result depends on; pictures show instances and are labelled illustrations. Each lesson has 5-7 steps, predicts before it reveals and ends in free exploration. No exercises, grading or progress. New routes and Presets only; existing routes and stored Presets keep working.

### Release batches

| Batch | Lessons | Release condition |
| --- | --- | --- |
| A | D1 Degree reduction; D3 Arc-length parametrization | Reduction kernel and arc-length table pass the batch gate; `/bezier/elevation`, `/ph/*` routes and Presets unchanged |
| B | D2 Bézier clipping | Batch A released **and** the [convexity](convexity-hulls-lessons.md) core delivered (hull predicate, separating-axis test, pair-of-curves graph from A6) |
| C | D4 Coons patch | Batch A released; surface-view ADR below recorded |

### Overlap with other specs (stated, none blocking)

- [bezier-study-chapter.md](bezier-study-chapter.md): defers "subdivision, extrapolation, degree elevation, derivatives" to later chapters (line 102) and says equal parameter increments need not cover equal distances (line 32). D3 develops that statement; D1 is the inverse of the elevation motivation (§2.7). No reduction, clipping, arc-length or Coons content there.
- [bezier-patches.md](bezier-patches.md): lists "B-spline/NURBS and Coons surfaces" as out of scope (line 13). D4 is therefore new content and reuses its machinery without changing it.
- [curve-geometry-lessons.md](curve-geometry-lessons.md): no arc-length reparametrization (its only arc-length mentions are curvature per unit arc length). It owns the planned hodograph helper, which D3 reuses for the speed of non-PH curves. It excludes torsion and the \(T,N,B\) frame because no 3D curve view exists (verified: line 26 and Out of Scope line 139; `BaseSurfaceGraph.tsx` is the only 3D view), so rotation-minimizing frames stay out of this family.
- [b-splines-nurbs-lessons.md](b-splines-nurbs-lessons.md): L6 (optional, degrees 2-3) teaches blossoming, the FMF "razcvet". This family does not teach blossoming; if L6 ships, D1 may link to it as an alternative view of elevation (blossom of the elevated curve), without depending on it.
- [ph-arc-length-and-elevation-overlay.md](ph-arc-length-and-elevation-overlay.md): shows the PH arc-length readout and explicitly excluded "arc-length parametrisation drawing" (line 29); D3 supplies that drawing.
- [convexity-hulls-lessons.md](convexity-hulls-lessons.md) A6 stops at a fixed subdivision depth; D2 lifts that to a stated precision and keeps A6's caveat that hull overlap proves nothing.
- Sibling specs [linear-maps-lessons.md](linear-maps-lessons.md), [complex-maps-lessons.md](complex-maps-lessons.md), [triangle-geometry-lessons.md](triangle-geometry-lessons.md), [probability-statistics-lessons.md](probability-statistics-lessons.md), [fourier-series-lessons.md](fourier-series-lessons.md) and [projective-conics-lessons.md](projective-conics-lessons.md) share no kernel with this family; none is a prerequisite.

### Reuse and new modules

Verified to exist in this worktree:

- `elevate(rows)` and `subdivide(t, rows)` in `src/bezeg/impl/kernels/bezier-kernels.ts` (lines 69 and 55), and `BezierCurve.elevate()` / `subdivide(t)` in `src/bezeg/api/curve/bezier-curve.ts`. `ElevationGraph.tsx` (`/bezier/elevation`, Demonstration `elevation`) is the model for D1.
- `PhBezierCurve` in `src/bezeg/impl/curve/ph-bezier-curve.ts`: `s(t)` (exact polynomial arc length), `sigma(t)` (speed), `arcLength()` and `tk(prev, ds, k)` (Newton steps to the parameter where \(s(t)=k\,ds\), with a cusp guard). `tk` is used only in tests today (`ph-bezier-curve.test.ts:167`, `ph-golden.test.ts:29`), so D3 is its first user interface. `ph-math.ts` has `phControlPoints`, `phSigmas`.
- `SubdivisionGraph.tsx` (`MAX_SUBDIVISION_STEPS = 5`) for D2's subdivision look; the hull, separating-axis test and pair-of-curves graph come from the convexity spec (not yet built).
- Surface view: `SurfaceScene`, `SceneMesh`, `SceneMeshOwner` in `src/graphs/patches/surface-view/surfaceScene.ts`, `BaseSurfaceGraph.tsx` and `TensorProductBezierPatch` (constructor takes a net of points, `tensor-product-bezier-patch.ts:54`). `SceneMeshOwner.kind` is `'tensor' | 'triangular' | 'join' | 'teapot'`, so a Coons mesh needs either the existing `'tensor'` kind or a new one.
- Not reusable: `src/analysis/arcLength.ts` and `ArcLengthGraph.tsx` measure the graph of a function (`arcValue = sine.value`), only a visual precedent. No general polynomial-Bézier hodograph exists yet (curve-geometry spec line 24).

New modules (suggested names; pure mathematics free of React, JSXGraph and localization): `src/bezeg/impl/kernels/degree-reduction.ts`, `src/bezeg/impl/kernels/bezier-clipping.ts` (fat line, hull-band clip, recursion with statuses), `src/bezeg/impl/kernels/arc-length.ts` (Gauss-Legendre length, table, inverse), `src/bezeg/impl/kernels/coons.ts` (bicubic net from four cubic boundaries, general blend evaluator for tests), graphs `DegreeReductionGraph`, `BezierClippingGraph`, `ArcLengthParametrizationGraph`, `CoonsPatchGraph`, and the chapter in `src/learning/content/familyChapters.ts`. The Demonstrations need a family; propose `bezier` for D1-D3 and `patches` for D4, so no new family is required.

### Decisions needing an ADR

1. **Reduction objective** (D1). (a) Offer endpoint-fixed least squares only; (b) offer endpoint-fixed and free-endpoint \(L^2\) with a switch; (c) add a max-norm solver. This spec proposes (b): the two differ visibly (D1 numbers) and teach non-uniqueness; (c) needs an iterative solver and adds nothing for \(3\to2\) on the examples (it coincided with endpoint-fixed least squares there).
2. **Clipping scope and ownership** (D2). Reuse the A6 pair-of-curves graph and hull predicate, or give clipping its own graph. Proposal: reuse, so A6 and D2 share one model; D2 cannot start before that graph exists. Also fix the clip-count cap and the discard margin (see D2).
3. **Coons representation and mesh owner** (D4). (a) Boundaries restricted to cubic Béziers, so the patch is exactly a bicubic net fed to `TensorProductBezierPatch` and the existing tensor mesh path (checked: the Coons patch equals that net to \(1.3\cdot10^{-15}\)); (b) general blended evaluation with a new mesh owner kind. Proposal (a); (b) only if non-Bézier boundaries are wanted. Builds on [ADR 0019](../adr/0019-jsxgraph-surface-view.md).
4. **Arc-length drawing** (D3): where equal-arc points are computed, in the curve class (as `tk` already is for PH) or in the new kernel for every curve. Proposal: kernel, with the PH exact `s(t)` used as an independent check, not as the implementation.

## Concept contracts and acceptance criteria

Examples are implementation defaults; equivalents may replace them if the learning goal, edge cases and independent checks are kept. Numbers marked "checked" were computed on 2026-10-31 in Python (`python -I`, stdlib, scripts `check1.py`-`check5.py`, with exact `Fraction` arithmetic for the reduction); the implementation keeps its own unit tests. The reduction error norm is \(\|e\|_2=\bigl(\int_0^1|B(t)-Q(t)|^2dt\bigr)^{1/2}\) and the maximum error is \(\max_t|B(t)-Q(t)|\).

### D1. Degree reduction (Nižanje stopnje)

- Learning goal: elevation is exact (the same curve with one more control point), but reduction is generally impossible; a cubic is a quadratic exactly when its third forward difference \(b_3-3b_2+3b_1-b_0\) vanishes. Otherwise a quadratic can only approximate it, and "the best" quadratic depends on the norm and on which constraints (fixed endpoints) are imposed, so the answer is not unique.
- Prerequisites: the Bézier chapter, `/bezier/elevation`.
- Default example (checked): cubic \(P=(0,0),(1,3),(3,3),(4,0)\), third difference \((-2,0)\), so not reducible. (i) Endpoints fixed, \(L^2\) optimal: \(q_1=(2,4.5)\), maximum error \(0.096225=\sqrt3/18\), \(\|e\|_2=0.069007\). It coincides with Forrest's formula \(q_1=\tfrac14(3(b_1+b_2)-b_0-b_3)\) (cited via the syllabus' Farin, not opened) and, numerically, with the endpoint-fixed max-norm optimum on this example. (ii) Free endpoints, \(L^2\) optimal: \(Q=(-0.1,0),(2,4.5),(4.1,0)\), maximum error \(0.1\), \(\|e\|_2=0.037796\); the endpoints move, which is smaller in \(L^2\) and larger in maximum error. Second example for exploration: \(P_2=(0,0),(1,4),(3,1),(4,3)\): (i) \(q_1=(2,3)\), max \(0.585314\), \(\|e\|_2=0.419750\); (ii) \(Q=(-0.1,0.6),(2,3),(4.1,2.4)\), max \(0.608276\), \(\|e\|_2=0.229907\). Control-point bound: the largest distance between corresponding control points of \(P\) and the elevated \(Q\) bounds the curve error (convex combination); here \(1/3\) and \(0.3\) for \(P\), \(2.0276\) and \(1.8248\) for \(P_2\), always at least the true maximum.
- Round trip (checked): quadratic \((0,0),(2,4),(4,0)\) elevates to \((0,0),(\tfrac43,\tfrac83),(\tfrac83,\tfrac83),(4,0)\), and all three reductions recover \((0,0),(2,4),(4,0)\) exactly.
- Steps: (1) elevate a quadratic and see the same curve; (2) predict whether the cubic can go back; (3) drag a control point off the reducible position and read the third difference; (4) reduce with endpoints fixed and overlay the elevated result; (5) switch to free endpoints and compare the error readouts; (6) read the control-point bound against the true error; (7) free exploration.
- Graph needs: curve with the reduced curve and its elevation overlaid (the elevation overlay of `ElevationGraph` as the pattern), mode switch, readouts for third difference, maximum error, \(L^2\) error, control-point bound; Presets store control points and mode.
- Acceptance:
  1. Reducing the elevated quadratic returns it to \(10^{-12}\) in both modes, and the third difference is zero within that tolerance, the only case reported as "exactly reducible".
  2. The listed solutions and errors match to 6 decimals for the two examples (errors by dense sampling and by the Gram-matrix formula).
  3. In each mode no other quadratic in a small search neighbourhood has smaller error in that mode's norm (unit test by perturbation).
  4. The control-point bound is at least the sampled maximum error on random cubics.
  5. The prose names the norm and the constraints behind "best" and says other choices (for example a max-norm optimum or tangent preservation) give other quadratics.
  6. Exact versus tolerance: "reducible" uses a stated tolerance (suggested \(10^{-9}\) relative to the control-point scale) and the readout says so; the optimum is never described as exact.
  7. Both languages.

### D2. Intersecting curves by Bézier clipping (Presečišča z Bézierovim rezanjem)

- Learning goal: two curves can be intersected by repeatedly discarding the parameter ranges that cannot meet: clip one curve against a fat line around the other, then swap, subdividing when clipping stalls. Convergence is fast at a crossing, slow at a tangency, and a pair of overlapping hulls is not an intersection.
- Prerequisites: [convexity A6](convexity-hulls-lessons.md) (hulls, subdivision, hull overlap is necessary), the Bézier chapter.
- Reference method (Sederberg and Nishita, cited, not opened; the mathematics below is checked independently): the fat line of \(B\) is the strip between the lines parallel to its chord that contain all control points of \(B\) (here the min and max of the signed control-point distances, always a valid band; tighter bands for quadratics and cubics exist and are optional). The signed distance of \(A\) to the chord is a polynomial with Bézier coefficients at abscissae \(i/m\); the convex hull of these points meets the band in an interval, which is the clipped parameter range.
- Default examples (checked with the reference script, shrink threshold 0.8, band from control-point distances): \(A=(0,0),(2,4),(4,0)\) and \(B=(0,3),(2,-1),(4,3)\), the curves of A6, cross at \(t=\tfrac14,\tfrac34\) (points \((1,1.5),(3,1.5)\)). With tolerance on both parameter widths: \(10^{-3}\) takes 22 clips, \(10^{-6}\) and \(10^{-10}\) take 26 clips each (quadratic-like convergence), two results at \(0.25\) and \(0.75\). Tangent pair: \(B_t=(0,4),(2,0),(4,4)\) touches \(A\) at \(t=\tfrac12\), point \((2,2)\) (double root of \(16t^2-16t+4=0\)); tolerance \(10^{-3}\) takes 66 clips and \(10^{-6}\) takes 122 clips (linear convergence, about five times the crossing), and the same tangency reported as two adjacent pieces that must be merged. At tolerance \(10^{-10}\) the reference script degrades into 59 552 clips and 29 696 reported pieces: rounding makes the clip unable to certify a double root. No-intersection pair: \(B_u=(0,4.5),(2,0.5),(4,4.5)\), whose vertical gap to \(A\) is \(4.5-16t+16t^2\ge0.5\) (checked, minimum at \(t=\tfrac12\)); the control hulls of \(A\) and \(B_u\) overlap (separating-axis test, checked), yet clipping proves "no intersection" after 7 clips.
- Steps: (1) the two curves and their hulls; hulls overlap, so predict; (2) draw the fat line of \(B\) and the distance graph of \(A\); (3) the clipped range of \(A\) and the discarded pieces; (4) swap roles and clip \(B\); (5) repeat to the tolerance and read the interval widths; (6) the tangent pair: watch progress slow and the iteration cap trigger; (7) the offset pair: overlapping hulls, no intersection; (8) free exploration.
- Graph needs: pair-of-curves graph from A6, fat-line band, distance-curve inset, interval table, status text (found, empty, limit reached, overlapping), tolerance field, Next step, Play/Pause, Reset as in [numerical-methods](numerical-methods-lessons.md) iteration.
- Acceptance:
  1. Crossing example finds \(0.25\) and \(0.75\) to the tolerance and merges duplicate results of one root; the no-intersection pair returns empty.
  2. Never discards a range that contains a true root: tested against dense sampling and a resultant-based reference on random quadratic and cubic pairs (every reference root lies in a reported interval or the pair is reported as limit reached).
  3. Termination: a termination tolerance on the parameter widths (default \(10^{-6}\)), a maximum clip count (suggest 200) with a "limit reached" status, and a depth limit on subdivision. The lesson explains that a tolerance is a stopping rule, not a proof of a root, and that the limit status is expected near tangencies and for coincident segments, which are out of scope (reported, not solved).
  4. The discard decision is biased towards keeping: a range is discarded only if the hull misses the band by more than a stated margin (suggest \(10^{-12}\) of the control-point scale), so rounding cannot drop a true crossing.
  5. The tangent example needs at least three times the clips of the crossing example at \(10^{-6}\) (reference counts 122 versus 26; implementation counts are recorded with its rule and need not match).
  6. The prose states hull overlap is necessary, not sufficient, and a finite run illustrates the algorithm but proves nothing; degrees above 3 are not offered.
  7. Dragging recomputes and resets playback; both languages.

### D3. Arc-length parametrization (Naravna parametrizacija)

- Learning goal: equal steps in \(t\) are not equal steps along the curve; arc length \(s(t)=\int_0^t|B'(u)|du\) can be tabulated and inverted to place points at equal distances. For a PH curve \(s(t)\) is an exact polynomial, but its inverse \(t(s)\) is never polynomial, so no non-linear polynomial curve is arc-length parametrized.
- Prerequisites: the parametrization chapter, the PH chapter (speed), [curve geometry](curve-geometry-lessons.md) hodograph helper.
- Default examples (checked): PH cubic, start \((-4.2,-2)\), hodograph points \((-3.5,-1.7),(-2.6,1.7)\) (the cubic preset of `ph-golden.test.ts`). Control points \((-4.2,-2),(-1.08,1.9667),(2.9167,1.4567),(4.2067,-1.49)\); speed coefficients \(15.14,6.21,9.65\); exact \(s(1)=31/3=10.333333\) agrees with 24-point Gauss-Legendre of \(|B'|\) to \(10^{-15}\), and \(s(0.3)=3.84963\). Eight equal steps in \(t\) give chords \(1.7585\) to \(1.1568\) (ratio \(1.62\)); eight equal arcs, at \(t=0,0.0899,0.1901,0.3023,0.4279,0.5662,0.7130,0.8604,1\), each have length \(L/8=1.291667\) (checked by quadrature) and chords \(1.2908\) to \(1.2864\) (ratio \(1.004\); chord below arc). The repo's `tk` chain agrees with bisection to \(1.1\cdot10^{-16}\). Non-PH cubic \(Q=(0,0),(1,3),(3,3),(4,0)\): length \(6.390976\) (24-point Gauss-Legendre, two halves agree to \(4\cdot10^{-13}\)); chord \(4\le L\le8.32456\) (control polygon); inscribed polylines with \(N=4,8,16,32,64\) chords err by \(0.100244,0.025086,0.006267,0.001566,0.000392\) (error divides by about 4 when \(N\) doubles); equal-\(t\) chord ratio \(1.857\) at \(N=8\); equal-arc parameters \(0,0.0906,0.1983,0.3324,0.5,0.6676,0.8017,0.9094,1\).
- Steps: (1) move a point at constant \(t\)-speed and watch it speed up and slow down; (2) show the speed \(|B'(t)|\) graph; (3) tabulate \(s(t)\) and read \(L\) with its bracket (chord, polygon); (4) invert to equal-arc marks and compare spacing; (5) PH curve: exact \(s\) versus the numerical value; (6) the inscribed-polyline error halving; (7) free exploration.
- Graph needs: curve with equal-\(t\) and equal-arc marks, speed plot, readouts for \(L\) (numeric and, for PH, exact), the PH switch, \(N\) control, animated point at constant arc speed.
- Acceptance:
  1. The listed lengths, parameters and ratios match to the digits shown; for PH curves the numerical length equals the exact \(s(1)\) to \(10^{-9}\).
  2. Piece lengths between consecutive equal-arc parameters equal \(L/N\) to the inversion tolerance (suggest \(10^{-9}\)); a cusp (\(|B'|=0\)) is reported rather than dividing by zero, as `tk` already guards.
  3. The prose proves or cites the statement that a polynomial curve with constant speed 1 is a straight line (its components' derivatives have constant norm, so they are constant), and says PH makes the length, not the inverse, polynomial.
  4. The polyline error readout is labelled an illustration of \(O(h^2)\) behaviour on this example, not a proof.
  5. Exact versus tolerance: numerical lengths show their quadrature setting; the PH value is labelled exact only for PH curves.
  6. Both languages, decimal comma in Slovenian.

### D4. Coons patch (Coonsova ploskev)

- Learning goal: four boundary curves with matching corners determine a surface by blending, \(S=L_c+L_d-B\): two ruled surfaces minus the bilinear corner surface. The surface interpolates all four boundaries, but its interior is dictated by the blending and is not the only possible fill.
- Prerequisites: the tensor-product patch chapter, [bezier-patches.md](bezier-patches.md) surface view.
- Default example (checked): cubic Bézier boundaries \(c_0=(0,0,0),(1,0,2),(2,0,2),(3,0,0)\) at \(v=0\), \(c_1=(0,3,0),(1,3,-1),(2,3,-1),(3,3,0)\) at \(v=1\), \(d_0\) the straight edge from \((0,0,0)\) to \((0,3,0)\) at \(u=0\), \(d_1=(3,0,0),(3,1,1),(3,2,1),(3,3,0)\) at \(u=1\). Corners coincide. Centre \(S(\tfrac12,\tfrac12)=(1.5,1.5,0.75)\) from \(L_c=L_d=0.375\) in \(z\) and \(B=0\). With cubic boundaries the Coons patch is exactly a bicubic Bézier patch; its four interior control points are \((1,1,\tfrac43),(1,2,\tfrac13),(2,1,\tfrac53),(2,2,\tfrac23)\), computed as \(P_{ij}=L_{c,ij}+L_{d,ij}-B_{ij}\) with degree-elevated linear factors; the two evaluations agree to \(1.3\cdot10^{-15}\) and boundary interpolation holds to \(4.4\cdot10^{-16}\).
- Steps: (1) four boundary curves on the surface view; (2) ruled surface between \(c_0\) and \(c_1\); (3) ruled surface between \(d_0\) and \(d_1\); (4) subtract the bilinear corner surface and see all four edges met; (5) read the interior control net and compare with a tensor patch; (6) break a corner and see interpolation fail; (7) free exploration.
- Graph needs: new patch graph on `BaseSurfaceGraph`, editable boundary control points with shared corners, toggles for \(L_c\), \(L_d\), \(B\) and the result, interior-net readout; surface-view keyboard and camera behaviour as in existing patch demonstrations.
- Acceptance:
  1. Centre value and interior net match the numbers above; the Coons evaluation equals the bicubic net to \(10^{-12}\) on random \((u,v)\).
  2. Each boundary is reproduced to \(10^{-12}\) when the corners coincide; with a corner moved away the lesson shows the mismatch and the demonstration refuses to claim interpolation.
  3. The prose says the blend is one of many, and does not claim the interior is determined by the boundaries alone (other blendings give other fills); no twist claim is made.
  4. Dragging a boundary point rebuilds the mesh and respects scene ownership and disposal; the existing patch Presets and routes are unchanged.
  5. Rendering is measured against [the performance plan](../performance-plan.md) before any change to the sampling density used by tensor patches.
  6. Both languages.

## User Stories

1. As a student, I elevate a quadratic and reduce it back, and then try a cubic that cannot go back, so that I see what an approximation costs.
2. As a student, I compare two "best" quadratics and see that the norm matters.
3. As an educator, I project a clipping run and stop at each clip to show what was discarded.
4. As a student, I see overlapping hulls without an intersection, so that necessary is not mistaken for sufficient.
5. As a student, I drive a point at equal arc speed and see why the plain parameter is not it.
6. As an educator, I show a Coons patch built from its three ingredients.

## Terms (proposals, per [choosing new terms](../localization.md#choosing-new-terms))

| English | Slovenian | Justification |
| --- | --- | --- |
| degree reduction | nižanje stopnje | the FMF syllabus (d1718) says *višanje/nižanje stopnje*; matches the existing *višanje stopnje* elevation label |
| Bézier clipping | Bézierovo rezanje | literal; *rezanje* is established for cutting a parameter range; owner review |
| fat line | debela premica | literal rendering of Sederberg's term; descriptive for a strip, owner review |
| arc-length parametrization | naravna parametrizacija (parametrizacija z ločno dolžino) | *naravni parameter* is the standard geometry term; the second form explains it |
| Coons patch | Coonsova ploskev | the person's name is kept; *ploskev* matches the existing patch labels |
| blending | mešanje | descriptive; owner review |

## Implementation Decisions

- Kernels are pure number code under `src/bezeg/impl/kernels/`, using plain `[x, y]` or `[x, y, z]` tuples, with no React, JSXGraph or localization. Each Demonstration stores validated Presets and a stored step where iterative (D2).
- The PH arc length remains the independent check for D3, not the implementation.
- Rotation-minimizing frames for rigid-body motion (the syllabus' "gibanja togih teles") are out of scope until a 3D curve view exists, so no D5 is specified.

## Testing Decisions

Unit and math tests per lesson as listed under Acceptance, plus: elevation followed by reduction round trip, \(L^2\) optimality by perturbation, Gauss-Legendre against the PH exact length, clipping against a dense-sampling and resultant reference (including tangent and no-intersection cases), Coons against the bicubic net.

**Batch-wide acceptance gate.** Before a batch is released: its unit tests pass; the changed routes are smoke-tested per [the browser checklist](../smoke-tests.md) in Slovenian and English including a live language switch; `npx tsc --noEmit --pretty false`, the lesson-notation test and the production build pass; existing routes and Presets are re-checked; D2 and D4 record a drag measurement per the performance plan.

## Correctness Notes

- Degree reduction is an approximation, not an inverse; elevation followed by reduction is the identity, reduction followed by elevation is generally not.
- Clipping is only as certain as its tolerance and its discard margin; tangential intersections converge linearly and, at very small tolerance, can fail in floating point (observed above). Hull overlap is necessary for an intersection, not sufficient.
- Arc length of a non-PH curve is numerical; the quadrature setting is part of the claim.
- A Coons patch depends on the blending; interpolation requires coinciding corners.
- Pictures illustrate; "always" statements (hull property, constant speed means a line) carry their reasoning or a source.

## Out of Scope

- Rotation-minimizing frames and rigid-body motion design (no 3D curve view).
- Blossoming (the [B-spline spec](b-splines-nurbs-lessons.md) L6 owns it), degree reduction of rational or spline curves.
- Clipping for degrees above 3, rational curves, coincident or self-intersecting curves, surface intersection.
- Coons patches with non-Bézier boundaries, Gordon surfaces and twist control.
- Any change to existing routes, Presets or the PH readout.

## Further Notes

- The mathematical numbers above were computed on 2026-10-31; the reference clipping script's clip counts depend on its shrink threshold (0.8) and band rule and are guidance, not requirements.
- Not verified: Forrest's formula and Sederberg-Nishita were cited from memory and the syllabus bibliography (Farin, Bartels-Beatty-Barsky, not opened); no browser or implementation check was possible for a specification.
