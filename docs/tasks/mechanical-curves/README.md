# Mechanical curves: implementation tasks

Source: [mechanical-curves spec](../../specs/mechanical-curves-lessons.md). Decisions: [ADR 0056](../../adr/0056-mechanical-curves-descent-graph-quarter-grid-tracks.md). Stream: [families-prep](../feature-streams/families-prep.md). Slice kinds: [family template](../feature-streams/README.md#family-template). The spec is a draft prepared for release; release is not scheduled.

Workers: `bezeg-worker`, Sonnet 5.5 `medium`. Return at most 400 words. Bulky evidence goes to `docs/reviews/feature-streams/families-prep/`.

F1 is ungated. F2a waits for Controls step 5, and F2b–F6 for Controls step 7 ([boundary](../feature-streams/families-prep.md#boundary-with-the-controls-stream-owner-decision-2026-11-10)).

| Task | Batch | Slice | Gate | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [01 Mechanics kernel](01-mechanics-kernel.md) | 0 | F1 | none | — | planned |
| [02 State model and descent graph](02-descent-graph.md) | A–B | F2a | Controls step 5 | 01 | planned |
| [03 Release batches A–B](03-release-batches.md) | A–B | F2b–F6 | Controls step 7 | 02 | planned |

## Slovenian terms (F0 decision)

These are checked against `sl.ts`, which has *Cikloid*. They enter the [localization table](../../localization.md#choosing-new-terms) when first shipped.

| English | Slovenian | Basis |
| --- | --- | --- |
| cycloid | cikloida | Existing, reused in the running-text form |
| brachistochrone | brahistohrona (krivulja najhitrejšega spusta) | Standard Greek-derived term, glossed by the descriptive phrase on first use |
| tautochrone | tavtohrona (krivulja enakih časov) | As above |
| descent time | čas spusta | Transparent |
| bead | kroglica | Transparent |
| track | tir | Settles the spec's open choice. *pot* is too general and clashes with the path of a point. *tir* names the guide the bead runs along and is glossed once as "the curve the bead slides on" |
| friction | trenje | Standard physics |
