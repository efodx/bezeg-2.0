# New lesson families

**Status:** proposed, 2026-10-31. Specification only; no family is scheduled or implemented.
**Agreed:** 2026-10-31. The owner approved the candidate families from the research notes, asked for line-sweep algorithms to be added, and asked for each family to be specified.
**Source:** [lesson-family candidates](../research/lesson-family-candidates-2026-10-31.md) and [computational geometry candidates](../research/computational-geometry-candidates-2026-10-31.md).

## Purpose

This index names the proposed chapter families, the specs that define them, and the shared foundations they depend on. Each family spec has its own scope, lesson contracts and acceptance criteria. Approving a spec does not authorize implementation; create `docs/tasks/<feature>/` only when a family is scheduled.

All families follow the current learning model: a bilingual chapter in Learn with readable prose interleaved with chapter-owned guided graph activities ([chapter-owned guided learning](chapter-owned-guided-learning.md)). Each activity is backed by a Demonstration that also stays available for free exploration in the catalog. There are no exercises, grading or progress tracking.

## Families

| Family (SL / EN) | Spec | Audience | Effort | Owns shared foundation |
| --- | --- | --- | --- | --- |
| Numerične metode na grafu / Numerical methods on the graph | [numerical-methods-lessons.md](numerical-methods-lessons.md) | University, upper secondary | Low | — (reuses iterative playback) |
| Konveksnost in ovojnice / Convexity and hulls | [convexity-hulls-lessons.md](convexity-hulls-lessons.md) | Upper secondary to university | Low–medium | **Computational-geometry core:** exact predicates, point-set/polygon graph, algorithm step trace |
| Geometrija krivulj / Geometry of curves | [curve-geometry-lessons.md](curve-geometry-lessons.md) | University, secondary enrichment | Medium | **Curvature kernel** (signed curvature, osculating circle, comb) |
| Grafi funkcij za maturo / Function graphs for the matura | [school-function-graphs-lessons.md](school-function-graphs-lessons.md) | Upper secondary | Low–medium | **Function catalogue extension** |
| Triangulacije in Voronojevi diagrami / Triangulations and Voronoi diagrams | [triangulation-voronoi-lessons.md](triangulation-voronoi-lessons.md) | University | Medium–high | Triangulation adjacency structure, incircle predicate |
| B-zlepki in NURBS / B-splines and NURBS | [b-splines-nurbs-lessons.md](b-splines-nurbs-lessons.md) | University | High | **Knot-vector and de Boor kernel** (needs an ADR) |
| Algoritmi pometanja / Sweep-line algorithms | [sweep-algorithms-lessons.md](sweep-algorithms-lessons.md) | University | High | Event-queue/status trace model |
| Interpolacija in aproksimacija / Interpolation and approximation | [interpolation-approximation-lessons.md](interpolation-approximation-lessons.md) | University | Medium | — |

Slovenian titles are working names. Each spec settles its terms by [choosing new terms](../localization.md#choosing-new-terms).

## Dependencies and order

- Convexity and hulls owns the computational-geometry core. Triangulations and sweep algorithms build on it; Fortune's sweep also needs the Voronoi drawing from the triangulation family.
- Geometry of curves owns the curvature kernel. B-splines reuse it for curvature-comb checks, and offsets generalize the existing PH offset.
- B-splines precede the subdivision-curve lessons in interpolation and approximation, which reuse its uniform B-spline limit.
- Numerical methods and function graphs are independent of the others; numerical methods may use the extended function catalogue when it exists.

Suggested order: numerical methods, convexity and hulls, and curve geometry first (each delivers value with low effort or unlocks later families); then function graphs, triangulations and B-splines; then sweep algorithms and interpolation.

## Shared constraints

- Static, client-only hosting; desktop and classroom projection first, with essential touch and keyboard workflows.
- Slovenian default with English in lockstep; lesson math notation follows `lessonMathNotation.test.ts`.
- Mathematical claims are independently checked. A picture may carry an argument only when its construction establishes the claim; otherwise it is labelled an illustration.
- Geometry predicates that decide discrete outcomes (orientation, incircle, intersection order) must not silently give wrong answers on dragged points: use exact arithmetic on snapped inputs or robust predicates, and never present a tolerance as exact.
- Rendering-heavy views (direction fields, combs, basis plots, sweep animations) are measured per the [performance plan](../performance-plan.md) before a drawing approach is chosen.
- New Demonstrations add routes and Presets; existing routes and stored Presets keep working.
