# 04 Release batches A–C (F2b–F6, gated)

Gate: Controls step 7 `accepted` in [controls.md](../feature-streams/controls.md). Split this file into per-batch tasks when the gate opens, following the scene and registration model current at that time.

The batches are A (L1–L2), B (L3) and C (L4–L5, after the frieze drawing is measured). Each runs F2b registration, F3 scenes and [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), F4 chapter, F5 media and F6 acceptance, per the [family template](../feature-streams/README.md#family-template). The L5 prose names the frieze classification theorem and says that the app checks it only for this model's generators ([ADR 0047 §3](../../adr/0047-isometry-graph-rational-maps-and-frieze-closure.md)).

Owed from task 03:
- F2b registration restores Presets through `parseIsometryState` and saves through `serializeIsometryState` in `src/isometry/isometryModel.ts`.
- Per [the performance plan's measurement protocol](../../performance-plan.md), the browser measurement of the mirror drag (Batch A) and of the frieze redraw (Batch C). Task 03 chose merged NaN-break curves from jsdom placeholders only: 0.65 ms against 1.61 ms per copy. Batch C must confirm in a rendered check that the SVG path breaks at NaN.
