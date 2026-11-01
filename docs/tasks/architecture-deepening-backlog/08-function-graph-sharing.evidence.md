# 8. Function graph shared drawing and analysis: evidence

Source task: [08-function-graph-sharing.md](08-function-graph-sharing.md). Recorded 2026-11-01 (platform stream, handlers 7 and 8) against base `51e2e54b`. Inventory: [a8-inventory.md](../../reviews/feature-streams/platform/a8-inventory.md).

## What changed

| Slice | Commit | Change |
|---|---|---|
| S1 | `47434ed2` | `accumulationFill`, `sampleJumpPieces` (with `jumpLeftLimit`) and grid snapping (`gridUnits`) move to `src/analysis` with direct tests. Five identical local clean helpers use `cleanNumber`. `complex.ts` keeps its own 1/20 grid, which is not bit-identical. |
| S2 | `a5910b23`, `d1162c43` | `BaseFunctionGraph` exports `BoundingBox` (15 local copies removed, including `LinearMapGraph`) and holds the only `FillCurve` declaration (4 copies removed). Six graphs use `displayThinWidth`. New base helpers: `signedFill` (Accumulation, AreaBetweenCurves, DefiniteIntegral) and `modelCache` (Accumulation, ArcLength, AreaBetweenCurves, DefiniteIntegral, Bisection), which the base clears on unmount, on generated-object removal and on scene disposal. The stale asynchronous-`setState` comment now matches AGENTS.md. A new AreaBetweenCurves test checks that a view change at an unchanged model reclamps the cached fill. |
| S3 | — | No change. `alphaParameterization` is pure, exported, used once and tested directly (inventory §7). |

Drawing comparisons are unchanged. Test-consolidation task 5 had already repaired the excluded comparisons (`1653fbb`), so the cache changes run under the unfiltered transient-state comparisons (inventory §6).

Behavior change: Bisection's model-keyed history cache is now cleared on scene removal; before, it was never cleared. It is recomputed on the next draw, so there is no user-visible impact. Routes and stored Presets are unchanged.

## Measurement

`scripts/function-slider-perf.cjs`, production builds of `51e2e54b` (before) and `d1162c43`/`648d676f` (after, same `src`). Results are in [the performance results](../../bezier-performance-results.md#curve-gestures-and-function-slider-drags--2026-11-01).

The first after run showed a p95 one to four frames worse on area-between and accumulation at 390×844 with 4× CPU. Handler 8 settled this:

- **Code:** at `51e2e54b` both graphs already cleared their caches in `onSceneRemoved`, which `removeGeneratedObjects` calls. The per-frame fill callbacks do the same work in both builds, and `displayThinWidth` returns the same closure the graphs used to inline.
- **Interleaved runs:** both builds were served at once and alternated, in 3 rounds × 2 runs. The p95 medians match: accumulation 108.4 → 108.4 ms, area-between 83.3 → 83.4 ms, with fully overlapping ranges. The first difference came from machine load during the uninterleaved runs. Raw data: [perf-interleaved-functions.txt](../../reviews/feature-streams/platform/perf/perf-interleaved-functions.txt).

## Verification

- Unit: `just unit src/graphs/functions src/graphs/complex src/analysis src/graphs/base` (S2 worker); `src/graphs/linear` and `BaseFunctionGraph.test.ts` (handler, after `d1162c43`).
- `just typecheck`, `just lint`, `just build` on `d1162c43`; full `just check` passed (typecheck, lint, 7348 unit tests in 407 files with 1 skipped, build) on `648d676f` plus the lint fix `b129305b`.
- Browser smoke on the `648d676f` production build (0 page or console errors). The Haiku smoke worker checked: dragging the bound point changes the fill on integral, area-between, accumulation and Darboux; bisection's next step changes the board three times; after switching accumulation to English, it still renders and a drag still changes the fill. The handler checked Reset and preset restore on integral and accumulation. Reset returns the point to its start and restores the fill data. A preset saved after a drag, then restored after switching to the default, reproduces the saved point and fill data; the default reproduces the starting fill. These fills were compared in user coordinates, since opening the preset panel resizes the board.

Review: Sonnet engineering reviews of `47434ed2` and `a5910b23` found no blocking issue. Their four low findings were fixed in `a5910b23` and `d1162c43`.
