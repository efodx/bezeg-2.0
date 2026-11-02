# 15 — Triangulation lesson actions and lesson B2 (T2, F3)

Status: open (task file written 2026-11-02, geometry handler 25). Source: spec [B2](../../specs/triangulation-voronoi-lessons.md#b2-triangulating-a-set-of-points) (goal, example, formula note, steps, acceptance 1, 4–6), [testing decisions](../../specs/triangulation-voronoi-lessons.md#testing-decisions) (lesson tests), [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). Kind: F3; review covers scene actions, readouts and counts, not prose. Depends on 12 and 14. Template: [09](09-ear-clipping-lesson.md).

1. **Actions** (the `point-set` kind of `LessonAction`, validated for shape and finiteness only in `lessonCatalog.ts`):
   - `{operation: 'set-triangulation', triangles: readonly [number, number, number][]}` replaces the current triangulation of the scene's points; an invalid list is a lesson-content error (throws), never repaired.
   - `{operation: 'flip-edge', edge: [number, number]}` flips through the same path as the panel; a refused flip in scene data is a lesson-content error.
   - `{operation: 'select-edge', edge: [number, number] | null}` highlights an edge without flipping.
   - Point additions reuse the existing point-set actions. `TriangulationGraph` (and 13 by inheritance) handles these; the base class rejects them with `UnsupportedLessonActionError`.
2. **Lesson** B2 (`point-set-triangulation`) in `src/learning/content/compgeoGuidedLessons.ts`; remove `lesson: false` and the id from the list in `lessonCatalog.test.ts`. The spec's seven steps on \(p_0..p_6\):
   1. Points only (triangulation hidden).
   2. Predict the triangle count.
   3. T0 with 7 triangles, 13 edges, 8 interior, \(2n-2-k=7\).
   4. Flip an interior edge with a convex quadrilateral, counts unchanged; also a refused non-convex flip and its reason.
   5. Add a point inside a triangle (\(+2\)) and one outside the hull (count from the formula).
   6. T0 against the Delaunay triangulation: smallest angle \(1{,}91^\circ\) against \(25{,}35^\circ\). The forward link to B3 is added by 16, not here.
   7. The nine hull-lesson points with \(k=6\) (one collinear boundary point, 10 triangles), then free exploration.

   Prerequisite link to `convex-hull` (A4 is released). Every quoted value equals the scene's readout.
3. **Tests:** frames in one synchronous sequence; readouts at the quoting steps, numbers present in both languages' text; the new actions rejected by `EarClippingGraph` and `HullTraceGraph`; Back and a scene change restore the readouts. A mutation failure per new assertion.

Checks: `npx tsc --noEmit --pretty false`; `just lint` on touched paths; `just unit src/graphs/compgeo src/learning`; `lessonMathNotation.test.ts`; full unit suite once; `just build`. Handler: engineering review; a guided-lesson smoke row in `tests/guided-lessons.smoke.spec.cjs` and `just smoke-lesson point-set-triangulation` in both languages with a live switch.
