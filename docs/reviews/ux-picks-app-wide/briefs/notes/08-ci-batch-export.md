# CI: batch export did not restore the view (run 45961868757)

Cause: `BaseGraph.applyFigurePreset` (src/graphs/base/BaseGraph.tsx, finish callback) restored the entry scene's data and state but not the view. The figures moved the intent; the entry restore wrote nothing, and the director (src/workspace/view/viewDirector.ts `intentChanged`, a non-navigation write unpauses and glides) refit to its marks. The raw JXG box set by the spec is adopted by ViewAdapter.boardChanged as a learner navigation, which paused the director.

Fix: the entry scene now carries the view director intent (box, keepAspectRatio) and whether the director was paused. Restore writes that intent; if the director was paused it is written as navigation (`boardView.navigating`), so the pause survives. A fitting director refits as before. Spec unchanged (exact-restore assertion kept, raw setBoundingBox kept).

Checks: before, smoke failed (box [-10.97,4.49,21.60,-6.40], objectCount 56 vs 54); after, `just smoke tests/curve-ownership.smoke.spec.cjs` passed. tsc clean, lint on BaseGraph.tsx passed. `just unit src/graphs/base`: only 4 failures, all in sharedControls.graphs.test.tsx "shared slider: accumulation" (functions-lane files, in flight; not touched here).
