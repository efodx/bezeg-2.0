# 13 — Point-set lesson actions and lessons A1, A2 (F3)

Status: planned 2026-11-01 (handler 8). Source: spec [A1](../../specs/convexity-hulls-lessons.md#a1-orientation-of-three-points) and [A2](../../specs/convexity-hulls-lessons.md#a2-polygon-area-and-picks-theorem) (goals, steps, examples, acceptance), [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). Kind: F3; review covers scene actions and readouts, not prose. Depends on 12. Shared runtime: `src/learning/model.ts` (action union) is shared with Platform A9; add only the new members.

1. **Action vocabulary.** One discriminated kind in the `LessonAction` union, following `linear-map`:
   - `{kind: 'point-set', operation: 'set-points', points: readonly LessonPoint[], mode: 'points' | 'polygon', closed?: boolean}`: replaces the model. Scene data is strict: an off-grid, out-of-range or over-limit point is a lesson-content error (the graph's validator throws `UnsupportedLessonActionError` or an equivalent), never snapped.
   - `{kind: 'point-set', operation: 'set-overlay', overlay: PointSetOverlayName, visible: boolean}` with a closed `POINT_SET_OVERLAY_NAMES` list (`grid`, `turn`, `fan`, `lattice`, `trace`, `hull`); a graph registers only the overlays it owns and rejects the rest.
   - `PointSetGraph.registerLessonActions` handles both; the subclasses inherit. `sceneActions()` validation in `lessonCatalog.ts` checks shapes and finiteness only.
2. **Lessons** in a new per-family file `src/learning/content/compgeoGuidedLessons.ts`, joined to the lesson maps in `guidedLessons.ts`. Remove `lesson: false` from `orientation` and `polygon-area` in `src/demonstrations.ts`.
   - A1 (`orientation`): the spec's six steps with \(p=(0,0)\), \(q=(4,0)\); \(r=(3,2)\) → \(+8\), \(r=(3,-2)\) → \(-8\), \(r=(2,0)\) → \(0\) collinear. Predict-before-reveal through the `turn` overlay.
   - A2 (`polygon-area`): the spec's seven steps; hull pentagon (area \(21\), \(B=8\), \(I=18\)) and notched pentagon (area \(18\), doubled sum \(36\), \(B=16\), \(I=11\)); reversed order flips the sign; a self-intersecting polygon is labelled a signed sum and Pick is not offered.
   - Text: one-shot, Slovenian and English, spec terms table. Every quoted value equals the scene's readout.
3. **Tests:** content tests run each lesson's frames in one synchronous sequence (AGENTS.md) and assert the graph readouts (orientation value and status, area, \(B\), \(I\)) at the steps that quote them; unsupported overlay and off-grid point actions are rejected; a scene change and Back restore the status text (A1 acceptance 5). Report an observed failure for each new assertion against a mutation.

Checks: tsc 0; `just lint` on touched paths; `just unit src/graphs/compgeo src/learning`; `lessonMathNotation.test.ts`; full unit suite once; production build. Smoke (handler): `just smoke-lesson orientation polygon-area` if rows are added, otherwise the two lessons by hand in both languages.
