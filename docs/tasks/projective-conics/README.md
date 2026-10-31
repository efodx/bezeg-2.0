# Projective geometry of conics: implementation tasks

Source: [projective conics spec](../../specs/projective-conics-lessons.md). Decisions: [ADR 0033](../../adr/0033-projective-conics-exact-kernel-and-family.md). Stream: [functions](../feature-streams/functions.md). Slice kinds: [family template](../feature-streams/README.md#family-template).

Workers: `bezeg-worker`, Sonnet 5.5 `medium`. Task 04 (the five-point solver) runs at `high`, because its cofactor and rank classification is demanding exact algebra. Return at most 400 words. Bulky evidence goes to `docs/reviews/projective-conics/`.

| Task | Batch | Slice | Gate | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [01 Homogeneous-coordinate kernel](01-homogeneous-kernel.md) | A | F1 | none | — | reviewed and repaired; full suite pending |
| [02 Conic kernel, pencil parameter and Pascal](02-conic-kernel.md) | A | F1 | none | 01 | planned |
| [03 Conic sampler](03-conic-sampler.md) | A | F1 | none | 02 | planned |
| [04 Five-point solver and rational arc](04-five-point-solver.md) | B | F1 | none | 02 | planned |
| [05 Batch A graphs](05-batch-a-graphs.md) | A | F2a | none | 01–03 | planned |
| [06 Batch A release](06-batch-a-release.md) | A | F2b–F6 | `G-REG` | 05 | planned |
| [07 Batch B](07-batch-b.md) | B | F2a–F6 | `G-REG` (F2b–F6) | 04, 06 | planned |

Projective graphs add no function model and no curve object, so `G-FN` and `G-CURVE` do not apply. The F2a slices are ungated.

## Slovenian terms (F0 decision)

Sources and the search method: [term research](../../reviews/projective-conics/terms-research.md). APG is the FMF *Afina in projektivna geometrija* exercise sheet. Each term goes into the [localization table](../../localization.md#choosing-new-terms) in the slice that first ships it.

| English | Slovenian | Basis |
| --- | --- | --- |
| cross-ratio, harmonic quadruple | dvorazmerje, harmonična četverka | APG sheet; sl.wikipedia *Projektivna geometrija* |
| homogeneous coordinates | homogene koordinate | sl.wikipedia; `sl.ts` has no competing term |
| point / line at infinity | točka / premica v neskončnosti | APG sheet and sl.wikipedia both write *točka v neskončnosti*. This replaces the spec's *neskončno oddaljena*, which is given once as a gloss. |
| pole and polar | pol in polara | Spec's FMF c110 citation. Family 2 uses *pol* for the pole of a rational function, so conic prose always writes *pol* together with *polara* or *glede na stožnico*, never bare *pol*. English does the same with *pole*. |
| Pascal's / Pappus's theorem | Pascalov izrek / Pappusov izrek | c110 citation; Latin spelling of Pappus, as with *Pascal* |
| conic, degenerate conic, line pair | stožnica, izrojena stožnica, par premic | APG sheet (*izrojena stožnica*); *razpadla* was not found and is not used |
| tangent to a conic | tangenta stožnice | Matura §4.11 *Tangente stožnic*; `sl.ts` *tangenta* |
| central projection | središčna projekcija | No source found, so the most transparent wording was chosen. *Perspektivnost* appears only where a lesson needs the map between two lines. |
| pencil of lines | šop premic | The research found *snop* on sl.wikipedia and *šop stožnic* in a UL catalogue entry. In Slovenian geometry, *šop* is the planar pencil and *snop* the spatial bundle, so the planar term *šop* is chosen. Not confirmed in UL lecture text. |
| weight | utež | Existing `sl.ts` rational-curve term |

## Conventions fixed by the kernels

- **Sign of a homogeneous triple (task 01):** after the gcd, \(w>0\); for \(w=0\) the first non-zero entry is positive. A finite point therefore keeps \(w>0\), so `det3` with \(w=1\) agrees with `orient` (ADR 0033 §5). Lines use the same rule, which matters only for equality.
