# Guided-lesson candidates for computational geometry (*računska geometrija*)

**Status:** research report, 2026-10-31
**Scope:** Ranked proposals for interactive computational geometry lessons, how well each fits the current app, sample sequences with independently checked numbers, and a suggested first batch. This is not an implementation spec or a feature decision. Other subject areas (curricula, CAGD, numerical methods, curve geometry) are in the [lesson-family candidates](lesson-family-candidates-2026-10-31.md).

## Sources and current coverage

**Primary course source.** University of Ljubljana, FMF, *Računska geometrija / Computational geometry*. It is an elective in the interdisciplinary master's programme in Computer Science and Mathematics (2ISRM). Course director: prof. dr. Sergio Cabello Justo. The load is 2 hours of lectures, 1 of seminar and 2 of tutorials per week ([EN course page, 2025](https://www.fmf.uni-lj.si/en/study-mathematics/programmes/2isrm/2025/courses/298/), [SL course page, 2025](https://www.fmf.uni-lj.si/sl/studij-matematike/programi/2isrm/2025/predmeti/298/), [2016/17 syllabus PDF](https://stm.fmf.uni-lj.si/2ISRM/un1617/2ISRM_12L_Racunska_geometrija.pdf)). The Slovenian syllabus content, quoted verbatim because it gives the vocabulary: *Presečišča daljic. Algoritmi pometanja. Večkotniki in triangulacije večkotnikov. Konveksne množice. Algoritme za iskanje konveksne ovojnice točk v ravnini. DCEL. Problem določanja položaja. Voronojevi diagrami. Fortuneov algoritem. Delaunayeva triangulacija. Podatkovne strukture za točke. Dualnost in razporeditve.* Its readings are de Berg et al. (2nd ed., 2000), Devadoss–O'Rourke (2011) and O'Rourke (2nd ed., 1998). The FMF server's TLS certificate failed verification for the fetch tool, so the pages were retrieved with certificate checking off. Their content matches the search-engine snippets.

**Textbooks.**
- de Berg, Cheong, van Kreveld, Overmars, *Computational Geometry: Algorithms and Applications*, 3rd ed., Springer 2008, [DOI 10.1007/978-3-540-77974-2](https://doi.org/10.1007/978-3-540-77974-2) (abbreviated **dBCKO** below). Section numbers come from the [authors' table of contents (3rd ed.)](https://ics-websites.science.uu.nl/geobook/toc.html). The authors publish two free chapters, [Ch. 1](https://ics-websites.science.uu.nl/geobook/introduction.pdf) and [Ch. 9](https://ics-websites.science.uu.nl/geobook/interpolation.pdf), and I read both. Small caveat: the author site's "about" text puts the new BSP section in Ch. 13, while its TOC lists BSP trees as Ch. 12 (§12.5). I cite the TOC.
- O'Rourke, *Computational Geometry in C*, 2nd ed., CUP 1998. Only chapter titles were reachable ([Smith TOC](https://cs.smith.edu/~jorourke/books/toc.html)): Polygon Triangulation, Polygon Partitioning, Convex Hulls in 2D, Convex Hulls in 3D, Voronoi Diagrams, Arrangements, Search and Intersection, Motion Planning, Additional Topics. I cite no section numbers.
- Devadoss–O'Rourke, *Discrete and Computational Geometry*, Princeton UP. The 1st-ed. chapters per a catalogue snippet are Polygons, Convex Hulls, Triangulations, Voronoi Diagrams, Curves, Polyhedra, Configuration Spaces. The publisher page returned "Access denied", so this is unverified beyond search snippets.
- Preparata–Shamos, *Computational Geometry: An Introduction*, Springer 1985, [DOI 10.1007/978-1-4612-1098-6](https://doi.org/10.1007/978-1-4612-1098-6). I did not open the book, so I give no chapter references.

**Original papers.** All DOIs resolve; I did not read the full texts.
- Graham 1972, [10.1016/0020-0190(72)90045-2](https://doi.org/10.1016/0020-0190(72)90045-2)
- Andrew 1979, [10.1016/0020-0190(79)90072-3](https://doi.org/10.1016/0020-0190(79)90072-3)
- Bentley–Ottmann 1979, [10.1109/TC.1979.1675432](https://doi.org/10.1109/TC.1979.1675432)
- Fisk 1978 (art gallery), [10.1016/0095-8956(78)90059-X](https://doi.org/10.1016/0095-8956(78)90059-X)
- Fortune 1987, [10.1007/BF01840357](https://doi.org/10.1007/BF01840357)
- Welzl 1991, [10.1007/BFb0038202](https://doi.org/10.1007/BFb0038202)
- Douglas–Peucker 1973, [10.3138/FM57-6770-U75U-7727](https://doi.org/10.3138/FM57-6770-U75U-7727)
- Sederberg–Nishita 1990, Bézier clipping, [10.1016/0010-4485(90)90039-F](https://doi.org/10.1016/0010-4485(90)90039-F)
- Kettner et al. 2008, "Classroom examples of robustness problems", [10.1016/j.comgeo.2007.06.003](https://doi.org/10.1016/j.comgeo.2007.06.003)
- Shewchuk's [robust predicates page](https://www.cs.cmu.edu/~quake/robust.html)

**Unreachable or not found.**
- No FRI (UL) course titled *Računska/Računalniška geometrija* turned up in searches. FRI and UM FERI catalogues were not found or were not searchable.
- CGAL docs (`doc.cgal.org`) returned HTTP 403.
- MIT 6.850 (course site and OCW syllabus) returned 404.
- The Princeton UP page denied access.

**Current Bezeg reuse.**
- `convexHull` in [geometry.ts](../../src/bezeg/impl/curve/geometry.ts#L46) already implements Andrew's monotone chain (CCW order; collinear hull points omitted; duplicates counted once).
- The curve lesson action `curve-visibility: convex-hull` ([curveLessonActions.ts](../../src/graphs/base/lesson/curveLessonActions.ts#L30)) toggles the hull of the control points.
- The Bézier chapter's "Krajišči in konveksna ovojnica …" section ([bezierChapter.ts](../../src/learning/content/bezierChapter.ts#L197)) already defines *konveksna kombinacija* and *konveksna ovojnica* and proves the hull property.
- Draggable point sets exist as curve control points (`AbstractJXGPointControlledCurve`).
- [model.ts](../../src/learning/model.ts#L53) has a closed set of lesson animation ids (`decasteljau`, `bisection`, `sequence`, `fixed-point`, …) with iterative `next-step`/`reset` commands. A step-by-step algorithm trace would fit the `bisection` model: pure model in `src/analysis/*Model.ts` plus a graph that replays steps.
- There is no polygon-editing graph, no segment-set graph and no predicate module (orientation or incircle) yet.

## Ranked shortlist

| Rank | Source and proposed interaction | Fit with current app |
| --- | --- | --- |
| 1 | **Orientation predicate and convex hull** (Andrew monotone chain, plus gift wrapping as contrast). dBCKO §1.1 (Algorithm CONVEXHULL builds upper/lower hulls with a right-turn test) and §1.2 (degeneracies and robustness); FMF syllabus item 3; Andrew 1979. Drag a point and watch the sign of \(\det(q-p,\,r-p)\) flip. Then play the sweep: push, test the turn, pop, with the stack drawn as a chain. | **Low–medium.** The hull code exists; it needs a traced variant that emits events, a free point-set graph, and an `iterative` animation id. Strong bridge to the Bézier hull property. School (orientation) to university. |
| 2 | **Delaunay triangulation by edge flips (Lawson)**, dBCKO §§9.1–9.3: Thm 9.1 \(2n-2-k\) triangles; Lemma 9.4 illegal edge \(\Leftrightarrow\) the fourth point lies inside the circumcircle; Thm 9.8 legal \(\Leftrightarrow\) Delaunay; Algorithm LEGALTRIANGULATION. Show circumcircles, highlight illegal edges, flip one at a time, and display the minimum angle. | **Medium–high.** Needs a triangulation data structure (adjacency), an incircle predicate and circle drawing. Very visual. University; a gentle variant works for upper secondary. |
| 3 | **Voronoi diagram and Delaunay duality**, dBCKO §7.1 and §9.2; FMF items 5–6. Drag sites; the cells update live. Toggle the dual Delaunay graph; a Voronoi vertex is a circumcenter of an empty circle. **Fortune's sweep** (§7.2) as an animated beach line is a stretch goal. | **Medium** for a static diagram (compute via the Delaunay triangulation from rank 2, then the duals). **High** for a faithful Fortune animation (parabolic arcs, circle events). |
| 4 | **Polygon area (shoelace) and Pick's theorem**. O'Rourke Ch. 1; Devadoss–O'Rourke "Polygons". Drag the vertices of a lattice polygon (snap to the grid). Show the signed area as a sum of triangle fans \(\tfrac12\sum(x_iy_{i+1}-x_{i+1}y_i)\) and count \(I\) and \(B\). | **Low.** Needs a polygon graph with grid snapping. Excellent for school; the signed area ties to orientation. |
| 5 | **Ear clipping and the art gallery theorem (Fisk)**, dBCKO §3.1; Fisk 1978; O'Rourke Ch. 1. Clip ears one by one, then 3-colour the triangulation and pick the smallest colour class (\(\le\lfloor n/3\rfloor\) guards). | **Medium.** Reuses the polygon graph from rank 4. Ear clipping is \(O(n^2)\) and is a teaching algorithm; dBCKO teaches the monotone-partition method (§§3.2–3.3). |
| 6 | **Point in polygon: ray casting and winding number**, O'Rourke Ch. 7 "Search and Intersection". Drag a query point; the ray shows its crossing count, then the winding number. Use a self-intersecting star to show that even–odd and nonzero rules differ. | **Low–medium.** Natural tie to curves: the winding number of a closed Bézier spline around a point. |
| 7 | **Segment intersection sweep (Bentley–Ottmann)**, dBCKO §2.1; FMF items 1–2 (*algoritmi pometanja*). Animate a sweep line, an event queue and a status ordering; neighbours swap at each intersection. | **High.** Needs a segment-set editor, a balanced status structure (an array is fine for teaching), and tie and degeneracy handling. Very good to watch, but costly to make correct. |
| 8 | **Smallest enclosing disc (Welzl / randomised incremental)**, dBCKO §4.7*; Welzl 1991. Add points in random order; the disc grows only when a point falls outside it, and then that point must lie on the boundary. | **Medium.** Simple maths; it needs an animated recursion trace. Fun with dragging. |
| 9 | **Line simplification (Ramer–Douglas–Peucker)**, Douglas–Peucker 1973 (not a dBCKO chapter). Recursively split at the farthest point while its distance exceeds \(\varepsilon\). Apply it to a sampled Bézier curve as a contrast to de Casteljau flattening. | **Medium.** Fits the existing curve evaluation. This is a heuristic: the output is not the minimum-vertex simplification. |
| 10 | **Bézier curve intersection via subdivision and hull overlap**, Sederberg–Nishita 1990 (clipping); bridges to the existing `subdivision` route. Subdivide two curves, discard pairs whose control hulls are disjoint, and recurse. | **Medium.** Reuses subdivision and hull; needs a convex-polygon disjointness test (a separating axis). A hull overlap is necessary for an intersection, not sufficient. |
| 11 | **Closest pair (divide and conquer)**, Preparata–Shamos (proximity; chapter not verified). Split at the median \(x\), recurse, and check the strip of width \(2\delta\). | **Medium.** Less visual payoff; ties are common on lattices. |
| 12 | **kd-trees and range search** (dBCKO §5.2), **point–line duality** (§8.2), **Minkowski sums and motion planning** (§13.3). | **Medium–high.** These are later, university-only additions. |

## Proposed lesson families

**Family A — "Konveksnost in ovojnice" (bridge from the Bézier chapter; school to first-year university).**
1. *Orientacija treh točk*: sign of the cross product; drag \(r\) across line \(pq\).
2. *Ploščina večkotnika*: shoelace formula as a sum of signed triangles; Pick's theorem on the lattice.
3. *Konveksna ovojnica*: a slow \(O(n^3)\) edge test (dBCKO Algorithm SLOWCONVEXHULL), then monotone chain (Andrew) traced step by step, with gift wrapping as an alternative.
4. *Degenerirani primeri in robustnost*: collinear and duplicate points; the floating-point counterexample below.
5. *Nazaj k Bézierju*: the control-point hull contains the curve; subdivision shrinks the hulls; hull-overlap intersection.

**Family B — "Triangulacije in Voronojevi diagrami" (university; follows the FMF syllabus order).**
1. Ear clipping, then the art gallery theorem with Fisk's 3-colouring.
2. Point-set triangulations: \(2n-2-k\) triangles; edge flips change the angles.
3. Delaunay: empty circle, illegal edge, Lawson flips until the triangulation is legal.
4. Voronoi cells, and duality with Delaunay.
5. *Algoritmi pometanja*: a Bentley–Ottmann sweep, with Fortune's beach line as a stretch goal.

**Recommended first batch (3–4 activities):**
- A1 orientation;
- A3 the monotone-chain trace;
- A2 shoelace/Pick;
- B3 Delaunay flips on a 4-point quad, as the "showpiece".

A1–A3 share one draggable point-set or polygon graph and one predicate module. B3 adds the incircle predicate and a triangle-adjacency structure.

## Sample sequences

All values below were computed with exact integer or `Fraction` arithmetic in `python -I`.

1. **Monotone-chain hull.** Points \((0,0),(4,0),(5,3),(2,5),(-1,3),(2,2),(1,1),(3,1),(2,0)\).
   - Lexicographic order starts \((-1,3),(0,0),(1,1),(2,0),(2,2),(2,5),(3,1),(4,0),(5,3)\).
   - Lower-chain trace:
     - push \((-1,3),(0,0),(1,1)\);
     - at \((2,0)\) the orientation is \(-2\), so pop \((1,1)\);
     - push \((2,0),(2,2)\); at \((2,5)\) the orientation is \(0\), so pop \((2,2)\) (collinear points are rejected);
     - at \((3,1)\), pop \((2,5)\) (orientation \(-5\));
     - at \((4,0)\), pop \((3,1)\) (\(-2\)), then \((2,0)\) (\(0\), collinear on the bottom edge);
     - push \((4,0),(5,3)\).
   - Lower chain: \((-1,3),(0,0),(4,0),(5,3)\). Upper chain: \((5,3),(2,5),(-1,3)\).
   - Hull (CCW): \((-1,3),(0,0),(4,0),(5,3),(2,5)\). This matches Bezeg's `convexHull` convention: \((2,0)\) lies on an edge but is not a vertex.
2. **Shoelace and Pick on the same hull.** The area is \(21\). Boundary lattice points: \(B=1+4+1+1+1=8\) (edge gcds). Interior points: \(I=18\). Check: \(I+B/2-1=18+4-1=21\).
   - Nonconvex "notched" pentagon \((0,0),(6,0),(6,4),(3,2),(0,4)\): area \(24-6=18\), \(B=16\), \(I=11\), and \(11+8-1=18\).
3. **Ear clipping and Fisk on the notched pentagon.** Ears clipped in order: \(\triangle(6,0)(6,4)(3,2)\), then \(\triangle(0,0)(6,0)(3,2)\), leaving \(\triangle(0,0)(3,2)(0,4)\).
   - A 3-colouring gives \((3,2)\) its own colour, with \(\{(0,0),(6,4)\}\) and \(\{(6,0),(0,4)\}\) as the other classes.
   - The smallest class has size \(1=\lfloor5/3\rfloor\): one guard at the reflex vertex \((3,2)\) sees everything.
4. **Point in polygon (same pentagon).** Winding number \(1\) at \((3,1)\) and \((1,3)\); \(0\) at \((3,3)\), which is inside the notch.
   - For a regular pentagram \(\{5/2\}\) with vertices on the unit circle: winding number \(2\) at the centre and \(1\) in a tip, at \((0,0.8)\). Even–odd calls the centre *outside*; nonzero calls it *inside*.
5. **Delaunay flip.** Quadrilateral \(a=(0,0),b=(4,0),c=(5,3),d=(0,2)\) with diagonal \(ac\).
   - The circumcircle of \(abc\) has centre \((2,\tfrac73)\) and \(r^2=\tfrac{85}{9}\); \(|d-\text{centre}|^2=\tfrac{37}{9}<\tfrac{85}{9}\).
   - Equivalently, the incircle determinant is \(+64\) with \(abc\) counter-clockwise. So \(d\) lies inside, and edge \(ac\) is illegal (Lemma 9.4).
   - After flipping to \(bd\), both incircle tests are \(-64\) (legal). The minimum angle rises from \(19.65^\circ\) to \(26.57^\circ\), as Observation 9.3 predicts.
   - A square is cocircular (determinant \(0\)): both diagonals are Delaunay, so the triangulation is not unique.
6. **Smallest enclosing disc.**
   - For \((0,0),(4,0),(0,3),(1,1),(2,2)\): centre \((2,\tfrac32)\), \(r=\tfrac52\). Two points define it (the right-angle hypotenuse \((4,0)\)–\((0,3)\)).
   - For \((0,0),(4,0),(1,3),(2,1)\): an acute triangle, so the circumcircle is minimal. Centre \((2,1)\), \(r=\sqrt5\approx2.2361\).
7. **RDP with \(\varepsilon=1\).** Polyline \((0,0),(1,0.1),(2,-0.1),(3,5),(4,6),(5,7),(6,8.1),(7,9),(8,9),(9,9)\).
   - First split at \((2,-0.1)\) (distance \(1.4849\)), then \((3,5)\) (\(2.3169\)), then \((7,9)\) (\(1.1094\)).
   - Result: \((0,0),(2,-0.1),(3,5),(7,9),(9,9)\).
8. **Segment intersections (sweep demo).** Segments \(s_0=(0,0)(6,4)\), \(s_1=(0,4)(6,0)\), \(s_2=(1,-1)(2,5)\), \(s_3=(4,5)(5,-1)\) give five crossings: \(s_0s_1\) at \((3,2)\), \(s_0s_2\) at \((\tfrac{21}{16},\tfrac78)\), \(s_0s_3\) at \((\tfrac{87}{20},\tfrac{29}{10})\), \(s_1s_2\) at \((\tfrac{33}{20},\tfrac{29}{10})\), \(s_1s_3\) at \((\tfrac{75}{16},\tfrac78)\).
   - Two pairs share a \(y\)-coordinate (event ties): a good test of the tie-breaking rule.
9. **Floating-point orientation failure** (the setup of Kettner et al.). \(q=(12,12)\), \(r=(24,24)\), \(p=(0.5+i\cdot2^{-53},\,0.5+j\cdot2^{-53})\) for \(0\le i,j<64\).
   - Naive double evaluation of \((q-p)\times(r-p)\) gives the *opposite* sign in 112 of 4096 cases, and a false \(0\) in 2052 cases.
   - Example: \(i=41,j=48\). Exact value \(\approx+9.33\times10^{-15}\); double value \(-5.68\times10^{-14}\).

## Correctness notes and limits

- **Orientation:** \(\operatorname{orient}(p,q,r)=(q_x-p_x)(r_y-p_y)-(q_y-p_y)(r_x-p_x)\), positive for a counter-clockwise turn. In JS doubles it is exact only for small integer coordinates (all products below \(2^{53}\)). Dragged JSXGraph points are arbitrary doubles. Either snap the lesson inputs to a grid, or use Shewchuk-style adaptive predicates and an explicit zero tolerance labelled as such. Never present a tolerance as exact.
- **Hull degeneracies:**
  - collinear points on hull edges (state whether they are included);
  - duplicates;
  - all points collinear (the hull is a segment; the Bézier chapter already allows this);
  - \(n<3\);
  - ties in \(x\), which need a lexicographic sort.
  dBCKO §1.2 discusses these explicitly. Gift wrapping needs a rule for collinear candidates (take the farthest one).
- **Shoelace:** gives a *signed* area; the sign shows orientation. It is valid only for simple polygons. For self-intersecting polygons it gives \(\sum\) winding number \(\times\) region area, not "the area". **Pick** requires a simple lattice polygon without holes.
- **Ear clipping:** needs a simple polygon. The two-ears theorem guarantees an ear exists. Ear tests must treat reflex vertices on a triangle's boundary as blocking. **Fisk** gives sufficiency (\(\lfloor n/3\rfloor\) guards always suffice) and the comb shows necessity. A minimum guard set for a given polygon is a different, hard problem.
- **Delaunay:** it is unique only when no four points are cocircular. Lawson flips terminate because the angle vector strictly increases (dBCKO Obs. 9.3), but they can take \(\Theta(n^2)\) flips. Flip only edges whose quadrilateral is convex (dBCKO notes that an illegal edge's quadrilateral is always convex). The incircle sign depends on the triangle's orientation.
- **Voronoi:** cells of collinear sites are unbounded strips with no Voronoi vertices. With four cocircular sites, a Voronoi vertex has degree 4 and the dual is not a triangulation.
- **Fortune:** the beach line consists of parabolic arcs. Circle events can be false alarms, and a faithful animation must remove them. Present it as a stretch goal only after unit-tested event handling.
- **Bentley–Ottmann:** dBCKO's §2.1 version handles horizontal segments, shared endpoints and multiple segments through one point. Simplified lesson inputs must either exclude these cases or say so explicitly.
- **Welzl:** expected linear time *only* with a random insertion order; a fixed adversarial order is slower. The minimal disc is unique and is determined by 2 or 3 boundary points.
- **RDP:** a heuristic. Its result depends on \(\varepsilon\) and on the endpoints, it is not optimal, and it can create self-intersections. **Bézier hull overlap:** disjoint hulls prove there is no intersection. Overlapping hulls prove nothing, so recursion needs a termination tolerance.
- The research was selective. dBCKO was read from Ch. 1 and Ch. 9 plus the TOC. O'Rourke and Devadoss–O'Rourke were checked at chapter level only. The original papers were checked by DOI resolution, not read. Slovenian terms come from the FMF syllabus. New terms (e.g. *uho* for ear, *nedovoljen rob* for illegal edge) still need the [localization term procedure](../localization.md#choosing-new-terms).
