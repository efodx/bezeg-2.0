# 15 — Triangulation lesson actions and lesson B2 (T2, F3)

Status: accepted 2026-11-02 (geometry handler 31; task file written by handler 25). Evidence at the end. Source: spec [B2](../../specs/triangulation-voronoi-lessons.md#b2-triangulating-a-set-of-points) (goal, example, formula note, steps, acceptance 1, 4–6), [testing decisions](../../specs/triangulation-voronoi-lessons.md#testing-decisions) (lesson tests), [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). Kind: F3; review covers scene actions, readouts and counts, not prose. Depends on 12 and 14. Template: [09](09-ear-clipping-lesson.md).

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

## Evidence (handler 31, 2026-11-02)

- 15a: accepted by handler 30 (`9bede337`).
- 15b: the lesson and smoke row (handler 30's worker), rebased onto `a142bf70`. Rebase conflicts were mechanical:
  - `lessonCatalog.test.ts`: only `delaunay` stays without a lesson now that `simson-line` has one.
  - The smoke `LESSONS` list keeps both rows.
  - `guidedExamplePreviewCopy.test.ts` counts went to 80 lessons and 87 copies.
- Engineering review (Sonnet `bezeg-reviewer`) found one medium finding.
  - On steps 1–2 the triangulation is hidden, but the readout panel still showed "Trikotnikov: 7", which spoils step 2's prediction.
  - Fix: while the `triangulation` overlay is hidden, the panel shows only \(n\) and \(k\), with no triangle, edge or angle lines and no edge list or Flip.
  - Host test in `TriangulationGraph.host.test.tsx`. A mutation that always shows the counts failed it (`15b-r2-mut.log`).
  - A low finding: mutation logs do not cover steps 3 and 7. Accepted by inspection; those tests compare against the readout.
- First smoke: the lesson did not open. The interim owner (`ear-clipping` section) cannot work in a chapter-owned chapter, because `resolveGuidedExample` opens only the section's own lesson. B2's section (task 17, item 17a) was therefore built here; see [17](17-t2-chapter.md). No unit test had caught it; 17a adds a `resolveGuidedExample` test.
- Checks on the final tree (handler):
  - tsc; eslint on touched files.
  - `just unit src/learning src/graphs/compgeo` (one count failure, fixed and rerun).
  - Full unit suite: 464 files and 8252 tests passed, 5 skipped.
  - `just build`.
- Smoke recheck (Sonnet `bezeg-smoke`, production preview of the final tree, Chromium 1440x900) passed:
  - `just smoke-lesson point-set-triangulation` (SL desktop and EN 390 px walks);
  - the chapter section and its activity link;
  - steps 1–2 hide the counts and the edge list; step 3 shows 7/13;
  - live SL/EN switch on step 3, with n and the counts unchanged;
  - step 6 shows 1,91° and 25,35°; step 7 shows n = 9, k = 6 and 10 triangles;
  - the return link lands on `#point-set-triangulation`;
  - no console errors.
- The panel change was also checked in the free graph: untick hides, tick restores.
- Gaps:
  - The worker's own script clicked Exit after step 7 and stayed on the lesson. This is probably the Exit confirmation dialog; it was not diagnosed. `lessonRestorationContract.tsx` covers exit for every lesson.
  - No touch device.
