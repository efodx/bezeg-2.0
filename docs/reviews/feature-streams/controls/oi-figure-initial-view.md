# Figure scene initial view for a view-less Preset

- Hook: `BaseGraph.fitPresetView(data)` (no-op default), called by `importPreset` after the data import and by the
  figure `finish` (view set in `importData`, before `initialize`) when the Preset has no `boardState`.
- Moved onto it (was `importPreset` override doing `if (!preset.boardState && preset.data) fit()`): HermiteGraph,
  InterpolationGraph, BSplineBasisGraph, SubdivisionCurveGraph, ParametricCurveGraph (all under src/graphs/curves).
- Entry scene (`restoreEntryState`): keeps the board's current view (a live capture; checkpoints carry boardState).
- Not moved: AccumulationGraph, DefiniteIntegralGraph, BaseFunctionGraph importPreset overrides. They reset the view
  only when the function/example changed versus the previous model, which has no meaning in a figure batch; figures
  use `showInitialView()` (BaseFunctionGraph overrides it with the example box).
- Test: sceneReplacementContract.test.tsx "figure path view for a Preset without boardState" (hermite, bezier).
  Final run after moving the view into importData (not finish): tsc 0; GraphTransientState.part1 + sceneReplacementContract + curves, functions, export unit dirs pass (fv-ts2, fv-fam). Full check-changed (fv-check.log) before that move: only the Bernstein reset test failed, which the move fixed.
  Before: failed (2). After: passed. Logs: .command-logs/fig-view-before.log, fig-view-after.log, fv-tsc.log, fv-check.log.

## Handler amendment

The figure path (`applyFigurePreset`) also serves Reset and Preset selection (`reloadSelectedScene`), which start from the initial view (BaseGraph ~399) and never fitted. Calling `fitPresetView` there would make Reset and Preset selection fit Hermite, Interpolation, B-spline basis, Subdivision and Parametric to their points, a visible change outside this item. So the figure path calls only `showInitialView()` for a view-less Preset (matching Preset selection); `fitPresetView` stays the `importPreset` (Preset file) refinement. The test compares the view-less figure with the view after Reset. Focused units passed: `.command-logs/2026-11-11T11-40-53-302Z-9024-8515ed13.log`.
