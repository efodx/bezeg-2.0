# 03 Release batches A–C (F2b–F6, gated)

Gate: Controls step 7 `accepted` in [controls.md](../feature-streams/controls.md). Split this file into per-batch tasks when the gate opens, following the scene and registration model current at that time.

The batches are A (KN1–KN2), B (KN3–KN4) and C (KN5). Each runs F2b registration, F3 scenes with the typed actions `set-motion`, `set-time` and `set-params`, [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), F4 chapter, F5 media with clips that scrub \(t\), and F6 acceptance, per the [family template](../feature-streams/README.md#family-template). `curve-parametric` and `curve-curvature` must behave as before.

F2b done 2026-11-11 (route `/curve-geometry/kinematics` in *Geometrija krivulj*; Presets through `parseKinematicsState`; [evidence](../../reviews/feature-streams/families-prep/notes/f2b-random-kinematics.md)). Owed to the first batch: the browser redraw measurement of task 02 per [the performance plan](../../performance-plan.md), and captions clear of the y-axis tick labels.
