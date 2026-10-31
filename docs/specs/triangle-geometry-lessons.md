# Triangle geometry and inversion (Geometrija trikotnika in inverzija)

**Status:** scheduled, 2026-10-31 (stream `maps`). Tasks: [docs/tasks/triangle-geometry](../tasks/triangle-geometry/README.md). ADR decisions 1–2 and placement: [ADR 0030](../adr/0030-triangle-geometry-rationals-gliders-and-placement.md); the other open owner items of "Further Notes" are settled in the task README.
**Agreed:** 2026-10-31 (owner approved the family; details below are proposals for owner review).
**Source:** [lesson-family candidates, expansion, E3](../research/lesson-family-candidates-2026-10-31-expansion.md) (candidate E3; sample table row E3; correctness notes). It cites the matura catalogue M-MAT-2026 §4.6 and §4.7 (read by the research note and re-read for this spec: §4.6 lists *Znamenite točke trikotnika*, the goals "nariše geometrijske like … s programi za dinamično geometrijo" and "preiskuje geometrijske probleme z uporabo IKT", and *Središčni in obodni koti*, *Kot v polkrogu*; the formula sheet gives \(r=S/s\) and \(R=abc/(4S)\)) and the FMF course *Elementarna geometrija* (123, 2025 programme page, opened: *Talesovi izreki, Evklidovi izreki o krogu, tetivni štirikotnik, potenca točke na krožnico, inverzija, Apolonijeva krožnica, Simsonova premica, Cevov in Stewartov izrek, Eulerjeva premica, krožnica devetih točk, Fagnanov problem, trilinearne koordinate, Morleyev izrek*). Textbooks named there (Coxeter, Dörrie, Pagon) are cited, not opened. Part of the [new lesson families](new-lesson-families.md) index.

## Problem Statement

The matura catalogue asks students to explore *znamenite točke trikotnika* with dynamic-geometry software, and the FMF course *Elementarna geometrija* turns the same objects into theorems: the Euler line, the nine-point circle, the Simson line, power of a point and inversion. Bezeg has no triangle geometry. A student cannot drag a vertex and watch the centroid, circumcentre, incentre and orthocentre move, cannot see that the circumcentre leaves the triangle exactly when it becomes obtuse, and has no place to meet inversion, the map that sends circles through a point to lines. Dragging shows instances, not proofs, so the lessons must say which statement is a theorem (with a source) and which is only a picture, and must treat collinear triangles, which have no circumcircle, and near-degenerate drags honestly.

## Solution

Add a Learn chapter **Geometrija trikotnika in inverzija / Triangle geometry and inversion** with five chapter-owned guided activities, each backed by a catalog Demonstration that also works for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). Audience: upper secondary (T1, T2) to first-year university (T3–T5). Each lesson is 5–7 steps (an editorial target), asks the learner to predict before a Show or Next step reveals, states the theorem with its source in the prose, labels every drag an illustration, and ends in free exploration. No exercises, grading or progress. Lesson order in the chapter is T1 to T5; the research note lists inscribed angle third and Simson fourth, and this spec moves the inscribed angle to T2 because T3 and T4 use it in the prose arguments.

### Release batches

| Batch | Lessons | Release condition |
| --- | --- | --- |
| 0 (kernel) | Triangle and circle kernel below, with exact rational type, the ADR, and unit tests | ADR accepted; kernel tests pass; no learner-visible route required |
| A | T1 Notable points; T2 Inscribed angle and Thales | Batch 0 done; batch gate below |
| B | T3 Euler line and nine-point circle | Batch A released |
| C | T4 Simson line | Batch B released; tolerance policy of T4 accepted by the owner |
| D | T5 Power of a point and inversion | Batch C released **and** the inversion kernel of [complex-maps-lessons.md](complex-maps-lessons.md) (E2) merged (hard dependency, see below) |

Publish batches separately. Do not expose unimplemented Demonstrations or advertise unreleased lessons.

### Dependencies (precise)

Verified against the sibling specs; the inversion anchor was cross-checked against [complex-maps-lessons.md](complex-maps-lessons.md), which owns \(z\mapsto c+r^2/\overline{z-c}\) and names this spec as its consumer.

| Needed | Source | Strength | What happens if absent |
| --- | --- | --- | --- |
| Robustness policy (snapped grid, exact arithmetic) | the ADR of [convexity-hulls-lessons.md](convexity-hulls-lessons.md), "Predicate module and robustness policy" (option A recommended) | **Hard for the policy, soft for the code.** E3 must adopt whatever the ADR decides; it must not invent a second policy. | If the ADR picks tolerance (option C), exact rational centres still work on the same integer inputs, but every "collinear / on the circle" status would need a stated tolerance and T4 would be redesigned. |
| `orient(a,b,c)` sign predicate | same spec, `src/compgeo/` proposal | **Soft.** Used for the collinear-triangle test, the inside-triangle test and the Simson collinearity test. It is a three-line integer expression; if the predicate module is not merged, Batch 0 waits for it rather than copying it. | Batch 0 blocked, not duplicated. |
| Draggable point-set graph (snapping, numeric fields, keyboard moves, Preset validation) | same spec, "Draggable point-set and polygon graph" | **Soft.** Reused for the three vertices and the extra labelled points (\(P\), circle centre). A triangle needs a fixed count of three, not a list; if the point-set graph is not built, a minimal three-point graph with the same snapping and numeric inputs is written, and merged into the shared graph later. | Slower, not blocked. |
| `incircle(a,b,c,d)` | [triangulation-voronoi-lessons.md](triangulation-voronoi-lessons.md), "`incircle`" | **Soft.** An exact "\(P\) is on the circumcircle" test; the same answer is obtained from the kernel's own exact power of a point, so E3 does not wait for it. A test cross-checks the two when both exist. | None. |
| Circumcentre | none exists in `src/` (searched `circumc`, `incenter`, `orthocent` in `src`: no matches). The triangulation spec defines Voronoi vertices as exact rationals with denominator \(2\cdot\)orient but no named function (`triangulation-voronoi-lessons.md:81`). | **E3 owns it.** The research note says E3 reuses circumcircle code from the triangulation kernel; there is no such code yet, so the direction is reversed: the Voronoi drawing should call E3's `circumcentre` when both specs are built. Flag for the integration decision. | Two circumcentre implementations if the triangulation family lands first. |
| Circle inversion as \(z\mapsto c+r^2/\overline{z-c}\) | [complex-maps-lessons.md](complex-maps-lessons.md) (E2) owns it | **Hard for T5 only.** T5 must call E2's function for drawn images and must not re-implement it. | T5 does not ship; T1–T4 are unaffected. E2's inversion is expected to work on doubles; the exact rational image in this spec's kernel is a separate, small, E3-owned helper used for tests and readouts (see ADR 1). |
| [linear-maps-lessons.md](linear-maps-lessons.md), [projective-conics-lessons.md](projective-conics-lessons.md) | siblings E1 and E7 | None. E7's homogeneous-coordinate kernel could later carry the same circumcentre; not required. | None. |

### Placement

Demonstrations need a family in `families` ([demonstrations.ts](../../src/demonstrations.ts), line 7 onward); `src/learning/content/familyChapters.ts` holds the per-family chapters and `src/learning/runtime/lessonCatalog.ts` the scene actions (both verified to exist). Triangle geometry is classical school geometry rather than algorithm design, so the convexity spec's proposed family *Računska geometrija* would hide it from students who look for the matura topic. Options: (a) a new family **Geometrija ravnine / Plane geometry** (proposal; matches the FMF course name *Elementarna geometrija* only loosely), (b) join *Računska geometrija*. Owner decision; the spec works with either. Routes proposed (new, additive): `/bezeg-2.0/triangle-centres`, `/bezeg-2.0/inscribed-angle`, `/bezeg-2.0/euler-line`, `/bezeg-2.0/simson-line`, `/bezeg-2.0/inversion`.

### Reuse and new modules

Verified by search in `src/`: nothing for triangle centres, circumcircles or inversion exists (the research note's search found the same). `src/analysis/complex.ts` has complex multiplication on a \(0.05\) grid and is not a base for this kernel. Scene-store and board-ownership rules are the repository's; no new infrastructure is proposed.

New modules (names are suggestions; contracts below are the stable part): `src/compgeo/rational.ts` (BigInt rational, see ADR 1), `src/compgeo/triangle.ts` (centres, radii, classification, nine-point circle), `src/compgeo/circle.ts` (circle through points, power of a point, circle–circle and line–circle intersection, generalized circle), `src/compgeo/simson.ts` (feet, pedal collinearity), a three-vertex triangle graph (or the point-set graph in triangle mode), five Demonstration graphs, five lesson sets. Pure mathematics stays free of React, JSXGraph, localization and graph-global cache state.

### Decisions needing an ADR

1. **Exact rational arithmetic as the kernel number type**, shared across families. Alternatives: (a) `bigint` numerator/denominator pairs, exact for all centres, powers and feet; (b) doubles with a documented tolerance (cheap, but "collinear", "concurrent" and "on the circle" become approximate and a tolerance would be shown as exact); (c) doubles on snapped inputs with exactness only for `orient`/`incircle` (convexity spec), rationals only where needed. Recommendation: (a) in a small `Rational` module used only by predicates, centre computation and tests; drawing converts to doubles at the last step. The triangulation spec already needs exact rational Voronoi vertices (`triangulation-voronoi-lessons.md:81`), so the type is cross-family and the ADR belongs with the convexity robustness ADR, not to E3 alone. Decide before Batch 0.
2. **Free-parameter points (gliders) versus grid-snapped points** (T2, T4). A point constrained to a circle by an angle \(t\) cannot be a grid point. Recommendation: vertices, centres and the free \(P\) of T4/T5 are grid-snapped and exact; the single glider parameter in T2 and T4 is a double and every claim made about it is labelled approximate with a stated tolerance (Correctness Notes). Record that the glider is the only inexact input in the family. Owner may prefer a separate ADR; a spec-level decision is enough if the owner agrees.

## Terms (proposals, to be settled by localization.md#choosing-new-terms)

Existing in `sl.ts` (searched `krožnic`, `težišč`, `višinsk`, `očrtan`, `včrtan`, `simson`, `potenc`, `inverzij`): only *krožnica* (`catalog_investigation_circle`, `circle_from_n_pieces`); everything else is new. Slovenian school usage is checked against the matura catalogue text (PIK 2026 §4.6, formula sheet) and the FMF syllabus (opened); both are quoted below.

| English | Slovenian (proposal) | Basis |
| --- | --- | --- |
| notable points of a triangle | znamenite točke trikotnika | PIK §4.6 heading, verbatim |
| centroid | težišče | standard school term (not in the PIK extract); confirm in a textbook |
| circumcentre, circumcircle | središče očrtane krožnice, očrtana krožnica | PIK formula sheet: "polmer … očrtanega kroga" (uses *krog*); lessons draw curves, so *krožnica* matches the existing circle strings; mention *krog* as the PIK wording in the first glossary entry |
| incentre, incircle | središče včrtane krožnice, včrtana krožnica | PIK: "včrtanega kroga" (same note) |
| orthocentre | višinska točka (ortocenter in brackets once) | school usage; confirm |
| Euler line | Eulerjeva premica | FMF syllabus, verbatim |
| nine-point circle | krožnica devetih točk | FMF syllabus, verbatim |
| Simson line | Simsonova premica | FMF syllabus, verbatim |
| power of a point | potenca točke na krožnico | FMF syllabus, verbatim |
| inversion; centre and circle of inversion | inverzija; središče in krožnica inverzije | FMF syllabus "Inverzija"; the two compounds are proposals |
| inscribed angle, central angle | obodni kot, središčni kot | PIK §4.6 content list *Središčni in obodni koti* |
| Thales' theorem | Talesov izrek (kot v polkrogu) | FMF *Talesovi izreki*; PIK *Kot v polkrogu* |
| cyclic quadrilateral | tetivni štirikotnik | FMF syllabus |
| foot of a perpendicular | nožišče pravokotnice | school usage; confirm |
| pedal triangle | nožiščni trikotnik | proposal, to research; may be avoided in prose |
| degenerate (collinear) triangle | izrojen trikotnik | proposal; the convexity spec's *izrojen primer* |

Final wording, sources and any table entry are recorded in the implementing change.

## Triangle and circle kernel (batch 0)

Proposed under `src/compgeo/`; the contracts are stable, the names are not.

- **Input.** Three vertices as integer grid points (`GridPoint`) with a graph-level scale, per the convexity policy. Predicates and centres see grid coordinates only, so every centre is scale-equivariant and drawn after the scale is applied. Coordinate range documented (default board far smaller than the \(2^{11}\) bound shared with `incircle`); out-of-range input is rejected.
- **Classification.** `classify(A,B,C)` returns `degenerate` (orient \(=0\): collinear or coincident vertices) or `proper` with `acute | right | obtuse`, decided exactly by the signs of the three integer dot products at the vertices (\(\vec{AB}\cdot\vec{AC}\) etc.). No centre except the centroid is defined for a degenerate triangle; the kernel returns a typed `degenerate` result, never `NaN` or an infinity. Checked: sample dots \((14,35,15)\) acute; \((0,0),(7,0),(1,1)\) has \(-5\) at \(C\) so obtuse; \((0,0),(4,0),(0,3)\) has \(0\) at the origin so right.
- **Centres.** `centroid` \(=(A+B+C)/3\); `circumcentre` with the common denominator \(2\cdot\)orient (the formula of the Voronoi vertex in the triangulation spec); `orthocentre` \(=A+B+C-2O\) (an identity of the Euler configuration, used to compute and checked in tests against the altitude definition by the exact dot products \((H-A)\cdot(B-C)=0\) etc.); `incentre` \(=(aA+bB+cC)/(a+b+c)\) with \(a,b,c\) side lengths: **irrational in general**, so a double (see Correctness Notes). The nine-point circle: centre \(N=(O+H)/2\), squared radius \(R^2/4\), both exact. Each centre also reports exactly `inside | on | outside` the triangle by `orient` against the three edge lines.
- **Radii.** \(R^2\) exact (rational), \(R=\sqrt{R^2}\) double; \(r=S/s\) and \(R=abc/(4S)\) as in the PIK formula sheet, computed in doubles for display and cross-checked in tests.
- **Circle.** `Circle = {centre: RationalPoint, r2: Rational}` (squared radius, so exactness is kept); `powerOfPoint(P, circle) = |P-centre|² - r2` exact; `Line` and a `GeneralizedCircle = Circle | Line` for T5. Circle–circle and line–circle intersection return typed results `none | tangent | two points`; the points are doubles (square roots) and are labelled in the contract as inexact.
- **Simson.** `feet(P, A, B, C)` returns the three feet of the perpendiculars to the lines \(BC, CA, AB\) (the lines, not the segments) as exact rationals (denominators \(|BC|^2\), …); `pedalOrient` is the exact signed double area of the foot triangle. Coincident feet are allowed and reported (a vertex \(P\) gives two coinciding feet).
- **Inversion helper (exact, E3-owned).** `invertExact(P, c, r2)` returns \(c+r^2(P-c)/|P-c|^2\) as an exact rational for grid \(P\), \(c\) and integer \(r^2\); `P=c` is rejected (no image). It exists for tests and readouts; drawn images come from E2's kernel.

## Concept contracts and acceptance criteria

Examples are implementation defaults; equivalents may replace them if the learning goal, edge cases and independent checks are kept. All numbers below were checked in Python with exact `Fraction` arithmetic (script outside the repo, `python -I`) and are marked *checked*; items with a source but no check are labelled.

### T1. Notable points of a triangle (Znamenite točke)

- Learning goal: the four notable points are defined by four different constructions (medians, perpendicular bisectors, angle bisectors, altitudes); where they lie depends on the triangle, and the circumcentre leaves the triangle exactly when the triangle is obtuse.
- Prerequisites: perpendicular bisector, altitude and angle bisector from school geometry; none in Bezeg.
- Default example (*checked*): \(A=(0,0)\), \(B=(7,0)\), \(C=(2,5)\). Area \(35/2\), orient \(35\). Centroid \(G=(3,5/3)\); circumcentre \(O=(7/2,3/2)\) with \(R^2=29/2\), \(R=3{,}80789\); orthocentre \(H=(2,2)\); incentre \(I=(2{,}65705;\,1{,}79891)\), \(r=1{,}79891\) (the \(y\)-coordinate of \(I\) equals \(r\) because side \(AB\) lies on the \(x\)-axis; the distances from \(I\) to the three side lines all equal \(r\) to \(10^{-15}\)). All four lie inside the triangle (acute). \(R=abc/(4S)\) and \(S/s\) agree with the exact values to \(10^{-15}\).
- Steps: (1) the triangle and the centroid from the medians; predict whether it can leave the triangle; (2) add the circumcentre from the perpendicular bisectors and the circle through the vertices; (3) the incentre from the angle bisectors and the incircle; (4) the orthocentre from the altitudes; (5) drag \(C\) so that \(\angle C\) passes \(90^\circ\) and watch \(O\) cross the longest side and \(H\) reach \(C\); (6) the obtuse example below; (7) free exploration.
- Graph needs: three draggable grid vertices with numeric fields; independent toggles for each centre with its construction lines and circle; a classification chip (acute, right, obtuse, degenerate) shown as text and not colour alone; readouts \(S\), \(R\), \(r\); a text list of coordinates for non-pointer use.
- Acceptance:
  1. The default values above match to 5 decimals; \(O\) and \(H\) show as the exact fractions \((7/2,3/2)\) and \((2,2)\) in the numeric readout.
  2. Obtuse example \((0,0),(7,0),(1,1)\) (*checked*): classification obtuse; \(O=(7/2,-5/2)\) and \(H=(1,6)\) are reported `outside`, \(G=(8/3,1/3)\) `inside`. Right example \((0,0),(4,0),(0,3)\) (*checked*): \(O=(2,3/2)\) is the midpoint of the hypotenuse, \(H=(0,0)\) is the right-angle vertex, \(R=5/2\), \(r=1\), incentre \((1,1)\).
  3. The classification is exact: right triangles are reported right, never "almost right"; the circumcentre status is `inside | on | outside`, with `on` only for right triangles.
  4. A collinear triple, e.g. \((0,0),(1,1),(3,3)\) (*checked*, orient \(0\)), shows the `degenerate` state: no circumcircle, incircle or orthocentre is drawn, the message says why in both languages, and no readout shows `NaN`. Coincident vertices behave the same way.
  5. A near-degenerate triangle with a very distant circumcentre does not rescale the board silently: the centre is reported with its coordinates and "outside the view"; a Show-all control frames it; the board never receives infinite or non-finite coordinates.
  6. The prose states "circumcentre inside iff acute; at the hypotenuse midpoint iff right" as a theorem with a source to be cited (Coxeter or an equivalent school text; not opened) and calls the drag an illustration; the centroid's two-thirds ratio and the altitudes' concurrency are named as theorems, not read off the picture.
  7. Optional last step, if a source is cited: Euler's inequality \(R\ge2r\) and \(OI^2=R(R-2r)\) (*checked numerically* on the default: \(OI^2=0{,}79991\), \(R^2-2Rr=0{,}79991\)); omitted from the spec's required scope.
  8. Slovenian and English complete.

### T2. Inscribed angle and Thales (Obodni kot in Talesov izrek)

- Learning goal: all inscribed angles over the same arc are equal and half the central angle; an inscribed angle over a diameter is a right angle; on the other arc the angle is the supplement.
- Prerequisites: T1 (circumcircle).
- Default example (*checked*): the circumcircle of the T1 triangle, chord \(AB\), vertex \(C\): \(\angle ACB=66{,}8014^\circ\), central angle \(\angle AOB=133{,}6028^\circ\), and an arc point on the opposite side of \(AB\) from \(C\) gives \(113{,}1986^\circ=180^\circ-66{,}8014^\circ\). Thales: diameter from \((0,0)\) to \((8,6)\) (centre \((4,3)\), radius \(5\)); the lattice point \((1,7)\) lies on the circle and \((1-0)(1-8)+(7-0)(7-6)=0\) exactly (right angle).
- Steps: (1) a chord and a point \(P\) on the circle; predict how the angle changes when \(P\) moves along the arc; (2) drag \(P\), the angle readout stays constant; (3) compare with the central angle; (4) move \(P\) to the other arc; (5) make the chord a diameter; (6) the lattice point \((1,7)\) as an exact instance; (7) free exploration.
- Graph needs: a circle with centre and radius, a chord with two draggable end points, a glider \(P\) with an angle parameter, a numeric \(t\) field, and angle readouts to \(0{,}1^\circ\); arrow-key stepping of \(P\) by a fixed angle.
- Acceptance:
  1. The three angles above agree to \(0{,}0001^\circ\); inscribed angle \(\times2=\) central angle for \(P\) on the major arc to \(10^{-12}\) in a unit test over 100 positions.
  2. Thales: for the diameter \((0,0),(8,6)\) and every lattice point on the circle the exact dot product at \(P\) is \(0\); a test enumerates the lattice points.
  3. The glider is labelled as the only inexact object: the angle readout is a double rounded for display; no claim "exactly equal" is displayed for the glider, only "equal to the displayed precision".
  4. Equality over the same arc, \(2\times\) and the supplement on the other arc are stated as theorems (Euclid III, FMF *Evklidovi izreki o krogu*; section numbers to add when implemented). The prose says the picture illustrates and that the angle is not defined when \(P\) coincides with \(A\) or \(B\) (the glider parameter avoids those two values).
  5. Slovenian and English complete.

### T3. Euler line and nine-point circle (Eulerjeva premica in krožnica devetih točk)

- Learning goal: \(H,G,O\) lie on one line with \(HG=2\,GO\); the nine named points (three side midpoints, three altitude feet, three midpoints of \(AH,BH,CH\)) lie on one circle with centre \((O+H)/2\) and radius \(R/2\).
- Prerequisites: T1; T2 helps for the right-angle reasoning.
- Default example (*checked*, exact rationals): on the T1 triangle \(H=(2,2)\), \(G=(3,5/3)\), \(O=(7/2,3/2)\); \(H-G=(-1,1/3)=2(G-O)\); \(\operatorname{orient}(O,G,H)=0\); \(HG=1{,}05409\), \(GO=0{,}52705\). Nine-point centre \(N=(11/4,7/4)\), radius \(R/2=1{,}90394\) (\(R^2/4=29/8\)); each of the nine points satisfies \(|X-N|^2=29/8\) exactly and the nine points are distinct (checked). The foot of the altitude from \(C\) is \((2,0)\) and the midpoint of \(CH\) is \((2,7/2)\).
- Steps: (1) \(O\), \(G\), \(H\) of the T1 triangle; predict whether they can be collinear; (2) draw the line, read \(HG\) and \(GO\); (3) drag a vertex, the ratio stays \(2\); (4) the nine points and the circle; (5) drag until two of the nine points coincide (right or isosceles triangle) and read "n distinct points"; (6) the near-equilateral example; (7) free exploration.
- Graph needs: the T1 graph plus the line through \(O,G,H\) with distance readouts, and the nine-point circle with its nine markers and a count of distinct points.
- Acceptance:
  1. The values above match: collinearity and \(HG=2GO\) are decided exactly (\(\operatorname{orient}=0\) and \(HG^2=4\,GO^2\) in rationals) in tests over a dense grid of triangles, not by a tolerance.
  2. Distinct nine-point count (*checked*): \(9\) for the sample, \(5\) for the right triangle \((0,0),(4,0),(0,3)\), \(8\) for the isosceles triangles \((0,0),(6,0),(3,5)\) and \((0,0),(8,0),(4,7)\). The prose says "nine points, fewer distinct ones for special triangles".
  3. When \(H=O\) the triangle is equilateral and the Euler line is not defined; the kernel returns `undefined` and the graph shows a message. On an integer grid this cannot happen (a lattice triangle is never equilateral; stated as a known fact to be sourced before it appears in prose, and checked here only for the examples). The near-equilateral \((0,0),(8,0),(4,7)\) (*checked*) has \(H=(4,16/7)\), \(O=(4,33/14)\), \(|HO|=1/14=0{,}0714\) against \(R=4{,}64286\): the line direction is exact but visually unstable, and the lesson says so.
  4. The Euler line, \(HG=2GO\) and the nine-point circle are stated as theorems with a source to be cited (Coxeter or Dörrie; not opened); a proof idea (the homothety about \(G\) with ratio \(-1/2\) sends \(H\) to \(O\)) may appear in the prose only if the construction on the board shows that homothety; otherwise the drag is labelled an illustration.
  5. Degenerate triangles behave as in T1.
  6. Slovenian and English complete.

### T4. Simson line (Simsonova premica)

- Learning goal: for a point \(P\) the feet of the perpendiculars to the three side lines are collinear exactly when \(P\) is on the circumcircle; the picture illustrates the "if" and the quantitative failure off the circle.
- Prerequisites: T1, T2 (cyclic quadrilaterals appear in the proof).
- Default example (*checked*): the T1 triangle. Exact grid instance: the lattice points on the circumcircle are \((0,0),(0,3),(2,-2),(2,5),(5,-2),(5,5),(7,0),(7,3)\); for \(P=(2,-2)\) the feet are \((11/2,3/2)\), \((-12/29,-30/29)\), \((2,0)\) and the exact orientation determinant is \(0\). For \(P=(0,3)\) the feet are \((2,5)\), \((30/29,75/29)\), \((0,0)\) with determinant \(0\). Glider on the circle: \(\max|\text{pedal area}|=4{,}5\times10^{-15}\) over 2000 random positions (area units against the triangle area \(17{,}5\)). Off the circle by a relative radial offset \(\varepsilon\) (point at distance \(R(1+\varepsilon)\) from \(O\)): the foot triangle's area divided by \(S\) is \(0{,}000500\), \(0{,}005025\), \(0{,}025625\), \(0{,}110\) for \(\varepsilon=0{,}001,0{,}01,0{,}05,0{,}2\), equal to \(|R^2-OP^2|/(4R^2)\) in each case to \(10^{-15}\) (the equality is checked numerically; no source was found, so it is used only as a test oracle and not stated as a theorem in prose).
- Steps: (1) the triangle, its circumcircle and a point \(P\) on it; predict how the three feet are arranged; (2) draw the feet and the line through them; (3) move \(P\) around the circle; (4) leave the circle by an offset slider; the foot triangle opens up; (5) read the area readout and the status; (6) \(P\) at a vertex (two feet coincide); (7) free exploration.
- Graph needs: the T1 triangle with circumcircle, a glider \(P\) on the circle (angle parameter) and a free grid point \(P'\) (exact mode), the three feet, the line through them when defined, the foot-triangle area readout, and a status text. Feet may lie on the extensions of the sides; the graph draws the side lines, not only the segments.
- Acceptance (the tolerance band is a decision, not a fact about geometry):
  1. **Exact mode** (grid \(P'\)): "on the circumcircle" is the exact test \(\text{power}(P')=0\); because the power of a grid point is a multiple of \(1/\operatorname{orient}\), a grid point is either exactly on the circle or at least \(1/35\) away in squared units for the default triangle (*arithmetic argument checked: \(\text{power}\cdot35\) integer on all points of a \(41\times41\) window*); collinearity of the feet is the exact rational orientation, with no tolerance. The eight lattice points above all report collinear; tests check each.
  2. **Glider mode** (continuous \(t\)): collinearity is by construction. The readout and status use a stated tolerance \(|\text{pedal area}|\le10^{-9}\,S\) (observed \(\le2{,}6\times10^{-16}\,S\)); the status reads "collinear (within \(10^{-9}\) of the triangle's area)" and never "exactly collinear". The constant lives in the kernel with a test showing the observed error is at least a million times smaller.
  3. **Offset slider:** \(\varepsilon\in\{0\}\cup\{\pm0{,}001,\pm0{,}01,\pm0{,}05,\pm0{,}2\}\) (discrete); off the circle the area readout is nonzero and the status reads "not collinear" for every nonzero value, including \(\varepsilon=0{,}001\), where the three feet look collinear on the board (a drag by one screen pixel is invisible; the area readout, \(0{,}0005\,S\), is the evidence). The prose says this explicitly, so the drag is not mistaken for a proof of "only if".
  4. When \(P\) is a vertex two feet coincide; the line is defined by the two distinct feet and the status says so. Perpendiculars are to the side lines; a foot outside a side segment is drawn and not reported as an error.
  5. The statement "collinear iff \(P\) is on the circumcircle" is given as a theorem with a source (FMF *Simsonova premica* opened as a topic; textbook section to cite; Coxeter or Dörrie not opened); the proof sketch through cyclic quadrilaterals (T2) may appear in the prose; the graph is labelled an illustration of the "if" and of the quantitative failure.
  6. Slovenian and English complete.

### T5. Power of a point and inversion (Potenca točke in inverzija)

- Learning goal: the power \(|PO|^2-\rho^2\) of a point is constant along every secant (\(PA\cdot PB\)); inversion in a circle sends circles through the centre to lines, other circles to circles, and preserves angles but reverses their orientation.
- Prerequisites: T1 (circle); [complex-maps-lessons.md](complex-maps-lessons.md) lesson 1 is a prerequisite link (inversion appears there as \(z\mapsto c+r^2/\overline{z-c}\)); the chapter is also readable without it.
- Default example (*checked*): inversion circle centre \((0,0)\), radius \(r=2\) (\(r^2=4\)). The circle \(|z-(1,0)|=1\), through the centre, maps to the line \(x=2\): the exact images are \((1,1)\mapsto(2,2)\), \((1,-1)\mapsto(2,-2)\), \((2,0)\mapsto(2,0)\). The circle with centre \((3,0)\), radius \(1\) maps to the circle with centre \((3/2,0)\) and radius \(1/2\) (images of \((2,0),(4,0),(3,1)\) are \((2,0)\), \((1,0)\), \((6/5,2/5)\); all at distance \(1/2\) from \((3/2,0)\)). Power of a point: \(P=(0,0)\), circle with centre \((5,0)\), radius \(3\): power \(=16\); the secant along the \(x\)-axis meets the circle at \((2,0)\) and \((8,0)\) with \(2\cdot8=16\); tangent length \(4\). With inversion radius \(r=4\) (\(r^2=16\)) this circle is orthogonal to the inversion circle and maps to itself (\((2,0)\leftrightarrow(8,0)\), \((5,3)\mapsto(40/17,24/17)\), on the same circle). Angle: circles with centres \((3,0)\) and \((3,1)\), radius \(1\), meet at an angle of \(60^\circ\) at \(P\approx(2{,}134;\,0{,}5)\); their images meet at \(\mp60^\circ\) (signed angle flips; unsigned equal).
- Steps: (1) a point and a circle, a secant through the point; predict \(PA\cdot PB\) as the secant turns; (2) the product stays \(16\); the tangent length gives the same value; (3) switch on the inversion circle and one point; predict the image position on its ray; (4) a circle through the centre becomes a line; (5) a circle not through the centre becomes a circle; (6) two circles and their angle, before and after; (7) free exploration.
- Graph needs: inversion centre and radius (numeric and draggable on the grid), one draggable point \(X\) with its image \(X'\), a generalized-circle gallery (circle, line) with images drawn through E2's inversion, the secant for the power lesson, signed and unsigned angle readouts, and a "point at the centre has no image" message.
- Acceptance:
  1. Exact images above are produced by `invertExact` and agree with E2's double implementation to \(10^{-12}\) in a unit test (guards against divergence; if E2's kernel is absent the batch is not released).
  2. Circle through the centre draws a line (not a huge circle); a line through the centre maps to itself; a circle not through the centre draws a circle; a point at the centre is rejected with a message; a point near the centre is not drawn with a non-finite coordinate: images beyond the view are clipped with a marker and the board is never given an infinite value.
  3. The default numbers (power \(16\), images, \(60^\circ\), circle \((3/2,0)\) radius \(1/2\)) are reproduced by tests with the stated precision.
  4. Angle preservation and the circle-to-line behaviour are stated as theorems with a source (FMF *Inverzija*; Coxeter not opened) and the readout is described as an instance. The prose says that inversion reverses orientation, so the lesson does not say "conformal" without that qualification (E2 states the complex form).
  5. Slovenian and English complete.

## User Stories

1. As a student, I drag a vertex and watch which of the four notable points leave the triangle.
2. As a student, I see an angle readout stay constant while I drag a point along an arc, and I am told that this is an instance, not the proof.
3. As an educator, I project the Euler line and the nine-point circle and show the case where several of the nine points merge.
4. As an educator, I move the point off the Simson circle by a small offset and show the foot triangle's area, so the class sees that "nearly collinear" is not "collinear".
5. As a student of Elementarna geometrija, I see a circle through the centre of inversion become a line, and compare the power of a point with the tangent length.
6. As a reader on a phone or without a mouse, I use numeric vertex fields and arrow keys and read a text status and coordinates.

## Implementation Decisions

- Mathematics lives in pure modules (rational, triangle, circle, simson) with typed results, including `degenerate` and `undefined`, never `NaN`. Exact where exactness is available (centroid, circumcentre, orthocentre, nine-point circle, feet on grid inputs, power of a point, exact images), and doubles only for the incentre, radii, angles, glider positions and circle–circle intersection points, each labelled in the code docs.
- Vertices and free points are snapped to the grid (scale proposal \(1\) or \(1/4\), per the convexity spec); the glider angle is the single continuous parameter. Pure kernel functions take grid values; the scale is applied in the graph.
- Lesson scene actions are typed and synchronous (set the triangle or a named example, show/hide a centre or overlay, set glider \(t\), set offset \(\varepsilon\), set inversion circle); unsupported values are rejected; the scene store is the source of truth, per repository rules. No new `LESSON_ANIMATION_IDS` entry is needed because the lessons are drag-based (a "play around the circle" animation is an optional later addition and would need one).
- Board objects, listeners and timers have explicit owners and are disposed on scene change and route exit. Presets store the vertex grid coordinates, example id, glider parameter and toggles; import validates integer range, collinear-allowed (a degenerate triangle is valid state), and gives an actionable error otherwise.
- Existing routes and stored Presets are unchanged. All routes and Presets are new; reasons and user impact are recorded in the implementing change.
- Hosting and app-shell code stay separate from the mathematics. Performance: these boards have fewer than 50 objects; measure a drag with all overlays on per the [performance plan](../performance-plan.md) before any optimization.

## Testing Decisions

- Kernel tests: every number above; exact identities over a dense grid of triangles (circumcentre equidistance; \(H-A\perp B-C\); \(HG^2=4GO^2\) and orient \(=0\); nine points on the circle); classification by dot products; `degenerate` for collinear and coincident vertices; power of a point multiple of \(1/\operatorname{orient}\); exact Simson orientation for every lattice point of the circumcircle; the glider tolerance constant versus observed error; inversion exact images versus E2's doubles.
- Independent oracles: Python-checked values are re-derived in the unit test using the integer recurrence or the closed form; `convexHull` is not used here. The incentre is tested against the equal-distance-to-three-lines definition.
- Scene tests: multi-action scenes in one synchronous tick; unsupported values rejected; editing a vertex clears derived overlays.
- Preset tests: save/reopen, export/import, malformed data, out-of-range coordinates, collinear triangle accepted.
- Lesson/content tests: step counts, both languages in lockstep, `lessonMathNotation.test.ts` unchanged and passing, `tsc --noEmit` after localization changes.
- Browser: a smoke row per lesson (default scene, controls, reveal, restore, catalog link, refresh, narrow viewport, keyboard, touch alternatives, collinear triangle, T4 offset slider, T5 centre point). The full checklist only if shared catalogue or lesson runtime changes.

### Batch-wide acceptance gate

1. Each Demonstration opens directly and after refresh, with its chapter-owned guided activity and a static preview.
2. The concept contract above is met with checked examples; every "always" claim is a theorem with a source and the drag is labelled an illustration.
3. Both languages, accessible inputs, projection readability, restore on exit, Presets and figure export pass.
4. Existing routes and stored Presets behave as before.
5. TypeScript, unit and content tests, production build, smoke checks and mathematics review pass; commit and push follow the repository workflow.

## Correctness Notes

- A drag shows instances. The Euler line, the nine-point circle, the Simson line, the angle theorems and the power of a point are theorems; a cited proof or algebraic argument is required for any "always" in the prose, and "the picture illustrates" is the standing label. The section numbers of the textbooks (Coxeter, Dörrie, Pagon) are not known; the implementing change adds them.
- **Exact versus tolerance** (shared predicate policy in [new-lesson-families.md](new-lesson-families.md#shared-constraints)). Exact: orientation/collinear triangle, acute/right/obtuse, centroid, circumcentre, orthocentre, nine-point circle, Euler-line collinearity and ratio, grid-point-on-circle, Simson collinearity of grid feet, power of a point, exact inversion images. Tolerance, labelled as such: the glider and anything computed from it (T2 angle readouts, T4 glider mode with \(10^{-9}\,S\)), the incentre and radii, circle–circle intersection points, drawn images of inversion. A tolerance is never shown as an equality.
- The incentre is irrational for most grid triangles; "the incentre equals a point of the angle bisectors" is displayed by construction, not by comparing doubles with `===`.
- **Near-degenerate drags.** When orient is small relative to the side lengths, the circumcentre is far away and its formula is well conditioned only because the arithmetic is exact; drawing needs a framing rule (T1 acceptance 5) and the Euler line of a near-equilateral triangle is directionally unstable (T3 acceptance 3).
- The "iff" in the Simson line cannot be shown by a drag: a point one pixel off the circle gives visually collinear feet. The quantitative readout is the honest answer, and the prose says so.
- Inversion is orientation-reversing; images of lines through the centre are the lines themselves; the centre has no image and nearby points leave the board.

## Out of Scope

- Backend, accounts, assessment, grading, progress tracking.
- Ceva, Menelaus, Stewart, Apollonius circle and problem, Fagnano's problem, Morley's theorem, trilinear coordinates, hyperbolic models of inversion; they are in the FMF syllabus but outside this family. Concurrency (Ceva) is the natural first extension.
- Free-text constructions, a construction-language, ruler-and-compass step playback, general dynamic geometry; the family is five fixed Demonstrations.
- A proof checker or automatic theorem discovery; the lessons present cited theorems and instances.
- Conics and projective geometry ([projective-conics-lessons.md](projective-conics-lessons.md)); the complex Möbius kernel ([complex-maps-lessons.md](complex-maps-lessons.md)); linear maps ([linear-maps-lessons.md](linear-maps-lessons.md)).
- Renderer replacement or build-tool changes.

## Further Notes

Open owner decisions: the family placement and name; ADR 1 (exact rational type) with the convexity robustness ADR; whether the glider (ADR 2) needs its own ADR; the direction of ownership of `circumcentre` against the research note (E3 owns it and the Voronoi drawing should call it); the Slovenian terms above; whether Euler's inequality enters T1. Dependent specs must not change the kernel contracts without updating this spec. Not verified here: E2's spec (not yet available), textbook section numbers, the Slovenian school term for *orthocentre* and *centroid*, and the claim that no lattice triangle is equilateral (not checked in prose-ready form).
