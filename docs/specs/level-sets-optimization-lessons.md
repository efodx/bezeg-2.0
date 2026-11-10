# Level sets, gradient and optimization (Nivojnice, gradient in optimizacija)

**Status:** draft, 2026-11-10 (stream families-prep); prepared, not scheduled for release. Tasks: [docs/tasks/level-sets](../tasks/level-sets/README.md). Decisions 1–4: [ADR 0053](../adr/0053-level-sets-contour-graph-marching-squares-exact-lp.md).
**Agreed:** owner scheduled preparation 2026-11-10 (family #10 of the [top-15 note](../research/lesson-family-candidates-2026-11-09.md); engine family).
**Source:** [expansion candidates, E9](../research/lesson-family-candidates-2026-10-31-expansion.md#e9-nivojnice-gradient-in-optimizacija--level-sets-gradient-and-optimization-u) (anchors, five lessons, pitfalls) and the top-15 entry 10 (opening lesson, engine). Read in the PIK M-MAT-2026 text extraction: §4.10.1 *Linearna funkcija*, p. 16, content list *Linearna neenačba*, *Sistem linearnih neenačb*, *Modeliranje preprostih primerov iz vsakdanjega življenja z linearno funkcijo*; §4.13 *Diferencialni račun*, p. 21, *Uporaba odvoda: Ekstremi, naraščanje in padanje funkcije* and *Ekstremalni problemi* ("reši preprost ekstremalni problem"). The extraction is two-column and interleaves the goals, so a goal is not matched to its content row; level marker not verified. Nothing in the catalogue covers functions of two variables, gradients or contours: LS1–LS4 are university content (FMF Analiza 2a/2b, Optimizacija 1–2, cited from the research note, not opened); only LS5 reaches the matura (a system of linear inequalities in two variables, drawn as a region).

## Problem Statement

Bezeg draws curves and single-variable function graphs, and a surface view for Bézier patches ([surface view spec](jsxgraph-surface-view.md)). It has no function of two variables, no contour map, no gradient and no optimization. A learner cannot see that moving along a contour keeps the value, that the steepest direction is perpendicular to it, why gradient descent zig-zags in a narrow valley and diverges for a large step, or that a constrained extremum sits where a contour touches the constraint. The linear-programming picture (a feasible polygon and a sweeping objective line) is the one piece that fits the secondary programme.

## Solution

Add a Learn chapter **Nivojnice, gradient in optimizacija / Level sets, gradient and optimization** with five chapter-owned guided activities, each backed by a catalog Demonstration that stays available for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). Audience: LS5 upper secondary; LS1–LS4 first-year university. Each lesson is 5–7 steps, predicts before it reveals, and ends in free exploration. No exercises, grading or progress. Chapter order LS1–LS5; release order differs (below).

### Release batches

| Batch | Content | Release condition |
| --- | --- | --- |
| 0 (foundation) | Kernels below: function catalogue with analytic gradients, marching squares, gradient descent, constrained-point model, LP (exact); ADRs 1–3 accepted | Kernel tests pass; no route required |
| A | LS5 Linear programming | Batch 0 done; needs no contour or 3D view |
| B | LS1 Surface and level sets, LS2 Gradient is perpendicular to the level curve | Batch 0 done; contour measurement recorded (ADR 2); 3D decision (ADR 3) |
| C | LS3 Gradient descent, LS4 Lagrange multipliers | Batch B released (the contour map graph) |

Publish batches separately; do not advertise unreleased lessons.

### Reuse and new modules

Verified by search in this worktree:

- `SceneMesh` (`src/graphs/patches/surface-view/surfaceScene.ts:40`: flat xyz `positions`, triangle `faces`, `visible`, `chordTolerance`) and `JsxSurfaceView` (`src/graphs/patches/surface-view/jsxSurfaceView.ts:159`) draw generic triangle meshes. `SceneMeshOwner.kind` (line 54) is a closed union (`'tensor' | 'triangular' | 'join' | 'teapot'`); a function-surface owner needs a new kind, a change to a shared file (ADR 3).
- `Rational`, `RationalPoint` (`src/compgeo/rational.ts:38,128`: add, sub, mul, div, sign, compare, cross, dot) carry the exact LP arithmetic; `src/compgeo/grid.ts` has `GridPoint` and `isGridPoint`; `src/compgeo/polygonMeasures.ts` has `doubledSignedArea` (integer-grid polygons only, so used as a cross-check of the feasible region, not for rational vertices).
- `src/analysis/eulerField.ts` and ADR [0037](../adr/0037-direction-field-drawing.md) (NaN-separated polyline for many short segments) are the precedent for drawing contours as one polyline-array curve.
- `src/linear/matrix2.ts` is not needed here (the Hessian sketch is out of scope).
- No contour, gradient, optimization or two-variable code exists (searches: `contour`, `marching`, `gradient`, `simplex`, `halfplane` in `src/`).

New modules (suggested): `src/levelsets/functions2.ts` (catalogue), `contours.ts` (marching squares), `descent.ts`, `constrained.ts` (point on a constraint curve, tangency), `src/optimization/lp2.ts` (LP); graphs `ContourMapGraph.tsx` (LS1–LS4, mode switch) and `LinearProgramGraph.tsx` (LS5). Pure maths stays free of React, JSXGraph and localization.

### Decisions needing an ADR

1. **Graph shape.** (a) One `ContourMapGraph` with modes and a shared function state; (b) a graph per lesson; (c) fold LS5 into it. Proposal: (a) for LS1–LS4 and a separate `LinearProgramGraph` for LS5 (different object: half-planes, not a function), decided before Batch A.
2. **Contour drawing and grid resolution.** (a) One polyline-array curve per level from marching squares on an \(N\times N\) cell grid; (b) per-segment JSXGraph elements; (c) an overlay canvas. Measure per the [performance plan](../performance-plan.md) before choosing: \(N\in\{40,80,120\}\) cells per side, 1, 5 and 9 levels, while dragging the level slider and the probe point; record frame times and the threshold used. Handler decision, reversible: default \(N=60\) until the measurement. Do not replace JSXGraph on this evidence alone.
3. **Surface view.** (a) Reuse `JsxSurfaceView` with a function-surface owner kind; (b) a 2D-only contour map (surface as an inset or omitted); (c) a new renderer. Owner rule: extend the existing view (a), measured first. Mesh cost: \((N+1)^2\) vertices and \(2N^2\) triangles, \(N=40\): 1681 and 3200 (arithmetic only). Dependency: the shared 3D view is touched by the Controls stream (step 5); this spec plans no edit of it.
4. **Exactness policy for LS3 and LS4**: (a) parameters on integer grids so convergence and tangency are exact integer tests; (b) continuous with tolerances. Proposal: (a) (below); the dragged constraint point is exact on a rational grid.

## Kernels

1. **Catalogue** (`functions2.ts`): a closed id list with value, analytic gradient and a window: `bowl` \(x^2+y^2\), `saddle` \(x^2-y^2\), `valley` \(x^2+10y^2\) (window \([-2,2]^2\)), `hills` \(\sin x\sin y\) (window \([-4,4]^2\)), `product` \(xy\) (window \([-2,2]^2\)). No formula parser. Gradients are analytic; a numerical central difference \((f(x+h)-f(x-h))/2h\) is used only as the test oracle and in no learner-visible number.
2. **Marching squares** (`contours.ts`): nodes \(x_i=x_0+(x_1-x_0)\,i/N\) (integer ratio first, so node coordinates such as \(1\) are exact doubles); node sign \(s=f\ge c\); per edge with differing signs, \(t=(c-f_a)/(f_b-f_a)\in[0,1]\) (\(t=0\) or \(1\) when the positive endpoint has \(f=c\)) (denominator nonzero because the signs differ). **Degenerate-value policy:** a node with \(f=c\) counts as positive; a segment whose endpoints coincide (contour touching a node) is dropped; the level is never perturbed. **Saddle cells** (two diagonal corners positive, the other two negative): decide by the asymptotic decider on the bilinear interpolant, \(f_s=(f_{00}f_{11}-f_{01}f_{10})/D\) with \(D=f_{00}+f_{11}-f_{01}-f_{10}\) (method of Nielson and Hamann, cited from memory, not opened). The kernel does not divide: with \(g=f-c\), \(f_s\ge c\) iff \(G\cdot D\ge0\) where \(G=g_{00}g_{11}-g_{01}g_{10}=(f_{00}f_{11}-f_{01}f_{10})-cD\); \(D>0\) when \(00/11\) is the positive diagonal and \(D<0\) for the other diagonal, never \(0\) in a saddle cell. The sign of \(G\) is exact on dyadic data (snapped nodes and levels). If \(f_s\ge c\) the positive corners are joined (the negative corners are cut off); otherwise each positive corner is cut off separately. The tie \(f_s=c\) (contour through the cell centre) resolves to "joined"; this is a stated convention, not a claim about the true curve. Output is segments per level; chaining into polylines is a separate pure step.
3. **Gradient descent** (`descent.ts`): \(p_{k+1}=p_k-h\nabla f(p_k)\) with \(h=H/100\), integer \(H\in[1,30]\), start on a \(1/4\) grid. For the quadratic `valley`, \(x_k=x_0(1-2h)^k\), \(y_k=y_0(1-20h)^k\): for a start with \(y_0\ne0\) it converges iff \(0<h<0.1\) iff \(1\le H\le9\), an integer test on \(H\); \(H=10\) oscillates without converging; \(H\ge11\) diverges. A start with \(y_0=0\) has only the factor \(1-2h\) and converges for every \(H\le30\) (up to \(H\le99\)), so the classification is "\(H\le9\) or \(y_0=0\)", decided exactly on the start. For other functions no convergence claim is made, only the path with a step cap (200) and a non-finite or \(|p|>10^6\) stop.
4. **Constrained point** (`constrained.ts`): a constraint is a line \(ax+by=c\) (integers) with the point parametrised so that coordinates are rational (\(x\) on the \(1/4\) grid), or a circle with the point at an angle (tolerance, named). Tangency of level curve and constraint is \(\det(\nabla f,\nabla g)=0\): exact (`Rational`) for lines, \(|\sin\angle|<0.01\) for the circle, shown as "approximately".
5. **Linear programming** (`lp2.ts`): constraints \(a_ix+b_iy\le c_i\) with integer coefficients, always including \(x\ge0,y\ge0\); objective \(\max px+qy\), integers. Vertex enumeration: for each pair of constraint lines with \(D=a_1b_2-a_2b_1\ne0\), the intersection by Cramer's rule in `Rational`; keep it if every constraint holds (exact `Rational` comparison); dedupe equal points (several pairs can give one degenerate vertex). Because \(x,y\ge0\) are present the region is pointed, so it is feasible iff at least one vertex exists. **Unbounded** iff some ray direction in \(\{\pm(b_i,-a_i)\}\) satisfies \(a_jd_x+b_jd_y\le0\) for all \(j\) and \(p d_x+q d_y>0\) (the extreme rays of the recession cone are among these directions). Rows with \(a_i=b_i=0\) are rejected at input. A region with one vertex (a point) or two (a segment) is reported as such and the walk compares the vertices directly. The walk runs only on a **bounded** region; an unbounded region shows its vertices and rays and reports the unbounded status or the optimal vertex without a walk, because ordering an open chain about a centroid would close a false edge. Bounded vertices are ordered around the polygon by an exact angular order about the centroid (a half-plane split, then the sign of the cross product within each half); the **simplex walk** starts at the origin when feasible (else the first vertex) and moves to the neighbour with the larger objective, stopping when neither neighbour is larger; equal neighbours stop with "optimal edge". This is the simplex method for two variables seen on the polygon; no tableau, no cycling possible (strict improvement).

## Concept contracts and acceptance criteria

Examples are implementation defaults. Every number was computed with `node -e` (expressions in the families-prep note, `docs/reviews/feature-streams/families-prep/notes/spec-levelsets-phase.md`).

### LS1. Surface and level sets

- Learning goal: the level set \(\{f=c\}\) is the curve where the surface has height \(c\); closely spaced contours mean steep slope; saddles are where contours cross.
- Prerequisites: functions of one variable; no matura anchor (university).
- Scene: `bowl`, `saddle`, `valley`, `hills` chooser; a level slider; contour map beside the surface (ADR 3); one probe point linked in both views.
- Steps: (1) the bowl and one contour; predict the contours for level \(1,2,3\); (2) drag the probe, the contour through it follows (\(c=f(p)\)); (3) the valley: contours are ellipses with ratio \(\sqrt{10}\); (4) the saddle at the origin, level \(0\) is two lines; (5) `hills`: maxima, minima and saddles; (6) free exploration.
- Checked numbers: `bowl`, \(c=1\), window \([-2,2]^2\): \(N=20,40,80\) gives total contour length \(6{,}2581;\ 6{,}2763;\ 6{,}2813\), against \(2\pi=6{,}2832\) (errors \(-0{,}0251;\ -0{,}0069;\ -0{,}0018\), falling by about 4 per doubling); largest vertex radius error \(0{,}0050;\ 0{,}0012;\ 0{,}0003\); no zero-length segment (nodes \((\pm1,0)\) lie on the contour: \(-2+4\cdot30/40=1\) exactly, handled by the policy).
- Acceptance: (1) the numbers above match in unit tests; (2) every vertex satisfies \(\lvert f-c\rvert\) within the interpolation bound for the catalogue function (oracle: the closed form of the circle or hyperbola); (3) the contour of the bowl at \(c=1\) has one closed loop, the saddle at \(c=0\) two crossing lines; (4) probe and surface point agree; (5) the contour picture is an **illustration** (sampled), the claim "\(f=c\) along the curve" is by definition; (6) Reset, Preset, restore, both languages.

### LS2. The gradient is perpendicular to the level curve

- Learning goal: \(\nabla f\) points to the steepest ascent and is perpendicular to the contour through the point; its length is the steepness.
- Scene: LS1 plus the gradient arrow at the probe and the tangent of the contour; `numeric` toggle comparing the central-difference estimate.
- Steps: (1) drag the probe on the bowl; predict the arrow direction; (2) arrow vs tangent: right angle; (3) the valley: steeper across than along; (4) `hills` near a maximum and a saddle: the arrow shrinks to \(0\) at \(\nabla f=0\); (5) the numeric estimate and its error; (6) free exploration.
- Checked numbers: bowl at \((0{,}6;0{,}8)\): \(\nabla f=(1{,}2;1{,}6)\), tangent \((-0{,}8;0{,}6)\), dot product \(0\). `hills` at \((1,1)\): \(\nabla f=(0{,}4546487;0{,}4546487)\). Central difference of \(\partial_x\) there: error \(7{,}6\cdot10^{-6}\) for \(h=10^{-2}\), \(7{,}6\cdot10^{-8}\) for \(10^{-3}\), about \(10^{-11}\) for \(10^{-5}\), but about \(10^{-7}\) for \(h=10^{-10}\) (rounding grows again; the last two are rounding noise, quoted as orders of magnitude and not tested to digits). The learner-visible gradient is the analytic one.
- Acceptance: (1) analytic gradient vs central difference with \(h=10^{-5}\) agree within \(10^{-9}\) over 1000 random points of each catalogue function (the independent oracle); (2) the angle between the gradient and the contour-segment normal at its midpoint is within the discretisation bound for \(N=40\), reported as a number, not "exact" (measured at F1 for `bowl`, \(c=1\): at most \(0{,}1799\) rad \(\approx10{,}3^\circ\), largest on short corner-cutting chords; the kernel test bound is \(0{,}2\) rad); (3) the prose states perpendicularity as a theorem (chain rule: \(f(\gamma(t))=c\) gives \(\nabla f\cdot\gamma'=0\)); the picture is an **illustration**; (4) at critical points the arrow is a point and the status says "\(\nabla f=0\): stationary", no direction is invented; (5) common acceptance.

### LS3. Gradient descent

- Learning goal: the step \(h\) trades speed against stability; a narrow valley makes the path zig-zag; beyond a threshold the iteration diverges.
- Scene: `valley` (and `bowl`, `hills`), start handle, step \(H\), step button and path with step counter (playback; Controls step 5).
- Steps: (1) `bowl`, predict the path; (2) `valley`, \(H=3\): slow; (3) \(H=9\): zig-zag; (4) \(H=10\): never settles; (5) \(H=11\): diverges; (6) predict the threshold, then reveal \(0{,}1=2/L\); (7) free exploration with the claim limited to quadratic `valley`.
- Checked numbers: `valley`, start \((2,1)\), \(H\) = 3, 5, 9: iterations until \(f<10^{-6}\): 123, 73, 40. \(H=5\): \(y\) is \(0\) after one step (factor \(1-H/5=0\)), \(x\) factor \(0{,}9\). \(H=9\): first iterates \((1{,}64;-0{,}8)\), \((1{,}3448;0{,}64)\), \((1{,}10274;-0{,}512)\); factors \(0{,}82\) and \(-0{,}8\). \(H=10\): \(y=\pm1\) forever, \(x\to0\), \(f\to10\) (checked over 10000 steps). \(H=11\): factor \(-1{,}2\); the path leaves \(\lvert p\rvert\le10^6\) at step 76 (\(1{,}2^{76}\approx1{,}04\cdot10^6\)); the last accepted iterate is step 75, where \(f=10\cdot1{,}2^{150}\approx7{,}5\cdot10^{12}\). (Corrected at F1, 2026-11-10: the earlier \(f\approx1{,}2\cdot10^{25}\) after 152 steps is the closed form past the escape stop.)
- Acceptance: (1) numbers match; (2) the classification (converges for \(1\le H\le9\), or for every \(H\) when \(y_0=0\)) is the integer rule, checked against simulation for every \(H\in[1,30]\) with starts both off and on the axis \(y_0=0\); (3) for `bowl` and `hills` the graph shows the path only and says no convergence claim is made; (4) the prose says the threshold \(2/L\) is a theorem for quadratics (the argument is the factor \(1-20h\)), the zig-zag picture an **illustration**; (5) playback holds no stored state; Reset, Preset, restore, both languages.

### LS4. Lagrange multipliers

- Learning goal: on a constraint curve, an extremum of \(f\) occurs where a contour is tangent to the curve (\(\nabla f\parallel\nabla g\)); tangency is necessary, not sufficient.
- Scene: `bowl` with the line \(x+2y=5\); `product` with the circle \(x^2+y^2=2\); a point dragged along the constraint, the contour through it, both gradients, value readout.
- Steps: (1) line: drag, predict where \(f\) is smallest; (2) the contour touches the line at \((1,2)\); (3) both gradients are parallel there, \(\nabla f=\lambda\nabla g\), \(\lambda=2\); (4) circle and \(xy\): four tangency points, two maxima and two minima; (5) free exploration.
- Checked numbers: minimum of \(x^2+y^2\) on \(x+2y=5\): \((1,2)\), \(f=5\), \(\nabla f=(2,4)=2\,(1,2)\). Exact tangency test on the line: \(4x-2y=0\) with \(y=(5-x)/2\) gives \(x=1\). \(xy\) on \(x^2+y^2=2\): \(f(\theta)=\sin2\theta\) with the point \((\sqrt2\cos\theta,\sqrt2\sin\theta)\); maxima \(1\) at \((1,1),(-1,-1)\), minima \(-1\) at \((1,-1),(-1,1)\); cross product \(\det(\nabla f,\nabla g)=2(y^2-x^2)=0\) there.
- Acceptance: (1) numbers match; (2) on the line the tangency is exact (`Rational`); on the circle it is "approximately" with the named tolerance \(\lvert\sin\rvert<0.01\); (3) the prose states "tangency is necessary" as a theorem and shows with the circle case that the same condition holds at maxima and minima, so it does not tell them apart (that is all the circle shows; a tangency that is neither, as for \(f=x^3\) on a suitable constraint, is named in the prose but not drawn); the picture is an **illustration**; (4) the point cannot leave the constraint; (5) common acceptance.

### LS5. Linear programming (matura-facing)

- Learning goal: the feasible region of linear inequalities is a convex polygon; a linear objective is largest at a vertex; the simplex method walks from vertex to better vertex.
- Scene: constraints \(x+2y\le8\), \(3x+y\le9\), \(x,y\ge0\); draggable objective direction \((p,q)\) on integers; the polygon, the objective line sweeping, the walk.
- Steps: (1) the region from the inequalities, predict its corners; (2) the objective \(3x+2y=k\) as a sliding line; (3) the last touch is a vertex; (4) the walk \((0,0)\to(3,0)\to(2,3)\); (5) the objective parallel to a side: a whole optimal edge; (6) a degenerate vertex and the unbounded case; (7) free exploration.
- Checked numbers: vertices \((0,0),(3,0),(2,3),(0,4)\); \(3x+2y\): \(0,9,12,8\), maximum \(12\) at \((2,3)\); walk \((0,0)\to(3,0)\) (\(9>8\)) \(\to(2,3)\). Objective \(x+2y\) (parallel to the first side): \(0,3,8,8\), optimal edge \((2,3)\)–\((0,4)\). Degenerate: \(x+y\le4,\ x+3y\le6,\ x\le3\), \(x,y\ge0\): vertices \((0,0),(3,0),(3,1),(0,2)\) with \(3x+2y=0,9,11,4\); three constraints are tight at \((3,1)\) and \(x+y\le4\) is redundant. With 5 constraints there are \(\binom52=10\) pairs.
- Acceptance: (1) numbers match, vertex coordinates exact fractions; (2) vertex enumeration vs a brute-force oracle (every integer-grid point of the window tested against the constraints, then the convex hull of the feasible lattice for integer-vertex cases) and `doubledSignedArea` of the vertex polygon vs the exact Cramer area; (3) unbounded and infeasible statuses are text, never an empty graph; (4) the prose states "optimum at a vertex" as a theorem (the objective on a segment is monotone); the sweep is an **illustration**; (5) common acceptance.

## User Stories

1. As a student, I drag a point on a surface and see the contour through it and the gradient arrow at a right angle.
2. As a student, I see why a large step diverges and a medium step zig-zags.
3. As an educator, I show the tangency picture of Lagrange multipliers on a projector.
4. As a secondary student, I draw a feasible region and find the optimum by sliding a line.
5. As a keyboard or phone user, I type the level, step and constraint numbers and read text statuses.

## Terms (proposals, to be settled by localization.md#choosing-new-terms)

Search of `src/localization/sl.ts` found *ploskev*, *stacionarna točka*, *lokalni minimum*, *sedlo*, *oglišče*, *iteracija*, *korak*; no *nivojnica*, *gradient*. *omejitev* already means "limit" (step cap), so it is not used for constraints. No online research was possible in this session; sources named are from the research note, not opened.

| English | Slovenian proposal | Basis |
| --- | --- | --- |
| level set, level curve | nivojnica | research note E9 title (FMF-style); proposal |
| contour map | nivojski zemljevid | transparent compound; *plastnice* (cartography) rejected as a geography word |
| gradient | gradient | FMF Analiza 2b (research note) |
| gradient descent | gradientni spust | research note E9 |
| step size | velikost koraka | *korak* in the app |
| constrained extremum; constraint | vezani ekstrem; vezni pogoj | FMF Analiza 2a "vezani ekstremi" |
| Lagrange multiplier | Lagrangeev multiplikator | research note; Lagrangeev vs Lagrangeov to settle |
| linear programming | linearno programiranje | FMF Optimizacija 1 |
| feasible region; vertex | dopustna množica; oglišče | proposal; *oglišče* is used in the app |
| objective function | kriterijska funkcija | proposal to research |
| LP constraint | omejitveni pogoj | proposal |

## Implementation Decisions

- **Gating.** Ungated now: this spec, F0 plan, F1 kernels as new pure TypeScript files with oracle tests (Batch 0). Waits on Controls step 5: every F2a graph (LS1–LS4 use the shared 3D view and playback; LS5 is a graph of a family outside #1, #2, #5, #6, so it waits too) and the contour measurement; F2b registration, F3 lessons, F4 chapters, F5 media wait on step 7. Dependencies on other streams, not planned here: a function-surface `SceneMeshOwner` kind in the surface view (ADR 3), playback and stepper controls for LS3 (Controls), host panels for sliders.
- Graph state holds the function id, level, probe, start, \(H\), constraint id and point parameter, LP constraint integers and objective; derived values are recomputed from validated state, never from a Preset.
- Lesson scenes use typed actions (`set-function`, `set-level`, `set-probe`, `set-step`, `set-objective`) in one tick; unit-tested as a synchronous sequence.
- Routes and Presets are additive. Lesson prose follows the notation rules; `t()` calls are type checked and `sl.ts`/`en.ts` stay in lockstep.

## Testing Decisions

- Marching squares: all 16 cases against a hand table; ambiguous cell \(f=xy\) on \([-1,1]^2\), \(N=1\): \(c=0{,}5\) gives segments \((-1,-0{,}5)\)–\((-0{,}5,-1)\) and \((1,0{,}5)\)–\((0{,}5,1)\) (positive corners separated), \(c=-0{,}5\) gives the two other corner cuts (joined), \(c=0\) (\(f_s=0=c\)) joined, checked; \(f=c\) on nodes; circle length and radius errors above; the contour of the bilinear interpolant (brute-force fine sampling) as oracle for case selection.
- Gradient: analytic vs central difference; descent vs the closed form for `valley` and the \(H\) rule over \(H\in[1,30]\); LP vs brute force and `Rational` area.
- Scene, Preset (malformed, out-of-range), content tests, `tsc --noEmit` after localization changes, smoke row per lesson (default scene, drag, numeric entry, singular cases, restore, narrow viewport, keyboard, touch).
- Performance (ADR 2): see above; record in the ADR.

### Batch-wide acceptance gate

1. Each Demonstration opens directly and after refresh with its guided activity and a static preview.
2. The contracts are met with checked examples; discrete outcomes (descent classification, tangency on a line, LP vertices, feasibility) are exact on integer inputs; named tolerance only for the circle tangency; no tolerance shown as exact.
3. Both languages, accessible numeric inputs for every handle, restore on exit, Presets pass; Presentation mode checked.
4. Existing routes, Presets and the Bézier patch surface view behave as before.
5. TypeScript, tests, build, smoke and mathematics review pass.

## Correctness Notes

- Contours are piecewise-linear approximations; vertices lie on cell edges, not on the exact curve. A feature smaller than a cell can be missed (a small closed contour inside one cell), which the lesson says when it shows a level near a critical value.
- Flat regions and levels equal to a critical value: policy "\(f\ge c\) is positive" can draw a segment along an edge; the status names the case.
- Gradient descent claims are for the quadratic `valley` only; `hills` has several critical points and the path depends on the start.
- Lagrange tangency is necessary, not sufficient; degenerate constraints (\(\nabla g=0\)) are not offered.
- LP: degenerate vertices are deduplicated; unbounded and infeasible are reported; the walk cannot cycle in two variables because the objective strictly increases.

## Out of Scope

Backend, accounts, grading, progress; 3D constraint surfaces, Hessians, Newton's method, line search, momentum; KKT and duality; integer programming; tableau simplex and \(n\)-variable LP; free-text function input; renderer replacement or build-tool changes; edits to the shared controls, `BaseGraph.tsx`, `GraphSession.ts` and the surface view.

## Further Notes

Not verified: PIK level markers; FMF 2026 syllabi and textbooks (cited, not opened); the asymptotic-decider reference (from memory); Slovenian terms (no online research); contour performance (ADR 2); whether the `hills` window is pleasant; the interplay with the Controls stream. Sibling specs were being written in parallel and were not read, except the recursion spec's logistic lesson (for the phase-portraits spec).
