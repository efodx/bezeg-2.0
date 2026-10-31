# Triangulations and Voronoi diagrams (Triangulacije in Voronojevi diagrami)

**Status:** proposed, 2026-10-31. Specification only; implementation not scheduled.
**Agreed:** 2026-10-31 (owner approved the family; details below are proposals for owner review).
**Source:** [computational geometry candidates](../research/computational-geometry-candidates-2026-10-31.md), Family B, the Delaunay sample sequence (5) and ear-clipping sample (3), and its correctness notes. Primary sources it cites: de Berg, Cheong, van Kreveld, Overmars, *Computational Geometry* (3rd ed., Springer 2008; Ch. 9 on Delaunay triangulations, including Observation 9.3 and Lemma 9.4 as the note cites them); Fisk 1978 (DOI 10.1016/0095-8956(78)90059-X); Fortune 1987 (DOI 10.1007/BF01840357, only as the later consumer of the Voronoi drawing); FMF *Računska geometrija* syllabus. Index: [new lesson families](new-lesson-families.md). Core: [convexity-hulls-lessons.md](convexity-hulls-lessons.md#shared-computational-geometry-core).

## Problem Statement

Bezeg has curves but no discrete geometry beyond the control-polygon hull. A learner cannot drag points and see a polygon being triangulated, why a triangulation of a point set always has the same number of triangles, why some triangulations are better than others, or how the nearest-site map (Voronoi diagram) is the dual of the best one. These are central items of the FMF computational-geometry course and underlie meshing and interpolation of scattered data. The shared predicates, draggable point-set graph and step-trace model are specified once in the convexity spec; this family adds the `incircle` predicate, a triangulation structure and a Voronoi drawing on top of them.

## Solution

Add a bilingual Learn chapter, **Triangulacije in Voronojevi diagrami / Triangulations and Voronoi diagrams**, with five lessons. Each has a chapter-owned guided graph activity backed by a catalog Demonstration that also works for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). Target: university; B1 is also approachable in upper secondary. A lesson takes about 5–10 minutes in 5–7 steps (editorial target). Learners predict before an explicit Show or Next step reveals the result. There are no exercises, grading or progress tracking; every lesson ends in free exploration.

### Release batches

Batch 0 below means Batch 0 of the [convexity spec](convexity-hulls-lessons.md#release-batches) (predicate module and robustness ADR, point-set/polygon graph, trace model). None of these batches needs the convexity lessons A1–A6 themselves; B2 only links to A4 as a prerequisite when A4 is released.

| Batch | Contents | Release condition |
| --- | --- | --- |
| T0 (kernel) | `incircle` in the predicate module; triangulation structure and flip; Delaunay and Voronoi kernels; unit tests | Convexity Batch 0 accepted (ADR on robustness settled); no learner-visible route required |
| T1 | B1 Ear clipping and the art gallery theorem | Convexity Batch 0 accepted; uses only `orient`, so it does not wait for T0 |
| T2 | B2 Triangulating a point set; B3 Delaunay and flips (the showpiece) | T0 done; B3 may ship alone first if the owner wants the research note's showpiece early |
| T3 | B4 Voronoi diagrams and duality; B5 Degenerate sites | T2 released; Voronoi drawing reviewed for reuse by Fortune |

Publish batches separately. Do not expose unimplemented Demonstrations or advertise unreleased lessons.

### Placement

Use the **Računska geometrija / Computational geometry** Demonstration family proposed in the convexity spec ([placement](convexity-hulls-lessons.md#placement), still awaiting the owner), one Learn chapter registered in [familyChapters.ts](../../src/learning/content/familyChapters.ts). If the owner declines that family, this spec follows whatever placement is chosen there.

### Slovenian and English terms (proposals)

Per [choosing new terms](../localization.md#choosing-new-terms). The FMF syllabus gives *triangulacija* and *Voronojev diagram*; the rest are proposals to be settled against FMF/RUL usage when implemented. The research note proposes *uho* and *nedovoljen rob*.

| Slovenian (proposal) | English |
| --- | --- |
| triangulacija (večkotnika, množice točk) | triangulation (of a polygon, of a point set) |
| uho; rezanje ušes | ear; ear clipping |
| izrek o galeriji (galerijski problem); stražar | art gallery theorem; guard |
| Fiskovo 3-barvanje | Fisk's 3-colouring |
| izbočeno (konveksno) / vbočeno (reflektno) oglišče | convex / reflex vertex |
| zamenjava roba (obrat diagonale) | edge flip |
| prazna krožnica; pogoj prazne krožnice | empty circle; empty-circle property |
| nedovoljen rob / dovoljen rob | illegal edge / legal edge |
| Delaunayeva triangulacija; Lawsonove zamenjave | Delaunay triangulation; Lawson flips |
| vektor kotov | angle vector |
| Voronojev diagram; celica; Voronojevo oglišče | Voronoi diagram; cell; Voronoi vertex |
| mesto (točka množice) | site |
| dualnost | duality |
| kocirkularne točke | cocircular points |

*Delaunay* and *Voronoi* keep their Slovenian spelling conventions (*Delaunayeva*, *Voronojev*) pending the term check. *Uho* is the ordinary word; confirm it reads naturally in a geometry sentence.

## Triangulation and Voronoi kernel (batch T0)

Lives next to the shared core (proposed `src/compgeo/`), free of React, JSXGraph, localization and graph-global cache state. Names are proposals; the contracts are the stable part. The kernel is shared by B1–B5 and by the later sweep family.

### `incircle` (implements the reserved extension point)

`incircle(a, b, c, d): -1 | 0 | 1` is the sign of the \(3\times3\) determinant of rows \((a_x-d_x,\; a_y-d_y,\; (a_x-d_x)^2+(a_y-d_y)^2)\) for \(a,b,c\) in that order. It is positive when \(d\) lies strictly inside the circle through \(a,b,c\) taken **counter-clockwise**, zero on the circle, negative outside. If \(a,b,c\) are clockwise the sign flips, so callers pass triangles in counter-clockwise order (the triangulation structure stores them that way). Collinear \(a,b,c\) is rejected, not guessed. `incircleValue` returns the exact integer for display.

Exactness bound, consistent with the convexity spec's policy (option A, snapped grid recommended): for absolute coordinates up to \(2^{11}\) (differences up to \(2^{12}\)) the determinant is bounded by \(6\cdot2^{12}\cdot2^{12}\cdot2\cdot(2^{12})^2\approx3.38\times10^{15}<2^{53}\approx9.01\times10^{15}\) (computed with `python -I`; the bound fails for \(2^{12}\)), so plain doubles are exact. For larger coordinates the same function falls back to `BigInt`; the fallback is covered by the same tests. The bound is documented next to `orient`'s \(2^{25}\), because the degrees differ. If the ADR picks a different policy, only this paragraph changes; the contract does not.

### Triangulation structure

Needed: walk to the neighbour across an edge, flip an edge, enumerate edges, list illegal edges, detect hull edges. Alternatives (decision recorded in an ADR only if the owner wants one; it is internal and cheap to change, so a spec decision suffices):

| Option | Strength | Weakness |
| --- | --- | --- |
| A. Immutable triangle list with neighbour indices (`tri = [v0,v1,v2]` counter-clockwise, `nbr[i]` opposite vertex \(i\)) | Simple to test and to snapshot per trace event; a flip returns a new value; fits the pure `stateAt` fold | Slightly more bookkeeping on flips than half-edges |
| B. Half-edge (DCEL) | Standard in textbooks; constant-time local traversal, faces and Voronoi cells fall out | Mutable by nature; heavier to snapshot per event; more invariants to test |
| C. Recompute adjacency from the triangle list each time | Least code, no stale state | Quadratic per query; fine at \(n\le40\) but hides the structure the lesson wants to show |

Recommendation: **A**. Contract: `flip(tri, edge)` succeeds only when the two triangles around `edge` form a **strictly convex** quadrilateral (both new triangles counter-clockwise); otherwise it returns a typed refusal, never a degenerate triangle. `illegalEdges(tri)` returns the interior edges with `incircle > 0`.

### Delaunay construction

Starting triangulation for free exploration: incremental insertion in lexicographic order, joining each new point to the hull edges it sees, then Lawson flips. Legal means `incircle <= 0` for the opposite vertex, so cocircular quadruples stop flipping (flips only on strictly positive values) and termination follows from the strictly increasing angle vector. Alternatives for the same job (all \(O(n^2)\) or worse at \(n\le40\), so performance does not decide): Bowyer–Watson cavity insertion; brute-force all triples against all points (\(O(n^4)\)) used only as the test oracle. Recommendation: incremental plus flips, because the same code serves B3's trace; brute force is the oracle.

### Voronoi drawing (reused by the sweep family)

Defined once so that Fortune's algorithm can later produce the same value. A `VoronoiDiagram` over sites \(0..n-1\) contains: **vertices** as exact rationals (numerator pair and common denominator \(2\cdot\text{orient}\) of the Delaunay triangle, converted to doubles only for drawing); **edges** between two sites, each a segment (two vertices), a ray (one vertex and an outward direction perpendicular to the site pair), or a full line (collinear sites); **cells** as site index plus its edge list, clipped to the view box only at draw time. Cells of hull sites are unbounded and drawn clipped with an explicit "continues" marker. A circumcentre may lie outside the hull or the initial view; the board frames the diagram, with a Reset view control. The dual relation (each interior Delaunay edge corresponds to one finite Voronoi edge) is derived from the Delaunay structure and is checked in tests, not assumed.

## Concept contracts and acceptance criteria

All lessons use the draggable point-set/polygon graph and the step-trace model from the core, with its snapping, point limit, numeric alternatives to dragging, keyboard moves and disposal rules. Common criteria (apply to every lesson; not repeated): C1. Editing the input recomputes derived state, resets the step index to \(0\) and pauses playback. C2. Reset returns to the lesson's default example and step \(0\); leaving a lesson restores the previous configuration and view. C3. Next step and Play yield identical states. C4. Both languages present, including a live language switch, with type-checked `t()` calls. C5. Every action and answer is available without a pointer. C6. Points that would break a precondition are refused with an actionable message, not silently moved.

### B1. Ear clipping and the art gallery theorem

- Goal: see that every simple polygon can be cut into triangles by repeatedly removing ears, then use the triangulation's 3-colouring to place at most \(\lfloor n/3\rfloor\) guards.
- Prerequisites: A1 orientation ([convexity spec](convexity-hulls-lessons.md#a1-orientation-of-three-points)); no other chapter.
- Example 1 (notched pentagon from the research note, sample 3): \((0,0),(6,0),(6,4),(3,2),(0,4)\), area \(18\), reflex vertex \((3,2)\). Ears are clipped in order \(\triangle(6,0)(6,4)(3,2)\), then \(\triangle(0,0)(6,0)(3,2)\), leaving \(\triangle(0,0)(3,2)(0,4)\). The 3-colouring classes are \(\{(6,0),(0,4)\}\), \(\{(0,0),(6,4)\}\), \(\{(3,2)\}\); the smallest has size \(1=\lfloor5/3\rfloor\), so one guard at \((3,2)\) sees the whole polygon.
- Example 2 (comb, new, checked with `python -I`): \((0,0),(18,0),(16,2),(15,6),(14,2),(10,2),(9,6),(8,2),(4,2),(3,6),(2,2)\); \(n=11\), simple, area \(44\), \(9\) triangles, colour class sizes \(4,4,3\), so the smallest class is \(3=\lfloor11/3\rfloor\). Three guards are also necessary here: on a \(0.1\) grid inside the polygon (about 4450 points; the exact count depends on whether boundary points are included) no point sees more than one of the three points \((3,5.9),(9,5.9),(15,5.9)\) near the tips (a numeric illustration; the proof is that the three tip regions lie in disjoint wedges).
- Steps: (1) the polygon with reflex vertices marked; (2) predict which vertex can be cut off; (3) Next step clips ears one at a time, showing the ear test (convex apex, no other vertex in the triangle); (4) the finished triangulation: \(n-2\) triangles, \(n-3\) diagonals; (5) Fisk's 3-colouring, shown by walking from triangle to triangle; (6) the smallest colour class as guards and the guard's view; (7) the comb (necessity), then free exploration with editable polygon.
- Capabilities: polygon mode with exact simplicity check; ear-clipping trace (events `test`, `accept`, `reject`, `output`, `done`); colouring overlay; visibility shading of a guard (computed from the triangles the guard's vertex belongs to, which is exact: a vertex sees every triangle it belongs to).
- Acceptance: 1. The trace of Example 1 clips the three listed triangles in the listed order (first ear chosen by lowest vertex index counter-clockwise; the rule is stated in the lesson). 2. For random simple grid polygons (\(n\le 15\)) the result has \(n-2\) triangles, their areas sum to the shoelace area, no triangle contains another vertex, and every polygon edge is a triangle edge. 3. Each triangle receives three distinct colours and the smallest class has size \(\le\lfloor n/3\rfloor\). 4. Non-simple input and three consecutive collinear vertices are refused with a message (ear clipping is specified for strictly convex ears only). 5. Orientation is normalised: a clockwise polygon is reversed and the lesson says so. 6. The guard-view overlay equals the union of triangles at the guard's vertex. 7. The comb example reproduces the sizes \(4,4,3\). 8. Common criteria C1–C6.

### B2. Triangulating a set of points

- Goal: see that all triangulations of a point set have the same numbers of triangles and edges, and that flipping an edge changes the triangles but not the counts.
- Prerequisites: B1 (what a triangulation is); A4 convex hull for the boundary ([convexity spec](convexity-hulls-lessons.md#a4-convex-hull)), when released.
- Example (new, computed with `python -I`; points in general position, no three collinear, no four cocircular): \(p_0=(0,0),\,p_1=(8,0),\,p_2=(9,6),\,p_3=(4,8),\,p_4=(-1,5),\,p_5=(3,3),\,p_6=(6,3)\). The hull has \(k=5\) vertices \(p_4,p_0,p_1,p_2,p_3\). Every triangulation has \(2n-2-k=7\) triangles and \(3n-3-k=13\) edges (8 interior, 5 on the hull). Two triangulations are given as presets: the starting one T0 (triangles \((1,2,6),(1,5,4),(1,6,5),(2,3,4),(4,0,1),(4,5,6),(6,2,4)\) by index) and the Delaunay one (B3). Both have 7 triangles and 13 edges.
- Formula note: \(k\) counts points on the hull **boundary**, including collinear ones. For the nine points of the hull lesson (sample 1) the boundary has \(6\) points, so \(2\cdot9-2-6=10\) triangles.
- Steps: (1) points only; (2) predict the triangle count; (3) Show the triangulation T0 and the counts; (4) flip an interior edge (only convex quadrilaterals allow it) and see the counts unchanged; (5) add a point inside a triangle (counts \(+2\) triangles) and outside the hull (counts depend on the hull edges visible); (6) compare the smallest angle of two triangulations; (7) free exploration.
- Capabilities: triangulation structure; flip with refusal on non-convex quadrilaterals; add-point-and-retriangulate by the T0 insertion rule; count readout; angle readout.
- Acceptance: 1. T0 has 7 triangles and 13 edges, 8 interior. 2. For random general-position grid sets, every triangulation reached by random legal flips keeps \(2n-2-k\) triangles and \(3n-3-k\) edges, with \(k\) the boundary count. 3. Flip refuses a non-convex quadrilateral and states why. 4. Added points inside a triangle give \(+2\) triangles; outside the hull, the count matches the formula. 5. Collinear boundary points are counted in \(k\) and the readout says so. 6. The flip changes the angle vector (sorted list of the \(3\cdot\text{triangles}\) angles) and the readout shows both minima. 7. Common criteria C1–C6.

### B3. Delaunay triangulation and Lawson flips (showpiece)

- Goal: understand why some triangulations are better, define an illegal edge by the empty-circle test, and watch flips raise the smallest angle until every edge is legal.
- Prerequisites: B2; A1 orientation (the incircle sign depends on orientation).
- Example 1, the 4-point quad (research sample 5): \(a=(0,0),b=(4,0),c=(5,3),d=(0,2)\) with diagonal \(ac\). The circumcircle of \(abc\) has centre \((2,\tfrac73)\) and \(r^2=\tfrac{85}{9}\); \(|d-\text{centre}|^2=\tfrac{37}{9}<\tfrac{85}{9}\). The incircle determinant of \((a,b,c,d)\) is \(+64\), so \(d\) is inside and \(ac\) is illegal. After flipping to \(bd\), both tests are \(-64\) (verified again with `python -I`). Sorted angle vectors (degrees): before \(19.65,30.96,40.60,59.04,101.31,108.43\); after \(26.57,37.87,60.26,63.43,81.87,90.00\). The minimum rises from \(19.65^\circ\) to \(26.57^\circ\) and the vector increases in lexicographic order.
- Example 2, the seven points of B2 starting from T0 (new, `python -I`): the illegal edges are \(p_1p_4\), \(p_2p_4\), \(p_4p_6\); flipping the first illegal edge in lexicographic order three times reaches the Delaunay triangulation (7 triangles: \((0,1,5),(0,5,4),(1,2,6),(1,6,5),(2,3,6),(3,4,5),(3,5,6)\)), whose smallest angle is \(25.35^\circ\) against \(1.91^\circ\) in T0. The set has no four cocircular points, so the result is unique and equals a brute-force empty-circle check.
- Steps: (1) the quad with diagonal \(ac\); (2) predict whether \(d\) is inside circle \(abc\); (3) Show the circle and the determinant; (4) flip, show both circles and the angle vectors; (5) the seven points in T0, mark illegal edges; (6) Next step flips one illegal edge at a time, each time updating the angle minimum; (7) free exploration (drag points; a flipped edge may become illegal again, so the trace is recomputed).
- Capabilities: `incircle`; circle overlay for a chosen triangle; Lawson trace (events `test` with the incircle sign, `accept` = flip, `reject` = legal, `done`); angle readout; a draggable quad variant for B3's first part.
- Acceptance: 1. `incircle` equals exact rational reference over a grid sweep, and gives \(+64,-64,-64,-64\) on the sample. 2. Example 1 shows 19.65 and 26.57 degrees (two decimals). 3. Example 2 reproduces three flips and 25.35 degrees. 4. Flips happen only on strictly illegal edges whose quadrilateral is convex, and the lesson states that an illegal edge always has a convex quadrilateral (dBCKO's observation) as a cited fact. 5. For random general-position sets (and a start from random flips), Lawson flipping terminates, the angle vector strictly increases lexicographically at every flip, and the result equals the brute-force empty-circle triangulation. 6. Cocircular input (the unit square) leaves both diagonals legal with determinant \(0\); the lesson states the triangulation is then not unique. 7. The circle drawn is the exact circumcircle (double centre converted from the exact rational). 8. Common criteria C1–C6.

### B4. Voronoi diagrams and duality

- Goal: understand a Voronoi cell as the set of points nearest to a site, see its vertices as circumcentres of Delaunay triangles, and see that the Delaunay triangulation is the dual of the diagram.
- Prerequisites: B3.
- Example (the seven points of B2; new, exact via `python -I`): Voronoi vertices are the circumcentres of the Delaunay triangles: \((0,1,5)\to(4,-1)\); \((0,5,4)\to(\tfrac13,\tfrac83)\); \((1,2,6)\to(\tfrac{91}{10},\tfrac{29}{10})\); \((1,6,5)\to(\tfrac92,-\tfrac16)\); \((2,3,6)\to(\tfrac{85}{14},\tfrac{83}{14})\); \((3,4,5)\to(\tfrac{21}{11},\tfrac{64}{11})\); \((3,5,6)\to(\tfrac92,\tfrac{53}{10})\). There are 8 finite edges (one per interior Delaunay edge) and 5 rays (one per hull edge); cells of the 5 hull sites are unbounded and those of \(p_5,p_6\) are bounded.
- Steps: (1) the sites; (2) predict the region nearer to \(p_5\) than to any other site; (3) Show the cell by the bisector construction (half-planes intersected); (4) all cells; (5) overlay the Delaunay triangulation and highlight one triangle with its circumcentre; (6) drag a site and watch both diagrams change together; (7) free exploration (query point showing its nearest site).
- Capabilities: Voronoi drawing as defined in the kernel; cell fill, vertex markers, ray "continues" marker; Delaunay overlay; nearest-site query point.
- Acceptance: 1. Vertices equal the exact list above; each vertex is equidistant (exact rational check) from its three sites and no site is nearer. 2. Each finite Voronoi edge corresponds to one interior Delaunay edge and each ray to one hull edge. 3. A random query point's nearest site (brute force) lies in the cell the drawing assigns to it. 4. Unbounded cells are visibly open and are clipped consistently when the view changes. 5. The duality overlay is toggled, not always on. 6. The drawing can be built from a vertex/edge/cell value without calling the Delaunay code (so Fortune can supply it). 7. Common criteria C1–C6.

### B5. Degenerate sites

- Goal: see what cocircular and collinear sites do: a Voronoi vertex of degree four, a non-unique Delaunay triangulation, and parallel strips with no vertices.
- Prerequisites: B3 and B4.
- Examples: the unit square (cocircular, incircle \(0\)); the symmetric trapezoid \((0,0),(8,0),(9,5),(-1,5)\), found cocircular by `python -I`; five collinear sites on a line.
- Steps: (1) four points near a circle; (2) predict the number of Voronoi vertices; (3) move one point onto the circle (one degree-4 vertex, two valid diagonals); (4) move it off (two vertices appear, one diagonal becomes the only legal one); (5) collinear sites: parallel strips, no Delaunay triangles; (6) the lesson's convention, and why the snapped grid makes "exactly on the circle" reachable; (7) free exploration.
- Capabilities: draggable four-point mode with incircle readout; diagram for collinear sites (full lines, no vertices); message when no triangulation exists.
- Acceptance: 1. On the square the determinant is exactly \(0\), the drawing has one degree-4 vertex, and both diagonals are shown as legal. 2. Off the circle by one grid step, the determinant is nonzero and the diagram has two degree-3 vertices. 3. Five collinear sites give four parallel bisector lines, no vertices, no Delaunay triangles, and a visible explanation. 4. Duplicate sites are refused. 5. Common criteria C1–C6.

## User Stories

1. As a student, I clip ears off a polygon and see why \(\lfloor n/3\rfloor\) guards are enough.
2. As a student, I flip an edge and see the triangle and edge counts stay put while the angles change.
3. As an educator, I project the empty-circle test on a four-point quad and show a flip raise the smallest angle.
4. As a student, I drag a site and watch the Voronoi diagram and its Delaunay dual move together.
5. As a student, I move a point onto a circle and see the triangulation stop being unique.
6. As a keyboard user, I complete every lesson with arrow-key moves and numeric fields.

## Implementation Decisions

- Chapter and activities follow the chapter-owned model; each has a Demonstration, route and Preset collection. Existing routes and stored Presets are unchanged, so nothing here is a breaking change. New Presets store points and the chosen triangulation in grid units; import validates counts, integer range, mode and that a stored triangulation is a valid counter-clockwise triangulation of the stored points, with an actionable error otherwise.
- Do not redefine the core: predicates, the point-set/polygon graph (point limit 40, snapping) and the trace model (including the `algorithm-trace` animation id) come from the convexity spec. This family adds the event kinds `flip` and `circle`, which consumers ignore if unknown.
- ADR needed: none new from this family. It depends on the robustness ADR from the convexity spec, including the incircle bound above. The adjacency structure choice (A) is a spec decision; the owner may ask for an ADR.
- Keep kernel code independent of React, JSXGraph, localization and graph state. Graphs adapt it. Boards, listeners and timers have explicit owners and are disposed on scene change and route exit.
- Lesson prose follows the notation rules: symbols in `\(...\)`, `{,}` for decimal commas in Slovenian maths, undelimited `latex` fields. Do not copy source wording or figures.
- Rendering: triangles and cells for \(n\le40\) are cheap, but the circle overlay and the clipped unbounded cells redraw on every drag; measure a drag of B4 at 40 sites before choosing a drawing approach ([performance plan](../performance-plan.md)).

## Testing Decisions

- Unit/math: `incircle` against a rational reference on a grid sweep and at the \(2^{11}\) boundary (including the `BigInt` fallback); flip refusal on non-convex quadrilaterals; triangle/edge counts after random flips; ear clipping against shoelace area and edge-containment on random simple polygons; 3-colouring validity; Lawson termination and strictly increasing angle vector; Delaunay equals the brute-force empty-circle oracle on random general-position sets; Voronoi vertices exact and equidistant; duality edge counts; nearest-site check; collinear and cocircular cases.
- Trace tests: termination with `done`, `stateAt` purity, fold equals final output, edit invalidation.
- Graph adapter tests: add/remove/drag/snap, point limit, preset import validation (including an invalid stored triangulation), multi-action scenes in one synchronous sequence.
- Lesson tests: default preparation, Back, exit restore, final-scene handoff, `lessonMathNotation.test.ts` unchanged and passing, both languages present, `npx tsc --noEmit --pretty false` and the production build.
- Playback: injectable scheduler tests for Next step/Play equivalence, pause on edit, disposal.
- Smoke: a production guided-lesson row per lesson via the smoke-tester workflow; keyboard-only run of B3 and B4; touch add mode; SL and EN including live language switch; the full checklist only if the shared runtime changes.

### Batch-wide acceptance gate

1. Every listed Demonstration opens from its family directly and after refresh, with its lesson and a static preview.
2. The concept contracts hold with the numbers above and honest guarantees.
3. Both languages, accessible inputs, projection readability, scene restore, stopped-by-default playback, Presets and figure export pass.
4. Existing routes and Presets behave as before; shared runtime changes pass regression tests.
5. Verification evidence is recorded; commit and push follow the repository workflow.

## Correctness notes

- Hypotheses: ear clipping needs a simple polygon without three consecutive collinear vertices; the two-ears theorem guarantees an ear for simple polygons with \(n\ge4\); ear tests treat vertices on a triangle's boundary as blocking. Fisk gives sufficiency only; the comb illustrates necessity for that polygon and does not give a minimum guard set for other polygons (that is a hard problem).
- The \(2n-2-k\) and \(3n-3-k\) counts hold for every triangulation using all points as vertices, with \(k\) the number of points on the hull boundary. Euler's formula is the proof; the picture illustrates it.
- Delaunay is unique only when no four points are cocircular. An illegal edge's quadrilateral is always convex (cited from dBCKO); flipping only edges whose quadrilateral is convex enforces this in code. Lawson flips terminate because the angle vector strictly increases, and can take \(\Theta(n^2)\) flips; the lesson does not claim that flipping from an arbitrary start is fast.
- Voronoi: cells of collinear sites are strips with no vertices; with four cocircular sites a vertex has degree four and the dual is not a triangulation. A picture of a few random sites illustrates duality; it does not prove it.
- Numerical robustness: `incircle` is exact within the documented bound; outside it the `BigInt` path is used. Voronoi vertices are exact rationals; only drawing converts to doubles, and nothing compares drawn doubles.
- Angle readouts are display values (degrees to two decimals) computed from exact grid coordinates in doubles; they are never used for a discrete decision.
- Fortune's algorithm, its beach line and false circle events are not taught here; its output must use the Voronoi drawing defined above.

## Out of Scope

- Assessment, grading, accounts, backend, progress tracking, free-text input.
- Bentley–Ottmann and Fortune's sweep, monotone-polygon partitioning and its \(O(n)\) triangulation (the [sweep family](sweep-algorithms-lessons.md)); the Voronoi diagram is delivered here, its sweep construction there.
- Constrained and conforming Delaunay triangulations, polygons with holes, minimum-weight triangulation, optimal ear-clipping complexity (\(O(n\log n)\)), 3D Delaunay, higher-order and weighted Voronoi diagrams, centroidal/Lloyd relaxation, mesh refinement, Euclidean minimum spanning trees, and point location structures.
- A smallest-enclosing-disc lesson and other Family D candidates from the research note.
- Shewchuk-style adaptive predicates unless the convexity ADR chooses them.
- Replacing JSXGraph or the build tool; implementation task files.

## Further Notes

Open owner decisions: the Demonstration family name and placement (shared with the convexity spec); whether B3 ships in the first computational-geometry batch as the research note suggested (it can, after T0); acceptance of structure option A; the ADR on the robustness policy (owned by the convexity spec); the Slovenian terms above; whether B5 is wanted or folded into B4. This spec depends on the predicate, point-set graph and trace contracts in the convexity spec and must change with them. The research note's Family B list still lists the sweep item under B ("moved to its own Family C"); the sweep spec owns it.
