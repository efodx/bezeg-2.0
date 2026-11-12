# Trigonometry of the unit circle and triangle: implementation tasks

Source: [trigonometry spec](../../specs/trigonometry-lessons.md). Decisions: [ADR 0044](../../adr/0044-trigonometry-graphs-and-snapped-inputs.md). Stream: [families-prep](../feature-streams/families-prep.md). Slice kinds F0–F6: [family template](../feature-streams/README.md#family-template). The spec is a draft prepared for release; release is not scheduled.

Workers: `bezeg-worker`, Sonnet 5.5 `medium`. Return at most 400 words. Bulky evidence goes to `docs/reviews/feature-streams/families-prep/`.

Gates come from the stream's [boundary with Controls](../feature-streams/families-prep.md#boundary-with-the-controls-stream-owner-decision-2026-11-10). F1 and F2a are ungated. F2b–F6 wait for Controls step 7.

| Task | Batch | Slice | Gate | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [01 Angle and unit-circle kernel](01-angle-unit-circle-kernel.md) | 0 | F1 | none | — | done 2026-11-10 (mathematical review, Sonnet; two identity bounds 2.5e-15 for paired double evaluations) |
| [02 Triangle solver kernel](02-triangle-solver-kernel.md) | 0 | F1 | none | — | done 2026-11-10 (mathematical review, Sonnet; full SSA grid enumerated against an independent oracle; handler removed casts) |
| [03 State models and Presets](03-state-models.md) | A, B | F2a | none | 01, 02 | done 2026-11-10 (engineering review, Haiku; clamped flag and casts fixed) |
| [04 Unit-circle graph](04-unit-circle-graph.md) | A | F2a | none | 03 | done |
| [05 Triangle solver graph](05-triangle-solver-graph.md) | B, C | F2a | none | 03 | done |
| [06 Release batches A–C](06-release-batches.md) | A–C | F2b–F6 | Controls step 7 (accepted) | 04, 05 | F2b done 2026-11-11 for both graphs (engineering review, smoke; [evidence](../../reviews/feature-streams/families-prep/notes/f2b-trig.md)); browser drag baseline done 2026-11-11, no budget miss ([results](../../bezier-performance-results.md#f2b-geometry-routes-drag-baseline--2026-11-11)); split into 07–09 on 2026-11-12 |
| [07 Batch A lessons](07-batch-a-lessons.md) | A | F3–F6 | 06 | 04 | F3 in progress |
| [08 Batch B lessons](08-batch-b-lessons.md) | B | F3–F6 | 07 | 05 | not started |
| [09 Batch C lessons](09-batch-c-lessons.md) | C | F3–F6 | 08 | 05 | not started |

## Slovenian terms (F0 decision)

These come from the spec's table, checked against `sl.ts` and the PIK M-MAT-2026 text. Each term goes into the [localization table](../../localization.md#choosing-new-terms) in the slice that first ships it.

| English | Slovenian | Basis |
| --- | --- | --- |
| unit circle | enotska krožnica | Existing localization table; PIK §4.10.9 |
| radian | radian | Standard; `sl.ts` already says "v radianih" (complex arguments, conic φ) |
| sine, cosine, tangent | sinus, kosinus, tangens | Standard; existing trigonometric graph titles |
| trigonometric functions | kotne funkcije | PIK §4.10.9 title |
| addition formulas | adicijski izreki | PIK §4.10.9 |
| sine rule; cosine rule | sinusni izrek; kosinusni izrek | PIK §4.6 |
| circumradius | polmer očrtane krožnice | Existing *očrtana krožnica* (the app keeps *krožnica* where PIK says *očrtan krog*, see the localization table) |
| arc | lok | PIK §4.6 ("nad istim lokom") |
| quadrant | kvadrant | `sl.ts` already uses *kvadrant* (complex reciprocal prompt) |
| ambiguous case (SSA) | dvoumni primer (podatki SSK) | Transparent wording. *SSK* is the school congruence abbreviation (stranica, stranica, kot), glossed on first use because it is not yet in the repository |
| reflection in the origin | zrcalna slika čez izhodišče | Transparent wording: *zrcalna slika čez os* is the school phrase for a reflection in a line, and the origin extends it to a point (central reflection, *središčna zrcalitev*, is the formal name; the shorter phrase fits the readout label) |
| signs (of cosine and sine) | predznaka | Dual of *predznak*: two quantities, so the dual form is correct Slovenian |
| position (of the point on the circle) | lega | Standard word for position in school geometry; used for the quadrant or axis readout |
| SAS (two sides and the included angle) | SKS (dve stranici in kot med njima) | School congruence abbreviation (stranica, kot, stranica), glossed in the data-type choice because it is not yet in the repository |
| ASA (a side and the two adjacent angles) | KSK (stranica in priležna kota) | School congruence abbreviation (kot, stranica, kot), glossed in the data-type choice |
| SSA (two sides and an angle) | SSK (dve stranici in kot, dvoumni primer) | As the ambiguous-case row above; the angle lies opposite the first side |
| flat (degenerate) triangle | sploščen trikotnik | Transparent wording; the school texts call collinear vertices "točke ležijo na premici", which the status line says as well |
| correction (term 2·CA·CB of the cosine rule) | popravek | Plain word for the term that corrects a² + b² to c²; shown as *popravek 2·CA·CB* with the vector notation of the task |
| dot product | skalarni produkt | Standard (PIK vectors) |
