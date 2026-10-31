# Complex maps: implementation tasks

Source: [complex maps spec](../../specs/complex-maps-lessons.md). Decisions: [ADR 0029](../../adr/0029-complex-maps-placement-graphs-and-domain.md). Stream: [maps](../feature-streams/maps.md). Slice kinds F0–F6: [family template](../feature-streams/README.md#family-template).

Workers: `bezeg-worker`, Sonnet 5.5 `medium`, except task 01 at `high` (Möbius and generalized-circle mathematics, per the stream template). Return at most 400 words. Bulky evidence goes to `docs/reviews/complex-maps/`.

| Task | Batch | Slice | Gate | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [01 Möbius and inversion kernel](01-mobius-kernel.md) | A, C | F1 | none | — | planned |
| [02 Reciprocal and roots kernel](02-reciprocal-roots-kernel.md) | A | F1 | none | — | planned |
| [03 Batch A graphs](03-batch-a-graphs.md) | A | F2a | none | 01, 02 | planned |
| [04 Batch A registration, lessons, chapter, acceptance](04-batch-a-release.md) | A | F2b–F6 | `G-REG` | 03 | planned |
| [05 Image sampler kernel](05-image-sampler.md) | B | F1 | none | — | planned |
| [06 Batch B](06-batch-b.md) | B | measurement, F2a–F6 | `G-REG` | 04, 05 | planned |
| [07 Batch C](07-batch-c.md) | C | ADR, F2a–F6 | `G-REG` | 01, 06 | planned |

Task 01 also provides circle inversion to the triangle geometry family (T5).

## Slovenian terms (F0 decision)

From the spec's table, checked against `sl.ts` and `src/learning/content/`. Each term goes into the [localization table](../../localization.md#choosing-new-terms) in the slice that first ships it.

| English | Slovenian | Basis |
| --- | --- | --- |
| Maps of the plane (family) | Preslikave ravnine | Transparent; matches *linearne preslikave ravnine* (linear maps spec) |
| conjugate | konjugirano število | PIK §4.3.4 "konjugiranega števila" |
| reciprocal | obratna vrednost | PIK §4.3.4; already in `functionGuidedLessons.ts` |
| circle inversion | inverzija v krožnici | FMF *Elementarna geometrija* "inverzija"; *krožnica* (circle) vs *krog* (disc) as used across the app |
| conformal map | konformna preslikava | FMF *Analiza 2b* "konformne preslikave" |
| Möbius map | Möbiusova preslikava | *Analiza 2b* uses "preslikave"; *transformacija* not used, for consistency with *afina preslikava* |
| cross-ratio | dvorazmerje | FMF *Afina in projektivna geometrija* |
| automorphism of the disc | avtomorfizem enotskega kroga | *Analiza 2b* "holomorfni avtomorfizmi kroga" |
| pole (of a map) | pol preslikave | Transparent; always with *preslikave*, to keep it apart from *pol in polara* (projective conics) |
| point at infinity | točka v neskončnosti | Transparent standard wording; not found in a UL page by this search, glossed in prose |
| circle or line (generalized circle) | krožnica ali premica | Spec: avoid *posplošena krožnica* in lesson prose |
| principal argument | glavni argument | Not in `sl.ts`; standard wording ("glavna vrednost argumenta"), glossed as \((-\pi,\pi]\) |
| \(n\)th root; root of unity | \(n\)-ti koren; koren enote | PIK "kompleksne rešitve enačbe"; standard |
