# Open item: does Preset application append curves on curve routes?

Result: no defect. The s7-3 note ("appends") does not hold for any real persisted entry. No production code changed.

## Evidence

- Real entries (Preset select, reload after file import, mount with a stored selection) go through `reloadSelectedScene`
  -> `replaceScene({dispose: this.disposesBeforeNonFigureImport() ...})` (BaseGraph.tsx ~890; `BaseCurveGraph.tsx:323` returns
  true). `disposeFigureScene` (BaseCurveGraph.tsx:327) disposes the curves and empties `jxgCurves`, then `importPreset` runs.
- `BaseCurveGraph.importPresetData` (BaseCurveGraph.tsx:472) only pushes; its comment says disposal belongs to the scene
  replacement. So a bare `graph.importPreset(...)` call on a live scene, as a unit test does, appends (2 live + 1 = 3). That
  is the likely source of the note: it called `importPreset` directly, which is the data step, not an entry.
- New test `src/graphs/curves/PersistedCurveReplacement.test.tsx` (real graphs: bezier, rational, ph-cubic, spline-c1,
  spline-g1): live scene with 2 curves; select a stored 1-curve Preset and reload after import -> exactly 1 curve, export
  equals the stored data. A fifth case per graph pins the bare `importPreset` append as documented behaviour.
- Observed: first run 10/10 passed without any fix (no pre-fix failure exists).

Figure entry (`applyFigurePreset`) not tested here; it disposes via `disposeFigureScene` before import (BaseGraph.tsx ~643).
