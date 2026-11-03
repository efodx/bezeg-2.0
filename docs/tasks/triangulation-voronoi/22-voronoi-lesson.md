# 22 — Voronoi lesson actions and lesson B4 (T3, F3)

Status: accepted 2026-11-03 (geometry handler 39, [record](../../reviews/triangulation-voronoi/22-acceptance.md)). Preset note: the new `diagram` overlay (default on) is stored in `overlays` on export; files from older builds without it still import with the diagram shown, while a new file is rejected by an older build (forward-only, not a breaking change). Planned 2026-11-02 (geometry handler 34). Source: spec [B4](../../specs/triangulation-voronoi-lessons.md#b4-voronoi-diagrams-and-duality) (goal, prerequisites, example, steps, acceptance 1–5), [testing decisions](../../specs/triangulation-voronoi-lessons.md#testing-decisions) (lesson tests), [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). Kind: F3; review covers scene actions, readouts and counts, not prose. Depends on 19 and 21. Template: [15](15-point-set-triangulation-lesson.md) (actions) and [16](16-delaunay-lesson.md).

1. **Actions** on `VoronoiGraph` (`point-set` kind of `LessonAction`, validated for shape and finiteness only in `lessonCatalog.ts`; other graphs, including `DelaunayGraph`, reject them with `UnsupportedLessonActionError`). Proposed names; the worker may adjust:
   - `{operation: 'select-site', site: number | null}` highlights a cell.
   - `{operation: 'set-construction', count: number | 'end'}` sets the half-plane count of 19 item 3.
   - `{operation: 'set-query-point', point: [number, number] | null}` places the query point.
   - Existing `select-triangle` shows the circumcircle and vertex; overlay visibility reuses the existing overlay action; point moves reuse the point-set actions (B4 step 6). An out-of-range index or an invalid value is a lesson-content error (throws).
2. **Lesson** B4 (`voronoi`) in `src/learning/content/compgeoGuidedLessons.ts`; remove `lesson: false` and the id from the list in `lessonCatalog.test.ts`. The spec's seven steps on the seven points of B2:
   1. The sites (diagram hidden).
   2. Predict the region nearer to \(p_5\) than to any other site (no cell, vertex or count visible).
   3. Show the \(p_5\) cell by the bisector construction.
   4. All cells: 7 vertices, 8 finite edges, 5 rays; the 5 hull sites' cells are unbounded, those of \(p_5,p_6\) are bounded.
   5. Overlay the Delaunay triangulation and highlight one triangle with its circumcentre, for example \((0,1,5)\to(4,-1)\).
   6. Drag a site and watch both diagrams change together.
   7. Free exploration with the query point.

   Prerequisite link to `delaunay` (B3). State that a picture of a few sites illustrates duality and does not prove it (correctness notes). Every quoted vertex equals the scene's readout, and the lesson does not quote vertices beyond the spec's list.
3. **Tests:** frames in one synchronous sequence; readouts at the quoting steps, numbers present in both languages' text; while the diagram is hidden (steps 1–2) the panel shows no vertex, edge or cell counts (task 15's review fixed this class of spoiler); the new actions rejected by the other compgeo graphs; Back and a scene change restore readouts and the view. A mutation failure per new assertion.

## Open points for the handler

- Whether B3's lesson gains a forward link to B4 (16 did this for B2 to B3). The spec is silent; proposed yes, small change in this slice.
- Which of the seven vertices the lesson quotes in step 5 is not specified; proposed only \((0,1,5)\to(4,-1)\), because it is the first in the spec's list.

Checks: `npx tsc --noEmit --pretty false`; `just lint` on touched paths; `just unit src/graphs/compgeo src/learning`; `lessonMathNotation.test.ts`; full unit suite once; `just build`. Handler: engineering review; a guided-lesson smoke row in `tests/guided-lessons.smoke.spec.cjs`; `just smoke-lesson voronoi` in both languages with a live switch; a keyboard-only run of the lesson (the spec asks for keyboard-only B4).
