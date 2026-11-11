# Preset round-trip contract (worker note)

Test: `src/graphs/PresetRoundTrip.contract.test.tsx`, 121 cases, about 57 s. Every graph of `allGraphFactories` (legacy table plus registered loaders) plus three graphs no route or loader mounts (ComplexPower, EulerCircle, Solids). Per graph: mount, `exportPreset()`, its own collection accepts graphState and data, then through the real path (`saveCurrentPreset`, `selectPreset`, `reset`) a full entry and an entry without graphState both give `exportPresetData()` equal to the exported data.
Data: the mount default, except patch-coons, complex-power, euler-circle and solids, which are moved off the default first (`changes` table). The test asserts the moved data differs from `defaultPreset()`.
Curve graphs: plain `importPreset` appends curves to the mount scene, so the test uses selection (which replaces the scene), not a second import.

Failed before any fix (own collection refused the exported Preset):
- ComplexPowerGraph: "Stanje grafa potenciranja ni veljavno." (graphState held A, B, n)
- EulerCircleGraph: "Stanje grafa Eulerjeve krožnice ni veljavno."
All other graphs passed, including EulerLine, InscribedAngle, NotablePoints, Coons (patch-coons, changed linkedCorners) and Solids (changed offset).

Fix (levelsets pattern): `exportPreset()` stores `graphState: {initialized: true}`; `figurePresetGraphState()` overlays the state fields from `this.state`, written by the data import. `ComplexPowerGraph.tsx` and `EulerCircleGraph.tsx`, next to `exportPresetData`. Collections and `src/graphs/base` untouched.

Routes and user impact: neither graph is mounted by any route, loader or lesson (only `ExportPausesPlayback.test.tsx`), so no user holds a refused Preset. Once mounted, Presets saved before this fix stay refused.

Not covered: the figure-scene merge (`figurePresetGraphState`) is not asserted generically (a second data import appends curves in curve graphs); it is only exercised by the new overrides' selection path. No browser smoke.
