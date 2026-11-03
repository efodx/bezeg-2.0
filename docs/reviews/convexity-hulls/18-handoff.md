# Task 18 handoff (partial), worker, 2026-11-03

## State
Implementation written; host test file written but NEVER RUN. Nothing committed.

## Files (all new unless noted)
- `src/graphs/compgeo/PointInPolygonGraph.tsx`: graph (query point q in scene state `query`, overlays `ray`/`winding`/`values`, `loadFigure("notched"|"pentagram")`, arrow-key listener `onQueryKey` registered on the session, q point removed in `disposeFigureScene`/`unmount`, readout `data-pip-*`).
- `src/graphs/compgeo/pointInPolygonReadout.ts` + `.test.ts`: pure adapters `pointInPolygonReadout`, `rayMarkers`. 11 unit tests PASSED (`just unit src/graphs/compgeo/pointInPolygonReadout.test.ts`).
- `src/graphs/compgeo/pointInPolygonPresetCollection.ts`: key `compgeo-point-in-polygon`, overlay ids `grid, ray, winding, values`, graphState `query` checked by `isGridPoint`. NOT registered in `compgeoPresetCollections.ts` (task 20 does).
- `src/graphs/compgeo/PointInPolygonGraph.host.test.tsx`: 15 host tests, unrun.
- `src/localization/sl.ts`, `en.ts` (modified): 26 keys `pointinpolygon_*` inserted after `pointset_area_markers_skipped`, same position in both. Term "poltrak" (ray) is already used in `compgeoGuidedLessons.ts`; others from spec table.
- `docs/reviews/convexity-hulls/18-tsc.log`: tsc clean (0 errors) BEFORE the host test and the label-stacking edit in `drawRay`.

## No base change
`PointSetGraph.tsx` untouched. Used `overlayInputs()` (query identity), overrode `syncScene`, `select`, `createMainView`, `figurePresetGraphState`, transient capture/restore.

## Verdict hiding
Overlay `values` off replaces the readout content with one neutral sentence (`pointinpolygon_values_hidden`); the readout div stays mounted with empty `data-pip-*`. Board overlays are independent.

## Remaining
1. `just unit src/graphs/compgeo/PointInPolygonGraph.host.test.tsx` and fix failures. Likely trouble spots: `reset()` restoring q (3,1); `rendNode` in the board shims for the aria-label test; `ray-line` creation in shims; unmount test (objectsList emptied?); drag via `moveTo` + `triggerEventHandlers(['drag'])`; `board.unitY` in the shims.
2. `just unit src/graphs/compgeo src/compgeo --maxWorkers=2`, `just lint src/graphs/compgeo src/compgeo`, `npx tsc --noEmit --pretty false`, `just build`; logs to `18-*.log`.
3. Two mutations with failing test names, reverted (suggested: half-open rule inverted via `rayMarkers` touch dedupe, and `setQuery` moving q on `loadModel`/keys leaking to q while a vertex is selected).
4. Check readout/board after a scene change and language switch (covered by one test, unrun).

## Reported gaps / spec notes
- Overlay ids `ray` and `winding` are not in `POINT_SET_OVERLAY_NAMES` (`src/compgeo/pointSetModel.ts:28`), so the lesson `set-overlay` action cannot reach them; `values` is. Also `set-query-point` is documented "VoronoiGraph only" (`src/learning/model.ts:287`). Task 21 needs both extended.
- "The polygon-area graph's self-intersecting label" interpreted as a readout line (`pointinpolygon_not_simple`), since the area graph's own text talks about area and Pick.
- "Scene option selects the pentagram" implemented as `loadFigure("pentagram")` plus an Examples button, not a stored state field.
