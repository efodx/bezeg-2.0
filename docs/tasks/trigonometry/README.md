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
| [05 Triangle solver graph](05-triangle-solver-graph.md) | B, C | F2a | none | 03 | planned |
| [06 Release batches A–C](06-release-batches.md) | A–C | F2b–F6 | Controls step 7 | 04, 05 | planned |

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
| reflection in the origin | zrcalna slika čez izhodišče | Transparent wording: *zrcalna slika čez os* is the school phrase for a reflection in a line, and the origin extends it to a point (central reflection, *središčna zrcalitev*, is the formal name; the shorter phrase fits the readout label) || signs (of cosine and sine) | predznaka | Dual of *predznak*: two quantities, so the dual form is correct Slovenian || position (of the point on the circle) | lega | Standard word for position in school geometry; used for the quadrant or axis readout |
