# Circle geometry and constructions (Geometrija krožnice in načrtovalne naloge)

**Status:** draft, 2026-11-10 (stream families-prep); prepared, not scheduled for release. Tasks: [docs/tasks/circle-geometry](../tasks/circle-geometry/README.md). Decisions 1–3: [ADR 0045](../adr/0045-circle-construction-graph-and-exact-tangency.md).
**Agreed:** owner scheduled preparation 2026-11-10 (family #6 of the [top-15 research note](../research/lesson-family-candidates-2026-11-09.md)); details below are proposals for owner review.
**Source:** the research note's entry 6 (opening lesson, lesson list, risks) and the matura catalogue M-MAT-2026, text extraction read for this spec: §4.6 (page 13; *Točke, premice in krožnice v ravnini*, *Središčni in obodni koti*, *Kot v polkrogu*, *Središčni razteg, podobnost*, *Načrtovalne naloge*; page footers follow the page text in the extraction), §4.7 (page 14; *Polmer trikotniku včrtanega in ocrtanega kroga*) and §4.11 *Stožnice* (page 19; *Krožnica v središčni in premaknjeni legi*, *Tangente stožnic*). The catalogue text has **no** *potenca točke*, *potenčna premica*, *Apolonijeva krožnica* or common-tangent item (searched *potenc*, *tangent*, *tetiv*, *sekant*), so CG2–CG4 are enrichment beyond the matura. Level markers (VR) were not verified. FMF pages and textbooks are not opened. Part of the [new lesson families](new-lesson-families.md) (the index entry is added by the handler).

## Problem Statement

Bezeg has the circle as a kernel and as parts of other lessons: the inscribed angle and Thales (`inscribed-angle-thales`), the notable points with the circumcircle and incircle (`notable-points`), and power of a point with inversion (`inversion`), all in the [triangle geometry chapter](triangle-geometry-lessons.md) (`src/learning/content/triangleGeometryChapter.ts`). It has nothing that teaches how a tangent is constructed, how two circles relate through their radical axis, where the Apollonius circle comes from, or how a common tangent of two circles is drawn. These constructions are the classic compass-and-ruler content of §4.6 *Načrtovalne naloge* and the geometric base of §4.11 *Tangente stožnic*, and they are best learned by dragging the point or the circle and watching the construction follow.

## Solution

Add a Learn chapter **Geometrija krožnice / Circle geometry and constructions** with four guided activities, each backed by a Demonstration that stays available for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). Audience: upper secondary (CG1) to enrichment (CG2–CG4). Each lesson is 5–7 steps, predicts before it reveals and ends in free exploration. No exercises, grading or progress. Each picture is labelled an **argument** (its construction establishes the claim) or an **illustration**.

**Handler decisions, reversible.** (1) Thales is excluded: `inscribed-angle-thales` exists and CG1 only uses its result. (2) The research list names "the circle through three points and the incircle (PIK §4.7 radii)"; that content is lesson T1 of the triangle spec (circumcircle, incircle, \(R=abc/4S\) and \(r=S/s\) cross-checked, `src/compgeo/triangle.ts:286,294`), so it is linked from CG-chapter intro and not repeated; the family therefore has four lessons. (3) Power of a point as a secant product and tangent length is lesson T5; CG2 starts from it and teaches only what T5 does not (radical axis, radical centre). If T5 is not released, the link is omitted and CG2's first step restates the definition \(|PO|^2-\rho^2\).

### Release batches

| Batch | Lessons | Release condition |
| --- | --- | --- |
| 0 (foundation) | Kernel `src/compgeo/circleConstructions.ts` (below) with oracle tests; ADRs 1–2 accepted | Kernel tests pass; no learner-visible route needed |
| A | CG1 Tangents from a point; CG2 Radical axis and radical centre | Batch 0 done; construction graph passes the batch gate |
| B | CG3 Apollonius circle; CG4 Common tangents of two circles | Batch A released |

Publish batches separately. Do not expose unimplemented Demonstrations.

### Reuse and new modules

Verified by search in `src/`:

- `src/compgeo/circle.ts`: `Circle` (line 37, centre and squared radius, exact), `Line` (44), `GeneralizedCircle` (51), `powerOfPoint` (96), `lineValue` (101), `lineThrough` (106), `intersectLineCircle` (118) and `intersectCircles` (137) with the exact classification `none | tangent | two` (and `coincident`), `circlePoint` (168), `angleBetween` (179), `thalesDot` (189), `invertExact` (194). Every discrete decision is already exact on rational input and the intersection points are doubles labelled `inexact: true`.
- `src/compgeo/triangle.ts`: `circumradiusSquared`, `incentre`, `inradius` (T1 cross-link only). `src/compgeo/grid.ts`: `GridPoint`, `GRID_COORD_LIMIT` (line 12). `src/compgeo/rational.ts`: `Rational` (line 38), `RationalPoint` (128).
- `src/projective/conic.ts`: `polar` (239) and `tangentPoints` (355) of a conic; used only as an **independent oracle** for CG1 (a different route: conic polar, not the kernel's chord of contact). Not a dependency of the shipped kernel.
- `InscribedAngleGraph` (`src/graphs/graphFactories.ts:218`, `src/graphs/compgeo/InscribedAngleGraph.tsx`) is the precedent for a circle graph with handles; it is not modified.
- Searched `radicalAxis`, `apollonius`, `commonTangent`, `tangentPoints` in `src/`: nothing else exists.

New modules (names suggested): `src/compgeo/circleConstructions.ts` (the kernel below), `src/compgeo/circleConstructionModel.ts` (state parse/validation), graph `src/graphs/compgeo/CircleConstructionGraph.tsx`. Pure maths stays free of React, JSXGraph and localization.

### Decisions needing an ADR

1. **Graph shape and placement.** (a) One `CircleConstructionGraph` with modes `tangents`, `radical`, `apollonius`, `common`; (b) one graph per lesson; (c) extend `InscribedAngleGraph`. (c) would change the existing route and stored Presets; (b) duplicates handles, grid and snapping. Proposal: (a), a new chapter next to the triangle geometry chapter and the Demonstrations in the `plane-geometry` family; decided before Batch A.
2. **Input snapping and tangency policy.** (a) Centres and points on the integer grid, radii on a \(1/4\) grid in \([1/4,8]\), Apollonius ratio \(k\) on a \(1/2\) grid in \([1/2,4]\), so \(r^2\) and \(k^2\) are exact rationals and every tangent/none/two decision is exact; (b) continuous inputs with a tangency tolerance \(\varepsilon\); (c) rational input of any denominator. Proposal: (a): tangency is then reachable by dragging (for example distance \(8=5+3\)) and never depends on \(\varepsilon\). Before Batch A.
3. **Common-tangent representation.** (a) tangent lines as double triples \((a,b,c)\) labelled inexact, apart from the exact cases; (b) tangent points only; (c) symbolic. Proposal: (a), because the lines pass through irrational points when radii are rational. Before Batch B.

## Circle construction kernel (batch 0, owned by this spec)

Pure TypeScript in `src/compgeo/circleConstructions.ts`; it builds on `circle.ts` and does not re-implement it. Contracts are stable, names are not.

1. **Tangents from a point.** `tangentsFrom(P, circle)` with rational \(P\), \(\rho^2>0\): `power = powerOfPoint(P, circle)` exact; `inside` (power \(<0\), no tangent), `on` (power \(=0\), one tangent, the point of contact is \(P\) exactly, the line is \((P-O)\cdot X=(P-O)\cdot P\)), `outside` (power \(>0\)). Outside: the chord of contact is the exact rational line \((P-O)\cdot(X-O)=\rho^2\); the points of contact are `intersectLineCircle(chord, circle)` (doubles, inexact); the tangent length squared equals `power`, exact. Radius zero (point circle) is rejected.
2. **Radical axis and centre.** `radicalAxis(c1, c2)`: the exact line \(\operatorname{pow}_1=\operatorname{pow}_2\), that is \(2(O_2-O_1)\cdot X=|O_2|^2-|O_1|^2-\rho_2^2+\rho_1^2\); `concentric` when \(O_1=O_2\) (no axis, or `coincident` if also \(\rho_1=\rho_2\)). `radicalCentre(c1, c2, c3)`: the exact intersection of two axes, or, when the centres are collinear (exact test: cross product of centre differences is \(0\)), `coaxal` if the two axes are the same exact line (for example three circles through the same two points; every point of that axis has equal power to all three) and `parallel` otherwise; with a centre, the common power at that point.
3. **Apollonius locus.** `apolloniusLocus(A, B, m)` with \(m=k^2>0\) rational: the set \(|PA|^2=m\,|PB|^2\). For \(m=1\) the exact line (perpendicular bisector); otherwise the exact `Circle` with centre \((mB-A)/(m-1)\) and \(\rho^2=m\,|AB|^2/(m-1)^2\). \(A\neq B\). Membership of a rational point is the exact test \(|PA|^2=m|PB|^2\).
4. **Common tangents.** `commonTangents(c1, c2)` with centres on the grid and rational radii \(r_1,r_2>0\) (the circle is built with \(\rho^2=r^2\)). Count by exact rules from `intersectCircles`: with \(k=d^2-r_1^2-r_2^2\): `two` intersections give \(2\) tangents; `tangent` gives \(3\) if \(k>0\) (external contact) and \(1\) if \(k<0\) (internal contact; the one tangent is rational: perpendicular to the centre line through the exact point of contact); `none` gives \(4\) if \(k>0\) (separated) and \(0\) if \(k<0\) (nested or concentric); `coincident` gives infinitely many (no lines drawn). The external homothety centre \(X=(r_1O_2-r_2O_1)/(r_1-r_2)\) and internal one \(I=(r_2O_1+r_1O_2)/(r_1+r_2)\) are exact rationals (\(X\) does not exist for \(r_1=r_2\): the external tangents are then parallel to the centre line). Tangent lines come from the tangent points of `tangentsFrom(X, c1)` and `tangentsFrom(I, c1)` (doubles, inexact).

## Concept contracts and acceptance criteria

Examples are implementation defaults; equivalents may replace them if the learning goal, edge cases and independent checks are kept. Every number was computed by the author with `node` (scripts and outputs in the families-prep note `docs/reviews/feature-streams/families-prep/notes/spec-trig-circle.md`); none is guessed.

### CG1. Tangents from a point

- Learning goal: from a point outside a circle there are exactly two tangents, their points of contact lie on the circle with diameter \(OP\), the two tangent lengths are equal and \(PT^2=|PO|^2-\rho^2\); one tangent from a point on the circle, none from inside.
- Prerequisites: Thales and the inscribed angle (`inscribed-angle-thales`); the power of a point is linked from `inversion` (T5) and not repeated.
- Default example (*checked*): \(O=(0,0)\), \(\rho=5\), \(P=(13,0)\): power \(144\), tangent length \(12\); the Thales circle on \(OP\) has centre \((13/2,0)\) and \(\rho^2=169/4\); the points of contact are \(T_{1,2}=(25/13,\pm60/13)=(1{,}9231;\,\pm4{,}6154)\) on the rational chord of contact \(x=25/13\); \((T-O)\cdot(T-P)=0\) exactly in rationals. \(P=(5,0)\) (on the circle, power \(0\)): one tangent \(x=5\). \(P=(3,0)\) (inside, power \(-16\)): none.
- Steps: (1) a circle and a point \(P\); predict how many tangents there are when \(P\) is inside, on and outside; (2) drag \(P\) across the circle and read the count; (3) for \(P\) outside draw the circle on \(OP\) as diameter, it meets the circle in two points; (4) the right angle at each point (Thales) shows \(PT\perp OT\), a tangent; (5) the equal lengths \(PT_1=PT_2=12\) by Pythagoras, and the chord of contact; (6) free exploration with a link to the power-of-a-point lesson.
- Graph needs: a circle with draggable centre and radius handles, a draggable point \(P\), the Thales circle, the two tangents with points of contact, readouts of power, tangent length and count, numeric inputs for the centre, radius and \(P\), keyboard stepping, a text status.
- Acceptance:
  1. Numbers above agree (power and tangent length exact; points of contact to the displayed precision); the classification is the exact sign of `powerOfPoint`, not a tolerance.
  2. In a unit test over all grid points \(P\) in \([-16,16]^2\) and a set of circles: each point of contact lies on the circle and satisfies \((T-O)\cdot(T-P)=0\) to \(10^{-12}\), and agrees with `tangentPoints` of `src/projective/conic.ts` (independent oracle).
  3. The Thales-circle construction (steps 3–4) is an **argument** that the two lines through \(P\) and \(T_{1,2}\) are tangents, since each \(T\) is on both circles; step 5's equal lengths follow by Pythagoras (an **argument**). Dragging is an **illustration**. The prose says the other points of the circle give secants.
  4. When \(P=O\) the status says there is no tangent from the centre; \(\rho\) must be positive.
  5. Reset, Preset, restore, both languages pass.

### CG2. Radical axis and radical centre

- Learning goal: the points with equal power with respect to two circles form a line perpendicular to the line of centres, passing through the common points when they exist; three circles with non-collinear centres have one point of equal power, the radical centre.
- Prerequisites: CG1; power of a point (T5 `inversion`).
- Default example (*checked*): \(c_1\): centre \((0,0)\), \(\rho=5\); \(c_2\): centre \((6,0)\), \(\rho=3\). Radical axis \(x=13/3\), through the common points \((13/3,\pm2{,}4944)\) (\(y^2=56/9\)). Disjoint pair \(c_1\), \(c_2'\): centre \((10,0)\), \(\rho=2\): axis \(x=121/20=6{,}05\), between the two circles. Externally touching pair, \(c_2''\): centre \((8,0)\), \(\rho=3\): axis \(x=5\), the common tangent at the point of contact. Radical centre of \(c_1\), \(c_2\) and \(c_3\) (centre \((3,6)\), \(\rho=2\)): \(\left(13/3,\,10/3\right)\) with common power \(44/9=4{,}8889\), tangent length \(2{,}21108\); the circle about it with that radius cuts each of the three at right angles.
- Steps: (1) two circles; predict which points of the plane have the same power with respect to both; (2) drag a probe point and compare its two powers; (3) the points of equal power form a line; (4) the line passes through the intersection points; (5) move the circles apart and into contact; (6) a third circle and the radical centre; (7) free exploration.
- Graph needs: up to three circles with handles and numeric inputs, a probe point with its powers as numbers, the radical axes, the radical centre and its orthogonal circle, text statuses.
- Acceptance:
  1. Numbers above agree; at every sampled rational point on the axis the two powers are equal as exact rationals (test); at the common points to \(10^{-12}\).
  2. Touching circles: `intersectCircles` reports `tangent` exactly and the axis passes through the exact point of contact.
  3. Concentric circles give a text status (no axis; equal circles: "every point"); collinear centres give "the axes are parallel, no radical centre" or, when the axes coincide exactly, "the circles share one radical axis" (coaxal), decided by the exact cross product and exact line equality; no `NaN` and no infinite coordinate.
  4. "Equal power is a line" is an **argument** (the difference of the two power equations is linear in \(X\)), stated with that equation; the probe and the radical centre are an **illustration**.
  5. Reset, Preset, restore, both languages pass.

### CG3. Apollonius circle

- Learning goal: the set of points whose distances to two fixed points have a fixed ratio \(k\neq1\) is a circle whose diameter has the internal and external division points of \(AB\) as its endpoints; for \(k=1\) it is the perpendicular bisector; \(A\) and \(B\) are inverse with respect to this circle.
- Prerequisites: CG1; inversion (`inversion`, T5) is linked for the last step.
- Default example (*checked*): \(A=(0,0)\), \(B=(6,0)\), \(k=2\) (\(m=4\)): the circle has centre \((8,0)\), \(\rho=4\), \(\rho^2=16\); the points on \(AB\) are \(x=4\) (\(PA=4\), \(PB=2\)) and \(x=12\) (\(PA=12\), \(PB=6\)); the grid point \((8,4)\) has \(|PA|^2=80=4\cdot20=4|PB|^2\) exactly; \(|OA|\cdot|OB|=8\cdot2=16=\rho^2\), and `invertExact` sends \(A\) to \(B\). For \(k=1/2\) (\(m=1/4\)): centre \((-2,0)\), \(\rho^2=16\); \(k=1\): the line \(x=3\).
- Steps: (1) two points \(A,B\) and a point \(P\); predict the shape of the set where \(PA=PB\), then \(PA=2\,PB\); (2) drag \(P\) and read the ratio; (3) mark the points on the line \(AB\) with ratio \(k\) (internal and external division); (4) the circle on these two points as diameter; (5) other points on it keep the ratio; (6) \(A\) and \(B\) are inverse in this circle; (7) free exploration.
- Graph needs: two draggable points on the grid, a ratio chooser (or numeric \(k\)) and a probe \(P\) with the ratio readout, the two division points, the circle or line, a text status for \(P=B\).
- Acceptance:
  1. Numbers above agree; the grid points on the locus are exactly those with \(|PA|^2=m|PB|^2\) (exact test), and the unit test enumerates all grid points in a window and compares with the kernel circle.
  2. The inversion step uses `invertExact` (exists) and returns \(B\) exactly for \(A\); no new inversion code.
  3. The circle's characterisation is an **argument** by expansion of \(|PA|^2-m|PB|^2=0\) into a circle equation (shown in the prose); the division points on \(AB\) follow from the bisector construction (also an **argument**); the dragged \(P\) is an **illustration**.
  4. At \(P=B\) the ratio is undefined and the status says so; \(A=B\) is rejected with a message.
  5. Reset, Preset, restore, both languages pass.

### CG4. Common tangents of two circles

- Learning goal: two circles have \(4\), \(3\), \(2\), \(1\) or \(0\) common tangents, according to how far apart they are; the external tangents meet at the external centre of similarity, the internal tangents at the internal one.
- Prerequisites: CG1; the central dilation (PIK §4.6 *Središčni razteg*).
- Default example (*checked*): \(c_1\): centre \((0,0)\), \(r_1=3\); \(c_2\): centre \((10,0)\), \(r_2=1\): \(4\) tangents. External centre \(X=(15,0)\), internal centre \(I=(15/2,0)\); angles with the centre line \(\arcsin(3/15)=11{,}537^\circ\) and \(\arcsin(3/(15/2))=23{,}578^\circ\) (the same angles from the independent support-function equation \(\cos t=(\varepsilon_1r_1-\varepsilon_2r_2)/d\) with \(\cos t=0{,}2,\,0{,}4\)); the distance between the two points of contact on one tangent is \(\sqrt{100-4}=9{,}79796\) (external) and \(\sqrt{100-16}=9{,}16515\) (internal) (corrected at F1: earlier wording called these tangent segments from the centre; the tangent length from \(X\) to \(c_1\) is \(\sqrt{216}\)); the point of contact on \(c_1\) from \(X\) is \((0{,}6;\,\pm2{,}93939)\). Counts for centre distance \(d\) with radii \(5,3\): \(d=8\) gives \(3\), \(d=7\) gives \(2\), \(d=2\) gives \(1\), \(d=1\) gives \(0\); equal radii \(3,3\), \(d=10\): external tangents \(y=\pm3\) (parallel), internal tangents at \(\arcsin(0{,}6)=36{,}8699^\circ\) through \((5,0)\).
- Steps: (1) two circles; predict how many lines touch both when they are far apart, touching, overlapping, nested; (2) drag one circle and watch the count; (3) the external centre \(X\) and the tangents from it (CG1 construction); (4) the internal centre and the other two; (5) equal radii: the external tangents become parallel; (6) the touching positions; (7) free exploration.
- Graph needs: two circles with handles and numeric inputs, the common tangents with points of contact, the two centres of similarity, count and case status, equal-radius handling.
- Acceptance:
  1. Numbers above agree; the count is the exact rule of the kernel (grid-enumerated test over centre distances and radii against a count computed independently from the pairs of tangent normals).
  2. Each drawn tangent line is at distance \(r_1\) from \(O_1\) and \(r_2\) from \(O_2\) to \(10^{-12}\) (oracle: the support-function solution, independent of the homothety construction).
  3. Touching: three (or one) tangents, the tangent at the point of contact is exact; equal radii have no external centre and show parallel external tangents; coincident circles give a text status.
  4. The homothety construction is an **argument** that the drawn lines are common tangents (each is tangent to \(c_1\) by CG1 and the dilation maps \(c_1\) to \(c_2\)); the count by position is an **illustration** backed by the exact rule.
  5. Reset, Preset, restore, both languages pass.

## User Stories

1. As a student, I drag a point and see the two tangents appear, with the circle on \(OP\) explaining why.
2. As a student, I find the line of equal powers of two circles and the one point of equal power of three.
3. As a student, I see a circle appear as the set of points with a fixed distance ratio.
4. As a student, I count the common tangents of two circles as I move one.
5. As an educator, I project each construction and set the circles by number.
6. As a reader on a phone or keyboard, I enter coordinates and radii numerically and read text statuses.

## Terms (proposals, to be settled by localization.md#choosing-new-terms)

Searched `src/localization/sl.ts` and [the glossary](../localization.md): the app uses *tangenta*, *sekanta*, *tetiva*, *točka dotika* (`sl.ts` line 1288), *potenca točke na krožnico*, *obodni kot*, *Talesov izrek*, *inverzija*. No *potenčna premica* or *Apolonijeva krožnica* exists. The PIK text supplies *središčni razteg* and *tangente stožnic*.

| English | Slovenian proposal | Basis |
| --- | --- | --- |
| tangent; point of contact | tangenta; točka dotika | existing |
| power of a point | potenca točke na krožnico | existing table |
| radical axis | potenčna premica | proposal; standard in Slovenian geometry texts, not verified here |
| radical centre | potenčno središče | proposal, same |
| Apollonius circle | Apolonijeva krožnica | proposal, standard Slovenian form of the name |
| Thales circle | Talesova krožnica | existing *Talesov izrek* |
| common tangent (external / internal) | skupna tangenta (zunanja / notranja) | proposal; transparent wording |
| centre of similarity | središče raztega | PIK §4.6 *središčni razteg* |
| chord of contact | tetiva dotikališč | proposal; *tetiva* exists, to settle |

## Implementation Decisions

- The kernel is new pure TypeScript (`src/compgeo/circleConstructions.ts`) over `circle.ts`; the graph adapts it. No graph-global cache state.
- Graph state: mode, circle centres (grid points), radii (\(1/4\) grid), probe point, Apollonius \(k\); derived values are recomputed from validated state and never trusted from a Preset.
- Lesson scenes use typed actions (`set-mode`, `set-circle`, `set-point`, `set-ratio`) registered through the lesson-action registry as in the [linear-maps spec](linear-maps-lessons.md#reuse-and-new-modules); multi-action scenes run synchronously in one tick and are unit tested that way. No playback.
- **Tangency tolerance policy.** The kernel contains no \(\varepsilon\). Every none/tangent/two decision (CG1 power sign, CG2 contact, CG4 counts) is an exact rational comparison on snapped inputs. Drawn points are doubles. The nearest non-tangent pair on the input grid has discriminant at least \(1/256\); the two intersection points are \(\sqrt D/d\) apart (as in `intersectCircles`), and two intersections need \(d\le16\) with radii at most \(8\), so they are at least \(\sqrt{1/256}/16\approx3{,}9\cdot10^{-3}\) apart (checked in review). That is still below one pixel at usual zoom, so the status text states "two points" from the exact result and the readout gives the separation; the picture never decides the state.
- Routes and Presets are additive. Existing routes (`inscribed-angle`, `inversion`) and Presets keep working. No breaking change.
- **Gating** (boundary in [families-prep](../tasks/feature-streams/families-prep.md#boundary-with-the-controls-stream-owner-decision-2026-11-10)). Ungated now: this spec, F0 plan and ADR drafts, F1 kernel (pure file and oracle tests), F2a `CircleConstructionGraph` as a new graph class using `src/inputs/` as it is, with no route (no playback, stepper or step counter). Waits on Controls step 7: F2b registration and routes, F3 lessons, F4 chapter, F5 media. The spec plans no edits to `BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/`, the lesson runtime or existing panels; any shared-control need is a dependency on the Controls stream.
- Lesson text is one-shot ([rule](new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31)); prose follows `lessonMathNotation.test.ts`.
- **F2b decisions** (handler 7, 2026-11-11; evidence `docs/reviews/feature-streams/families-prep/notes/f2b-circle-combinatorics.md`). `circle-construction` at `/circle-constructions` in *Geometrija ravnine*, as ADR 0045 proposed. Feature-local registration in the subdirectory `src/graphs/compgeo/circleConstruction/` (the legacy `compgeo` directory keeps its central registration, so the graph file is not moved) and a new Preset collection keyed `circle-construction`, checked by the model parser, following the trigonometry F2b pattern; the row ships with `lesson: false` and pending entries until F3–F5. The default construction fills about half of the opening board.
- **F3 Batch B decisions** (handler 14, 2026-11-12; evidence `docs/reviews/feature-streams/families-prep/notes/f3-circle-b.md`). CG3 and CG4 join the chapter `circle-geometry` as sections `apollonius-circle` and `common-tangents` (lesson ids `circle-construction-apollonius`, `circle-construction-common-tangents`, after the CG1/CG2 pattern). The action kind `circle` gains `set-apollonius` (optional A, B, P, k; validated in full before one write), in place of the `set-ratio` named above, because the lesson also moves A, B and P. The common mode reads out no points of contact, angles or contact distances; the lessons give them as stated arithmetic and call them approximate. CG3 steps 1 and 2 run at k = 1, so the circle is not drawn before the division step. Steps that reveal something new ask first (CG3 division points and inverse, CG4 touching cases, the external centre at equal radii, the internal centre at contact); the derivation follows in the observation.

## Testing Decisions

- Kernel oracles: tangent points against `tangentPoints` of `src/projective/conic.ts` and the perpendicularity \((T-O)\cdot(T-P)\); radical axis by exact equality of the two powers at sampled rational axis points; radical centre by equal powers for three circles; Apollonius by enumerating grid points against \(|PA|^2=m|PB|^2\) and by `invertExact` (\(A\mapsto B\)); common tangents by distance to both centres and by the independent support-function solution; counts by enumeration of centre distances and radii; `intersectCircles` and `intersectLineCircle` are reused and keep their own tests (`src/compgeo/circle.test.ts`).
- Edge tests: \(P=O\), \(P\) on the circle, concentric and coincident circles, collinear centres, \(A=B\), \(k=1\), \(P=B\), equal radii, internal and external contact, nested circles; no `NaN` or infinite result.
- Scene, Preset (save/reopen, export/import, malformed or out-of-range input), lesson/content tests (step counts, lockstep languages, `lessonMathNotation.test.ts`, `tsc --noEmit`) as in the other families.
- Browser: smoke row per lesson (default scene, handle drag, numeric entry, degenerate cases, restore, catalog link, narrow viewport, keyboard, touch); the existing `inscribed-angle` and `inversion` routes are smoke checked once in Batch A.
- Performance: a drag moves two circles and updates at most four tangent lines and two axes; measure per [the performance plan](../performance-plan.md) before choosing a drawing approach.

### Batch-wide acceptance gate

1. Each Demonstration opens directly and after refresh, with its chapter-owned guided activity and a static preview.
2. The concept contracts are met with checked examples; discrete outcomes are exact on snapped inputs and no tolerance is shown as exact.
3. Both languages, accessible numeric inputs for every handle, restore on exit, Presets and figure export pass; check legibility in Presentation mode.
4. Existing routes, Presets and lessons of the triangle geometry chapter behave as before.
5. TypeScript, unit and content tests, production build, smoke checks and mathematics review pass.

## Correctness Notes

- Exactness: a circle carries \(\rho^2\); with integer centres and radii on a \(1/4\) grid, \(\rho^2\) is a multiple of \(1/16\), powers and `intersectCircles` discriminants are exact rationals with granularity \(1/256\). Points of contact, intersection points and tangent lines are computed doubles (square roots), shown rounded, and not compared with `===`.
- Tangency is a degenerate intersection (discriminant \(0\)). It is decided exactly; no epsilon exists. Near-tangency on the grid is visible as two very close points plus a numeric separation (see Implementation Decisions).
- Radical axis of tangent circles passes through the point of contact; for concentric circles no axis exists; centres on one line give parallel axes (no radical centre) or one common axis (coaxal circles).
- Apollonius: \(m=1\) is a line, not a circle of infinite radius; the circle's centre \((mB-A)/(m-1)\) is undefined at \(m=1\) and the kernel never divides by \(m-1=0\).
- Common tangents: \(X\) does not exist for equal radii; coincident circles have infinitely many.
- The research note's "constructions must be true constructions to count as arguments" is applied: CG1 and CG4 draw the compass construction; CG2 and CG3 are algebraic arguments with an illustration.
- Pictures illustrate instances; every "always" statement is a theorem or an explicit argument.

## Out of Scope

- Thales and the inscribed angle (`inscribed-angle-thales`), the circumcircle and incircle (T1), secant products and inversion (T5): linked, not re-taught.
- The problem of Apollonius (circle tangent to three given circles), Descartes' circle theorem, Miquel and Ptolemy theorems, Steiner chains.
- Conic tangents beyond the circle (the projective-conics family), orthogonal and coaxal pencils beyond the radical axis.
- Exercises, grading, progress, free-text input, a formula parser; changes to the existing circle kernel's behaviour or the inscribed-angle and inversion lessons.
- Renderer replacement or build-tool changes.

## Further Notes

Not verified: VR level markers of the PIK items; the Slovenian terms (no FMF or textbook source opened); whether the integer grid and \(1/4\) radius steps feel comfortable for dragging; whether the 3-circle radical-centre step is too heavy for one lesson; drawing performance. Whether T5 is released first is a scheduling dependency of CG2's cross-link. The trigonometry spec ([trigonometry-lessons.md](trigonometry-lessons.md)) was written in parallel and was not read.
