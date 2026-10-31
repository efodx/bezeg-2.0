# New lesson families

**Status:** scheduled 2026-10-31 at the owner's request for full features; delivered by the Geometry, Curves, Functions and Maps [feature streams](../tasks/feature-streams/README.md). Each family creates its `docs/tasks/<feature>/` in its first slice.
**Agreed:** 2026-10-31. The owner approved the candidate families from the research notes, asked for line-sweep algorithms to be added, and asked for each family to be specified.
**Expanded:** 2026-10-31. The owner added seven families from the [expansion research](../research/lesson-family-candidates-2026-10-31-expansion.md) (candidates E1, E2, E3, E4, E6, E7, E8); phase portraits (E5), level sets and optimization (E9) and mechanical curves (E10) stay research candidates only.
**Source:** [lesson-family candidates](../research/lesson-family-candidates-2026-10-31.md), [computational geometry candidates](../research/computational-geometry-candidates-2026-10-31.md) and the [expansion research](../research/lesson-family-candidates-2026-10-31-expansion.md).

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
| Linearne preslikave ravnine / Linear maps of the plane | [linear-maps-lessons.md](linear-maps-lessons.md) | Upper secondary to university | Low–medium | **2×2 linear-map kernel** (matrix model, basis handles, grid image) |
| Kompleksne preslikave / Complex maps | [complex-maps-lessons.md](complex-maps-lessons.md) | Upper secondary to university | Medium | **Complex Möbius kernel**, including circle inversion |
| Geometrija trikotnika in inverzija / Triangle geometry and inversion | [triangle-geometry-lessons.md](triangle-geometry-lessons.md) | Upper secondary to university | Medium | Triangle-centre and circle kernel |
| Verjetnost in statistika na grafu / Distributions, CLT and correlation | [probability-statistics-lessons.md](probability-statistics-lessons.md) | Upper secondary to university | Medium | **Density and convolution kernel** |
| Fourierove vrste / Fourier series | [fourier-series-lessons.md](fourier-series-lessons.md) | University, secondary enrichment | Medium | Fourier coefficient kernel |
| Projektivna geometrija stožnic / Projective geometry of conics | [projective-conics-lessons.md](projective-conics-lessons.md) | University | Medium | **Homogeneous-coordinate kernel** |
| Napredne Bézierjeve teme / Advanced Bézier topics | [advanced-bezier-lessons.md](advanced-bezier-lessons.md) | University | Medium–high | — |

Slovenian titles are working names. Each spec settles its terms by [choosing new terms](../localization.md#choosing-new-terms).

## Dependencies and order

- Convexity and hulls owns the computational-geometry core. Triangulations and sweep algorithms build on it; Fortune's sweep also needs the Voronoi drawing from the triangulation family.
- Geometry of curves owns the curvature kernel. B-splines reuse it for curvature-comb checks, and offsets generalize the existing PH offset.
- B-splines precede the subdivision-curve lessons in interpolation and approximation, which reuse its uniform B-spline limit.
- Numerical methods and function graphs are independent of the others; numerical methods may use the extended function catalogue when it exists.

- Complex maps own circle inversion; triangle geometry's inversion lesson (T5) depends on it. Triangle geometry owns the circumcentre and circle kernel (no circumcircle code exists yet), which the triangulation family may reuse; its point-set graph and orientation predicate come from the convexity core (soft dependency).
- Distributions reuse the least-squares kernel of interpolation and approximation (I4) for any regression line; they do not duplicate it.
- Projective conics build on the focus–directrix conics of function graphs and on the existing rational Bézier conics.
- Advanced Bézier topics collect items the convexity and curve-geometry families leave out (Bézier clipping, arc-length parametrization, Coons patches) and use the convexity core for hull tests.
- Linear maps and Fourier series are independent of the other families.

Suggested order: numerical methods, convexity and hulls, and curve geometry first (each delivers value with low effort or unlocks later families); then function graphs, triangulations and B-splines; then sweep algorithms and interpolation. Among the 2026-10-31 additions, linear maps and complex maps come first (low dependency, both audiences, and they extend released content), triangle geometry follows the convexity core, and distributions follow interpolation I4; Fourier series, projective conics and advanced Bézier topics come after.

## Shared constraints

- Static, client-only hosting; desktop and classroom projection first, with essential touch and keyboard workflows.
- Slovenian default with English in lockstep; lesson math notation follows `lessonMathNotation.test.ts`.
- Graph constructions, kernels and readouts are independently checked. A picture may carry an argument only when its construction establishes the claim; otherwise it is labelled an illustration.
- Geometry predicates that decide discrete outcomes (orientation, incircle, intersection order) must not silently give wrong answers on dragged points: use exact arithmetic on snapped inputs or robust predicates, and never present a tolerance as exact.
- Rendering-heavy views (direction fields, combs, basis plots, sweep animations) are measured per the [performance plan](../performance-plan.md) before a drawing approach is chosen.
- New Demonstrations add routes and Presets; existing routes and stored Presets keep working.

## One-shot lesson text — owner decision, 2026-10-31

Graphs carry the quality bar in these families; lesson text is **one-shot**. The worker that builds a lesson's scene writes its text once, in Slovenian and English, after the scene works, from that lesson's concept contract: learning goal, steps, checked numbers and prose notes. The contract is the only source.

- **Done** when every step has text in both languages, `lessonMathNotation.test.ts` and `tsc` pass, and every value the text quotes matches the scene. Plausible, complete-looking wording is enough; the owner rewrites content by hand later.
- **Terms:** use the Slovenian proposal from the spec's terms table as written.
- **Review** covers kernels, constructions, readouts and scene actions. The family specs' prose criteria ("the prose says…") are guidance for the one-shot draft and sit outside review and repair.

Reason: the owner wants high-quality graphs at low token cost and will revise lesson content separately.
