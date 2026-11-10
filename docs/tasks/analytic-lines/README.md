# Analytic geometry of lines: implementation tasks

Source: [analytic-lines spec](../../specs/analytic-lines-lessons.md). Decisions: [ADR 0046](../../adr/0046-line-geometry-graph-and-integer-lines.md). Stream: [families-prep](../feature-streams/families-prep.md). Slice kinds: [family template](../feature-streams/README.md#family-template). The spec is a draft prepared for release; release is not scheduled.

Workers: `bezeg-worker`, Sonnet 5.5 `medium`. Return at most 400 words. Bulky evidence goes to `docs/reviews/feature-streams/families-prep/`.

F1 and F2a are ungated. F2b–F6 wait for Controls step 7 ([boundary](../feature-streams/families-prep.md#boundary-with-the-controls-stream-owner-decision-2026-11-10)).

| Task | Batch | Slice | Gate | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [01 Line kernel](01-line-kernel.md) | 0 | F1 | none | — | planned |
| [02 State model and line graph](02-line-graph.md) | A–C | F2a | none | 01 | planned |
| [03 Release batches A–C](03-release-batches.md) | A–C | F2b–F6 | Controls step 7 | 02 | planned |

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
