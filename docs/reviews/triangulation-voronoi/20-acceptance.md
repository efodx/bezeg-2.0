# T3 task 20 acceptance: four-point and collinear modes and `DegenerateSitesGraph`

Accepted 2026-11-03 by geometry handler 36. Task: [20](../../tasks/triangulation-voronoi/20-degenerate-sites-graph.md) (B5). Briefs: [20](20-brief.md), [20b](20b-brief.md) (continuation after the first worker's budget handoff), [review](20-review-brief.md). Commit on master: `59359d7f`, one squashed commit of the worker's WIP, its completion and the review fixes (originally `97095256`, `37d24486`, `6edde41b`; the worker's committed check logs were dropped).

## Decisions (handler 36)

- Point limit (the task's open point): up to 40 sites in `sites` mode, exactly four in `four-point` mode. The five-collinear Preset uses `sites` mode.
- Presets without `mode` load in `sites` mode. A four-point Preset with a site count other than 4 also loads in `sites` mode. An unknown `mode` is refused with a localized, actionable error.
- Terminology: the spec's term table gives *dovoljen/nedovoljen rob* for legal/illegal edge, and the catalog and lessons use it 23 times. The UI review asked to align with *legalna/nelegalna*. I aligned the other way: the two outlier Delaunay prompts (`prompt_compgeo_delaunay_illegal`, `prompt_compgeo_delaunay_cocircular`) now say *nedovoljeno/dovoljeni*.

## B5 coordinates (confirmed for lesson 23)

The worker derived these coordinates. The mathematics reviewer and the handler each recomputed them independently with exact integers. The incircle determinant puts the first three sites in counter-clockwise order, then tests them against the fourth.

| Example | Sites | Determinant |
| --- | --- | --- |
| Unit square | \((0,0),(1,0),(1,1),(0,1)\) | \(0\): one degree-4 vertex, both diagonals legal |
| One grid step off | corner \((1,1)\to(1,2)\) | \(2\): two degree-3 vertices; P2–P4 legal, P1–P3 illegal |
| Trapezoid | \((0,0),(8,0),(9,5),(-1,5)\) | \(0\) |
| Near-circle | \((5,0),(3,4),(-4,3),(1,-5)\) | \(-30\): P4 outside, since \(r^2=26\) against \(25\) |
| Onto the circle | P4 \(\to(0,-5)\) | \(0\) |
| Collinear (`sites` mode) | \((-4,-2),(-2,-1),(0,0),(2,1),(4,2)\) | four parallel bisectors, no vertices, no triangles |

## Reviews (Sonnet `bezeg-reviewer`)

- **Mathematics:** accept. The sign convention, the legal-diagonal rule (`incircle <= 0`), the exact degrees and the 1-based display are all correct. Nit: when the first three sites are collinear, the readout shows only `deg_no_circle`. That is correct, so no change.
- **Engineering:** accept with fixes.
  1. The key `deg_readout_label` was unused. Fixed: it now labels the readout group.
  2. `addPointAt` mutated a shared `limits` object. Fixed: a `pointLimit` getter now reads the live mode.
  3. Nit: the import fallback is now documented in a comment.
- **UI and accessibility:** accept with fixes.
  1. Terminology. Settled as above.
  2. The readout group had no accessible name. Fixed.
  3. The live region re-announced the full determinant sentence on every move. Fixed: it now announces the sign word, the verdict and the degrees, so it changes only when they change.
  4. Nit: the keyboard test called the method directly. Fixed: it now sends a real `keyDown`.
  5. Nit: shared inspector classes need a check at 200 % text size. Deferred to task 21's smoke, the first point where the graph has a route.

The worker observed each fix's assertion fail under a deliberate mutation: no group label, the full determinant text in the live region, a zero `ArrowUp` step, and a fixed site limit. The earlier mutations were a clockwise determinant, an unmerged degree-4 vertex, a removed collinear message, an accepted unknown mode and a duplicate that was not refused.

## Checks

- Workers: tsc and eslint (catalogs included) clean; `just unit src/graphs/compgeo src/localization` 675 passed, 3 skipped; build passed.
- Handler 36, on the squashed commit rebased onto `9e3d354f` (`bf44a1ed`): tsc and eslint on touched files clean; `just unit src/graphs/compgeo src/localization src/demonstrations.test.ts` passed; `just build` passed. Rebased again onto `cfaa45a3` (`59359d7f`): tsc clean, `just unit src/graphs/compgeo src/localization` passed. Logs: `20h-*.log`.
- No browser smoke: there is no route until task 21, whose smoke covers B5. Known gaps for that smoke: real focus order, keyboard reach of the on-circle position in a browser, and 200 % text size.
