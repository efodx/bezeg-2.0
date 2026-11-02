# 20 — Four-point and collinear modes and `DegenerateSitesGraph` (T3, B5, F2a)

Status: planned 2026-11-02 (geometry handler 34). Source: spec [B5](../../specs/triangulation-voronoi-lessons.md#b5-degenerate-sites) (examples, steps, capabilities, acceptance 1–5), [correctness notes](../../specs/triangulation-voronoi-lessons.md#correctness-notes) (Delaunay uniqueness, Voronoi degeneracies), common criteria C1–C6. Kind: F2a (no route), engineering, mathematical and UI/accessibility review. Depends on 19 (`VoronoiGraph`), 18, 05 and `incircleValue`. Template: 19.

B5 has its own Demonstration `voronoi-degenerate` (README decision: lessons are keyed one per Demonstration). This task adds to `VoronoiGraph` the modes (a scene field `mode`, `sites` default, `four-point`, validated on Preset import) and the display of the collinear case (05 behaviour; a Preset), and the subclass `DegenerateSitesGraph extends VoronoiGraph` that only fixes the default mode to `four-point`, its Presets collection `compgeo-voronoi-degenerate` and its title.

## Acceptance

1. **Four-point mode:** four draggable sites with an incircle readout: the determinant for the first three in counter-clockwise order against the fourth, as exact `bigint` text with its sign word (inside / on / outside); the number of Voronoi vertices and their degrees; which Delaunay diagonals are legal. A diagonal is legal when `incircle <= 0` (decided, consistent with B3 and GLOSSARY "Illegal edge"). Sites snap to the grid so that "exactly on the circle" is reachable (B5 step 6).
2. **Cocircular case:** on the unit square the determinant is exactly \(0\), the drawing has one degree-4 vertex and both diagonals are shown as legal, with a note that the triangulation is then not unique (spec acceptance 1). The symmetric trapezoid \((0,0),(8,0),(9,5),(-1,5)\) behaves the same.
3. **One grid step off the circle:** the determinant is nonzero and the diagram has two degree-3 vertices (spec acceptance 2); the readout names the one legal diagonal. The graph never moves a point itself; only the user or a lesson action does.
4. **Collinear sites:** five collinear sites give four parallel bisector lines, no vertices and no Delaunay triangles (spec acceptance 3), drawn by 18, with a visible and announced explanation in both languages that no triangulation exists, not an empty board.
5. **Duplicates** are refused with the point-set graph's actionable message (spec acceptance 4); never moved or merged (C6).
6. **Presets:** the collection `compgeo-voronoi-degenerate` of `DegenerateSitesGraph`: the unit square and the trapezoid in four-point mode, a near-circle quadruple (see below) and five collinear sites. Import validates `mode` and the rest as in 19, with an actionable localized error for an unknown mode.
7. **Localization:** one key block after 19's at the same position in `sl.ts` and `en.ts`; *kocirkularne točke* from the spec's table.
8. **Tests** (host):
   - Unit square: \(D=0\), one vertex of degree 4, both diagonals legal, the not-unique note.
   - Trapezoid: the same.
   - One corner of the square moved one grid step off the circle: nonzero determinant, two degree-3 vertices; moved back, degree 4 again.
   - Five collinear sites: four lines, zero vertices, zero triangles, the message in both languages.
   - Duplicate refusal, including a drag onto an existing site.
   - Switching mode keeps the sites and recomputes the readouts; an edit resets derived state (C1); keyboard moves and numeric entry reach the on-circle position (C5); Preset round trip and each import refusal; live language switch; disposal.
   - Observe each new assertion fail against a deliberate mutation (for example the determinant taken in clockwise order, a degree-4 vertex not merged, the collinear branch leaving a blank board).

## Coordinates of the B5 examples (decided procedure)

The spec gives no coordinates for "four points near a circle" or for the move onto the circle. The worker derives them from the spec's examples (the unit square scaled to the grid, or the trapezoid) with `python -I`, checks them with `incircleValue`, and reports them in its evidence. The handler confirms them in this task's review before 23 quotes them.

## Open points for the handler

- Point limit in four-point mode: the spec names four points and five collinear sites. Proposed: the point-set limit (40) in `sites` mode and exactly four sites in `four-point` mode. Handler to confirm.

Not in scope: route, registration, lessons, readouts for five or more cocircular sites beyond what 05 already tests.

Checks: as 19.
