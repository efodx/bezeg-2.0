# Kinematics on curves: implementation tasks

Source: [kinematics spec](../../specs/kinematics-lessons.md). Decisions: [ADR 0050](../../adr/0050-kinematics-graph-si-units-and-arrow-scale.md). Stream: [families-prep](../feature-streams/families-prep.md). Slice kinds: [family template](../feature-streams/README.md#family-template). The spec is a draft prepared for release; release is not scheduled.

Workers: `bezeg-worker`, Sonnet 5.5 `medium`. Return at most 400 words. Bulky evidence goes to `docs/reviews/feature-streams/families-prep/`.

F1 is ungated. F2a waits for Controls step 5, and F2b–F6 for Controls step 7 ([boundary](../feature-streams/families-prep.md#boundary-with-the-controls-stream-owner-decision-2026-11-10)).

| Task | Batch | Slice | Gate | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [01 Kinematics kernel](01-kinematics-kernel.md) | 0 | F1 | none | — | done |
| [02 State model and kinematics graph](02-kinematics-graph.md) | A–C | F2a | Controls step 5 | 01 | planned |
| [03 Release batches A–C](03-release-batches.md) | A–C | F2b–F6 | Controls step 7 | 02 | planned |

## Slovenian terms (F0 decision)

These are checked against `sl.ts`, which has *hitrost*, *ukrivljenost*, *tangenta* and *normala*. The remaining terms are the standard school-physics names. They enter the [localization table](../../localization.md#choosing-new-terms) when first shipped.

| English | Slovenian | Basis |
| --- | --- | --- |
| velocity; speed | hitrost (vektor hitrosti; velikost hitrosti) | Existing |
| acceleration; tangential, normal acceleration | pospešek; tangentni, normalni pospešek | Standard; *tangenta* and *normala* exist |
| centripetal acceleration | centripetalni pospešek | Standard; glossed "pospešek proti središču" on first use |
| uniform circular motion; angular velocity | enakomerno kroženje; kotna hitrost | Standard |
| projectile motion | poševni met | Standard |
| time; parameter | čas; parameter | Existing |
