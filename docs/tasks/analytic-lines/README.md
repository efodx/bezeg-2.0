# Analytic geometry of lines: implementation tasks

Source: [analytic-lines spec](../../specs/analytic-lines-lessons.md). Decisions: [ADR 0046](../../adr/0046-line-geometry-graph-and-integer-lines.md). Stream: [families-prep](../feature-streams/families-prep.md). Slice kinds: [family template](../feature-streams/README.md#family-template). The spec is a draft prepared for release; release is not scheduled.

Workers: `bezeg-worker`, Sonnet 5.5 `medium`. Return at most 400 words. Bulky evidence goes to `docs/reviews/feature-streams/families-prep/`.

F1 and F2a are ungated. F2b–F6 wait for Controls step 7 ([boundary](../feature-streams/families-prep.md#boundary-with-the-controls-stream-owner-decision-2026-11-10)).

| Task | Batch | Slice | Gate | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [01 Line kernel](01-line-kernel.md) | 0 | F1 | none | — | done |
| [02 State model and line graph](02-line-graph.md) | A–C | F2a | none | 01 | done |
| [03 Release batches A–C](03-release-batches.md) | A–C | F2b–F6 | Controls step 7 (accepted) | 02 | F2b done 2026-11-11 ([evidence](../../reviews/feature-streams/families-prep/notes/f2b-lines-isometries.md)); split into 04–06 on 2026-11-12 |
| [04 Batch A lessons](04-batch-a-lessons.md) | A | F3–F6 | 03 | 02 | F3 done 2026-11-12 (L1, L2; chapter skeleton); F4–F6 next |
| [05 Batch B lessons](05-batch-b-lessons.md) | B | F3–F6 | 04 | 02 | not started |
| [06 Batch C lessons](06-batch-c-lessons.md) | C | F3–F6 | 05 | 02 | not started |

## Slovenian terms (F0 decision)

These come from the spec's table: reuse from `sl.ts` first, then the PIK. They enter the [localization table](../../localization.md#choosing-new-terms) when first shipped.

| English | Slovenian | Basis |
| --- | --- | --- |
| implicit form; explicit form; intercept form | implicitna oblika; eksplicitna oblika; odsekovna oblika | Standard school names for the forms of *enačba premice* (PIK §4.10.1) |
| normal vector; direction vector | normalni vektor; smerni vektor | *smerni* exists in `sl.ts`; *normala* is the curve term, so the vector is named in full |
| dot product | skalarni produkt | PIK §4.8 |
| angle between lines | kot med premicama | PIK §4.10.1 |
| distance from a point to a line | razdalja točke od premice | PIK formula sheet |
| foot of the perpendicular | nožišče pravokotnice | Standard; glossed on first use |
| orthogonal projection | pravokotna projekcija | PIK §4.6, §4.8 |
| intersection; tangent | presečišče; tangenta | Existing |
| two-point form | dvotočkovna oblika | Follows *odsekovna oblika*; used in the line graph (task 02) |
| discriminant | diskriminanta | Existing quadratic vocabulary (PIK §4.10.1 circle and line) |
| law of cosines | kosinusni izrek | Existing |
| relative position of lines | lega premic | Standard school name |
