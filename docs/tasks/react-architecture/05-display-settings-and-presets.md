# 5. Per-board display settings and in-place presets

Spec: [React architecture refactor](../../specs/react-architecture-refactor.md), findings 1, 2. Depends on [task 3](03-scene-store-graph-host.md).

## Goal

Remove module-level mutable settings and remount-based state transitions.

## Scope

- **Display settings.** Replace `SizeContext`, `AxisContext`, `VisibilityContext` with a `DisplaySettings` value owned by each graph (store state or a sub-store on `GraphSession`). Styles (`AxisStyles`, `PointStyles`, `CurveStyles`, `SegmentStyles`, adapters) read it through the board's session (`graphSessionForBoard`) or an injected accessor, never module state. Changing a setting updates the store and triggers the required board update. Defaults equal today's defaults.
- **Presets in place.** The graph controller owns the selected preset id. `PresetSelector` calls controller methods: `selectPreset(id)`, `reset()` (reload the selected preset or the default without remounting), and `reloadAfterImport()`. Remove `SiteContext.preset`, the `key={selectedPreset}` on `App`, `Refresher` and `RefreshContext`. `DemonstrationWorkspace` topic `<details>` stop using `pathname` in their key; control `open` explicitly.
- Record the user-visible changes in the spec's decision section (already listed) and in `docs/ui-functionality.md`.

## Acceptance

1. `src/graphs/context/{Size,Axis,Visibility}Context.ts`, `RefreshContext.ts` and `Refresher` are deleted; no `key` prop is used to reset app or graph state.
2. Two graphs constructed in one test have independent display settings.
3. Selecting, saving, deleting, resetting and importing presets work without unmounting the graph (test: the controller instance and board survive `reset()`).
4. `tsc`, build, Jest, `npm run test:smoke` and a smoke check of display controls, presets and route navigation pass.
