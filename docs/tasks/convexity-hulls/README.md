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
| 07 | [Polygon area and lattice-count kernel](07-area-lattice-kernel.md) | F1 | 02 | accepted 2026-10-31 (math review; test repair) |
| 08 | [Slow edge test and gift wrapping traces](08-slow-hull-gift-wrapping.md) | F1 | 02, 03 | accepted 2026-10-31 (math review: no findings) |
| 09 | [Orientation and polygon-area graphs](09-orientation-area-graphs.md) | F2a | 05, 07 | accepted 2026-10-31 (engineering + UI/accessibility review, repairs) |
| 10 | [Hull trace graph with step playback](10-hull-trace-graph.md) | F2a | 03, 05, 08 | accepted 2026-10-31 (engineering + UI/accessibility review, repairs, shared-hook re-review) |
| 12 | [Batch 1 registration](12-batch1-registration.md): family and three Demonstrations, posters | F2b | 09, 10, `G-REG` | accepted 2026-11-01 (handler 10): routes, family, Presets; posters deferred to F5 (`POSTER_PENDING`; capture needs a `linear-map` recipe from Maps first) |
| 13 | [Lessons A1 orientation, A2 polygon area](13-lessons-orientation-area.md) | F3 | 12 | accepted 2026-11-01 (handler 12): `point-set` actions, `values` overlay, interim chapter owner until F4 |
| 14 | [Hull trace actions and lesson A4](14-lesson-convex-hull.md) | F3 | 13 | accepted 2026-11-01 (handler 14): F3 review, `just smoke-lesson convex-hull`, bilingual walk |
| 15 | [Convexity and hulls chapter, Batch 1](15-chapter.md) | F4 | 13, 14, Maps `chapterOwnedLessons` on `master` | accepted 2026-11-01 (handler 18) |
| — | F5 media; F6 acceptance | F5–F6 | 15 | F6 accepted 2026-11-02 (handler 27, [record](../../reviews/feature-streams/geometry/f6-convexity-acceptance.md); repair `e9f07099`); F5 media files pending |

## Batch 2 (A3, A5)

Planned 2026-11-03 (geometry handler 48). The A5 "free double" board is a fixed view of Kettner's inputs, because [ADR 0021](../../adr/0021-exact-grid-predicates.md) rules out free double points feeding an algorithm (task 19). The Kettner counts kernel already exists from task 02.

| # | Task | Kind | Depends on | Status |
| --- | --- | --- | --- | --- |
| 16 | [Point-in-polygon kernel and pentagram approximation](16-point-in-polygon-kernel.md) | F1 | 02, 07 | accepted 2026-11-03 (handler 48) |
| 17 | [Monotone chain rule variants and the Kettner sign map](17-chain-variants-kettner-map.md) | F1 | 02, 03 | accepted 2026-11-03 (handler 48) |
| 18 | [Point-in-polygon graph](18-point-in-polygon-graph.md) | F2a | 16, 09 | planned |
| 19 | [Hull robustness graph](19-hull-robustness-graph.md) | F2a | 17, 10 | planned |
| 20 | [Batch 2 registration](20-batch2-registration.md): `point-in-polygon`, `hull-robustness` | F2b | 18, 19, `G-REG` | planned |
| 21 | [Lesson A3 point in polygon](21-lesson-point-in-polygon.md) | F3 | 20 | accepted 2026-11-05 (handler 50) |
| 22 | [Lesson A5 degenerate cases and robustness](22-lesson-hull-robustness.md) | F3 | 20, 21 | accepted 2026-11-05 (handler 51) |
| 23 | [Chapter sections for A3 and A5](23-batch2-chapter.md) | F4 | 21, 22 | accepted 2026-11-05 (handler 51) |
| — | F5 posters; F6 acceptance | F5–F6 | 23 | accepted 2026-11-05 (handler 51, [record](../../reviews/feature-streams/geometry/f6-convexity-batch2-acceptance.md)) |

## Batch 3 (A6)

Planned 2026-11-05 (geometry handler 52). Kernel [11](11-hull-separation.md) was accepted 2026-10-31. Curves D2 waits on tasks 24 and 25: [ADR 0028](../../adr/0028-advanced-bezier-objectives-and-owners.md) has clipping reuse this model and graph.

- **Graph base:** a `PointSetGraph` subclass, not a curve graph (reasons in [25](25-curve-pair-graph.md)). Both curves have the same degree, 2 or 3.
- **Drawn hulls** are exact: pieces of a grid net are dyadic, so they scale to integers for the monotone chain. No off-grid hull is built.
- **Default example kept:** the lesson explains the \(8\) pairs (crossings at shared piece endpoints), as the spec allows.
- **Caveat example:** a near-miss pair found by search and certified exactly (task [24](24-curve-pair-model.md)). A visible gap cannot survive to depth 4, because a piece's hull is too thin there.

| # | Task | Kind | Depends on | Status |
| --- | --- | --- | --- | --- |
| 24 | [Curve pair subdivision model](24-curve-pair-model.md) | F1 | 11 | built, mathematical review pending |
| 25 | [Pair-of-curves graph](25-curve-pair-graph.md) | F2a | 24 | planned |
| 26 | [Readout, Presets and the depth 4 measurement](26-curve-pair-readout.md) | F2a | 25 | planned |
| 27 | [Batch 3 registration](27-batch3-registration.md): `bezier-hulls` | F2b | 26 | planned |
| 28 | [Lesson A6 scene, wiring and chapter section](28-lesson-bezier-hulls.md) | F3, F4 | 27 | planned |
| 29 | [Lesson A6 tests and gates](29-lesson-bezier-hulls-tests.md) | F3 | 28 | planned |
| — | F5 poster; F6 acceptance | F5–F6 | 29 | planned |

## Earlier notes on Batch 3
- **Batch 3 (A6):** kernel [11 conservative hull separation](11-hull-separation.md) (F1, accepted 2026-10-31 after math review; [ADR 0036](../../adr/0036-conservative-hull-separation-for-off-grid-bezier-pieces.md); not gated, written early because the Curves D2 graph needs it); the pair-of-curves view (measure at depth 4); F2b, F3, F4, F5, F6.
