# 21 — Lesson A3 point in polygon (Batch 2, F3)

Status: accepted 2026-11-05 (geometry handler 50; workers 21a actions and 21b lesson, Sonnet high; engineering review of the actions found no defect in this graph; the smoke showed an interim chapter owner gives no launch path, because chapter-owned lessons open through the section registry, so the A3 section of task 23 was done here). Planned 2026-11-03 (geometry handler 48). Source: spec [A3](../../specs/convexity-hulls-lessons.md#a3-point-in-polygon) (goal, prerequisites A1 and A2, steps 1–7, acceptance 1–6), [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). Kind: F3; the review covers scene actions, readouts and the stated rule, not prose. Depends on 20. Template: [13](13-lessons-orientation-area.md).

1. **Actions.** `PointInPolygonGraph` registers typed actions:
   - move the query point;
   - `set-polygon` (pentagon or pentagram);
   - toggle the overlays and the visibility of the verdicts.

   `lessonCatalog.ts` checks only their shape and finiteness, and other graphs reject them. Unit-test multi-action scenes in one synchronous sequence.
2. **Lesson.** Add lesson A3 on `point-in-polygon` in `compgeoGuidedLessons.ts`, and remove `lesson: false`. It follows the spec's seven steps on the notched pentagon, then on the pentagram.
   - Step 2 hides the verdicts until after the prediction.
   - Step 4 states task 16's half-open rule in words.
   - Step 6 states that the pentagram is a lattice approximation.
   - Quoted values (winding numbers \(1\), \(0\) and \(2\), and the crossing counts) equal the readouts at their steps.
   - Prerequisite links go to `orientation` and `polygon-area`.
3. **Tests:**
   - frames run in one synchronous sequence;
   - quoted numbers equal the readouts and appear in both languages;
   - Back and a scene change restore the scene;
   - `lessonMathNotation.test.ts` passes unchanged;
   - observed mutation failures, for example the step 3 query moved one grid step.

Checks: as 13, with `just smoke-lesson point-in-polygon` in both languages with a live switch.

Carried from 18's review (handler 49): the `ray` overlay numbers the counted crossings, which gives the even–odd verdict away, so the "predict" step must hide `ray` as well as `values`. `ray` and `winding` are not yet in `POINT_SET_OVERLAY_NAMES` (`src/compgeo/pointSetModel.ts`), and `set-query-point` is documented as VoronoiGraph only (`src/learning/model.ts`); extend both.
