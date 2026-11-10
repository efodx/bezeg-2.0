# Recursion and growth models: implementation tasks

Source: [recursion spec](../../specs/recursion-growth-lessons.md). Decisions: [ADR 0052](../../adr/0052-recursion-new-cobweb-graph-integer-parameters-log-plot.md). Stream: [families-prep](../feature-streams/families-prep.md). Slice kinds: [family template](../feature-streams/README.md#family-template). The spec is a draft prepared for release; release is not scheduled.

Workers: `bezeg-worker`, Sonnet 5.5 `medium`. Return at most 400 words. Bulky evidence goes to `docs/reviews/feature-streams/families-prep/`.

F1 is ungated. F2a waits for Controls step 5, by the stream's binding boundary. The spec's Implementation Decisions call `GrowthGraph` ungated, and the boundary overrides that. F2b–F6 wait for Controls step 7 ([boundary](../feature-streams/families-prep.md#boundary-with-the-controls-stream-owner-decision-2026-11-10)).

| Task | Batch | Slice | Gate | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [01 Recursion kernel](01-recursion-kernel.md) | 0 | F1 | none | — | planned |
| [02 State model and graphs](02-graphs.md) | A–C | F2a | Controls step 5 | 01 | planned |
| [03 Release batches A–C](03-release-batches.md) | A–C | F2b–F6 | Controls step 7 | 02 | planned |

## Slovenian terms (F0 decision)

These are checked against `sl.ts`, which has *iteracija*, *negibna točka*, *Pajkova mreža* and *Geometrijska vrsta*, and against the PIK §4.12 text. They enter the [localization table](../../localization.md#choosing-new-terms) when first shipped.

| English | Slovenian | Basis |
| --- | --- | --- |
| sequence; term; recursive formula | zaporedje; člen zaporedja; rekurzivna formula | PIK §4.12 |
| arithmetic, geometric sequence | aritmetično, geometrijsko zaporedje | PIK §4.12 |
| cobweb diagram; fixed point | pajkova mreža; negibna točka | Existing |
| simple, compound interest | navadno, obrestno obrestovanje | PIK §4.12 |
| relative, conformal rate | relativna, konformna obrestna mera | PIK §4.12; standard school finance terms |
| doubling time | čas podvojitve | Transparent standard wording |
| Euler's number | Eulerjevo število \(e\) | Standard. Match the wording of the existing exponential lessons when they name \(e\) |
