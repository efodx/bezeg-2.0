# Solids and volumes: implementation tasks

Source: [solids spec](../../specs/solids-volumes-lessons.md). Decisions: [ADR 0051](../../adr/0051-solids-mesh-in-surface-view-integer-clipping-and-kgon-revolve.md). Stream: [families-prep](../feature-streams/families-prep.md). Slice kinds: [family template](../feature-streams/README.md#family-template). The spec is a draft prepared for release; release is not scheduled.

Workers: `bezeg-worker`, Sonnet 5.5 `medium`. Return at most 400 words. Bulky evidence goes to `docs/reviews/feature-streams/families-prep/`.

F1 is ungated. F2a waits for Controls step 5 and the 3D measurement, and F2b–F6 for Controls step 7 ([boundary](../feature-streams/families-prep.md#boundary-with-the-controls-stream-owner-decision-2026-11-10)).

| Task | Batch | Slice | Gate | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [01 Mesh and section kernel](01-mesh-section-kernel.md) | 0 | F1 | none | — | done |
| [02 Revolve and volume kernel](02-revolve-volume-kernel.md) | 0 | F1 | none | 01 | done |
| [03 Measurement, state model and solids graph](03-solids-graph.md) | A–C | F2a | Controls step 5 | 01, 02 | implemented, uncommitted (review owed) |
| [04 Release batches A–C](04-release-batches.md) | A–C | F2b | Controls step 7 | 03 | done; split into 05–07 |
| [05 Batch A: SV1–SV2](05-batch-a-lessons.md) | A | F3–F6 | — | 04 | F3 done; F4–F6 next |
| [06 Batch B: SV3–SV4](06-batch-b-lessons.md) | B | F3–F6 | — | 05 | not started |
| [07 Batch C: SV5](07-batch-c-lessons.md) | C | F3–F6 | — | 06 | not started |

## Slovenian terms (F0 decision)

These come from the matura catalogue M-MAT-2026 §4.7 and §4.14 wording, which the spec read, and from `sl.ts` for the 3D view. They enter the [localization table](../../localization.md#choosing-new-terms) when first shipped.

| English | Slovenian | Basis |
| --- | --- | --- |
| plane section | ravninski presek | Standard school wording *presek telesa z ravnino* |
| Cavalieri's principle | Cavalierijevo pravilo | PIK §4.7 |
| oblique solid | poševno telo | PIK §4.7 *Poševna telesa* |
| solid of revolution; axis of rotation; volume of revolution | vrtenina; os vrtenja; prostornina vrtenine | PIK §4.7, §4.14 |
| prism, pyramid, cylinder, cone, sphere | prizma, piramida, valj, stožec, krogla | PIK §4.7 |
| mesh (readouts only) | mreža telesa | Changed from the spec's proposal *mrežno telo*, which reads as "net of a solid". Readouts say "prostornina mreže" next to the exact value |
