# Analytic geometry of lines (Analitična geometrija premice)

**Status:** draft, 2026-11-10 (stream families-prep); prepared, not scheduled for release. Tasks: [docs/tasks/analytic-lines](../tasks/analytic-lines/README.md). Decisions 1–3: [ADR 0046](../adr/0046-line-geometry-graph-and-integer-lines.md).
**Agreed:** owner scheduled preparation 2026-11-10; owner ranking rule: lines with the dot product as a tool, not a standalone vectors lesson.
**Source:** [top-15 research note, family 2](../research/lesson-family-candidates-2026-11-09.md) (opening lesson, lessons, kernel, risks). Read for this spec: the matura catalogue M-MAT-2026 §4.6 (page 13: *pravokotna projekcija*), §4.8 (pages 14–15: *skalarni produkt, kot med vektorjema in dolžina vektorja*, *pravokotna projekcija vektorja na drug vektor*, *povezava med skalarnim produktom in kosinusnim izrekom*, *utemelji pravokotnost in vzporednost vektorjev*), §4.9 (page 15: *razdalja med točkama*, *ploščina trikotnika*), §4.10.1 (page 16: *enačbe premice v ravnini*, *kot med premicama*) and the formula sheet (page 40: *razdalja točke od premice*, \(d=|ax_0+by_0+c|/\sqrt{a^2+b^2}\)). The catalogue has no level marker check here: level markers not verified. Part of the [new lesson families](new-lesson-families.md); the index entry is added by the handler.

## Problem Statement

Bezeg has a linear function lesson (`linear-function`, `src/demonstrations.ts:92`, graph `src/graphs/functions/LinearFunctionGraph.tsx`) that handles two points, \(k\) and \(n\) and refuses vertical lines (`linear_vertical_rejected` in `src/localization/sl.ts`). It has no implicit form \(ax+by+c=0\), no normal vector, no angle between lines, no distance from a point to a line and no intersection with a circle. Yet the matura catalogue names all of these and the geometry chapters (tangents, Voronoi, collision) use them silently. A learner cannot drag two points and watch every form of the line change together, see why the explicit form breaks, or see that the distance formula is a projection onto the normal.

## Solution

Add a Learn chapter **Analitična geometrija premice / Analytic geometry of lines** with five chapter-owned guided activities, each backed by a Demonstration that stays available for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). Audience: upper secondary. Each lesson has 5–7 steps, predicts before it reveals, ends in free exploration, and has no exercises, grading or progress. **Owner rule (settled):** the dot product appears only as a tool for lines (normal, angle, projection); no lesson is about vectors as such. Every step is anchored on a line drawn in the picture.

### Release batches

| Batch | Lessons | Release condition |
| --- | --- | --- |
| 0 (foundation) | Line kernel below with oracle tests; ADRs 1–3 accepted | Kernel tests pass; no learner-visible route required |
| A | L1 Forms of a line; L2 Normal vector, parallel and perpendicular | Batch 0 done; the graph passes the batch gate |
| B | L3 Dot product and the angle between lines; L4 Distance from a point to a line | Batch A released |
| C | L5 Intersections: line with line, line with circle | Batch B released |

Publish batches separately. Do not advertise unreleased lessons.

### Reuse and new modules

Verified by search in this worktree:

- `src/compgeo/circle.ts`: `Line` (`a x + b y = c`, line 44), `lineThrough(p, q)` (line 106, `Degenerate` for equal points), `lineValue` (line 101), `intersectLineCircle` (line 118; exact none/tangent/two by the sign of \(r^2(a^2+b^2)-(ac_x+bc_y-c)^2\), tangent point returned exactly), `powerOfPoint`, `thalesDot`. Reused as they are; L5 adds no new circle code.
- `src/compgeo/rational.ts` (`Rational`, `RationalPoint` with `dot`, `cross`, `sub`, `scale`, lines 38–157) and `src/compgeo/grid.ts` (`GridPoint`, integer \(|c|\le 2^{25}\), `assertGridPoint`). These are the exact-arithmetic base of the computational-geometry family (ADR 0021); parallel, perpendicular and intersection decisions here use them and do not invent a tolerance.
- `src/linear/matrix2.ts` is not needed. The linear-function graph and its Preset format stay unchanged; the new graph is separate (ADR 1).

New modules (names suggested): `src/compgeo/lineForms.ts` (conversions, parallel/perpendicular, projection, distance, angle, line–line intersection) with `lineForms.test.ts`; `src/graphs/lines/LineGeometryGraph.tsx`, `src/graphs/lines/lineGeometryModel.ts` (state parse/validation) and their tests. Pure maths stays free of React, JSXGraph and localization.

### Decisions needing an ADR

1. **Graph shape.** (a) One `LineGeometryGraph` with a mode (forms / normal / angle / distance / intersect) and one state; (b) a graph per lesson; (c) extend `LinearFunctionGraph`. (a) shares handles, kernel and Preset format and lets scenes switch modes in one tick; (b) duplicates handles; (c) changes the `linear-function` route and stored Presets and cannot represent vertical lines. Proposal: (a), family `basics` or a new geometry family decided in the ADR. Handler decision, reversible.
2. **Input domain.** (a) Handles on the integer grid \([-8,8]^2\) with the first line through two grid points (\(a,b,c\) integers, all decisions exact via `Rational`); (b) a quarter grid scaled by 4 (same arithmetic, finer drag); (c) continuous handles with tolerances. Proposal: (a); keyboard step 1. Consequence: the circle is given by a centre and a boundary grid point (\(r^2\) integer), so tangency is reachable. Whether (b) drags more pleasantly is not measured.
3. **Where the kernel lives.** (a) `src/compgeo/lineForms.ts` next to `Line`; (b) a new `src/lines/` module; (c) extend `circle.ts`. Proposal: (a); `circle.ts` already carries its own header contract and should not grow.

## Line kernel (owned by this spec)

Free of React, JSXGraph, localization and graph state. All functions take `RationalPoint`/`GridPoint` input.

1. **Forms.** `Line` is `{a,b,c}` with `a x + b y = c`. `normalizeLine` divides by the gcd of integer coefficients and fixes the sign (first nonzero of \(a,b\) positive) so equal lines compare with `===` on the three integers. `explicitForm(line)` returns `{k, n}` as `Rational`, or `{vertical: true, x0}` when \(b=0\); never divides by zero. `interceptForm` returns the axis intercepts, or `undefined` for a missing one (line through the origin, or parallel to an axis).
2. **Direction and normal.** direction \(d=(-b,a)\), normal \(n=(a,b)\). `parallel(l1,l2)`: exact \(a_1b_2-a_2b_1=0\). `perpendicular(l1,l2)`: exact \(a_1a_2+b_1b_2=0\). Both on integers, no tolerance, no slopes.
3. **Dot product tools.** `project(v, onto)` returns the exact rational vector \(\frac{v\cdot w}{w\cdot w}w\); `footOfPerpendicular(line, p)` = \(p-\frac{ap_x+bp_y-c}{a^2+b^2}(a,b)\), exact rational.
4. **Distance.** `distanceSquared(line, p)` = \(\frac{(ap_x+bp_y-c)^2}{a^2+b^2}\) exact `Rational`; `distance` is its square root, a double labelled computed. `distance = 0` is decided exactly by `lineValue = 0`.
5. **Angle.** For directions \(u,v\): \(\text{dot}=u\cdot v\), \(\text{cross}=u\times v\) exact integers. The (acute) angle between lines is \(\operatorname{atan2}(|\text{cross}|,|\text{dot}|)\in[0,\pi/2]\), a double; "perpendicular" is \(\text{dot}=0\) and "parallel" is \(\text{cross}=0\), both exact. `acos` of the normalized dot loses precision near \(0\) and \(\pi\) and is not used for display (it differs from `atan2` at \(10^{-14}\) in the example of L3).
6. **Intersection.** `intersectLines(l1,l2)` returns `{kind:'point', point: RationalPoint}` by Cramer's rule when \(a_1b_2-a_2b_1\ne0\), `{kind:'parallel'}` when it is \(0\) and the lines differ, `{kind:'same'}` when they are equal. Line and circle: `intersectLineCircle` as it stands.
7. **Discrete outcomes** (parallel, perpendicular, same line, point on line, tangent) are exact on integer grid input. Floating point appears only in `distance`, `angle`, line–circle intersection points and the drawing.

## Concept contracts and acceptance criteria

All numbers below were computed with `node` (BigInt fractions) and are listed with their inputs in the [note file](../reviews/feature-streams/families-prep/notes/spec-lines-isometries.md). Examples are defaults; equivalents may replace them if the goal and checks hold. Fixture: the line \(\ell\) through \(P=(-2,1)\) and \(Q=(4,4)\); \(T=(3,-2)\).

### L1. Forms of a line

- Goal: one line has several equivalent forms; each fails somewhere; the implicit form fails nowhere.
- Prerequisites: the linear function lesson (PIK §4.10.1, page 16: *enačbe premice v ravnini*); not a prerequisite of anything but L2–L5.
- Scene: two draggable points \(P,Q\); readouts of the two-point, implicit \(ax+by=c\), explicit \(y=kx+n\) and intercept forms; a vertical-line status. Argument or illustration: illustration (a different pair would give the same relations).
- Steps: (1) predict the slope of the line through \(P,Q\); (2) drag \(Q\) and watch all forms; (3) bring \(Q\) above \(P\): explicit form vanishes, implicit stays; (4) put the line through the origin: both intercepts are \(0\), so \(\frac xm+\frac yn=1\) is undefined; (5) free exploration.
- Checked numbers: \(P=(-2,1),Q=(4,4)\): `lineThrough` gives \(3x-6y=-12\), normalized \(x-2y=-4\), \(k=\tfrac12\), \(n=2\), intercepts \(-4\) and \(2\). Vertical: \(P=(3,-1),Q=(3,5)\) gives \(x=3\).
- Acceptance: (1) these values in unit tests; (2) equal lines from different point pairs have equal normalized triples (the doubles test fails: with the slope-then-intercept formula \(k=\Delta y/\Delta x\), \(n=p_y-kp_x\) in doubles, from \((-8,-8),(-2,-6)\) the intercept is \(-5.333333333333334\) but from \((-2,-6),(4,-4)\) it is \(-5.333333333333333\), checked, kept as a counter-example test); (3) coincident points show a status, no line; (4) vertical lines are accepted; (5) handles clamp to \([-8,8]\).
- Prose: say the explicit form is the graph of a function and so excludes vertical lines.

### L2. Normal vector, parallel and perpendicular

- Goal: the coefficients \((a,b)\) are a normal; parallel means proportional coefficients, perpendicular means \(a_1a_2+b_1b_2=0\).
- Scene: \(\ell\) plus a second line given by a point and a draggable direction or a second pair; the normal arrow drawn on \(\ell\); a status "parallel", "perpendicular", "neither", decided exactly. Definition, not argument: "perpendicular" is defined as dot product zero of the directions, so the status illustrates the definition; the slope product \(-1\) is a corollary shown as a readout for non-vertical lines.
- Steps: (1) predict the direction of the normal of \(x-2y=-4\); (2) drag the second point until the status says perpendicular; (3) vertical and horizontal pair: slope product fails, dot product holds; (4) parallel pair with different \(c\); (5) free.
- Checked numbers: normal of \(\ell\) is \((1,-2)\); the line through \(T\) perpendicular to \(\ell\) is \(2x+y=4\) (value \(2\cdot3-2=4\)); slopes \(\tfrac12\) and \(-2\) multiply to \(-1\); \(x-2y=-4\) and \(x-2y=3\) are parallel (\(a_1b_2-a_2b_1=0\)).
- Acceptance: statuses match the exact predicates on all pairs of grid directions in a unit test; the vertical–horizontal pair is "perpendicular"; the same line is reported as "same", not just parallel.
- Prose: PIK §4.8 *utemelji pravokotnost in vzporednost vektorjev*.

### L3. Dot product and the angle between lines

- Goal: the dot product of directions gives the angle; the cosine rule is the same fact.
- Scene: two lines, direction vectors drawn, the acute angle arc, readouts \(u\cdot v\), \(u\times v\), angle. Illustration; the cosine-rule statement \(|u-v|^2=|u|^2+|v|^2-2u\cdot v\) is a theorem and the number check is an instance.
- Steps: (1) predict the angle between directions \((2,1)\) and \((1,3)\); (2) drag to confirm; (3) swap which angle is shown (acute versus its supplement) and keep the acute one; (4) bring dot to \(0\); (5) free.
- Checked numbers: \(u=(2,1),v=(1,3)\): dot \(5\), cross \(5\), angle \(45^\circ\) (`atan2`: 45, `acos`: \(45.00000000000001\)); \(|u-v|^2=5=5+10-2\cdot5\). \(u=(4,1),v=(1,3)\): dot \(7\), cross \(11\), angle \(57.5288^\circ\). \(u=(2,1),v=(1,0)\): \(26.5651^\circ\).
- Acceptance: angle from `atan2` equals `acos` of the normalized dot to \(10^{-12}\) away from \(0^\circ\) and \(90^\circ\) (independent oracle); "perpendicular" only when the integer dot is \(0\); parallel lines show \(0^\circ\) exactly.
- Prose: PIK §4.10.1 *kot med premicama*; the angle is the acute one by convention (Handler decision, reversible).

### L4. Distance from a point to a line

- Goal: the distance is the length of the projection of \(\overrightarrow{PT}\) on the unit normal, and equals the formula of the formula sheet.
- Scene: \(\ell\), the point \(T\), the foot \(F\), the vector \(\overrightarrow{PT}\) and its projection on the normal, and the formula with numbers. Argument for the formula's meaning (the picture constructs the projection); the number check is an instance.
- Steps: (1) predict where the nearest point lies; (2) drag \(T\), see the right angle at the foot; (3) show \(\overrightarrow{PT}\cdot n/|n|\); (4) put \(T\) on the line: distance \(0\); (5) free.
- Checked numbers: \(\ell: x-2y+4=0\), \(T=(3,-2)\): value \(11\), \(d=11/\sqrt5=4.91935\) (also \(\sqrt{121/5}\)); foot \((\tfrac45,\tfrac{12}{5})\); \(\overrightarrow{PT}=(5,-3)\), \(\overrightarrow{PT}\cdot(1,-2)=11\).
- Acceptance: `distanceSquared` is exactly \(121/5\); foot is exact; \(T\) on \(\ell\) gives \(0\), checked in the test by a hand-written integer determinant (not `lineValue`, which the kernel itself uses); foot lies on \(\ell\) and \(FT\perp\ell\) exactly in a property test over random grid input.
- Prose: formula sheet page 40.

### L5. Intersections

- Goal: two lines meet in one point, in none or in all; a line and a circle meet in two, one or no points, decided by the discriminant.
- Scene: two lines or a line and a circle (centre and boundary point on the grid). Argument for tangency: discriminant \(0\) is the exact condition; the picture illustrates.
- Steps: (1) predict the meeting point; (2) drag until the lines are parallel (status); (3) switch to the circle; (4) drag the boundary point and find the tangent radius; (5) free.
- Checked numbers: \(x-2y=-4\) and \(2x+y=4\) meet at \((\tfrac45,\tfrac{12}{5})\). Circle centre \((1,0)\) through \((3,1)\) (\(r^2=5\)): \(s=5\), discriminant \(5r^2-25=0\): tangent at \((0,2)\). Boundary \((3,0)\) (\(r^2=4\)): \(-5\), none. Boundary \((3,2)\) (\(r^2=8\)): \(15\), two points \((0,2)\mp\tfrac{\sqrt{15}}5(2,1)\approx(-1.549,1.225),(1.549,2.775)\).
- Acceptance: the three cases agree with `intersectLineCircle` and with a brute-force check on the circle's equation; tangent point exact; the parallel case reports "parallel" or "same" exactly.

## User Stories

1. As a student, I drag two points and see all forms of the line update together.
2. As a student, I see why a vertical line has no slope.
3. As a student, I see the angle between two lines come from the dot product.
4. As a student, I see the distance formula as a projection.
5. As an educator, I set up a tangent and a secant exactly, without a tolerance.
6. As a reader on a phone or keyboard, I enter coordinates numerically and step through the lesson with large controls.

## Terms

Search of `src/localization/sl.ts` found *premica*, *naklon*, *začetna vrednost*, *presečišče*, *vzporedn-*, *pravokotn-*, *razdalja*, *normala* in use and no *skalarni produkt*. The PIK text supplies *skalarni produkt*, *kot med premicama*, *enačbe premice*, *pravokotna projekcija*, *razdalja točke od premice*. Decided by [choosing new terms](../localization.md#choosing-new-terms) (reuse, then the PIK; no web search was done).

| English | Slovenian | Where | Basis |
| --- | --- | --- | --- |
| implicit form | implicitna oblika | L1 | proposal, standard |
| explicit form | eksplicitna oblika | L1 | proposal, standard |
| normal vector | normalni vektor | L2 | proposal; `sl.ts` uses *normala* for curves |
| direction vector | smerni vektor | L2, L3 | `sl.ts` has *smerni* (one use) |
| dot product | skalarni produkt | L3 | PIK §4.8 |
| angle between lines | kot med premicama | L3 | PIK §4.10.1 |
| distance from a point to a line | razdalja točke od premice | L4 | PIK formula sheet |
| foot of the perpendicular | nožišče pravokotnice | L4 | proposal, standard |
| orthogonal projection | pravokotna projekcija | L4 | PIK §4.6, §4.8 |
| intersection | presečišče | L5 | `sl.ts` |
| tangent (to a circle) | tangenta | L5 | `sl.ts` |

## Implementation Decisions

- **Gating** ([Boundary with the Controls stream](../tasks/feature-streams/families-prep.md)). Ungated now: this spec, the F0 plan, the ADRs, the F1 kernel (`lineForms.ts` as a new pure file with oracle tests) and F2a (`LineGeometryGraph` as a new class using the shared controls of `src/inputs/` as they are, with no route). Waiting on Controls step 7: F2b registration, F3 lessons, F4 chapter, F5 media. This spec plans no edits to `BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/` or existing graph panels. If L2–L5 need a shared control (for example a direction handle), list it as a dependency on the Controls stream.
- Graph state: the two points of line 1, the second line (point and direction, or two points), \(T\), the circle (centre and boundary point), mode; all integer, derived values recomputed from validated state.
- Typed scene actions (`set-points`, `set-mode`, `set-circle`) through the lesson-action registry (as in `src/graphs/curves/bezier/AffineTransformsBezierCurveGraph.tsx:36`); multi-action scenes run synchronously in one tick and are unit tested that way. No playback.
- Graph view (F3, handler 7, 2026-11-11; was \([-17,17]^2\) at F2a): a fixed view \([-10,10]^2\). The handles fill \([-8,8]^2\); the foot of \(T\) on a line through two grid points can reach \(|x|=15{,}5\) (brute force over the grid), so such a foot is not drawn (no foot marker, drop segment, right angle or distance labels), like an intersection outside the view, and the status says so (`line_geometry_status_foot_off_view`); the exact foot stays in the readouts. All checked lesson scenes (L1–L5) lie inside \(\pm 10\). Reason: at \(\pm 17\) the default figure filled a few units of a wide board ([diagnosis](../reviews/feature-streams/families-prep/notes/f2b-initial-view.md)). A view that refits while dragging would jump under the pointer. Points that still fall outside, such as the intersection of nearly parallel lines, are not drawn and the status says so. The normal arrow has a fixed drawn length of 3; only its direction is drawn exactly, and the readouts carry the exact \((a,b)\). The second line is given by two grid points \(R,S\), the simpler of the two options above.
- Routes and Presets are additive; `linear-function` unchanged. No breaking change.
- Lesson text is one-shot ([rule](new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31)); notation rules of `lessonMathNotation.test.ts` apply.
- **F2b decisions** (handler 7, 2026-11-11; evidence `docs/reviews/feature-streams/families-prep/notes/f2b-lines-isometries.md`). `line-geometry` at `/line-geometry` in *Geometrija ravnine*, as ADR 0046 proposed (geometry of the line, not a function graph). Feature-local registration (`src/graphs/lines/registration.ts`, `collections.ts`, `runtime.ts`) and a new Preset collection keyed `line-geometry`, checked by the line model parser, following the trigonometry F2b pattern; the row ships with `lesson: false` and pending entries until F3–F5. The crossing marker is now stroked in its colour (it was white).
- **F3 Batch B decisions** (handler 14, 2026-11-12; evidence `docs/reviews/feature-streams/families-prep/notes/f3-lines-b.md`). L3 and L4 join the chapter `analytic-lines` as sections `angle-between-lines` and `distance-point-line` (lesson ids `line-geometry-angle`, `line-geometry-distance`) and use the existing `lines` action kind; no graph change. L3 step (3) "swap which angle is shown" has no graph toggle: the learner swaps \(R\) and \(S\), the dot product changes sign, the angle between the vectors becomes \(135^\circ\) and the angle between the lines stays the acute \(45^\circ\). L3 step (2) uses a second direction pair \((4,1),(1,3)\) with the worked example instead of "drag to confirm", so the example does not answer step 1's prediction. L4 step (3) shows the projection at the step-1 position. The distance readout rounds, so at \(d=0\) it prints "≈ 0"; the lesson names the value \(ax_T+by_T-c=0\) as the exact decision. In Slovenian, \(\vec u\times\vec v\) is called *determinanta*.

## Testing Decisions

- Kernel oracles: (1) exact `Rational` identities independent of the kernel (point on line, foot on line, \(FT\perp\ell\)); (2) a brute-force intersection check by substituting into both equations; (3) `atan2` against `acos` and against a rotation-based angle; (4) parallel/perpendicular against `Math.atan2` slopes only as a counter-example test, never as the predicate; (5) tangency against `intersectLineCircle` and a numeric scan of \(|p-c|^2-r^2\) along the line.
- Property tests over random grid triples; the unnormalized-doubles intercept counter-example of L1 is kept as a test.
- Scene, Preset, lesson-content tests as in [linear-maps-lessons.md](linear-maps-lessons.md#testing-decisions); a smoke row per lesson once registered.

### Batch-wide acceptance gate

1. Each Demonstration opens directly and after refresh, with its guided activity and a static preview.
2. The concept contracts are met with the checked examples; every discrete outcome is exact on grid input; no tolerance is shown as exact.
3. Both languages, accessible numeric inputs for every handle, restore on exit, Presets and figure export pass; the graph is legible in Presentation mode.
4. Existing routes and Presets, including `linear-function`, behave as before.
5. TypeScript, unit and content tests, production build, smoke checks and mathematics review pass.

## Correctness Notes

- The pair \(\lambda(a,b,c)\) describes one line; compare lines only after `normalizeLine` or by the exact proportionality test, never by doubles.
- `acos` near \(\pm1\) is ill-conditioned; angles use `atan2(|cross|,|dot|)`.
- Distance zero, tangent and parallel are exact decisions; the displayed square roots are computed and rounded.
- Grid input bounds keep every product exactly representable (`src/compgeo/grid.ts`), and the `Rational` class removes any overflow concern.

## Out of Scope

- A standalone vectors lesson, vector spaces, 3D lines and planes, cross-product lessons.
- Conics beyond the circle (PIK §4.11 is not covered here), systems of linear inequalities, Gaussian elimination.
- Free-text equation input, symbolic algebra, a formula parser.
- Changing `LinearFunctionGraph`, its lesson or its Presets.
- Backend, accounts, assessment, progress.

## Further Notes

Not verified: the VR level markers; whether integer-grid dragging feels right (ADR 2); the Slovenian terms against UL sources; the page of §4.8 beyond the footer reading (pages 14–15). Not run: browser checks, because no code exists.
