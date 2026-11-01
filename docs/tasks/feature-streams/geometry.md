# Stream: Geometry
Run state: active

Rules and slice template: [feature streams](README.md). Port 4313. Handoffs: `docs/reviews/feature-streams/geometry/`. Each family creates `docs/tasks/<family>/` in F0 and records slice status there. This file holds one status line per family.

| # | Family | Spec | Prerequisites | Status |
| --- | --- | --- | --- | --- |
| 1 | Convexity and hulls | [convexity-hulls-lessons.md](../../specs/convexity-hulls-lessons.md) | Batch 0 kernel: none. Point-set graph code: none; registration and lessons: `G-REG` | Batch 0 accepted 2026-10-31 (`G-CG` open); Batch 1 F2a complete: 07–10 accepted 2026-10-31; A6 kernel 11 (ADR 0036) accepted 2026-10-31; 12 F2b registration accepted 2026-11-01 (posters deferred to F5, waiting on a Maps `linear-map` recipe); 13–14 F3 next ([tasks](../convexity-hulls/README.md)) |
| 2 | Triangulations and Voronoi | [triangulation-voronoi-lessons.md](../../specs/triangulation-voronoi-lessons.md) | Convexity Batch 0 (its T0 kernel adds `incircle` to the predicate module) | F0 done 2026-10-31; T0: 02 `incircle` accepted, 03 structure and T1 kernel 06 ear clipping accepted; 04 Delaunay accepted 2026-10-31; 05 planned 2026-11-01 (`circumcentre` landed with triangle geometry 02) ([tasks](../triangulation-voronoi/README.md)) |
| 3 | Sweep-line algorithms | [sweep-algorithms-lessons.md](../../specs/sweep-algorithms-lessons.md) | Convexity Batch 0 (rational ADR builds on the robustness ADR); Fortune's sweep needs family 2's Voronoi drawing | F0 done 2026-10-31 (ADR 0035); S0: 02 trace model and 03 exact segment primitives accepted 2026-11-01; 04 segment-set graph mode (F2a) next ([tasks](../sweep-algorithms/README.md)) |

## Notes

- **Convexity Batch 0 opens `G-CG`** for the Maps and Curves streams. Do it first and push it as soon as it is accepted. Its robustness ADR is a real decision with alternatives listed in the spec; the handler decides and records it.
- The point-set/polygon graph is shared by all three families and by triangle geometry. Its interface has one owner, this stream. Other streams request changes through this file.
- **Request from Curves (2026-10-31, advanced Bézier D2):** A6's separating-axis hull-disjointness test must accept real (off-grid) control points, because de Casteljau pieces leave the grid. D2's "overlapping" status and its no-intersection pair use this test, and the D2 graph waits for it. AB-1d itself needs no predicate: see the [AB-1d plan](../advanced-bezier/README.md#ab-1d-plan-bezier-clippingts-handler-9-2026-10-31). Please record the chosen robustness rule (for example, a keep-biased overlap margin) in A6.
  - **Answer (handler 6, 2026-10-31):** [ADR 0036](../../adr/0036-conservative-hull-separation-for-off-grid-bezier-pieces.md) amends ADR 0021 for one function, `hullsSeparated(a, b)` in `src/compgeo/hullSeparation.ts`. It takes double point lists of 1 to 8 points and returns `{separated: true, axis}` or `{separated: false}`. The candidate axes are the direction and the normal of every point pair, and a keep-biased margin of \(10^{-12}\,s\) (the AB-1d margin) is used. The rule is recorded in A6. Convexity [task 11](../convexity-hulls/11-hull-separation.md) implements it; status is on the convexity line above.
- Mathematical review applies to every predicate, structure and trace. Discrete outcomes must never silently rely on tolerances ([shared constraints](../../specs/new-lesson-families.md#shared-constraints)).
- Before `G-REG`: F0 and kernel slices for families 2 and 3 (T0 and S0) may run once convexity Batch 0 is accepted.
- **Waiting (handler 7, 2026-10-31):** every ungated slice is accepted. Triangulation 05 and sweep S0 02 are blocked on `src/compgeo/rational.ts` and the exact circumcentre/circle kernel, which the Maps stream owns ([maps notes](maps.md)); they were not on `master` at `2a77839`. Convexity F2b and later wait for `G-REG`; the A6 and D2 graphs are Batch 3 / Curves. Restart when `rational.ts` lands or `G-REG` opens. [Handoff 7](../../reviews/feature-streams/geometry/handler-handoff-7.md).
- Sweep animations and Voronoi drawing are rendering-heavy. Measure them before choosing a drawing approach.

## Gate provided

| Gate | Status |
| --- | --- |
| `G-CG` (convexity Batch 0) | open (2026-10-31, `just check` green at aabaf9f) |
