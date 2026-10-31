# Numerical methods on the graph: implementation tasks

Source: [numerical methods spec](../../specs/numerical-methods-lessons.md). Decisions: [ADR 0021](../../adr/0021-numerical-methods-demonstrations.md). Stream: [functions](../feature-streams/functions.md). Slice kinds F0–F6: [family template](../feature-streams/README.md#family-template).

Workers: `bezeg-worker`, Sonnet 5.5 `medium`. Return at most 400 words. Bulky evidence goes to `docs/reviews/numerical-methods/`.

| Task | Batch | Slice | Gate | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [01 Root-finding kernel](01-root-finding-kernel.md) | A | F1 | none | — | planned |
| [02 Simpson kernel](02-simpson-kernel.md) | B | F1 | none | — | planned |
| [03 Euler kernel](03-euler-kernel.md) | C | F1 | none | — | planned |
| [04 Batch A Demonstration](04-batch-a-demonstration.md) | A | F2a, F2b | `G-FN`, `G-REG` | 01 | planned |
| [05 Batch A lessons, chapter, media, acceptance](05-batch-a-lessons.md) | A | F3–F6 | `G-REG` | 04 | planned |
| [06 Batch B](06-batch-b.md) | B | F2a–F6 | `G-FN`, `G-REG` | 02, 05 | planned |
| [07 Batch C](07-batch-c.md) | C | measurement + ADR, F2a–F6 | `G-FN`, `G-REG` | 03, 06 | planned |

## Slovenian terms (F0 decision)

These terms come from the spec's table, checked against `sl.ts` and UL teaching material. Each term goes into the [localization table](../../localization.md#choosing-new-terms) in the slice that first ships it.

| English | Slovenian | Basis |
| --- | --- | --- |
| Newton's (tangent) method | tangentna (Newtonova) metoda | FMF *Numerične metode* syllabus; FRI lecture notes ("tangentna metoda … red konvergence je vsaj 2") |
| secant method | sekantna metoda | Same sources; `sl.ts` already uses *sekanta* |
| iterate | približek | `sl.ts` uses *približek* for a midpoint estimate; *iterat* only as a gloss |
| trapezoid rule / Simpson's rule | trapezno pravilo / Simpsonovo pravilo | `sl.ts` `integral_method_help` uses *trapezno pravilo*; syllabus "Simpsonova formula" |
| direction (slope) field | polje smeri | FMF ODE notes (users.fmf.uni-lj.si/slapar/DE.pdf) and exercise sheets |
| Euler's method | Eulerjeva metoda | FMF *Numerične metode* course material |
| convergence order | red konvergence | FRI *Numerične metode* lecture 6 (2021) |
