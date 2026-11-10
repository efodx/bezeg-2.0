# Isometries, similarity and symmetry: implementation tasks

Source: [isometries spec](../../specs/isometries-lessons.md). Decisions: [ADR 0047](../../adr/0047-isometry-graph-rational-maps-and-frieze-closure.md). Stream: [families-prep](../feature-streams/families-prep.md). Slice kinds: [family template](../feature-streams/README.md#family-template). The spec is a draft prepared for release; release is not scheduled.

Workers: `bezeg-worker`, Sonnet 5.5 `medium`. Return at most 400 words. Bulky evidence goes to `docs/reviews/feature-streams/families-prep/`.

F1 and F2a are ungated. F2b–F6 wait for Controls step 7 ([boundary](../feature-streams/families-prep.md#boundary-with-the-controls-stream-owner-decision-2026-11-10)).

| Task | Batch | Slice | Gate | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [01 Isometry and similarity kernel](01-isometry-kernel.md) | 0 | F1 | none | — | done 2026-11-10 (mathematical review, Sonnet; tests strengthened) |
| [02 Rosette and frieze kernel](02-rosette-frieze-kernel.md) | 0 | F1 | none | 01 | planned |
| [03 State model and isometry graph](03-isometry-graph.md) | A–C | F2a | none | 01, 02 | planned |
| [04 Release batches A–C](04-release-batches.md) | A–C | F2b–F6 | Controls step 7 | 03 | planned |

## Slovenian terms (F0 decision)

These come from the spec's table: reuse from `sl.ts` first, then the PIK, then UL teaching material. The spec's three unverified terms were checked on 2026-11-10. They enter the [localization table](../../localization.md#choosing-new-terms) when first shipped.

| English | Slovenian | Basis |
| --- | --- | --- |
| isometry; rigid motion | izometrija; togi premik | PIK *togi premiki*; *izometrija* is standard |
| translation | vzporedni premik | PIK |
| reflection; mirror | zrcaljenje; zrcalo (os zrcaljenja) | PIK; `sl.ts` *Zrcaljenje* |
| rotation | vrtež | PIK |
| glide reflection | zrcalni zdrs | Changed from the spec's proposal *drsno zrcaljenje*. UL FMF course *Analitična in projektivna geometrija* (ucilnica.fmf.uni-lj.si, exercise sheets on plane isometries) uses *zrcalni zdrs*. Glossed on first use |
| orientation | orientacija | PIK |
| central dilation; similarity | središčni razteg; podobnost | PIK §4.6 |
| rosette; cyclic and dihedral group | rozeta; ciklična in diedrska grupa | *ciklična grupa* is the UL algebra term (dlib.si lecture notes). *diedrska grupa* is the matching adjective form. *rozeta* is the transparent everyday word and is glossed by its group |
| frieze pattern; frieze group | friz; frizna grupa | RUL thesis *Frizne grupe* (2021) |
| period | perioda | Standard |
