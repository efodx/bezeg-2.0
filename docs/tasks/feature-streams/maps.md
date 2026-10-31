# Stream: Maps
Run state: waiting on G-REG, G-CG

Rules and slice template: [feature streams](README.md). Port 4316. Handoffs: `docs/reviews/feature-streams/maps/`. Each family creates `docs/tasks/<family>/` in F0 and records slice status there. This file holds one status line per family.

| # | Family | Spec | Prerequisites | Status |
| --- | --- | --- | --- | --- |
| 1 | Linear maps of the plane | [linear-maps-lessons.md](../../specs/linear-maps-lessons.md) | 2×2 kernel and its ADRs: none. Graph code: none; registration and lessons: `G-REG` | F0 done ([tasks](../linear-maps/README.md), ADR 0025); 01–04 done (ADR 0032: grid image as one NaN-break polyline); 05 (graph) done; 06 waits for `G-REG` |
| 2 | Complex maps | [complex-maps-lessons.md](../../specs/complex-maps-lessons.md) | Möbius kernel with circle inversion: none. Graph code: none; registration and lessons: `G-REG`. Image-drawing ADR by measurement | F0 done ([tasks](../complex-maps/README.md), ADR 0029); 01, 02, 05 done; 03 done (reciprocal and roots graphs); 04 waits for `G-REG` |
| 3 | Triangle geometry and inversion | [triangle-geometry-lessons.md](../../specs/triangle-geometry-lessons.md) | `G-CG` for the kernel (exact rational type and robustness ADR) and the point-set graph. The inversion lesson (T5) needs family 2's circle inversion | F0 done ([tasks](../triangle-geometry/README.md), ADR 0030); kernel waits for `G-CG` |

## Notes

- Before `G-REG`: F0 for all three families, and the kernels of families 1 and 2.
- Triangle geometry owns the circumcentre and circle kernel. The Geometry stream's triangulation family may reuse it. If triangulation needs it first, coordinate through both stream files rather than building it twice.
- ADR 0030 fixes the shared `BigInt` `Rational` type in `src/compgeo/rational.ts` (triangle task 01), which ADR 0021 had left to the sweep family. Geometry-stream families import it rather than writing their own.
- Grid images and complex-map image drawing are rendering-heavy. Measure them before choosing a drawing approach.
