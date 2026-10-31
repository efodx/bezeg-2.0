# Convexity and hulls tasks

Source: [convexity-hulls-lessons.md](../../specs/convexity-hulls-lessons.md). Stream: [geometry](../feature-streams/geometry.md). Slice kinds F0–F6: [family template](../feature-streams/README.md#family-template). Reviews and evidence: `docs/reviews/convexity-hulls/`.

## Decisions (F0, 2026-10-31, handler)

- **Robustness:** option A, exact predicates on integer grid points ([ADR 0021](../../adr/0021-exact-grid-predicates.md)). A5 gets a labelled inexact computation, not a free-double graph mode.
- **Location:** `src/compgeo/` for predicates, traces and algorithms (pure TypeScript). Graph code under `src/graphs/compgeo/`.
- **Animation id:** one `algorithm-trace` id with the algorithm chosen by a typed choice, reused by the dependent families. One id per algorithm would grow the closed list in `src/learning/model.ts` for every algorithm.
- **Placement:** new Demonstration family **Računska geometrija / Computational geometry** for this family and the two dependent ones; one Learn chapter per family via `familyChapters.ts`. Putting them under `basics` or `analysis` would hide them from learners who look for geometry. Reversible at F2b.
- **Terms:** the spec's proposals as written (one-shot lesson text rule). *Shoelace* stays as the English gloss on first mention.

## Batch 0 — foundation (opens `G-CG`)

| # | Task | Kind | Depends on | Status |
| --- | --- | --- | --- | --- |
| 01 | F0 plan, ADR 0021, `src/compgeo/grid.ts` | F0 (handler) | — | done |
| 02 | [Predicate module](02-predicates.md) | F1 | 01 | planned |
| 03 | [Step-trace model and monotone chain trace](03-trace-model.md) | F1 | 02 | planned |
| 04 | [Point-set/polygon model](04-point-set-model.md) | F2a | 01 | planned |
| 05 | [Point-set/polygon graph](05-point-set-graph.md) | F2a | 02, 04 | planned |
| 06 | [Batch 0 acceptance](06-batch0-acceptance.md) | F6 (handler) | 02–05 | planned |

## Later batches (task files written when Batch 0 is accepted)

- **Batch 1 (A1, A2, A4):** kernels — signed area, lattice counts and Pick (A2), slow edge test and gift wrapping traces (A4), orientation readout model (A1); F2b registration of the family and three Demonstrations (`G-REG`); F3 lessons A1+A2, A4; F4 chapter; F5 media; F6.
- **Batch 2 (A3, A5):** kernels — point in polygon with half-open rule and winding number, pentagram lattice approximation (A3); the `<`/`<=` chain variants and duplicates (A5, the Kettner reference is in task 02); F2b, F3, F4 update, F5, F6.
- **Batch 3 (A6):** separating-axis hull disjointness and the pair-of-curves view (measure at depth 4); F2b, F3, F4, F5, F6.
