# 04 Release batches A–C (F2b done; split into tasks 05–07)

Gate: Controls step 7 `accepted` in [controls.md](../feature-streams/controls.md) — open. Split on 2026-11-12 (handler 12) into [05 Batch A](05-batch-a-lessons.md) (PP1–PP2), [06 Batch B](06-batch-b-lessons.md) (PP3) and [07 Batch C](07-batch-c-lessons.md) (PP4–PP5). Batch C runs first: Batch A waits for linear-maps Batch B, which is planned, and Batch C depends only on Batch 0.

The batches are:

- A: PP1–PP2, after linear-maps Batch B is released.
- B: PP3.
- C: PP4–PP5. The dependency on recursion RG4 is removed by ADR 0054 §3.

Each runs F2b registration, F3 scenes with the typed actions `set-matrix`, `set-system`, `set-seed`, `set-r` and `set-zoom`, [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), F4 chapter, F5 media and F6 acceptance, per the [family template](../feature-streams/README.md#family-template).

F2b done 2026-11-11 (routes `/analysis/phase-portrait` and `/analysis/logistic-map`, right after `recursion-growth`; Presets through `parsePhaseState` and `parseLogisticState`; [evidence](../../reviews/feature-streams/families-prep/notes/f2b-mechanics-phase.md)). Owed, distributed by the split (the logistic axis item to task 07, the seed items to task 05): lessons and `LessonAction` entries (`set-matrix`, `set-system`, `set-seed`, `set-r`, `set-zoom`); logistic y axis numbers below 0 run into the caption rows; browser timings measured 2026-11-12 ([results](../../bezier-performance-results.md#f2b-solids-level-sets-and-phase-portrait-browser-timings--2026-11-12)); owed: seed drag at the phone limit, seed counts 12/24/48 not reachable.
