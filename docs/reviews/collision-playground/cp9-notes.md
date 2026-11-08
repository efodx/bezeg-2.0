# CP9 notes: polygon mode, overlay and convexity chapter block

Task: [09-polygon-mode](../../tasks/collision-playground/09-polygon-mode.md). Spec: [collision playground](../../specs/collision-playground.md).

## Decisions

- **Placement.** Convexity chapter, section `convex-hull`, after the guided example: one invitation paragraph, the block `{kind: 'playground', playground: 'collisions', mode: 'polygons'}`, then a three-paragraph passage. Reason: the section teaches the hull, and the example ends the reading, so the playground applies it. `bezier-hulls` gets one linked sentence before its example; `hull-robustness` gets none. `convexityChapter.test.ts` allows `convex-hull` not to end with its example (as `sweepChapter.test.ts` does for `interval-sweep`) and checks the block position, the single playground and the link.
- **Limits.** Polygon naive 4 500, sweep 5 000. Throttled profile (4x, 390x844, main thread): naive 275 ms at n = 5 000 (quadratic fit crosses 250 ms near 4 960), sweep 3.7 ms at 5 000. `MAX_COUNT[shape][method]`, `clampCount(count, method, shape)`. Table: [performance results](../../bezier-performance-results.md#collision-playground-polygon-step-cost--2026-11-08); raw data `cp9-bench.json`, `cp9-bench.log`.
- **Protocol.** `init.shape`; overlay gains `hulls` and `pieces`; snapshot carries `shape`, per-body `templates` (transferred) and `scale`. Outlines are drawn on the main thread from `polygonTemplates`.
- **UI.** Radio group (Prikazana faza): boxes dashed, hulls dotted, pieces solid; five new readouts; touching bodies keep the ring.
- **Terms.** test ločilne osi and razdelitev na konveksne dele are used in the new passage with English glosses on first mention; marked used in the spec's Terms table.
- **Not done.** The optional harness query option `shape=polygon`. The worker wrongly reported that no harness page exists; `CollisionHarness.tsx` is routed at `/bezeg-2.0/harness/collision-playground` (handler correction). It is left for CP10, which measures on the chapter page.

## Tests

- `collisionLoop.test.ts` (+5), `CollisionPlayground.test.tsx` (polygon mode, including drawing). The drawing test records vertices: for template 2 in the hull stage it asserts the outline has `hull.size` vertices at the scaled coordinates, and the body outline has all template vertices. Observed failure: with the hull loop size forced to 0 the test fails with `expected [] to have a length of 1 but got +0`; the code was restored afterwards.
- `lessonMathNotation.test.ts` passes unchanged with the new prose.

## For review

- Browser check through `bezeg-smoke` (both languages, `/bezeg-2.0/learn/convexity-hulls` and `/bezeg-2.0/learn/sweep-algorithms`) is not yet done.
- Accessibility review: radio group keyboard operation and 44 px coarse targets are covered by unit tests only.
