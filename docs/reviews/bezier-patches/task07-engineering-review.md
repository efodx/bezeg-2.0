# Task 07 engineering/UI/performance review (90367a9..HEAD, d7dcffd)

Read-only static review; nothing was run in a browser and no test suite was executed by the reviewer.

## Findings

### Major

1. **Imported `graphState` bypasses patch validation.** `src/graphs/base/BaseGraph.tsx:840-846` (`importPreset`, reached at mount, line 710) does `setBaseState({...preset.graphState, initialized: true})`. `BaseSurfaceGraph` overrides `exportPreset` and `figurePresetGraphState` (`BaseSurfaceGraph.tsx:171,176`) but not `importPreset`. `PresetImport.ts:28-29` only runs the flat `checkSceneState` on `graphState`, and `patchCollection.check` covers `data` only. A file for `preset-patch-tensor` with no `data` (data is optional) and `"graphState": {"m": 99, "isoDensity": 100000, "u": 7}` passes preflight. On mount the state then holds m=99 with a 4x4 net.
   - Failure: `selection()` (`TensorPatchGraph.tsx:~212`) passes its `index > m` guard, then reads `net[i][j]` -> TypeError during render (white screen) after the user picks index 5 in the Uredi select.
   - `isoDensity: 100000` builds 200k polylines in `buildTensorScene` -> tab freeze.
   - Fix: override `importPreset` in `BaseSurfaceGraph` to ignore `preset.graphState` (as `figurePresetGraphState` does), or have the patch collections reject any `graphState` other than `{initialized}`. Add a test that imports `graphState: {m: 99}`.

2. **Touch cannot zoom, and the hint says it can.** `en.ts:1199` / `sl.ts:1198` (`surface_gesture_hint`) advertise "pinch to zoom". `threeSurfaceView.ts` has no pinch handling: a second pointerdown replaces `this.drag` (`:~523`) and the first finger's moves are ignored. `navigationActions` is `[]` for surface views (`demonstrations.ts`), and there is no distance slider in the panels. Wheel and `+`/`-` are the only zoom paths. The canvas has `touch-action: none`, so a touch user can only orbit. This breaks the AGENTS.md "essential touch workflows" requirement.
   - Fix: add a two-pointer pinch to the view, or a zoom slider/buttons in Prikaz, and correct the hint until then.

### Minor

3. **View host has no role and no described keyboard help.** `threeSurfaceView.ts:274-276` sets only `tabindex=0` and `aria-label`. `surface_view_label` is a long sentence with the key help folded into the accessible name. A focusable `div` with `aria-label` and no role is often ignored or read inconsistently. Fix: `role="application"` (or `group`), a short name, and key help in `aria-describedby`. A visible focus ring does exist via `DemonstrationWorkspace.css:74`.

4. **`surfaceUnavailable` is never cleared on remount.** It is set in `BaseSurfaceGraph.tsx:~70` (attach `.catch`). `createMainView` does not reset it, and `setBaseState({initialized: true})` doesn't either. A graph instance that failed once keeps the alert after a later successful attach. A lesson checkpoint restore (`replaceState` over `getInitialState`) can also clear it while the view is broken. Fix: reset it in `createMainView`; keep it out of captured state. The `.catch` also swallows the error silently, so add `console.warn`.

5. **No WebGL context-loss handling.** `build()` registers no `webglcontextlost` or `webglcontextrestored` listener. After a GPU reset the canvas stays blank with no notice and no recovery. Fix: listen on the canvas, call `preventDefault()`, then rebuild or set `surfaceUnavailable`.

6. **`patch_move_height_help` contradicts the toggle.** `sl.ts:1223` and `en.ts:1224` say that on touch screens a drag changes only z. Actually it does so only when the Prikaz toggle (`TensorPatchPanels.tsx` z-mode switch) is on, or with Shift. A touch user without the toggle drags horizontally. The toggle also sits in Prikaz although it governs editing. Fix: reword ("turn on to drag height only") and consider placing it in Uredi.

7. **Pixel and semantic evidence in the preview capture is weak.** `assertNonUniformPixels` (`scripts/demonstration-preview-png.cjs`, 64 colours, 99.5% dominance) accepts any shaded frame. `assertOutcomeEvidence` for surfaces (`demonstration-preview-recipes.cjs`) only checks that `readouts` and `controls` are arrays. The validator trusts the manifest's own `projectedControlPoints`, so it is self-attested and only the PNG hash links it to the pixels. Fix, if desired: check the screenshot against the framing, for example require non-background pixels near the projected corner points.

### Nit

8. **`publishFraming` runs in production.** `threeSurfaceView.ts:~436` runs every render (16 projections, `JSON.stringify`, `setAttribute`) for a test-only hook that nothing in the app reads. Cost is small (well under 1 ms), but gate it on an `AttachOptions` flag, or compute only on a changed camera.
9. **Full scene rebuild per camera event.** `reconcileView` -> `buildScene` re-samples every iso, boundary and mesh vertex (about 700 evals plus flatMaps) on each orbit pointermove and on selection. Cheap for one patch of degree <= 4. It will matter for the 32-patch teapot capstone in ADR 0018. Fix: reuse the last scene's geometry arrays when `revision` is unchanged. Not measured here.
10. **Drag start re-commits the unchanged position.** `applyEdit` handles phase `start` by calling `movePoint` with the start coordinates. This replaces `net` and forces a geometry rebuild for nothing. Fix: skip `movePoint` when `xyz` equals the current point.
11. **Hard-coded colours.** `SURFACE_COLORS`, the inset's `#eef2e6/#526950/#2f3b2e/#ca5c37` (`TensorPatchGraph.tsx:~262-275`) and `SURFACE_LABEL_COLOR #2f2a22` are not DESIGN.md tokens. DESIGN.md scopes itself to shell and homepage, so this is acceptable. The control-point green `0x7d9d61` on the white clear colour is about 3:1 or less for non-text; selection is not colour-only (scale 1.35 plus a row/column highlight).
12. **`SurfaceLabelOverlay.ready()` can wait on an unresolved typeset.** The promise is `.catch`-wrapped, so failures settle, but a never-resolving `typesetMath` would hang `showStill` until `waitForOwned` times out or the session is cancelled. `image.decode()` likewise has no timeout.
13. **Multi-touch hazards.** A second pointerdown during a point drag overwrites `this.drag` without releasing the first capture.

## Checked, no finding

- `GraphSession`: `createAuxiliaryBoard` frees its board exactly once (release is idempotent and unregisters its cleanup). `adoptMainView` runs its dispose once, and runs immediately on an already-disposed session. `isAlive` stays correct; `observeResize` and `requestFullUpdate` tolerate a missing board.
- Inset lifecycle: the ResizeObserver is disconnected in the registered cleanup. `inset` is cleared on session dispose and on a ref change. A stale container after remount is re-mounted via `createMainView -> mountInset`. The `inset?.board !== board` guards are sound. `moveTo` in `syncInset` does not echo back (value equality check).
- View disposal: `ThreeSurfaceView.dispose` is idempotent; it cancels the rAF, clears all listeners, `ResizeObserver`, geometries, materials and the renderer (forceContextLoss), and restores host `tabindex` and `aria-label`. Attach-after-dispose and a failed `loadThree` are guarded. The overlay and `onLayout`/`onEdit`/language listeners are registered as session cleanups. The `this.view === view` identity guard handles a remount.
- Reset, navigation and Preset load: `restoreTransientState(undefined)` clears the selection; `viewIsNew` and `syncReplacedScene` bump `revision`; `setDegree` and `useStartingPatch` re-validate the selection; `buildTensorScene` tolerates a stale selected id.
- Export: the curve path is unchanged (`createFigureCaptureTarget` keeps the old body; `buildSvgClone` falls through to `buildSvgWithMathLabels`). `figureContainer()` is guarded by `view`, so an unattached view exports nothing. `showStill` removes the image in `finally`. A batch lock covers the host. The batch dialog is hidden for surface graphs. `capture()` renders and calls `toDataURL` in the same task, which is needed for a non-preserved drawing buffer.
- Lesson checkpoints: `boardState` is optional and `isLessonState` is updated; `hasBoard` guards cover every board touch point I found.
- Import validation of `data`: degree 1-4, net length, finite triples, camera range, u/v in [0,1], density 8/16, unknown fields, `weights` rejected, type/collection match. Only `graphState` is missing (finding 1).
- Overlay labels are `aria-hidden`; the same information is in the sidebar (selection and index selects, Bernstein readout). Numeric xyz editor is keyboard operable with labelled inputs and an alert on error. Sliders for u/v and az/el are the keyboard alternative to the inset. The 3-column xyz grid uses `minmax(0,1fr)`; narrow-width behaviour was not rendered.
- Tests: the dispose test spies on `BufferGeometry` and `Material` prototypes and asserts every tracked resource was disposed (non-vacuous). The Export tests assert the image is removed after capture and that nothing downloads on cancel.

## Not verified

No browser or smoke run, no actual narrow-width layout, no measurement against the ADR 0018 budgets, no 44px touch-target audit of the `workspace-curve-picker` buttons, no check of the Slovenian terms beyond reading them, and no execution of the tests or `tsc`.
