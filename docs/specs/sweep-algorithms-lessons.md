# Sweep-line algorithms (Algoritmi pometanja)

**Status:** proposed, 2026-10-31. Specification only; implementation not scheduled.
**Agreed:** 2026-10-31 (owner approved the family; details below are proposals for owner review).
**Source:** [computational geometry candidates](../research/computational-geometry-candidates-2026-10-31.md), Family C ("Proposed lesson families", "Sample sequences" item 8, "Correctness notes and limits"). Primary sources: de Berg, Cheong, van Kreveld, Overmars, *Computational Geometry* (3rd ed., Springer 2008; "dBCKO"). Section numbers below were checked against the book's online table of contents (https://ics-websites.science.uu.nl/geobook/toc.html) on 2026-10-31: §2.1 Line Segment Intersection; §2.3 Computing the Overlay of Two Subdivisions; §3.2 Partitioning a Polygon into Monotone Pieces; §3.3 Triangulating a Monotone Polygon; §7.2 Computing the Voronoi Diagram. Only chapter and section titles were read; the algorithm descriptions below are the author's own and the cited sections are the places to check them. Also: Bentley–Ottmann 1979 and Fortune 1987 (DOI 10.1007/BF01840357) as named by the research note; FMF *Računska geometrija* syllabus (*Presečišča daljic. Algoritmi pometanja.*). Index: [new lesson families](new-lesson-families.md). Core: [convexity-hulls-lessons.md](convexity-hulls-lessons.md#shared-computational-geometry-core). Kernel and Voronoi value: [triangulation-voronoi-lessons.md](triangulation-voronoi-lessons.md#voronoi-drawing-reused-by-the-sweep-family).

## Problem Statement

Learners who meet segment intersection, polygon triangulation or Voronoi diagrams see only the result, never the paradigm that makes the fast algorithms work: a line moves across the plane, a few things change at discrete events, and only the neighbours of the line need attention. The slow versions (test all \(\binom n2\) pairs, clip ears in \(O(n^2)\), compare each site with all others) hide why \(O((n+k)\log n)\) and \(O(n\log n)\) are possible. Bezeg has no event-driven algorithm animation, and no place where a status structure, an event queue and a moving line are drawn together.

## Solution

Add a bilingual Learn chapter, **Algoritmi pometanja / Sweep-line algorithms**, with five lessons (a sixth is optional). Each has a chapter-owned guided graph activity backed by a catalog Demonstration that also works for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). Target: university. A lesson takes about 5–10 minutes in 5–7 steps (editorial target). Learners predict before an explicit Show or Next step reveals the result. No exercises, grading or progress tracking; every lesson ends in free exploration.

**Direction convention (proposal, one for the whole family).** As in dBCKO, the sweep line is horizontal and moves **downwards**. Events are ordered by decreasing \(y\), ties by increasing \(x\) (equivalent to a tiny rotation of the plane). The status lists objects from left to right along the sweep line. The alternative (left-to-right sweep) is closer to the \(x\)-axis habit of function graphs but would contradict the book and the Fortune figures; one direction is used everywhere so learners do not re-learn it.

### Release batches

"Convexity Batch 0" and "Triangulation T0" are the batches of the [convexity](convexity-hulls-lessons.md#release-batches) and [triangulation](triangulation-voronoi-lessons.md#release-batches) specs.

| Batch | Contents | Release condition |
| --- | --- | --- |
| S0 (foundation) | Event-queue/status trace model (below), exact rational helper, segment-set graph mode; unit tests; ADR on rational coordinates | Convexity Batch 0 accepted (predicate ADR settled); no learner-visible route required |
| S1 | C1 Sweep as an idea; C2 Bentley–Ottmann | S0 done |
| S2 | C3 Monotone partition; C4 Triangulating a monotone polygon | S1 released; Triangulation T1 (ear clipping, for the contrast) released or its absence stated in C4 |
| S3 | C5 Fortune's algorithm | S1 released; Triangulation T0 and T3 (Voronoi drawing) accepted; performance of the beach-line drawing measured |
| S4 (optional) | C6 Closest pair and overlay | Owner decision; S1 released |

Publish batches separately. Do not expose unimplemented Demonstrations or advertise unreleased lessons.

### Placement

Use the **Računska geometrija / Computational geometry** Demonstration family proposed in the convexity spec ([placement](convexity-hulls-lessons.md#placement), awaiting the owner) and one Learn chapter registered in [familyChapters.ts](../../src/learning/content/familyChapters.ts). If the owner declines, follow the placement chosen there.

### Slovenian and English terms (proposals)

Per [choosing new terms](../localization.md#choosing-new-terms). The syllabus gives *presečišča daljic* and *algoritmi pometanja*; the rest are proposals to settle against FMF/RUL usage when implemented.

| Slovenian (proposal) | English |
| --- | --- |
| pometalna premica; pometanje | sweep line; sweeping |
| dogodek; vrsta dogodkov | event; event queue |
| stanje pometalne premice (stanje) | status (of the sweep line) |
| presečišče; sosednji daljici | intersection point; neighbouring segments |
| ob izhodu / ob vstopu daljice (zgornje / spodnje krajišče) | upper / lower endpoint |
| monotoni večkotnik (glede na os \(y\)) | \(y\)-monotone polygon |
| začetno, končno, razcepno, zlivno, navadno oglišče | start, end, split, merge, regular vertex |
| pomočnik roba (pomožna točka) | helper of an edge |
| diagonala | diagonal |
| obalna črta; lok obale | beach line; arc |
| dogodek mesta / krožni dogodek | site event / circle event |
| lažni alarm | false alarm |
| najbližji par točk; pas širine \(\delta\) | closest pair; \(\delta\)-strip |
| prekrivanje dveh razdelitev | overlay of two subdivisions |

*Obalna črta* is a literal translation of *beach line*; confirm it reads naturally in a geometry sentence, or use *valovnica*. *Split/merge* have no established Slovenian terms found; *razcepno/zlivno* are proposals.

## Event-queue and status trace model (batch S0)

Owned by this spec; extends the [step-trace model](convexity-hulls-lessons.md#3-algorithm-step-trace-model) of the core and keeps all its rules (pure `trace = algorithm(input)`, indices not coordinates in payloads, pure fold `stateAt(trace, i)`, the step index plus input as the saved configuration, `algorithm-trace` animation id with a typed algorithm choice, guaranteed termination with `done`). Free of React, JSXGraph and graph-global cache state; proposed location `src/compgeo/sweep/`. Names are proposals; the contract is stable.

- **New event kinds** (consumers ignore kinds they do not know): `pop` (event taken from the queue; payload: event id and its position), `status-insert`, `status-remove`, `status-swap`, `neighbour-test` (payload: two object ids and the discrete outcome, using the shared predicates), `schedule` (an event is added to the queue), `cancel` (an event is dropped; used for Fortune's false alarms), `report` (an output item, e.g. an intersection or a Voronoi vertex), plus the shared `phase`, `accept`, `reject`, `output`, `done`.
- **Derived state** from the fold: sweep position, event queue contents in order, status list (object ids left to right), output so far, and counters (predicate calls, neighbour tests). Counters feed the "number of tests versus all pairs" comparison in C2.
- **Exact positions.** An event position is a `Rational` point (numerator pair over a common positive `bigint` denominator), because intersections of grid segments are rational. Comparisons of event positions and "which side of the sweep line's crossing is point \(p\)" are done by integer cross-multiplication in `BigInt`; no event position is ever stored or compared as a double. Input stays on the core's snapped grid; the sweep lessons use a tighter documented range (proposal \(|\text{coordinate}|\le 2^{10}\)) so denominators stay small enough for the display. A fraction display (`21/16`) accompanies every decimal.
- **Status structure.** An ordered array (insertion by comparison, swap by index) is enough for \(n\le 12\) and shows the structure; the lesson text names the balanced search tree that gives \(O(\log n)\) per operation. Alternative: implement the tree. Rejected for the lessons because the trace would show rotations instead of the idea; revisit only if the owner wants a performance comparison lesson.
- **Limits.** At most 12 segments, 10 intervals, 20 polygon vertices, 12 sites; at the limit the graph shows an error, not silent truncation. Trace length is documented per algorithm and finite.

**ADR needed** (before S0 is accepted): coordinate and rational policy for sweeps, building on the robustness ADR of the convexity spec. Alternatives: (A) grid input with `BigInt` rationals for derived points (recommended; exact, small code, testable by hand); (B) floating coordinates with a tolerance, which the shared constraints reject; (C) restrict lessons to inputs where all intersections happen to be dyadic, which makes the free-exploration editor misleading.

## Concept contracts and acceptance criteria

Common criteria for every lesson (not repeated): C-1. Editing the input recomputes the trace, resets the step index to \(0\) and pauses playback. C-2. Reset returns to the lesson's default example and step \(0\); leaving the lesson restores the previous configuration and view. C-3. Next step and Play yield identical states. C-4. Both languages present, including a live language switch, with type-checked `t()` calls. C-5. Every action is available without a pointer (numeric fields for objects, keyboard step controls); points are moved by arrow keys by one grid step. C-6. Inputs that break a precondition are refused with an actionable message, not silently moved. C-7. The sweep line, the status list and the event queue are shown together on the board and in a side list, with the current object highlighted in both.

### C1. Sweep as an idea

- Goal: see that a moving line plus a sorted list of events turns "who overlaps whom" into a sequence of tiny updates.
- Prerequisites: none beyond reading a number line.
- Example (new; counts hand-checked): intervals \(a=[0,4]\), \(b=[2,7]\), \(c=[3,5]\), \(d=[6,9]\), \(e=[8,10]\). Events in order: \(0^+,2^+,3^+,4^-,5^-,6^+,7^-,8^+,9^-,10^-\). The number of open intervals after each event is \(1,2,3,2,1,2,1,2,1,0\); the maximum is \(3\) on \([3,4]\). Overlapping pairs: \(ab, ac, bc, bd, de\) (five).
- Steps: (1) five intervals drawn on the \(x\)-axis, vertically offset; (2) predict the maximum number of intervals that share a point; (3) Next step sweeps to each event, updating the open set; (4) read off the maximum and the overlapping pairs as they appear (pair reported when an interval enters while another is open); (5) compare with testing all \(\binom52=10\) pairs; (6) the same idea rotated: events are points of the plane, the status is a sorted list of objects crossing the line; (7) free exploration with editable intervals.
- Capabilities: interval mode (add, drag ends, snap), sweep trace with `pop`, `status-insert`, `status-remove`, `report`.
- Acceptance: 1. The default trace reproduces the counts and pairs above. 2. For random interval sets (\(n\le 10\), shared endpoints allowed) the reported pairs equal the brute-force overlapping pairs and the maximum equals the brute-force maximum. 3. Ties: at equal coordinates, entering events are processed before leaving events (closed intervals); the lesson states the rule. 4. Zero-length intervals are accepted and reported as touching. 5. C-1–C-7.

### C2. Bentley–Ottmann: segment intersections (showpiece)

- Goal: find all crossings of \(n\) segments in \(O((n+k)\log n)\) by testing only neighbours; see the status order swap at every crossing.
- Prerequisites: C1; A1 orientation ([convexity spec](convexity-hulls-lessons.md#a1-orientation-of-three-points)). Reference: dBCKO §2.1.
- Default example (research note, sample 8, already checked): \(s_0=(0,0)(6,4)\), \(s_1=(0,4)(6,0)\), \(s_2=(1,-1)(2,5)\), \(s_3=(4,5)(5,-1)\); five crossings: \(s_0s_1\) at \((3,2)\), \(s_0s_2\) at \((\tfrac{21}{16},\tfrac78)\), \(s_0s_3\) at \((\tfrac{87}{20},\tfrac{29}{10})\), \(s_1s_2\) at \((\tfrac{33}{20},\tfrac{29}{10})\), \(s_1s_3\) at \((\tfrac{75}{16},\tfrac78)\).
- **New (computed with `python -I`, `fractions`, downward sweep, ties by increasing \(x\)):** the 13 events in order, with the status (left to right) after each. Upper endpoints: \((2,5)\) [2]; \((4,5)\) [2,3]; \((0,4)\) [1,2,3]; \((6,4)\) [1,2,3,0]. Crossings: \((\tfrac{33}{20},\tfrac{29}{10})\) \(s_1s_2\) → [2,1,3,0]; \((\tfrac{87}{20},\tfrac{29}{10})\) \(s_0s_3\) → [2,1,0,3]; \((3,2)\) \(s_0s_1\) → [2,0,1,3]; \((\tfrac{21}{16},\tfrac78)\) \(s_0s_2\) → [0,2,1,3]; \((\tfrac{75}{16},\tfrac78)\) \(s_1s_3\) → [0,2,3,1]. Lower endpoints: \((0,0)\) \(s_0\) → [2,3,1]; \((6,0)\) \(s_1\) → [2,3]; \((1,-1)\) \(s_2\) → [3]; \((5,-1)\) \(s_3\) → []. Note the two simultaneous-\(y\) pairs at \(y=\tfrac{29}{10}\) and \(y=\tfrac78\), separated by \(x\).
- Degenerate example (new, trivially checked): \(a=(0,0)(4,4)\), \(b=(0,4)(4,0)\), \(c=(0,2)(4,2)\) all pass through \((2,2)\); adding a vertical \(d=(2,0)(2,4)\) makes it four. The sweep reports one point with all involved segments and reverses their order in one step (the segments through the point are the contiguous block of the status).
- Steps: (1) the four segments, no sweep yet; (2) predict how many crossings and which pairs; (3) Next step: pop events, insert upper endpoints at the position given by the status order; (4) after each insertion or removal, only the two new neighbour pairs are tested (`neighbour-test`), and a found crossing below the line is `schedule`d once; (5) at a crossing the two segments swap and new neighbours are tested; (6) summary: events 13, neighbour tests counted versus \(\binom42=6\) pair tests, and the \(O((n+k)\log n)\) statement with the meaning of \(k\); (7) free exploration (editable segments) and the degenerate example.
- Capabilities: segment-set mode (add, drag endpoints, snap); trace as above; hover on a status entry highlights its segment; side lists for queue and status.
- Acceptance: 1. The default trace yields exactly the 13 events and statuses above and the five crossings with the exact rationals. 2. For random grid segment sets (\(n\le 12\)) the reported pairs and points equal the brute-force \(O(n^2)\) results (set equality, including degenerate sets). 3. Shared endpoints, endpoint-on-interior contact, vertical segments, three or more segments through one point and collinear overlap are handled as in dBCKO §2.1 or refused with a message: overlapping collinear segments are refused in the lessons (reported as "overlap, not a point") and covered by a kernel test, not drawn. 4. The status order is checked after every event: segments are sorted by \(x\) at the sweep line (tie-broken just below it), via exact comparison. 5. Every pair is reported once, and no event is scheduled twice. 6. The tests-versus-pairs counter is displayed and matches the trace. 7. C-1–C-7.

### C3. Partitioning a polygon into monotone pieces

- Goal: classify polygon vertices by a downward sweep and add diagonals at split and merge vertices so that every piece is \(y\)-monotone.
- Prerequisites: C1; B1 ear clipping optional for the contrast ([triangulation spec](triangulation-voronoi-lessons.md#b1-ear-clipping-and-the-art-gallery-theorem)). Reference: dBCKO §3.2.
- Example (new, `python -I`, exact integer arithmetic): counter-clockwise polygon \(P=(0,0),(4,3),(8,0),(12,8),(8,5),(4,8)\), simple, area \(40\). Types (sweep downwards, ties by smaller \(x\) first): \((0,0)\) end, \((4,3)\) split, \((8,0)\) end, \((12,8)\) start, \((8,5)\) merge, \((4,8)\) start. Processing order: \((4,8),(12,8),(8,5),(4,3),(8,0),(0,0)\). The merge vertex \((8,5)\) becomes the helper of the edge to its left, so the split vertex \((4,3)\) gets the diagonal \((4,3)(8,5)\). Result: two \(y\)-monotone pieces \((0,0),(4,3),(8,5),(4,8)\) and \((4,3),(8,0),(12,8),(8,5)\), each of area \(20\). Check: vertices 6, one added diagonal, \(\text{pieces}=1+\#\text{diagonals}=2\).
- Second example (new): \((4,0),(10,2),(8,5),(12,9),(7,7),(5,12),(3,7),(0,9),(2,4)\), simple, area \(58\); types end, regular, regular, start, merge, start, merge, start, regular. It has two merge vertices, three start vertices and no split, so it shows that a merge vertex alone also needs a diagonal (to the vertex handled next below it).
- Steps: (1) the polygon and the sweep line at the top; (2) predict which vertices make the polygon not \(y\)-monotone (those where the line "splits" or "joins" a region); (3) Next step classifies each vertex at its event, showing the two neighbours' directions and the interior angle test; (4) the status holds the left edges with their helper; (5) merge and split events draw diagonals to helpers; (6) the finished pieces, each verified monotone; (7) free exploration with an editable polygon.
- Capabilities: polygon mode of the core, simplicity check, orientation normalisation; trace with `pop`, `status-insert`, `status-remove`, `report` (diagonal); vertex-type colour overlay with text labels (not colour only).
- Acceptance: 1. The default example yields the stated types, the single diagonal, and the two pieces. 2. For random simple grid polygons (\(n\le 15\), no two vertices at equal height unless the tie rule applies): the pieces partition the polygon (areas sum to the shoelace area, \(n_\text{diagonals}+1\) pieces), every piece is \(y\)-monotone (checked independently), diagonals lie inside and do not cross. 3. The number of start+split equals the number of end+merge vertices. 4. Equal-height vertices follow the stated tie rule; three collinear consecutive vertices and non-simple input are refused. 5. C-1–C-7.

### C4. Triangulating a monotone polygon

- Goal: triangulate a \(y\)-monotone polygon in \(O(n)\) after the sort, and compare with ear clipping.
- Prerequisites: C3; B1. Reference: dBCKO §3.3.
- Example: each piece of C3. Piece 1 \((0,0),(4,3),(8,5),(4,8)\) has \(4\) vertices, so \(2\) triangles; piece 2 \((4,3),(8,0),(12,8),(8,5)\) likewise; the whole polygon has \(6-2=4\) triangles and \(3\) diagonals in the final triangulation (one from C3, plus one per piece). The exact stack contents per step come from the trace and are tested, not tabulated here.
- Steps: (1) a monotone piece, vertices listed top to bottom with their chain (left or right); (2) predict whether the next vertex can be connected to the stack; (3) Next step pushes or pops with the visibility test (an `orient` call) shown; (4) diagonals appear; (5) the finished triangulation with the \(n-2\) count; (6) comparison panel: predicate counts of ear clipping and of the monotone method on the same piece, with the growth statement \(O(n^2)\) versus \(O(n)\) after sorting (a count on small inputs illustrates, it does not prove); (7) free exploration with a polygon and automatic partition first.
- Capabilities: C3's graph; stack display in the side list; counters.
- Acceptance: 1. For every monotone piece produced by C3 on random polygons: \(n-2\) triangles, area sum equals piece area, no triangle contains another vertex. 2. The result is a valid triangulation of the same polygon as the ear-clipping kernel (not necessarily identical triangles; the check is validity and count). 3. A non-monotone input is partitioned first and the lesson says so. 4. The counts shown equal the counters recorded in the traces. 5. C-1–C-7.

### C5. Fortune's algorithm (showpiece)

- Goal: see the Voronoi diagram appear behind a moving line: arcs of parabolas form the beach line, new arcs at site events, vanishing arcs at circle events (Voronoi vertices), and false alarms.
- Prerequisites: C1; B4 Voronoi diagrams and duality ([triangulation spec](triangulation-voronoi-lessons.md#b4-voronoi-diagrams-and-duality)); B3 empty circle. Reference: dBCKO §7.2.
- Default example (new, `python -I`, `Fraction`): sites \(A=(0,5)\), \(B=(-4,3)\), \(C=(4,3)\), \(D=(0,-3)\). After \(A\), \(B\), \(C\) the beach line is \(A,B,A,C,A\), and the triple \((B,A,C)\) schedules a circle event with centre \((0,0)\), radius \(5\), at \(y=-5\) (the lowest point of the circle). The site \(D\) arrives first, at \(y=-3\) (it lies inside that circle: distance \(3<5\)), splits the arc of \(A\) and **cancels** the event: a false alarm. Two true circle events follow, symmetric: centres \((\mp\tfrac12,1)\), squared radius \(\tfrac{65}{4}\), so their event height is \(1-\tfrac{\sqrt{65}}{2}\approx-3.0311\) for both (queue tie broken by \(x\)); they are the Voronoi vertices of the Delaunay triangles \(ABD\) and \(ACD\). Ground truth by brute force: only the triples \(ABD\) and \(ACD\) have empty circumcircles. Final diagram: 2 vertices, 1 finite edge (the part of \(y=1\) between them, the bisector of \(AD\)) and 4 rays; \(2n-2-h=2\) and \(3n-3-h=5\) with \(n=h=4\).
- Second example (new): the same without \(D\): one circle event, centre \((0,0)\), \(y=-5\), Voronoi vertex \((0,0)\).
- Exactness (stated in the lesson). Site positions are grid integers. Circle centres are rational; the **event height** \(c_y-\sqrt{R^2}\) is generally irrational, so queue keys are never stored as doubles: events are compared by exact algebra on the rational \(c_y\) and \(R^2\) (compare \(c_y-\sqrt{R^2}\) with \(c'_y-\sqrt{R'^2}\) by isolating and squaring, sign tests on rationals), ties by centre \(x\). Voronoi vertices are the same exact rationals as in the Delaunay-dual value (denominator \(2\cdot\text{orient}\)). Which arc lies above a new site (comparing the site's \(x\) with a breakpoint of two parabolas) is a square-root comparison and is decided by the same squaring technique; the formula is to be derived and verified against brute force during S3, and a spec-level fallback is to find the arc by the combinatorial test used for the dual (the site's position relative to neighbouring Delaunay-like circles). The **drawn beach line** (parabola polylines, breakpoint markers) is approximate by design and labelled "drawn approximately" in the legend; it never feeds back into the algorithm.
- Output value: a `VoronoiDiagram` of the triangulation spec (exact rational vertices; segment, ray and line edges; cells by site). The same value type means the Delaunay-dual result and Fortune's result are compared by equality: same vertex set, same edge incidence (up to vertex ordering and edge orientation).
- Steps: (1) the sites and a sweep line high above; (2) predict where the line will first create a new arc; (3) Next step to the first site events: arcs and breakpoints, the traced edge starts; (4) a circle event is scheduled: the circle through three sites, its lowest point; (5) the new site \(D\) falls inside it: false alarm, with the circle shown as not empty; (6) the true circle events: the middle arc disappears and a Voronoi vertex is output; (7) the finished diagram equals the dual of the Delaunay triangulation; free exploration with up to 12 sites.
- Capabilities: point-set mode of the core with the 12-site limit; sweep trace with `schedule`, `cancel`, `report`, beach-line state in the fold (ordered arcs as site ids with an edge-trace per breakpoint); parabola and circle overlays; dragging a site recomputes the whole trace.
- Acceptance: 1. The default example gives the event order above (sites \(A,B,C,D\); then the cancelled event; then the two true events) and the two exact vertices \((\mp\tfrac12,1)\). 2. For random site sets on the grid (\(n\le 12\), general position): Fortune's `VoronoiDiagram` equals the Delaunay-dual `VoronoiDiagram` (vertex rationals, edge incidences, ray directions). 3. Every `cancel` corresponds to a circumcircle that contains a site in its interior (checked with `incircle`); every executed circle event has an empty circumcircle. 4. Degenerate inputs: sites with equal \(y\) (the first arcs are pointed, and the tie rule is stated), duplicates (refused), all sites collinear (a set of parallel lines, shown as such), four or more cocircular sites (one vertex of degree 4; several circle events with the same centre handled as one vertex). Each is covered by a kernel test and either shown with a note or refused. 5. The drawn beach line is visually continuous and is labelled approximate in both languages. 6. C-1–C-7.

### C6 (optional). Closest pair, and overlay of two subdivisions

- Closest pair by a sweep with a \(\delta\)-strip (compare divide and conquer), and the overlay of two subdivisions as the intersection sweep of C2 plus bookkeeping of faces (dBCKO §2.3). Only a sketch is specified here; a full contract (default example, steps, acceptance criteria) is written when the owner approves S4. Overlay needs the doubly-connected edge list (§2.2), which is not built elsewhere in this program.

## User Stories

1. As a student, I watch a line sweep across five intervals so that I see why events and a status list suffice.
2. As a student of computational geometry, I step through Bentley–Ottmann and see only neighbours being tested, then compare with \(\binom n2\).
3. As a lecturer, I project the three-lines-through-one-point input and show how the status block reverses.
4. As a student, I see why split and merge vertices block monotonicity and where the diagonals go.
5. As a student, I compare the monotone triangulation with ear clipping on the same polygon.
6. As a student, I watch Fortune's beach line, see a circle event cancelled by a nearer site, and confirm the result equals the Delaunay dual.
7. As a Slovenian- or English-speaking learner, I get every step text in both languages, with a live switch.
8. As a keyboard or touch user, I can step and edit inputs without dragging.

## Implementation Decisions

- Depends on, and does not redefine, the core of the convexity spec (predicates, grid policy pending its ADR, point-set/polygon graph, step-trace contract) and the Voronoi value of the triangulation spec. Reused as is: `incircle`, the Delaunay kernel as test oracle and for the equality check, the ear-clipping trace for C4's comparison.
- Verified to exist now: [model.ts](../../src/learning/model.ts) (iterative animation ids), [familyChapters.ts](../../src/learning/content/familyChapters.ts), [IterativeFunctionGraph.tsx](../../src/graphs/functions/IterativeFunctionGraph.tsx), [bisectionModel.ts](../../src/analysis/bisectionModel.ts), [demonstrations.ts](../../src/demonstrations.ts), [performance-plan.md](../performance-plan.md). `src/compgeo/` does not exist yet (created by the convexity Batch 0). New in this family: the sweep trace extensions and rational helper, segment-set and interval graph modes, Bentley–Ottmann, monotone partition and triangulation, Fortune, the lessons and chapter.
- Graph classes: segment-set/interval mode and polygon mode extend the point-set graph; no new global state. Board objects, listeners and timers have explicit owners and are disposed on scene change and route exit. Presets store input in grid units; import validates counts, integer ranges and mode, with an actionable error.
- Lesson scene actions are typed (set a named example, set the input, select a step, toggle overlays) and run synchronously; the scene store is the single source of truth. Unit-test multi-action scenes in one synchronous sequence.
- Open decisions for the owner: sweep direction (above), the coordinate range for sweeps, whether C6 is wanted, the Slovenian terms, and the shared Demonstration family placement.

## Testing Decisions

- Kernel unit tests (pure): BO against brute-force intersection on random grid sets, including each degenerate class; interval sweep against brute force; vertex classification and monotone check against an independent \(y\)-monotone test; partition validity (area, count, diagonal containment); monotone triangulation validity; Fortune against the Delaunay-dual Voronoi (equality) and against brute-force empty-circle triples; rational comparison unit tests (including near-equal irrational event heights).
- Scene tests: each lesson's actions in one synchronous sequence; reset; language switch; stale step index clamped on import.
- `lessonMathNotation.test.ts` stays enforced; every symbol or formula in the new prose is wrapped in `\(...\)`, decimals use `{,}`, and `latex` fields are undelimited. `t()` calls type checked per key; `sl.ts` and `en.ts` in lockstep; run `npx tsc --noEmit --pretty false` and the production build after localization changes.
- Smoke (per [smoke-tests](../smoke-tests.md)): the affected routes and each lesson's default stepping, free exploration edit, reset, language switch, a degenerate input; the full checklist only if the shared shell changes.
- Performance: dragging a site in C5 recomputes the trace and redraws parabolas; measure on 12 sites before choosing a drawing approach ([performance plan](../performance-plan.md)). Same for BO at 12 segments.

### Batch-wide acceptance gate

A batch is accepted when: its kernel tests pass; every lesson of the batch meets its acceptance list in both languages; the ADR (S0) is accepted; documentation (capabilities, glossary vocabulary) is updated; and the batch is smoke tested and published separately.

## Correctness notes

- **Hypotheses.** BO: segments are closed and finite; the output is the set of intersection points, each with the set of segments through it. Overlapping collinear segments have no isolated point; the lessons refuse them, the kernel reports overlaps separately. Monotone partition: simple polygon, no three consecutive collinear vertices. Fortune: distinct sites; general position is the default and the degenerate cases are listed in C5.
- **Complexity.** \(O((n+k)\log n)\) for BO is for a balanced status structure; the array in the lessons costs \(O(n)\) per operation and says so. Fortune is \(O(n\log n)\) with a balanced beach line.
- **What the pictures prove or illustrate.** Counters on small inputs illustrate growth; they do not prove it. The beach-line drawing is an approximation; the algorithm's output is exact. A false alarm shown for one site set illustrates why cancellation is needed; correctness rests on the empty-circle lemma, which the equality test checks on random inputs, not on the picture.
- **Robustness.** All decisions use exact rational or integer sign tests (see S0 and C5); the only doubles are for drawing. Rational sizes are bounded by the coordinate range; out-of-range input is refused.
- **Section numbers** come from the dBCKO table of contents (checked online), not from reading the book chapters; the research note's numbers matched the table of contents and needed no correction.

## Out of Scope

- Assessment, grading, accounts, progress tracking, server storage.
- A balanced-tree status structure, doubly-connected edge list, Boolean operations on polygons, and Voronoi diagrams of line segments (dBCKO §§2.2, 2.4, 7.3).
- Randomised incremental algorithms, trapezoidal maps, plane sweep for rectangle union, sweeping in three dimensions.
- Large inputs (beyond the stated limits) and animation of asymptotic timing on real data.
- A "free double" inexact mode for sweeps; it belongs to the convexity spec's degeneracy lesson only.
- Full contract for C6 until the owner approves it.

## Further Notes

- Contradictions noticed in other docs: none outstanding (a backslash-collapse artefact in the triangulation spec's `incircle` bound was repaired before commit). The research note's dBCKO section numbers were verified, so no correction applies there.
- The new-lesson-families index lists this spec as "(planned)"; the link should be updated when this spec is accepted.
