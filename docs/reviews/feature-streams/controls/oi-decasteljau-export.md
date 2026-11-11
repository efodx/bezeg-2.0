# De Casteljau export during a run (open item)

Defect found: `DecasteljauGraph` overrides `pausePlayback()` but not `beforeFigureCapture()`
(BaseGraph.tsx:706). `saveAsSVG`, `saveAsPNG2` and `exportPresetFigures` call the hook, not `pausePlayback()`,
so a running De Casteljau run is NOT paused by a single-figure export (frames keep advancing during capture;
Preset export saves `animationStatus: 'playing'`). A figure batch ends the run only later, via scene replacement.

Tests: src/graphs/curves/bezier/DecasteljauExport.test.tsx (3 tests, real graph, manual rAF frames).
- Without fix: all 3 fail (.command-logs/dc-export-2.log).
- With temporary `protected override beforeFigureCapture(): void { this.pausePlayback(); }` in
  DecasteljauGraph.tsx: all 3 pass (.command-logs/dc-export-3.log). Override reverted; not applied.
Batch behaviour once fixed: paused before the first await, left paused at the drawn step (not resumed).
Fix to apply: add that override (also check DecasteljauGraph2 / RationalDecasteljauGraph, not tested here).

## Applied (worker)
Added `protected override beforeFigureCapture(): void` to DecasteljauGraph, DecasteljauGraph2, ParametricCurveGraph,
RecursionCobwebGraph, SimulationGraph (each calls `this.pausePlayback()`; none of their pausePlayback calls super) and
BaseSurfaceGraph (calls `this.pauseSweeps()` directly: its pausePlayback calls super, which calls the hook).
No RationalDecasteljauGraph exists with playback. Tests: DecasteljauExport.test.tsx (3) and
src/graphs/ExportPausesPlayback.test.tsx (6: DecasteljauGraph, DecasteljauGraph2, Parametric, Cobweb, Simulation,
TensorPatchGraph sweeps; start playback with manual rAF, call the hook, advance, assert the value is unchanged).
Without the overrides the 6 new tests fail (.command-logs/ep-nofix.log); with them they pass (ep-fix.log).
Not covered: TriangularPatchGraph sweeps (same base override, not separately tested); no real export-path test for
the non-De Casteljau graphs (hook called directly).
