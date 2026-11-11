# 04 Release batches A–C (F2b–F6, gated)

Gate: Controls step 7 `accepted` in [controls.md](../feature-streams/controls.md). Split this file into per-batch tasks when the gate opens, following the scene and registration model current at that time.

The batches are:

- A: PP1–PP2, after linear-maps Batch B is released.
- B: PP3.
- C: PP4–PP5. The dependency on recursion RG4 is removed by ADR 0054 §3.

Each runs F2b registration, F3 scenes with the typed actions `set-matrix`, `set-system`, `set-seed`, `set-r` and `set-zoom`, [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), F4 chapter, F5 media and F6 acceptance, per the [family template](../feature-streams/README.md#family-template).

F2b done 2026-11-11 (routes `/analysis/phase-portrait` and `/analysis/logistic-map`, right after `recursion-growth`; Presets through `parsePhaseState` and `parseLogisticState`; [evidence](../../reviews/feature-streams/families-prep/notes/f2b-mechanics-phase.md)). Owed to the first batch: lessons and `LessonAction` entries (`set-matrix`, `set-system`, `set-seed`, `set-r`, `set-zoom`); logistic y axis numbers below 0 run into the caption rows; browser timing not measured.
