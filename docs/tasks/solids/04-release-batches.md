# 04 Release batches A–C (F2b done; split into tasks 05–07)

Gate: Controls step 7 `accepted` in [controls.md](../feature-streams/controls.md) — open. Split on 2026-11-12 (handler 13) into [05 Batch A](05-batch-a-lessons.md) (SV1–SV2), [06 Batch B](06-batch-b-lessons.md) (SV3–SV4) and [07 Batch C](07-batch-c-lessons.md) (SV5).

The batches are A (SV1–SV2), B (SV3–SV4) and C (SV5). Each runs F2b registration, F3 scenes and [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), F4 chapter, F5 media and F6 acceptance, per the [family template](../feature-streams/README.md#family-template). The Riemann-sum lessons must behave as before.

F2b done 2026-11-12 (route `/analysis/solids`, after `logistic-map` in the analysis family; Preset collection `solids`; [evidence](../../reviews/feature-streams/families-prep/notes/f2b-solids-levelsets.md)). Owed to the first batch: lessons and `LessonAction` entries; media; browser timings measured 2026-11-12 ([results](../../bezier-performance-results.md#f2b-solids-level-sets-and-phase-portrait-browser-timings--2026-11-12)); phone misses owed: cube offset long tasks, revolve discs p95, cause of the cube hitch unprofiled (distributed by the split: the cube items to task 05, the revolve item to task 07).
