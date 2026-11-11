# 03 Release batches A–B (F2b–F6, gated)

Gate: Controls step 7 `accepted` in [controls.md](../feature-streams/controls.md). Split this file into per-batch tasks when the gate opens, following the scene and registration model current at that time.

The batches are A (MC1–MC2) and B (MC3). Each runs F2b registration, F3 scenes, [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), F4 chapter, F5 media and F6 acceptance, per the [family template](../feature-streams/README.md#family-template). `curve-parametric` must behave as before.

F2b done 2026-11-11 (route `/curve-geometry/descent`, last row of *Geometrija krivulj* after `curve-kinematics`; Presets through `parseDescentState`; [evidence](../../reviews/feature-streams/families-prep/notes/f2b-mechanics-phase.md)). Owed to the first batch: lessons and `LessonAction` entries; the opening view of the descent race may crop the lower part of the circular arc (observed at 1280 px, not fixed); browser timing not measured.
