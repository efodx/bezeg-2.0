# W2-C3 handoff (partial, budget stop)

Typecheck (`just typecheck`, log `.command-logs/w2-c3-typecheck.log`): production files of the done set compile; the only error seen in my paths is `formatReadouts.test.tsx(28)` (needs the new `exampleId` prop). Tests were not run. No lint run yet. Nothing committed.

## Done (not yet test-verified)

New files in `src/graphs/compgeo/`:
- `ExampleSelect.tsx`: `ExampleSelect` (ChoiceSelect plus disabled "Custom" entry while the scene is not an example, key `notable_example_custom`) and `matchingExample(model, examples)` (same grid, same points).
- `useStatusReadout.ts`: hook returning a `SettledReadout` fed by `replace(text)`; callers render `<LiveReadout readout muted={playing} dataAttribute="<graph>-live"/>`.
- `stepCounter.ts`: `stepCounterText(t, step0, length)` = `hulltrace_step_counter`, 1-based (C27).
- `frameFit.ts`: `boardFrameOf(box, exponent)`, `fitFrame(frame, w, h)` (pure; needs its test).
- Scratch script `.command-logs/w2-c3-edit1.py` (already run; delete).

Migrated (controls and graph): Fortune (live, example select, Reset view removed, `fitView` override returns run box, exampleId, comment), Delaunay (live, example select with ids quad/seven/square, `EXAMPLE_INDEX`), EarClipping, MonotonePartition, MonotoneTriangulation (live, example select, 1-based counter). Comments for Fortune, Delaunay, EarClipping, MonotonePartition, MonotoneTriangulation updated to `TracePlayback`.

## Remaining

1. Same live/readout move: BentleyOttmannControls (live at line ~140, `stepCounterText`), IntervalSweepControls, BezierHullsControls, BezierClippingControls (also raw tolerance `<select>` to `ChoiceSelect`, remove from `controlExemptions`), VoronoiControls. HullRobustnessControls: check only (already ChoiceSelect).
2. Voronoi: remove `resetView` (action, button, `vor_view_reset`) and add `fitView` override using `fitFrame(this.viewBox(), w, h)`; query form to `PointListInput` single-point (no add/remove; values are exact rationals in quarters, grid units, so check `PointListInput` grid/snap fit; if not, propose a prop); drop the query-refused limit notice (decision 7); construction Next/Back/Reset onto `TracePlayback` (wire like DelaunayGraph: constructor host, `setState` settle, mount/unmount, `isPlaying`) with `PlaybackButtons` plus Back as child; examples (`DegenerateModes`) to `ExampleSelect`; mode buttons to `ChoiceSelect` (decision 9); "Reset example" stays. Remove `VoronoiControls.tsx` from `controlExemptions` in `eslint.config.mjs` (and `BezierClippingControls.tsx`).
3. Delete now-unused keys in `sl.ts`/`en.ts` in lockstep: `fortune_view_reset`, `vor_view_reset`, probably `fortune_step_counter`, `intervalsweep_step_counter`, `bentleyottmann_step_counter`, `monotonepartition_step_counter` once all callers use `stepCounterText`.
4. Tests to update: `FortuneGraph.host.test.tsx` (reset-view test at ~284 becomes a host Fit test via `graph['fitToVisiblePoints']()`; example buttons `[data-example]` become the select, find by label, `fireEvent.change`; live marker now `data-fortune-live` on LiveReadout), `DelaunayGraph.host.test.tsx` (17 hits), `VoronoiGraph.host.test.tsx`, `DegenerateSitesGraph.host.test.tsx`, `MonotoneTriangulationGraph.host.test.tsx`, `formatReadouts.test.tsx` (add `exampleId`), compgeoVoronoiLesson.test.ts, `BezierClippingControls.host.test.tsx`, `BezierHullsControls.host.test.tsx`; also grep `scripts/fortune-browser-perf.cjs` for `data-example`/`reset-view`. Monotone step text is now 1-based ("Korak 1 od N"). Add pure tests for `matchingExample`, `fitFrame`, `boardFrameOf`, plus one real-graph Fit case each for Fortune and Voronoi; one wiring check per migrated graph; delete duplicate control-mechanics cases.
5. Run `just lint` on my files, `just unit` on compgeo tests and sweep/Voronoi lesson tests; report observed pre-change failures and test-time delta (not measured).

## Proposed exceptions / open points

- Triangle rows (Delaunay, Voronoi) and Voronoi site rows (cell choice) stay `aria-pressed` groups: they select derived items or a construction site, not coordinate rows, so `PointListInput`'s selectable row does not fit. Handler to decide.
- Choosing an already shown example again does nothing (select semantics); the Voronoi "Reset example" button covers that case there.
