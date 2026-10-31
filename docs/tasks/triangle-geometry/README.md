# Triangle geometry and inversion: implementation tasks

Source: [triangle geometry spec](../../specs/triangle-geometry-lessons.md). Decisions: [ADR 0030](../../adr/0030-triangle-geometry-rationals-gliders-and-placement.md), building on [ADR 0021](../../adr/0021-exact-grid-predicates.md). Stream: [maps](../feature-streams/maps.md). Slice kinds F0–F6: [family template](../feature-streams/README.md#family-template).

Workers: `bezeg-worker`, Sonnet 5.5 `medium`, except the kernel tasks 02 and 03 at `high` (exact geometry with robustness requirements, per the stream template). Return at most 400 words. Bulky evidence goes to `docs/reviews/triangle-geometry/`. Every kernel task gets a mathematical review.

## Decisions (F0, 2026-10-31, handler)

- **Number type, glider and placement:** ADR 0030. `BigInt` rationals in `src/compgeo/rational.ts`; the glider angle is the only inexact input; new family *Geometrija ravnine / Plane geometry*.
- **Circumcentre ownership:** this family owns `circumcentre` (and the circle kernel). The triangulation family's Voronoi vertices should call it. If triangulation reaches its kernel first, coordinate through the maps and geometry stream files rather than building it twice.
- **Euler's inequality** (T1 acceptance 7): not in Batch A. A later change may add it as an optional last step once a source is cited.
- **Gate:** the kernel tasks wait for `G-CG` as the stream README defines it, although they use only the accepted parts (ADR 0021, `grid.ts`, `predicates.ts`). Graph tasks also need the point-set/polygon graph from that gate.
- **Terms:** the table below.

## Tasks

| Task | Batch | Slice | Gate | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [01 Rational module](01-rational.md) | 0 | F1 | `G-CG` | — | planned |
| [02 Triangle kernel](02-triangle-kernel.md) | 0 | F1 | `G-CG` | 01 | planned |
| [03 Circle, Simson and exact inversion kernel](03-circle-simson-kernel.md) | 0 | F1 | `G-CG` | 01 | planned |
| [04 Batch A graphs: notable points and inscribed angle](04-batch-a-graphs.md) | A | F2a | `G-CG` | 02, 03 | planned |
| [05 Batch A registration, lessons, chapter, acceptance](05-batch-a-release.md) | A | F2b–F6 | `G-REG` | 04 | planned |
| [06 Batch B: Euler line and nine-point circle](06-batch-b.md) | B | F2a–F6 | `G-REG` | 05 | planned |
| [07 Batch C: Simson line](07-batch-c.md) | C | F2a–F6 | `G-REG`, owner accepts the T4 tolerance policy | 06 | planned |
| [08 Batch D: power of a point and inversion](08-batch-d.md) | D | F2a–F6 | `G-REG` | 07, complex maps 01 | planned |

## Slovenian terms (F0 decision)

From the spec's table, checked against `sl.ts`, the matura catalogue wording quoted in the spec, and Slovenian school sources. Each term goes into the [localization table](../../localization.md#choosing-new-terms) in the slice that first ships it.

| English | Slovenian | Basis |
| --- | --- | --- |
| Plane geometry (family) | Geometrija ravnine | Transparent; parallel to *Preslikave ravnine* (ADR 0029) |
| triangle geometry and inversion (chapter) | geometrija trikotnika in inverzija | Spec title |
| notable points of a triangle | znamenite točke trikotnika | PIK §4.6 heading |
| centroid | težišče | Standard school term; used beside *višinska točka* and *nožišča višin* in Slovenian school geometry material |
| circumcentre; circumcircle | središče očrtane krožnice; očrtana krožnica | PIK formula sheet uses *očrtan krog*; *krožnica* (curve) matches the app's circle strings, so the first glossary mention notes the PIK wording |
| incentre; incircle | središče včrtane krožnice; včrtana krožnica | PIK *včrtan krog*, same note |
| orthocentre | višinska točka | Presek 1996, "Višinska točka trikotnika in stožnice" (N. Razpet); *ortocenter* is not used in prose |
| foot of a perpendicular / altitude | nožišče pravokotnice / višine | Slovenian school usage (*nožišča višin*) |
| pedal triangle | nožiščni trikotnik | *Matematika v šoli* 26 (2020), "Trikotniku pričrtani trikotniki"; COBISS subject heading pairs it with *pedal triangle* |
| Euler line | Eulerjeva premica | FMF *Elementarna geometrija* syllabus |
| nine-point circle | krožnica devetih točk | FMF syllabus |
| Simson line | Simsonova premica | FMF syllabus |
| power of a point | potenca točke na krožnico | FMF syllabus |
| inversion; centre and circle of inversion | inverzija; središče in krožnica inverzije | FMF "inverzija"; complex maps uses *inverzija v krožnici* for the same map |
| inscribed angle; central angle | obodni kot; središčni kot | PIK §4.6 |
| Thales' theorem | Talesov izrek (kot v polkrogu) | FMF *Talesovi izreki*; PIK *Kot v polkrogu* |
| cyclic quadrilateral | tetivni štirikotnik | FMF syllabus |
| degenerate (collinear) triangle | izrojen trikotnik | Convexity spec's *izrojen primer*; no school source found, so prose glosses it once as "oglišča ležijo na isti premici" |
| acute / right / obtuse triangle | ostrokotni / pravokotni / topokotni trikotnik | Standard school terms |
