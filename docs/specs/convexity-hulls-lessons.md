# Convexity and hulls (Konveksnost in ovojnice)

**Status:** scheduled, 2026-10-31, in the [geometry feature stream](../tasks/feature-streams/geometry.md); tasks in [docs/tasks/convexity-hulls/](../tasks/convexity-hulls/README.md). Handler decisions (robustness policy A in [ADR 0021](../adr/0021-exact-grid-predicates.md), `src/compgeo/`, the `algorithm-trace` id, the *Računska geometrija* family, terms as proposed) are recorded in the task README.
**Agreed:** 2026-10-31 (owner approved the family; details below are proposals for owner review).
**Source:** [computational geometry candidates](../research/computational-geometry-candidates-2026-10-31.md), Family A, ranks 1, 4, 6 and 10, sample sequences 1, 2, 4 and 9, and its correctness notes. Primary sources it cites: de Berg, Cheong, van Kreveld, Overmars, *Computational Geometry* (3rd ed., Springer 2008; §1.1 and §1.2 on hulls, degeneracies and robustness); Andrew 1979 (monotone chain); Kettner et al. 2008 (classroom robustness examples, DOI 10.1016/j.comgeo.2007.06.003); Shewchuk's robust predicates; Sederberg–Nishita 1990 (Bézier clipping); FMF *Računska geometrija* syllabus. Index: [new lesson families](new-lesson-families.md).

## Problem Statement

Bezeg teaches the convex hull property of Bézier curves, but a learner never sees what a hull is made of: why three points turn left or right, how a hull is built, what goes wrong when points are collinear or the arithmetic is inexact. The Bézier chapter states the hull property and proves it ([bezierChapter.ts](../../src/learning/content/bezierChapter.ts), section `geometric-properties`), and the curve graphs can shade the hull. Nothing in the app lets a learner drag points and watch a hull algorithm decide.

This family also lays the foundation for two later families ([triangulation-voronoi-lessons.md](triangulation-voronoi-lessons.md), [sweep-algorithms-lessons.md](sweep-algorithms-lessons.md)), which need the same predicates, the same draggable point-set graph and the same step-by-step algorithm traces.

## Solution

Add a bilingual Learn chapter, **Konveksnost in ovojnice / Convexity and hulls**, with six lessons. Each lesson has a chapter-owned guided graph activity backed by a catalog Demonstration that also works for free exploration, following [chapter-owned guided learning](chapter-owned-guided-learning.md). Target upper secondary to first-year university. A lesson takes about 5–10 minutes in 5–7 steps (an editorial target). Learners predict before an explicit Show or Next step reveals the result. There are no exercises, grading or progress tracking. Every lesson ends in free exploration.

### Release batches

| Batch | Lessons | Release condition |
| --- | --- | --- |
| 0 (foundation) | Shared core below: predicate module, point-set/polygon graph, trace model, the ADR on robustness | ADR accepted; core unit tests pass; no learner-visible route is required |
| 1 | A1 Orientation; A2 Polygon area and Pick; A4 Convex hull | Batch 0 done; full verification of all three (this is the research note's recommended first batch, minus its Delaunay showpiece) |
| 2 | A3 Point in polygon; A5 Degeneracies and robustness | Batch 1 released |
| 3 | A6 Back to Bézier | Batch 2 released; an owner decision on the new family placement (below) |

Publish batches separately. Do not expose unimplemented Demonstrations or advertise unreleased lessons.

### Placement

Demonstrations need a family in `families` ([demonstrations.ts](../../src/demonstrations.ts), line 7 onward; today `basics`, the curve families, `analysis`). Proposal: add one family **Računska geometrija / Computational geometry** for the Demonstrations of this and the two dependent specs, and one Learn chapter per lesson family via [familyChapters.ts](../../src/learning/content/familyChapters.ts). The alternative (put the Demonstrations under `basics` or `analysis`) hides them from learners who look for geometry. Needs owner confirmation. A6 is also reachable from the Bézier chapter through its prerequisite links.

### Slovenian and English terms (proposals)

Per [choosing new terms](../localization.md#choosing-new-terms). Existing term: *konveksna ovojnica*. Everything else is a proposal, to be settled against FMF/RUL usage when implemented; the syllabus gives *konveksne množice*, *večkotniki*, *konveksna ovojnica*.

| Slovenian (proposal) | English |
| --- | --- |
| orientacija treh točk; zavoj v levo / v desno | orientation of three points; left / right turn |
| nasprotno / v smeri urinega kazalca | counter-clockwise / clockwise |
| ploščina večkotnika; obrazec z determinantami (shoelace) | polygon area; shoelace formula |
| Pickov izrek; notranje in robne mrežne točke | Pick's theorem; interior and boundary lattice points |
| točka v večkotniku; sodo-liho pravilo; ovojno število | point in polygon; even–odd rule; winding number |
| algoritem monotone verige (Andrew) | monotone chain algorithm |
| ovijanje (Jarvisov algoritem) | gift wrapping |
| izrojen primer; robustnost | degenerate case; robustness |

*Shoelace* has no established Slovenian name found in the research; use the formula's name in prose with the English gloss on first mention.

## Shared computational-geometry core

Owned by this spec; the triangulation and sweep specs depend on it. It must stay free of React and JSXGraph, and must not use graph-global cache state. Proposed location: a new `src/compgeo/` (the existing `convexHull` in [geometry.ts](../../src/bezeg/impl/curve/geometry.ts) takes `Point` objects from the curve API, so it is not reusable as is). Names are proposals; the contract is the part to keep stable.

### 1. Predicate module and robustness policy

Contract (stable):

- `type GridPoint = {readonly x: number; readonly y: number}` holding integers in a documented range, plus a graph-level scale (grid step, a power of two such as \(1\) or \(1/4\)) that maps grid coordinates to the board. Predicates see only grid coordinates.
- `orient(a, b, c): -1 | 0 | 1`, the sign of \((b_x-a_x)(c_y-a_y)-(b_y-a_y)(c_x-a_x)\), positive for a counter-clockwise turn. A companion `orientValue` returns the exact determinant for display.
- Reserved extension point: `incircle(a, b, c, d): -1 | 0 | 1` (positive when \(d\) is inside the circle through counter-clockwise \(a,b,c\)), in the same module and with the same policy. Not implemented by this family; the triangulation spec implements it. The module documents its exactness bound separately per predicate, because the degree differs.
- Helpers on top of `orient`: segment intersection tests and point-on-segment, all returning discrete outcomes (never a coordinate that is later compared).
- Every predicate is a pure function with a documented exact input range. Out-of-range input is rejected, not approximated.

Robustness policy — a real decision, **needs an ADR** before Batch 0 is accepted. Alternatives:

| Option | Strength | Weakness |
| --- | --- | --- |
| A. Inputs snapped to an integer (or dyadic) grid, exact arithmetic | Simple, exact, testable against hand computation; matches Pick's theorem, which needs lattice points | Learner cannot place points between grid nodes; the double failure of sample 9 can only be shown with a special "free" mode |
| B. Shewchuk-style adaptive predicates on arbitrary doubles | Exact on every double a drag can produce | Substantial code to port and verify; harder to explain; the incircle version is longer still |
| C. Floating tolerance | Smallest code | Wrong answers for near-degenerate input, and a tolerance cannot be presented as exact (index shared constraint) |

Recommendation: **A**. Snap every point to the grid; with \(|{\text{grid coordinate}}|\le 2^{25}\) the `orient` products are below \(2^{53}\) and plain doubles are exact. `incircle` has degree four: for coordinates up to \(2^{11}\) in absolute value its determinant stays below \(2^{53}\); above that it uses `BigInt`. The ADR should confirm the grid range (default board is far smaller) and whether the lessons need a labelled "free double" mode for sample 9 only. In that mode, orientation is computed in doubles on purpose and the result is labelled inexact; the exact result comes from rational arithmetic on the same inputs (A5).

### 2. Draggable point-set and polygon graph

One graph class family (point-set mode, polygon mode) reused by A1–A6 and by both dependent specs:

- Points: add (click empty board, or an **Add point** button with numeric fields), drag, remove (select and Delete, or a Remove button), clear, and move the selected point by one grid step with the arrow keys. Every point has a numeric alternative (x, y fields in a list), so keyboard and screen-reader use do not depend on the pointer. Touch: tap adds only in an explicit Add mode, so panning and dragging do not add points by accident.
- Snapping to the grid is always on; grid step is a graph parameter. Count limit: 40 points (hull trace) with an error message at the limit, not silent truncation.
- Polygon mode: ordered vertices with edges, a "closed" flag, and an exact simplicity check (no two non-adjacent edges meet, using `orient`). A non-simple polygon is allowed in point-in-polygon and shoelace lessons that need it (pentagram) and is labelled; Pick and area-as-region claims state "simple polygon".
- Typed lesson actions: set the point list or a named example, select a point, show/hide overlays (hull, turns, ray, grid, trace). Unsupported actions are rejected. Scene store is the single source of truth, per the repository rule on synchronous scene writes.
- Board objects, listeners and timers have explicit owners and are disposed on scene change and route exit. Presets store the point list and mode in grid units; import validates counts, integer range and mode, and gives an actionable error otherwise.

### 3. Algorithm step-trace model

Contract (stable):

- A trace is produced by a pure function from validated input to a read-only array of events: `trace = algorithm(input)`. Each event has a `kind` (a string literal from the algorithm's own union), a payload of point indices (never copies of coordinates), the running count of predicate evaluations, and a `noteKey` for the status line. Event kinds shared by all algorithms: `phase`, `test` (a predicate with its sign), `accept`, `reject`, `output`, `done`. Algorithms may add kinds; consumers ignore kinds they do not know.
- State after event \(i\) is derived by a pure fold `stateAt(trace, i)`; no mutable simulation state lives in the graph. The graph keeps only the step index.
- The step index and the input form the saved configuration, as in [bisectionModel.ts](../../src/analysis/bisectionModel.ts); running/paused status is transient. Editing the input recomputes the trace and resets the index to \(0\); a stale index is clamped on import.
- Replay uses the iterative pattern already in [model.ts](../../src/learning/model.ts) (`LESSON_ANIMATION_IDS`, commands `next-step`, `reset`, `play`, `pause`; first user `bisection`, driven in [IterativeFunctionGraph.tsx](../../src/graphs/functions/IterativeFunctionGraph.tsx)). Proposal: one new animation id, `algorithm-trace`, with the algorithm chosen by a typed choice (like `bisection-example`); the dependent families reuse the id. Alternative: one id per algorithm, which grows the closed list. Needs a decision at integration, not an ADR.
- Traces have a documented finite length (hull of \(n\le 40\) points: a few hundred events) and always terminate with `done`. Next step and Play use the same transition.

### Reuse check

Verified to exist and reusable as is: `convexHull` in [geometry.ts](../../src/bezeg/impl/curve/geometry.ts) (Andrew; CCW from leftmost; collinear hull points omitted; duplicates once). Use it as an independent oracle in tests of the new trace, not as the trace's implementation (it depends on the curve `Point` type). The `curve-visibility: convex-hull` action ([curveLessonActions.ts](../../src/graphs/base/lesson/curveLessonActions.ts)) already toggles the hull of control points and is reused unchanged in A6. [SubdivisionGraph.tsx](../../src/graphs/curves/bezier/SubdivisionGraph.tsx) provides repeated midpoint subdivision (limit `MAX_SUBDIVISION_STEPS = 5`, so up to 32 pieces) and is reused by A6. New: predicate module, point-set/polygon graph, trace model, separating-axis hull disjointness test, the lesson content and chapter.

## Concept contracts and acceptance criteria

Examples are implementation defaults; equivalents may replace them if the learning goal, edge cases and independent checks are kept.

### A1. Orientation of three points

- Goal: the sign of the cross product decides a left or right turn, and zero means collinear.
- Prerequisites: coordinates and vectors; the Bézier chapter's affine and convex combinations are optional context.
- Example: \(p=(0,0)\), \(q=(4,0)\), movable \(r\). \(r=(3,2)\) gives \(+8\) (left turn); \(r=(3,-2)\) gives \(-8\); \(r=(2,0)\) gives \(0\).
- Steps: (1) two fixed points and the line \(pq\); (2) predict the side of a given \(r\); (3) reveal the value and sign; (4) drag \(r\) across the line and watch the sign flip at the line; (5) twice the signed triangle area (links to A2); (6) free exploration.
- Graph: point-set mode with three points, colour and text for the turn (not colour only), value readout.
- Acceptance: 1. The three values above are shown exactly. 2. Swapping any two points negates the value. 3. A point on the line shows \(0\) and "collinear" and is reachable by keyboard. 4. The displayed sign equals `orient` at every grid position tested over a small grid. 5. The status text is correct after a scene change and Back. 6. Both languages.

### A2. Polygon area and Pick's theorem

- Goal: area as a sum of signed triangles; the sign gives orientation; Pick's theorem relates area to lattice points.
- Prerequisites: A1.
- Examples: hull from sample 1, vertices \((-1,3),(0,0),(4,0),(5,3),(2,5)\): area \(21\), \(B=8\), \(I=18\), \(18+8/2-1=21\). Notched pentagon \((0,0),(6,0),(6,4),(3,2),(0,4)\): area \(18\), \(B=16\), \(I=11\).
- Steps: (1) fan of triangles from one vertex; (2) predict the area; (3) show the shoelace sum \(\tfrac12\sum(x_iy_{i+1}-x_{i+1}y_i)\); (4) reverse the vertex order and see the sign flip; (5) count \(I\) and \(B\) and compare with Pick; (6) make the polygon self-intersecting and see the formula stop meaning "area"; (7) free exploration.
- Acceptance: 1. Both examples give the values above (the pentagon's doubled shoelace sum is \(36\)). 2. Reversing the order negates the signed area and not \(|A|\). 3. \(B\) uses edge gcds; \(I\) is counted independently from \(B\) and Pick's value is compared, not derived from it. 4. For a self-intersecting polygon the shoelace value is labelled "signed sum of winding number times area", not "the area", and Pick is not offered. 5. Vertices stay on lattice nodes. 6. Both languages.

### A3. Point in polygon

- Goal: ray casting counts crossings; the winding number counts turns; the two rules differ for self-intersecting polygons.
- Prerequisites: A1, A2.
- Examples: the notched pentagon with query points \((3,1)\) and \((1,3)\) (winding number \(1\)) and \((3,3)\), inside the notch (\(0\)). Regular pentagram \(\{5/2\}\) (vertices on the unit circle, scaled to the grid): centre has winding number \(2\), a tip \(1\); even–odd calls the centre outside, nonzero inside.
- Steps: (1) drag a query point; (2) predict inside/outside; (3) reveal the ray and crossing count; (4) boundary and vertex hits on the ray, with the half-open rule stated; (5) the winding number; (6) the pentagram where the rules disagree; (7) free exploration.
- Graph: polygon mode plus a query point and a ray overlay. Crossings are decided by `orient` on grid points, with a documented half-open rule for rays through vertices.
- Acceptance: 1. The pentagon values above. 2. A ray through a vertex gives the same answer as a nearby ray (tested over all vertices). 3. A point on an edge is reported "on the boundary", not inside or outside. 4. The pentagram gives winding number \(2\) at the centre and the two rules disagree there. 5. Odd crossing count equals odd winding number for every tested point. 6. Both languages.
- Note: the pentagram vertices are not lattice points; the implementation chooses a scaled lattice approximation whose winding numbers are verified by an exact test, and states that the figure is approximate.

### A4. Convex hull

- Goal: build a hull from orientation tests, compare an \(O(n^3)\) edge test, the monotone chain and gift wrapping, and see why collinear points need a rule.
- Prerequisites: A1; Bézier chapter section on the convex hull.
- Example: the nine points of sample 1. Lexicographic order starts \((-1,3),(0,0),(1,1),(2,0),(2,2),(2,5),(3,1),(4,0),(5,3)\). Trace as in the research note: pops at \((2,0)\) (value \(-2\)), at \((2,5)\) (\(0\), collinear rejected), at \((3,1)\) (\(-5\)), at \((4,0)\) (\(-2\), then \(0\)). Hull (CCW): \((-1,3),(0,0),(4,0),(5,3),(2,5)\); \((2,0)\) lies on an edge but is not a vertex.
- Steps: (1) slow edge test: a directed pair is a hull edge when all other points are on its left; (2) predict which pairs qualify; (3) reveal the edges; (4) monotone chain, Next step through push/test/pop on the lower chain, then the upper chain; (5) gift wrapping on the same points; (6) compare predicate counts; (7) free exploration with Add/Remove.
- New numbers (computed with `node -e`, exact integers): the slow test examines 72 ordered pairs against 7 other points each (504 orientation tests) and accepts 5 directed edges under the rule "other points strictly left or on the segment between"; gift wrapping from the leftmost point, taking the farthest on ties, makes 5 wraps; each wrap takes the first of the 8 other points as candidate and compares the remaining 7 against it, so 35 orientation tests, and returns the same 5-vertex hull (corrected 2026-10-31 from "8 comparisons, 40 tests", which counted the candidate against itself; checked by an independent script).
- Acceptance: 1. The trace equals the hand-checked pops and values above. 2. The final hull equals the oracle `convexHull` (existing function) over random grid sets, including collinear and duplicate points. 3. The slow test, chain and wrapping give the same vertex set on the default example and on all-collinear input. 4. Edits recompute the trace, reset the index and pause playback; Reset returns to step \(0\); Next step and Play yield identical states. 5. \(n<3\) and all-collinear input show a segment or point hull with a message, not an error. 6. The slow test is stated as a teaching algorithm and its cost shown. 7. Both languages.

### A5. Degenerate cases and robustness

- Goal: collinear points, duplicates and floating-point error can break a hull algorithm; exact predicates on a grid avoid it.
- Prerequisites: A4.
- Examples: sample 1 (collinear \((2,0)\) on a hull edge; \((2,2)\), \((2,5)\) collinear with \((2,0)\)); duplicate points; Kettner setup: \(q=(12,12)\), \(r=(24,24)\), \(p=(0.5+i\,2^{-53},0.5+j\,2^{-53})\), \(0\le i,j<64\). Naive double evaluation has the wrong sign in 112 of 4096 cases and a false \(0\) in 2052; \(i=41,j=48\) has exact value about \(+9.33\times10^{-15}\) and double value \(-5.68\times10^{-14}\).
- Steps: (1) three collinear points: what should a hull do; (2) predict the rule choice; (3) the monotone chain with `<=` versus `<` on the pop test; (4) duplicates; (5) the "free double" board where a near-collinear triple gets the wrong sign; (6) the same triple on the grid, exact; (7) free exploration.
- Acceptance: 1. The 112 and 2052 counts and the \(i=41,j=48\) example reproduce in a unit test using exact rational arithmetic as the reference. 2. The inexact mode is labelled inexact everywhere it appears. 3. The exact mode never disagrees with the rational reference over a grid sweep. 4. The lesson states what the picture shows (examples), not that doubles always fail. 5. Both languages.

### A6. Back to Bézier: hulls of control polygons

- Goal: the control polygon's hull contains the curve; subdividing shrinks hulls; two curves whose hulls are disjoint cannot meet, and overlapping hulls prove nothing.
- Prerequisites: A4; the Bézier chapter (`geometric-properties`, subdivision).
- Examples: quadratic curves \(A\): control points \((0,0),(2,4),(4,0)\) and \(B\): \((0,3),(2,-1),(4,3)\). With \(x=4t\) for both, they meet where \(16t^2-16t+3=0\), at \(t=\tfrac14\) and \(t=\tfrac34\), the points \((1,1.5)\) and \((3,1.5)\) (handler recomputation with `node -e`, 2026-10-31; an earlier draft value was wrong).
- New numbers (computed with `node -e`: de Casteljau halving, hull by monotone chain, separating-axis test): hull-overlapping pairs after \(k=0,1,2,3,4\) halvings are \(1/1,\;2/4,\;8/16,\;8/64,\;8/256\). The count stabilizes at \(8\), pairs near the two crossings (the neighbours of a crossing piece also overlap). Handler-confirmed. Because both crossings sit at dyadic parameters, from depth \(2\) each lies on a shared piece endpoint, so up to four piece pairs touch it; keep the example only if the lesson explains this, or move a control point so the crossings fall inside pieces.
- Steps: (1) the curve inside its control hull (reuses `curve-visibility: convex-hull`); (2) subdivide once and see two smaller hulls inside the first; (3) predict which piece pairs of two curves can meet; (4) reveal the discard of disjoint pairs; (5) repeat to depth 4; (6) caveat: remaining pairs need not intersect; (7) free exploration.
- Graph: the subdivision graph shows one curve; the intersection view needs a second curve, so a new pair-of-curves graph (or a second subdivision instance) is required, with a separating-axis test on convex hulls. Depth is limited to \(4\) (\(\le 256\) pairs).
- Acceptance: 1. Counts above at depths \(0\)–\(4\). 2. Every discarded pair is verified disjoint by an independent test (dense sampling of both pieces finds no common point); no pair containing a true crossing is ever discarded. 3. Hulls of subdivided pieces lie inside the parent's hull. 4. The lesson says overlap is necessary, not sufficient, and the recursion stops at a fixed depth, not at "exact" crossings. 5. Dragging a control point recomputes the pairs and resets playback. 6. Both languages.

## User Stories

1. As a student, I drag the third point across a line and see the turn flip, so that the sign of a determinant gets geometric meaning.
2. As a student, I step through the monotone chain and see each push and pop, so that I understand why a hull algorithm is correct.
3. As an educator, I project the shoelace sum on a lattice polygon and check Pick's theorem live.
4. As a student, I add a collinear point and see how the rule changes the hull, so that degenerate input is not a surprise.
5. As a student of Bézier curves, I see the hull of subdivided pieces shrink, so that the hull property connects to an algorithm.
6. As a keyboard user, I move points with arrows and numeric fields and complete every lesson without a pointer.

## Implementation Decisions

- Chapter content and activities follow the existing chapter-owned model; each activity has a Demonstration, a route and a Preset collection. Existing routes and stored Presets are unchanged, so nothing here is a breaking change.
- Keep the core (predicates, traces, hull algorithms, simplicity checks) independent of React, JSXGraph, localization and graph-global state. Graphs adapt it.
- ADR required: robustness policy (options above). Also needed before the dependent families start: confirm the `src/compgeo/` location and the `algorithm-trace` animation id.
- Lesson scenes are temporary. Entering a lesson captures the configuration and view; leaving restores them; playback never resumes by itself.
- Lesson prose follows the notation rules: symbols in `\(...\)`, `{,}` for decimal commas in Slovenian maths, undelimited `latex` fields. Write English and Slovenian together; type-checked `t()` calls with exact placeholder names.
- Do not copy the textbook's wording or figures; the lessons are original and cite sources only for the algorithms.
- Rendering: points, polygons and traces are cheap. Only A6 at depth 4 (up to 512 hull polygons) is potentially heavy; measure before any optimization ([performance plan](../performance-plan.md)).

## Testing Decisions

- Unit/math: `orient` against a rational reference over a grid sweep and the Kettner case; signed area and Pick on both default polygons; point in polygon against a brute-force angle-sum reference on random grid polygons; the trace against hand-checked pops and against the existing `convexHull` as oracle on random sets with duplicates and collinear points; slow hull, chain and wrapping agree; separating-axis disjointness against dense sampling (A6).
- Trace-model tests: termination with `done`, `stateAt` is pure, fold of all events equals the final output, edits invalidate the index.
- Graph adapter tests: add/remove/drag/snap/arrow keys, count limit, preset import validation (non-integer, out of range, too many points, wrong mode), multi-action scenes in one synchronous sequence.
- Lesson tests: default preparation, Back, exit restore, final-scene handoff, `lessonMathNotation.test.ts` must pass unchanged, both languages present, `npx tsc --noEmit --pretty false` and the production build after localization changes.
- Playback: injectable scheduler tests for Next step/Play equivalence, pause on edit and scene change, disposal.
- Smoke: a production guided-lesson row per lesson using the smoke-tester workflow; keyboard-only run of A1 and A4; touch add mode check; SL and EN including a live language switch; the full checklist only if the shared lesson runtime changes.

### Batch-wide acceptance gate

1. Every listed Demonstration opens from its family, directly and after refresh, with its lesson and a static preview.
2. Concept contracts above hold with the checked numbers and honest guarantees.
3. Both languages, accessible inputs, projection readability, scene restore, stopped-by-default playback, Presets and figure export pass.
4. Existing routes and Presets behave as before; shared runtime changes pass regression tests.
5. Verification evidence is recorded; commit and push follow the repository workflow.

## Correctness notes

- Hypotheses to state: shoelace and Pick need a simple polygon; Pick needs lattice vertices and no holes; ray casting needs a rule for rays through vertices; the hull rule for collinear points must be named.
- Degeneracies: \(n<3\), all collinear, duplicates, ties in \(x\) (lexicographic sort), points on hull edges, query points on edges.
- Robustness: exactness holds only within the documented grid range; imported presets outside it are rejected. A tolerance is never shown as exact.
- A picture illustrates: finite examples of the hull property and of non-overlapping pieces are illustrations; containment for every \(t\) rests on the nonnegative coefficients summing to one, as the Bézier chapter argues. Hull overlap in A6 proves nothing about an intersection.
- Gift wrapping cost depends on the hull size \(h\) (\(O(nh)\)); the chain is \(O(n\log n)\). The test counts (504 for the slow test, 35 for wrapping) on one small example illustrate, not prove, this.

## Out of Scope

- Assessment, grading, accounts, backend, progress tracking, free-text input.
- Graham scan, quickhull, 3D hulls, dynamic hulls, convex-layer peeling, smallest enclosing disc, Minkowski sums, and polygon clipping.
- Holes in polygons for Pick and area; polygons with curved edges.
- Implementing Shewchuk's adaptive predicates unless the ADR chooses it; the `incircle` predicate (triangulation spec).
- Ear clipping and art-gallery lessons ([triangulation-voronoi-lessons.md](triangulation-voronoi-lessons.md)) and sweep algorithms ([sweep-algorithms-lessons.md](sweep-algorithms-lessons.md)).
- Bézier clipping and curve intersection to a stated precision; A6 stops at a fixed depth.
- Replacing JSXGraph or the build tool; implementation task files.

## Further Notes

Open owner decisions: the new Demonstration family name and placement; the robustness policy ADR (option A recommended); whether sample 9's inexact mode is worth a special "free double" board; the Slovenian terms above. Dependent specs must not change the predicate, point-set graph or trace contracts without updating this spec.
