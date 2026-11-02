# 07 F2a worker 1 handoff (partial)

## Files done (all new unless noted; nothing committed)
- src/compgeo/simsonLineModel.ts and simsonLineModel.test.ts (model tests 1-8 of the brief; passed under `just unit`).
- src/graphs/compgeo/simsonLinePresetCollection.ts and .test.ts (passed, with src/localization).
- src/graphs/compgeo/simsonLineText.ts, SimsonLinePanel.tsx, SimsonLineGraph.tsx.
- src/graphs/compgeo/SimsonLineGraph.host.test.tsx (all host tests passed on the last run, 24 s).
- src/localization/sl.ts and en.ts (edited): block of `simson_*` keys after `euler_invalid_example`, plus an extra key `simson_point_row_approx`.

## Last check results
- `npx tsc --noEmit --pretty false`: clean (after renaming dragPoint to dragMoving).
- `just unit` on the model, preset collection, localization and host tests: passed.
- Drag timings (jsdom, 120 runs, all overlays on) in `C:\Users\NonFriedMotherBoard\.claude\jobs\8a3ec379\tmp\drag.json`: objects 75 (glider), 79 (exact), 75 (vertex); step p50/p95 ms: 36/53, 38/51, 31/55; board.update p50/p95 under 2 ms.

## Remaining against the brief
1. Write docs/reviews/triangle-geometry/07-drag-measurement.md from drag.json (format of 04b-drag-measurement.md; run with SIMSON_DRAG_OUT).
2. Mutation evidence per test group (model groups 1-8, preset tests, host tests): none run yet.
3. `just lint` on the new files, `just build`: not run.
4. Final report.

## Traps and decisions
- The example id counts as active only while vertices, mode and (exact mode) P' equal the example. The default id stays stored after a P' edit in exact mode, so the select shows "custom".
- Glider t is stored normalised; setT ignores non-finite values. Collection accepts any finite t.
- Heredocs failed once on the panel file (quote handling); use the Write tool.
- Locale files edited with Python; verify no CRLF damage (git diff showed insertions only).
- Not smoke-tested in a browser; jsdom only.
