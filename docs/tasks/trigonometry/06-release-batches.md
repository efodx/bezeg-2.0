# 06 Release batches A–C (F2b–F6, gated)

Gate: Controls step 7 `accepted` in [controls.md](../feature-streams/controls.md) (persisted scenes; steps 8–9 change scenes and registration). Until then nothing here starts. Split this file into per-batch tasks when the gate opens, following the scene and registration model current at that time.

Per batch (A: TR1–TR2; B: TR3–TR4; C: TR5), following the [family template](../feature-streams/README.md#family-template):

- F2b: route, catalog entry and Demonstration registration, kept minimal and pushed promptly.
- F3: scene actions and [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31) per lesson.
- F4: bilingual chapter in Learn with chapter-owned guided examples.
- F5: catalog clip and example cards.
- F6: the spec's batch-wide acceptance gate, `just check`, smoke of the routes in both languages, and hosted CI.
