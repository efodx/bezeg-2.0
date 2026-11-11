# Phase portraits and dynamics: implementation tasks

Source: [phase-portraits spec](../../specs/phase-portraits-lessons.md). Decisions: [ADR 0054](../../adr/0054-phase-portraits-separate-graphs-rk4-integer-classification.md). Stream: [families-prep](../feature-streams/families-prep.md). Slice kinds: [family template](../feature-streams/README.md#family-template). The spec is a draft prepared for release; release is not scheduled.

Workers: `bezeg-worker`, Sonnet 5.5 `medium`. Return at most 400 words. Bulky evidence goes to `docs/reviews/feature-streams/families-prep/`.

F1 is ungated. F2a waits for Controls step 5 and the trajectory measurement, and F2b–F6 for Controls step 7 ([boundary](../feature-streams/families-prep.md#boundary-with-the-controls-stream-owner-decision-2026-11-10)).

| Task | Batch | Slice | Gate | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [01 RK4, systems and classification](01-rk4-classification.md) | 0 | F1 | none | — | done |
| [02 Logistic map and bifurcation raster](02-logistic-bifurcation.md) | 0 | F1 | none | — | done |
| [03 Measurement, state model and graphs](03-graphs.md) | A–C | F2a | Controls step 5 | 01, 02 | done pending review (measurement, state model, PhasePortraitGraph and LogisticMapGraph with tests; no route, browser numbers owed at F2b) |
| [04 Release batches A–C](04-release-batches.md) | A–C | F2b–F6 | Controls step 7 | 03 | planned |

## Slovenian terms (F0 decision)

These are checked against `sl.ts`. *vozel* is the Bézier knot, so it is not reused for a node. *Pajkova mreža* is the existing cobweb term. *stacionarna točka* is kept for extrema. They enter the [localization table](../../localization.md#choosing-new-terms) when first shipped.

| English | Slovenian | Basis |
| --- | --- | --- |
| phase portrait; phase plane | fazni portret; fazna ravnina | UL FMF *Mehanika* usage (*fazna ravnina*) |
| equilibrium | ravnovesna točka | Transparent; keeps *stacionarna točka* for extrema |
| stable; unstable | stabilen; nestabilen | Standard |
| node; saddle; spiral; centre | vozlišče; sedlo; spirala; središče | *sedlo* exists. *vozlišče* avoids *vozel*. *spirala* is glossed as *žarišče* (focus) and *središče* as *center* on first use |
| trace–determinant plane | ravnina sled–determinanta | *sled* from linear maps |
| separatrix; linearization | separatrisa; linearizacija | Standard loans |
| trajectory | trajektorija | Standard. The spec's alternative *tir* is not used, to keep one word |
| logistic map; period doubling; bifurcation diagram | logistična preslikava; podvajanje periode; bifurkacijski diagram | UL FMF *Dinamični sistemi* usage. The genitive singular *periode* replaces the spec's *period* |
| cobweb | pajkova mreža | Changed from the spec's *pajčevina* to the existing `fixed_point_legend_cobweb` term, matching #9 |
