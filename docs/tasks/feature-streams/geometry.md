# Stream: Geometry
Run state: active

Rules and slice template: [feature streams](README.md). Port 4313. Handoffs: `docs/reviews/feature-streams/geometry/`. Each family creates `docs/tasks/<family>/` in F0 and records slice status there. This file holds one status line per family.

| # | Family | Spec | Prerequisites | Status |
| --- | --- | --- | --- | --- |
| 1 | Convexity and hulls | [convexity-hulls-lessons.md](../../specs/convexity-hulls-lessons.md) | Batch 0 kernel: none. Point-set graph code: none; registration and lessons: `G-REG` | Batch 0 accepted 2026-10-31 (`G-CG` open); Batch 1 F2a complete: 07–10 accepted 2026-10-31; F2b and later wait for `G-REG` ([tasks](../convexity-hulls/README.md)) |
| 2 | Triangulations and Voronoi | [triangulation-voronoi-lessons.md](../../specs/triangulation-voronoi-lessons.md) | Convexity Batch 0 (its T0 kernel adds `incircle` to the predicate module) | F0 done 2026-10-31; T0: 02 `incircle` accepted, 03 structure and T1 kernel 06 ear clipping implemented, math reviews pending ([tasks](../triangulation-voronoi/README.md)) |
| 3 | Sweep-line algorithms | [sweep-algorithms-lessons.md](../../specs/sweep-algorithms-lessons.md) | Convexity Batch 0 (rational ADR builds on the robustness ADR); Fortune's sweep needs family 2's Voronoi drawing | F0 done 2026-10-31 (ADR 0035); S0 kernel tasks 02–03 planned, 02 waits for `rational.ts` (triangle geometry 01, maps) ([tasks](../sweep-algorithms/README.md)) |

## Notes

- **Convexity Batch 0 opens `G-CG`** for the Maps and Curves streams. Do it first and push it as soon as it is accepted. Its robustness ADR is a real decision with alternatives listed in the spec; the handler decides and records it.
- The point-set/polygon graph is shared by all three families and by triangle geometry. Its interface has one owner, this stream. Other streams request changes through this file.
- **Request from Curves (2026-10-31, advanced Bézier D2):** A6's separating-axis hull-disjointness test must accept real (off-grid) control points, because de Casteljau pieces leave the grid. D2's "overlapping" status and its no-intersection pair use this test, and the D2 graph waits for it. AB-1d itself needs no predicate: see the [AB-1d plan](../advanced-bezier/README.md#ab-1d-plan-bezier-clippingts-handler-9-2026-10-31). Please record the chosen robustness rule (for example, a keep-biased overlap margin) in A6.
- Mathematical review applies to every predicate, structure and trace. Discrete outcomes must never silently rely on tolerances ([shared constraints](../../specs/new-lesson-families.md#shared-constraints)).
- Before `G-REG`: F0 and kernel slices for families 2 and 3 (T0 and S0) may run once convexity Batch 0 is accepted.
- Sweep animations and Voronoi drawing are rendering-heavy. Measure them before choosing a drawing approach.

## Gate provided

| Gate | Status |
| --- | --- |
| `G-CG` (convexity Batch 0) | open (2026-10-31, `just check` green at aabaf9f) |
