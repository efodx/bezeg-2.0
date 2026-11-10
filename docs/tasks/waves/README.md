# Waves, beats and sampling: implementation tasks

Source: [waves spec](../../specs/waves-sampling-lessons.md). Decisions: [ADR 0055](../../adr/0055-waves-one-graph-integer-frequencies-drawn-sampler.md). Stream: [families-prep](../feature-streams/families-prep.md). Slice kinds: [family template](../feature-streams/README.md#family-template). The spec is a draft prepared for release; release is not scheduled.

Workers: `bezeg-worker`, Sonnet 5.5 `medium`. Return at most 400 words. Bulky evidence goes to `docs/reviews/feature-streams/families-prep/`.

F1 is ungated. F2a waits for Controls step 5, and F2b–F6 for Controls step 7 ([boundary](../feature-streams/families-prep.md#boundary-with-the-controls-stream-owner-decision-2026-11-10)).

| Task | Batch | Slice | Gate | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [01 Waves kernel](01-waves-kernel.md) | 0 | F1 | none | — | planned |
| [02 State model and waves graph](02-waves-graph.md) | A–C | F2a | Controls step 5 | 01 | planned |
| [03 Release batches A–C](03-release-batches.md) | A–C | F2b–F6 | Controls step 7 | 02 | planned |

## Slovenian terms (F0 decision)

These are checked against `sl.ts`, which has *Amplituda*, *Faza*, *Perioda* and *Frekvenca*. The remaining terms are standard school-physics names. They enter the [localization table](../../localization.md#choosing-new-terms) when first shipped.

| English | Slovenian | Basis |
| --- | --- | --- |
| wave; superposition | valovanje (val); seštevanje valovanj (superpozicija) | Standard |
| beats | utripanje | Standard |
| standing wave; node; antinode | stoječe valovanje; vozel; hrbet | Standard school physics. *vozel* is also the app's Bézier knot. The two never share a screen, and wave prose always says *vozel valovanja* on first use |
| sampling; sampling rate | vzorčenje; frekvenca vzorčenja | Standard |
| aliasing | pojav lažne frekvence | Transparent wording, with the English *aliasing* glossed on first use. No established school term was found |
| Nyquist rate | Nyquistova frekvenca | Standard |
