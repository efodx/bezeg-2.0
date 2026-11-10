# Randomness and simulation: implementation tasks

Source: [randomness spec](../../specs/randomness-simulation-lessons.md). Decisions: [ADR 0049](../../adr/0049-randomness-pcg32-integer-decisions-and-prefix-replay.md). Stream: [families-prep](../feature-streams/families-prep.md). Slice kinds: [family template](../feature-streams/README.md#family-template). The spec is a draft prepared for release; release is not scheduled.

Workers: `bezeg-worker`, Sonnet 5.5 `medium`. Return at most 400 words. Bulky evidence goes to `docs/reviews/feature-streams/families-prep/`.

F1 is ungated. F2a waits for Controls step 5, and F2b–F6 for Controls step 7 ([boundary](../feature-streams/families-prep.md#boundary-with-the-controls-stream-owner-decision-2026-11-10)).

| Task | Batch | Slice | Gate | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [01 Generator and samplers](01-generator-samplers.md) | 0 | F1 | none | — | planned |
| [02 Runners and exact comparators](02-runners-comparators.md) | 0 | F1 | none | 01 | planned |
| [03 State model and simulation graph](03-simulation-graph.md) | A–C | F2a | Controls step 5 | 02 | planned |
| [04 Release batches A–C](04-release-batches.md) | A–C | F2b–F6 | Controls step 7 | 03 | planned |

## Slovenian terms (F0 decision)

These are checked against `sl.ts`, which already has `replay` *Ponovi* and `play` *Predvajaj*, and the PIK §4.16 text. They enter the [localization table](../../localization.md#choosing-new-terms) when first shipped.

| English | Slovenian | Basis |
| --- | --- | --- |
| seed | seme (generatorja) | Transparent wording; *seme* is the common Slovenian rendering in software texts. Glossed on first use |
| replay | Ponovi | Existing `replay` key |
| Galton board | Galtonova deska | Standard form of the name |
| relative frequency; law of large numbers | relativna frekvenca; zakon velikih števil | PIK §4.16; standard |
| random walk | slučajni sprehod | Standard probability term, as used in UL FMF *Verjetnost* teaching |
| Markov chain; stationary distribution | markovska veriga; stacionarna porazdelitev | Standard |
| confidence interval; covers; misses | interval zaupanja; pokrije; zgreši | Standard; plain words |
