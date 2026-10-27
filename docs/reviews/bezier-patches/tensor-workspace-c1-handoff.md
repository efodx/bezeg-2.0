# Slice C1 handoff (tensor workspace) - partial

Status: design finished, only localization keys written. No check was run (no tsc, tests, build).

## Files touched by this worker
- `src/localization/sl.ts`, `src/localization/en.ts`: appended 31 keys in lockstep (after `preset_bicubic_dome`). Keys: `bezier_patches`, `tensor_product_bezier_patch`, `prompt_patch_net`, `prompt_patch_degree`, `surface_view_label`, `surface_gesture_hint`, `surface_unavailable`, `patch_degree_{heading,u,v,help}`, `patch_point_heading`, `patch_parameter_{u,v}`, `patch_starting_heading`, `patch_visibility_heading`, `patch_show_{control_net,iso_curves,boundary_curves,shading}`, `patch_density_heading`, `patch_iso_density`, `patch_shading_density`, `patch_camera_heading`, `patch_view_{front,top,side,isometric,reset}`, `patch_move_height`, `patch_move_height_help`. Not yet type-checked. None use placeholders.
- Everything else listed in the brief is untouched. The earlier working-tree changes (package.json, lock, src/graphs/patches/*, the first patch localization keys) are not mine.

## Findings from reading the seams (verified in code)
- `GraphSession.isAlive` = `!disposed && board !== undefined` (GraphSession.ts:~45). A surface graph has no board, so the session needs a way to adopt a main view. Plan: `adoptMainView(dispose)` sets a flag that makes `isAlive` true and registers a cleanup. `dispose()` already runs the cleanups and tolerates failures. `observeResize` is harmless without a board.
- BaseGraph mount (BaseGraph.tsx:~675-714) calls `session.createBoard(...)` inline. Plan: extract it into `protected createMainView(session, container)` (default = current code, assigns `this.board`). BaseSurfaceGraph overrides it to create the `ThreeSurfaceView`, adopt it into the session, wire `onEdit`, and call `attach(container, {ariaLabel: t('surface_view_label')})` with a `.catch` that records a "surface unavailable" flag, shown with `surface_unavailable`.
- Board-touching sites to guard with `protected get hasBoard() { return this.board !== undefined; }` (unmount already sets `board` to undefined):
  - `reloadSelectedScene` (`this.board.setBoundingBox`)
  - `applyFigurePreset` (suspendUpdate, objectsList removal, unsuspendUpdate, `preset.boardState` setBoundingBox)
  - `boardUpdate`
  - `setElementSize`, `setAxisSelect`, `setPointLabelsVisible`
  - `navigateBoard`
  - `captureLessonState` and `isLessonState` (boardState optional when there is no board)
  - `restoreLessonState` (setBoundingBox and displayState `fullUpdate`)
  - `saveAsSVG`, `saveAsPNG2`, `exportPresetFigures` (early return)
  - `boardState()`, `exportPreset()`
- Preset import (`PresetImport.checkPreset`) validates `graphState` as flat primitives only (`checkSceneState` with no `allowed`) and `boardState` as a 4-number box. So net and camera must not be in the exported graphState. Plan for BaseSurfaceGraph:
  - override `exportPreset()` to `{id, data: exportPresetData(), graphState: {initialized: true}}` with no boardState;
  - all patch state (m, n, net, camera, u, v, show*, densities) lives in the DTO `state`, so `PatchStateDto`/`PATCH_STATE_FIELDS` need additive `isoDensity` and `shadingDensity` (8 or 16) with validation in `patchPresetCollections.ts` `checkState`;
  - `zMode` stays in the scene store and is not exported;
  - override `figurePresetGraphState` to return `{...this.state, initialized: true}`, because `applyFigurePreset` imports first and then replaces state with `initialFigureGraphState`, which would wipe the imported net.
- `sceneGraphState()` keeps returning the whole store, which lesson checkpoints need.
- Save panel: `workspaceSave` passes `batchExporter` to `PresetSelector` and renders `SaveImage`. Surface graph override: keep the PresetSelector without the batch exporter (check that the prop is optional) and omit the image-export group (C2 adds surface export). Say "hidden" in the report.
- Workspace: `DemonstrationWorkspace.tsx:~224-235` always renders the pan/zoom group and `workspace-gesture-hint` (`pan_shift_drag_zoom_shift_mouse_wheel`). `navigationActions` is already per demonstration (demonstrations.ts:6,83). Plan:
  - add a Definition flag (e.g. `view: 'surface'`) that gives `navigationActions: []`;
  - the workspace hides the navigation group when the list is empty;
  - the workspace shows `surface_gesture_hint` instead of the curve hint for surface demonstrations;
  - `demonstrations.test.ts:69` checks `navigationActions` and may need the new case.
- Catalog:
  - add family `{id: '/bezeg-2.0/patches', title: 'bezier_patches'}` (FamilyId is derived from the families array; the other ids are path-like except `basics` and `analysis`);
  - add definition `{id: 'patch-tensor', path: '/bezeg-2.0/patches/tensor', family: '/bezeg-2.0/patches', title: 'tensor_product_bezier_patch', prompts: ['prompt_patch_net', 'prompt_patch_degree'], ...}`;
  - add `'patch-tensor': () => new TensorPatchGraph()` to `graphFactories.ts` (it is `Record<DemonstrationId, ...>`);
  - add `...Object.values(patchPresetCollections)` to `presetCollections` in `PresetImport.ts:10-12`.
- Blocking catalog requirement: `src/demonstrationPreviewAssets.ts:49` is `Record<DemonstrationId, string>` and is generated ("do not edit by hand", `scripts/capture-demonstration-previews.cjs`). A `patch-tensor` entry is mandatory for `tsc`. `tests/smoke-catalog.cjs validateGeneratedPreviews` probably checks PNGs too (not inspected). Options: a temporary placeholder PNG in `src/images/demonstrations/catalog/patch-tensor.png` with a hand-added entry (to be regenerated by task 13), or widening the type. Report this to the handler. `demonstrationMotionAssets` is `Partial`, so no entry is needed.
- Transient-state contract (`graphTransientStateContract.tsx`, `realGraphScenes.ts`, `realGraphTestHarness.tsx`) is JSXGraph-centric:
  - `installBoardShims` and `mountGraph` mount via `GraphHost`;
  - `observeScene` calls `board.getBoundingBox()` and `boardSignature(board)`;
  - `changeScene` calls `internals(graph).board.setBoundingBox`, `setElementSize` and `flipSwitches`;
  - `resetDisplay` uses the board;
  - `storedPreset` asserts `preset.graphState` is defined (satisfied by `{initialized:true}`).
  Needed work:
  - generalize `observeScene`/`changeScene`/`resetDisplay` for a graph without a board: `view` = camera, `board` = signature of the scene polylines/points;
  - inject a fake `ThreeSurfaceView` so jsdom never loads WebGL. `graphFactories['patch-tensor']` builds the real view, so give `TensorPatchGraph` a constructor option (view factory) and have the harness or test setup substitute it. Real three in jsdom throws in `new WebGLRenderer`, which the `attach` catch would swallow.
  Do not add an exemption set without cause. Report it if a case cannot be made to pass.
- Camera fit: `fitCameraTo(points, aspect, from)` in surfaceMath.ts. Use aspect about 0.45 (390x844 portrait) to tune the DTO camera of both default presets (the current placeholder is `az -0.9, el 0.5, distance 9, target [0,0,0.5]`), e.g. via a one-off vitest or `npx tsx`. Reset view = default az/el + `fitCameraTo(net points, host clientWidth/clientHeight, ...)`.
- Default scene: use the bicubic dome (`defaultPatchPresets[1]`). The starting-patch group in Uredi offers both presets as buttons, calling `importPresetData(preset.data())`.

## Remaining steps
1. Catalog edits plus preview placeholder, factories, `PresetImport.ts` registry.
2. `GraphSession`: `adoptMainView` (+ `GraphSession.test.ts` cases: dispose idempotent, isAlive).
3. `BaseGraph`: `createMainView`, `hasBoard` guards. Curve behaviour must be unchanged; run the existing BaseGraph/GraphSession/GraphHost tests.
4. `src/graphs/patches/BaseSurfaceGraph.tsx` (view lifecycle: create, attach with `.catch`, onEdit, disposal through the session; override exportPreset, figurePresetGraphState, workspaceSave, workspaceDisplay) and `TensorPatchGraph.tsx`:
   - store state {m, n, net: Xyz[][], u, v, camera, show*, isoDensity, shadingDensity, zMode};
   - transient `selectedPoint` via `captureTransientState`/`restoreTransientState`; selection change calls the sync directly and `requestRender()`;
   - `onStateChange(prev)` bumps a monotonic revision only when geometry, visibility or density fields changed vs `prev` (not camera or selection), and also forces a bump when the view is new;
   - degree changes use `patch.elevate` when raising; when lowering, resample the patch at (i/m', j/n').
5. Pure builder `patchSceneBuilder.ts` (state to `SurfaceScene`): mesh `sampleMesh(shadingDensity)`; iso curves (density+1 per family) sampled from `isoCurveU/V`; 4 `boundaryCurves()`; net rows and columns; points `p-i-j`; marker P(u,v); label `S(u,v)`.
6. Uredi/Prikaz panels (Slider for u/v, `ChoiceSelect` for m/n and densities, `OnOffSwitch` toggles, `Button` camera presets and reset view, z-mode switch); `DemonstrationWorkspace` navigation and hint change.
7. Tests per the brief, each with one observed mutation failure. Then `npx tsc --noEmit --pretty false`, the transient-state contract, `just check` (logs to `.command-logs/sliceC1-*.log`), and confirm the `three` lazy chunk name and size from the build output.

## Checks run
None. Only a node script ran, to insert the localization keys; tsc has not yet validated the new keys.
