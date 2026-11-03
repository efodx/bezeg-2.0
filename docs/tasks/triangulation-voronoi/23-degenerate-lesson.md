# 23 — Degenerate sites lesson B5 (T3, F3)

Status: accepted 2026-11-03 (geometry handler 41, [record](../../reviews/triangulation-voronoi/23-acceptance.md)). Planned 2026-11-02 (geometry handler 34). Source: spec [B5](../../specs/triangulation-voronoi-lessons.md#b5-degenerate-sites) (goal, prerequisites B3 and B4, examples, steps, acceptance 1–5), [correctness notes](../../specs/triangulation-voronoi-lessons.md#correctness-notes), [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). Kind: F3; review covers scene actions, readouts and the stated convention, not prose. Depends on 20, 21 and 22. Template: [16](16-delaunay-lesson.md).

1. **Actions:** `VoronoiGraph` (and so `DegenerateSitesGraph`) has 22's actions; this task adds `{operation: 'set-mode', mode: 'sites' | 'four-point'}` (the mode of 20) and uses the existing point-set actions to move a point; if a numeric incircle action is needed it is added here under the same rules as 22 (shape and finiteness only in `lessonCatalog.ts`). Other graphs reject new actions.
2. **Lesson** B5 on Demonstration `voronoi-degenerate`; the lesson may switch four-point and collinear by `set-mode`. Remove `lesson: false` from its definition. The spec's seven steps:
   1. Four points near a circle.
   2. Predict the number of Voronoi vertices.
   3. Move one point onto the circle: one degree-4 vertex, two valid diagonals (the determinant reads exactly \(0\)).
   4. Move it off: two vertices appear and one diagonal becomes the only legal one.
   5. Collinear sites (five): parallel strips, no Delaunay triangles.
   6. The lesson's convention, and why the snapped grid makes "exactly on the circle" reachable.
   7. Free exploration; the unit square and the trapezoid \((0,0),(8,0),(9,5),(-1,5)\) as the cocircular examples.

   Prerequisite links to `delaunay` and `voronoi`. State the correctness notes: with four cocircular sites a vertex has degree four and the dual is not a triangulation; Delaunay is unique if no four points lie on an empty circle (corrected by the acceptance review; it first read "only when no four points are cocircular"). Quoted values equal readouts; the near-circle quadruple and the move in step 3 come from 20's recorded examples, not invented here. Step 2 must not show the vertex count in the panel before the prediction.
3. **Tests:** frames in one synchronous sequence; the quoted determinants and vertex degrees equal the readouts at their steps; the numbers are present in both languages; Back and a scene change restore the scene; step 5's message appears in both languages. A mutation failure per new assertion (for example the lesson's step 3 point off the circle by one step).

The convention stated in step 6: a diagonal is legal when `incircle <= 0`, so cocircular sites leave both diagonals legal.

Checks: as 22, with `just smoke-lesson voronoi-degenerate` in both languages with a live switch.
