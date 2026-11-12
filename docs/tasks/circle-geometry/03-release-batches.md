# 03 Release batches A–B (F2b done; split into tasks 04–05)

Gate: Controls step 7 `accepted` in [controls.md](../feature-streams/controls.md) — open. Split on 2026-11-12 (handler 11) into [04 Batch A](04-batch-a-lessons.md) (CG1–CG2) and [05 Batch B](05-batch-b-lessons.md) (CG3–CG4).

The batches are A (CG1–CG2) and B (CG3–CG4). Each runs F2b registration, F3 scenes and [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), F4 chapter, F5 media and F6 acceptance, per the [family template](../feature-streams/README.md#family-template). CG2's cross-link to the inversion lesson (T5) applies only if T5 is released. Otherwise CG2's first step restates the definition, as the spec says.

Owed from task 02: F2b registration must restore Presets through `parseCircleConstructionState` and save through `serializeCircleConstructionState` (the graph itself does not validate, and `defaultPreset()` returns `null` until then). Batch A F2b also owes the browser drag measurement of the construction graph per [the performance plan's measurement protocol](../../performance-plan.md); task 02 recorded only a jsdom placeholder.

F2b done 2026-11-11 (route `/circle-constructions`; Presets through the model parser; [evidence](../../reviews/feature-streams/families-prep/notes/f2b-circle-combinatorics.md)).
