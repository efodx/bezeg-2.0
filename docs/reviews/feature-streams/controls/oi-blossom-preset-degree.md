# Blossom Preset of another degree drew no blossom (handoff-v13)

Root cause: `BaseGraph` figure path (`BaseGraph.tsx` ~1246-1265, Preset selection / Reset) imports the Preset
(`importPresetData` -> `freshChoice`, correct segment/args), then replaces the state deferred through
`figurePresetGraphState`. Its base (`BaseGraph.tsx:758-763`) is `initialFigureGraphState` = the mount-time degree-2
scene, so `segment` (2) and `args` of that scene overwrote the fresh choice. The override
(`BSplineBlossomGraph.tsx:101`, before the fix) restored only degree/knots/points. For
B = degree 3, knots [0,0,0,0,1,1,1,1], segment 2 is the empty interval [0,0): `snapshot()` undefined, NaN triangle,
no readouts. Reset did the same (it reloads the selected Preset through the same path).

Fix: `BSplineBlossomGraph.figurePresetGraphState` keeps the stored segment/args only if the Preset's stored state holds a
valid one for the imported knots (segment in `blossomSegments`, args clamped to the domain); otherwise `freshChoice`.
No change in `src/graphs/base/*`; `importPresetData` unchanged (no `rebuildOwnedScene`).

Test: `BSplineBlossomPresetSelection.test.tsx` drives `selectPreset('B')`, `selectPreset('A')`, `reset()` via
localStorage Presets. Before the fix: `AssertionError: expected undefined to be defined` (snapshot) at the first B selection.

Not verified: browser smoke (JSDOM only); other graph families may share the stale-default merge via the same base.
