# 03 Release batches A–C (F2b–F6, gated)

Gate: Controls step 7 `accepted` in [controls.md](../feature-streams/controls.md). Split this file into per-batch tasks when the gate opens, following the scene and registration model current at that time.

The batches are A (L1–L2), B (L3–L4) and C (L5). Each runs F2b registration, F3 scenes and [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), F4 chapter, F5 media and F6 acceptance, per the [family template](../feature-streams/README.md#family-template).

Owed from task 02: F2b registration restores Presets through the parser and serializer in `src/graphs/lines/lineGeometryModel.ts`. Batch A F2b also owes the browser drag measurement of the line graph per [the performance plan's measurement protocol](../../performance-plan.md); task 02 recorded only a jsdom placeholder (median 2.6 ms).
