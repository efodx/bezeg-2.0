# Convexity and hulls tasks

Source: [convexity-hulls-lessons.md](../../specs/convexity-hulls-lessons.md). Stream: [geometry](../feature-streams/geometry.md). Slice kinds F0–F6: [family template](../feature-streams/README.md#family-template). Reviews and evidence: `docs/reviews/convexity-hulls/`.

## Decisions (F0, 2026-10-31, handler)

- **Robustness:** option A, exact predicates on integer grid points ([ADR 0021](../../adr/0021-exact-grid-predicates.md)). A5 gets a labelled inexact computation, not a free-double graph mode.
- **Location:** `src/compgeo/` for predicates, traces and algorithms (pure TypeScript). Graph code under `src/graphs/compgeo/`.
- **Animation id:** one `algorithm-trace` id with the algorithm chosen by a typed choice, reused by the dependent families. One id per algorithm would grow the closed list in `src/learning/model.ts` for every algorithm.
- **Placement:** new Demonstration family **Računska geometrija / Computational geometry** for this family and the two dependent ones; one Learn chapter per family via `familyChapters.ts`. Putting them under `basics` or `analysis` would hide them from learners who look for geometry. Reversible at F2b.
- **Terms:** the spec's proposals as written (one-shot lesson text rule). *Shoelace* stays as the English gloss on first mention.

## Batch 0 — foundation (opened `G-CG` 2026-10-31)

| # | Task | Kind | Depends on | Status |
| --- | --- | --- | --- | --- |
| 01 | F0 plan, ADR 0021, `src/compgeo/grid.ts` | F0 (handler) | — | done |
| 02 | [Predicate module](02-predicates.md) | F1 | 01 | accepted 2026-10-31 (math review: no findings) |
| 03 | [Step-trace model and monotone chain trace](03-trace-model.md) | F1 | 02 | accepted 2026-10-31 (math review: no findings) |
| 04 | [Point-set/polygon model](04-point-set-model.md) | F2a | 01 | accepted 2026-10-31 (handler review; range-reason fix) |
| 05 | [Point-set/polygon graph](05-point-set-graph.md) | F2a | 02, 04 | accepted 2026-10-31 (engineering + UI/accessibility review, repairs) |
| 06 | [Batch 0 acceptance](06-batch0-acceptance.md) | F6 (handler) | 02–05 | accepted 2026-10-31 (`just check` green at aabaf9f; `G-CG` open) |

## Batch 1 — A1 Orientation, A2 Area and Pick, A4 Convex hull

Kernels and graphs (F1, F2a) are not gated. Registration, lessons, chapter and media wait for `G-REG` (Platform), and lesson actions for Platform A9a. Gate: the spec's [batch-wide acceptance gate](../../specs/convexity-hulls-lessons.md#batch-wide-acceptance-gate).

| # | Task | Kind | Depends on | Status |
| --- | --- | --- | --- | --- |
| 07 | [Polygon area and lattice-count kernel](07-area-lattice-kernel.md) | F1 | 02 | planned |
| 08 | [Slow edge test and gift wrapping traces](08-slow-hull-gift-wrapping.md) | F1 | 02, 03 | planned |
| 09 | [Orientation and polygon-area graphs](09-orientation-area-graphs.md) | F2a | 05, 07 | planned |
| 10 | [Hull trace graph with step playback](10-hull-trace-graph.md) | F2a | 03, 05, 08 | planned |
| — | F2b registration of the family and three Demonstrations; F3 lessons A1+A2, A4; F4 chapter; F5 media; F6 acceptance | F2b–F6 | 07–10, `G-REG` | task files written when `G-REG` opens |

## Later batches (task files written when the previous batch is accepted)
- **Batch 2 (A3, A5):** kernels — point in polygon with half-open rule and winding number, pentagram lattice approximation (A3); the `<`/`<=` chain variants and duplicates (A5, the Kettner reference is in task 02); F2b, F3, F4 update, F5, F6.
- **Batch 3 (A6):** separating-axis hull disjointness and the pair-of-curves view (measure at depth 4); F2b, F3, F4, F5, F6.
