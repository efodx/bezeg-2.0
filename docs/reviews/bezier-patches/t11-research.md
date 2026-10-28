# Task 11 research: surface lesson capabilities and actions

Research only; no source edited. Line numbers are from worktree HEAD d56e39c.

## 1. Seams in the existing lesson runtime

- Model `src/learning/model.ts`: `LESSON_ANIMATION_IDS` :54 (closed set decasteljau|bisection|sequence|fixed-point), commands :61, `LessonPoint` :63, `LessonViewBox` :66 (2D JSXGraph box), `LessonCurveFixture` :74, `LessonAction` union :83-115 (the two `prepared-scene` variants :88/:90 are the only fixture entry), `LessonSceneCheckpoint` :187 (opaque `{version:1, value:unknown}`), `LessonGraphCapabilities` :192 (captureState/restoreState/apply/stopAnimations?/pauseAnimations?/isAvailable?).
- Registry `src/graphs/base/lesson/LessonActionRegistry.ts`: `DISCRIMINATORS` :14-18 (curve-visibility->target, parameter->name, animation->animationId); `on`, `onDiscriminated`, `use(feature)`, `supports` option; unregistered -> `UnsupportedLessonActionError`.
- Shared-feature precedent `src/graphs/base/lesson/curveLessonActions.ts`: `curveVisibilityActions(host)` returns a `LessonActionFeature`, host interface, `supports` narrows by graph class. New `patchLessonActions(host)` should be `src/graphs/patches/patchLessonActions.ts` (spec name), same shape.
- Graph wiring `src/graphs/base/BaseGraph.tsx`: `lessonCapabilityAdapter` :141-148, `getLessonCapabilities` :450, lazy `lessonActions` :463, `registerLessonActions` :473 (prepared-scene handler; overrides call super first), `applyLessonAction` :521 (try/finally `store.notify()`), `prepareLessonDefaultScene` :531, `finishSceneReplacement` :543 (private: restoreTransientState -> syncReplacedScene -> workspaceRevision++ -> boardUpdate -> requestRender), `lessonDefaultState` :551, `stopLessonAnimations` hook :556, `pausePlayback` :567, `captureLessonState` :607 (boardState if board, `sceneGraphState()`, `exportPresetData()`, `captureTransientState()`, display state, all cloned), `restoreLessonState` :623 (importPresetData, `replaceState({...getInitialState(), ...graphState, initialized:true})`, `finishSceneReplacement(transientState ?? {})`).
- `applyLessonView` is private (BaseGraph :655) and returns early without a board. Surface graphs are boardless (`adoptMainView`, BaseSurfaceGraph.tsx:89), so a `view` on a patch prepared-scene is silently ignored today. The 3D counterpart is new, on BaseSurfaceGraph.
- Transient contract: `captureTransientState`/`restoreTransientState` BaseGraph :376/:386 (keys must not be scene-store keys; restore validates; undefined = fresh scene). Generic suite `src/graphs/base/graphTransientStateContract.tsx` iterates all `graphFactories` (patch graphs already included; patch special case in `resetDisplay` :70). Scene mutators `src/graphs/base/realGraphScenes.ts:61-71` (`perturbPatch`).
- Animation lifecycle: `AnimationDriver` `src/learning/runtime/animation.ts` (play/pause/stop/replay/dispose, injectable scheduler). Reference graph `src/graphs/curves/bezier/DecasteljauGraph.tsx`: driver :40, `stopLessonAnimations` :218, `pausePlayback` :223, `setLessonAnimation` :227, `onDiscriminated('animation','decasteljau',...,{supports})` :250, `unmount()` -> `driver.dispose()` :106. `LessonSession.ts` calls `capabilities.stopAnimations()` before every restore/replace (:51,79,95,108,112,121,133,150,159,171,181); `GuidedLesson.tsx:143` on exit; `ActivitySession.ts` (:16-48) uses `pauseAnimations`/`stopAnimations`; BaseGraph :974 stops animations before figure batches.
- Content layer (only if lessons author the actions, see R9): `src/learning/runtime/lessonCatalog.ts` `sceneAction()` maps content `SceneAction{name,value}` to `LessonAction`; scene assembly :248-256; content types `src/learning/content/guidedLessons.ts` :135-154.
- `src/learning/content/guidedExamplePreviewCopy.ts:7-9` lists the six patch Demonstrations as "without lesson" (task 12 removes them).

## 2. Patch graphs today

Chain: `BaseSurfaceGraph` <- `TensorPatchGraph` <- {`TensorDeCasteljauGraph`, `TensorDerivativesGraph`, `TensorSubdivisionGraph`, `TensorJoinGraph`}; `TriangularPatchGraph` <- BaseSurfaceGraph. All in `src/graphs/patches/`; factories `src/graphs/graphFactories.ts`.

- Camera: `SurfaceCamera {az, el, distance, projection:'perspective', target:Xyz}` (`surface-view/surfaceScene.ts:67`) in scene state `state.camera` (BaseSurfaceGraph.tsx:18), stored as Preset DTO `state.camera` (`patchDto.ts:19`). There is NO separate zoom (distance is zoom) and NO 3D box anywhere (grep box/zoom: none). Presets/clamps in `surface-view/surfaceMath.ts:9-31` (front|top|side|isometric, `presetCamera`, `clampElevation` max 1.54, `clampDistance` 1.5-80). Methods: `applyCameraPreset` Tensor :245 / Triangular :233, `setCameraAngle` :229/:217, `resetView` :255/:238. Camera is in `sceneGraphState()`, so checkpoints already carry it; camera-only changes reuse geometry (`onlyCameraDiffers` :31, `reconcileView` :169).
- Visibility state: Tensor `showControlNet|showIsoCurves|showBoundaryCurves|showShading` (TensorPatchGraph.tsx:22-30; `setVisibility(key, visible)` :237). De Casteljau Demonstration adds optional `showDeCasteljau` (`setShowDeCasteljau` TensorDeCasteljauGraph :58). Derivatives adds optional `showTangentPlane|showNormal|showTwist` (absent = shown; TensorDerivativesGraph :13-84; no public setter outside panels). Triangular has the four plus required `showDeCasteljau`, `setVisibility` :225. So `decasteljau-scheme` exists on patch-decasteljau and triangular only; `tangent-plane`/`normal` only on patch-derivatives; per-class `supports` is needed.
- Evaluation: `setParameter(u|v)`/`setParameters(u,v)` Tensor :201/:208 (clamp to [0,1], ignore non-finite); Triangular :177/:185 (`clampToTriangle`; w derived). Both clamp silently; lesson actions must throw instead (R6).
- Subdivision: Tensor-only, non-destructive display state in `TensorSubdivisionGraph`: state `subdivisionDirection`, `subdivisionValue`, `showPieces` (in Preset); `setSubdivisionDirection` :112, `setSubdivisionValue` :117 (clamps to `SUBDIVISION_RANGE` 0.05-0.95), `setShowPieces` :121, `correspondence()` :131. Kernel `tensorSubdivision.ts:29 subdivisionPieces` throws RangeError outside open (0,1). Triangular: transient `setSubdivisionPreview(visible)` :202 (three-piece split at (u,v,w); no direction/value).
- Elevation: Tensor-only `TensorSubdivisionGraph.elevate(direction)` :141 (silently no-ops at degree 4/invalid; sets transient `this.ghost`, captured as `elevationGhost` :93/:99, validity by `ghost.after === state.net` :106); `canElevateIn` :126. Kernel `TensorProductBezierPatch.elevate` throws at degree 4. Triangular: `setDegree(n+1)` :169 is exact elevation (`changeTriangularDegree`), kernel `TriangularBezierPatch.elevate()` :162 takes no direction. Tensor `setDegree` lowering approximates.
- Selection (transient): `selectedPointIdValue` BaseSurfaceGraph :57, captured as `selectedPoint` :208, restored with `hasPoint` validation :212. `selectIndex(i,j)` Tensor :214, Triangular `selectIndex([i,j,k])` :192.
- Other transient: Triangular `subdivisionPreview`, `tensorComparison` (captured :120, restored :124 plus `syncInsetSquare`). No persisted "de Casteljau drawing cache" exists: the scene is rebuilt from state in `buildScene`.
- Lesson hooks for patches: none. `lessonFixtureData` is overridden only in BaseCurveGraph :113; no patch graph overrides `registerLessonActions`. Today only `prepared-scene` (demonstration-default) works on them.
- Fixture trap: BaseGraph `prepareLessonFixtureScene` :502-513 does `importPresetData(data)` then `replaceState({...getInitialState(), ...lessonDefaultState()})`. For curves the geometry lives in board adapters and survives; for patches the whole net/camera is in the scene store, so that `replaceState` would revert to the default patch. Needs its own route (R1).
- Unmount: sweep drivers need an `unmount()` override with `dispose()` like DecasteljauGraph :106; patch view disposal already runs via `adoptMainView`.

## 3. Geometry to validate/perform (reuse kernels, do not reimplement)

Kernels in `src/bezeg/impl/patch/`, reached through the graphs' `patchFromNet` helpers.
- Tensor eval `TensorProductBezierPatch.eval(u,v)` :149 accepts any finite u,v (extrapolation). Action validates finite and 0<=u,v<=1 itself, then `setParameters`; tests read via `eval`.
- Triangular eval check `triangular-bezier-patch.ts:76-80`: finite, u,v>=0, `u+v <= 1 + 8*Number.EPSILON` (literal, not exported). Action `{u,v,w}`: finite, each >= -tol, `|u+v+w-1| <= tol`, then `setParameters(u,v)` (w derived). Recommend exporting one tolerance constant from the kernel. Canonical net order: index 0 = `b_(n,0,0)`; (u,v,w) order must match the kernel `Barycentric` type (:8). `stateFromDto` already clamps v to 1-u for rounding.
- Subdivision: `subdivisionPieces` (open (0,1)); graph range 0.05-0.95. Action rejects outside it (no clamping).
- Elevation: kernel `elevate(direction)`; action throws when `!canElevateIn`.
- Camera preset: name in `CAMERA_PRESETS` via `applyCameraPreset`.

## 4. Types to add

In `src/learning/model.ts` (no Three/JSXGraph/Preset-DTO imports; opaque-state rule):
- `LessonPoint3 = readonly [x, y, z]` beside `LessonPoint` :63.
- `LessonPatchFixture`: discriminated union `{kind:'tensor', m, n, net: LessonPoint3[]}` (row-major, `(m+1)(n+1)`) | `{kind:'triangular', n, net: LessonPoint3[]}` (canonical order, `(n+1)(n+2)/2`), mirroring DTOs in spec lines 130-136. Validated by `patchPresetCollections[...].check` through the graph (no second validator).
- `LessonView3D {az, el, distance, target?: LessonPoint3, projection?: 'perspective'}` (radians, like `SurfaceCamera`). The spec's "3D box" has no code counterpart (see section 8); recommend an optional `fitBox?: [min, max]` resolved with `fitCameraTo(points, hostAspect(), camera)` or drop it; handler decides before S1.
- `LessonAction` additions: `{kind:'prepared-scene', sceneId, source:'lesson-patch-fixture', patch: LessonPatchFixture, view3d?: LessonView3D}` (third variant beside :88/:90; the BaseGraph prepared-scene handler must switch exhaustively on `source`), plus
  - `{kind:'patch-evaluation', u, v, w?}`
  - `{kind:'patch-visibility', target: 'control-net'|'iso-curves'|'boundary-curves'|'decasteljau-scheme'|'tangent-plane'|'normal'|'shading', visible}`
  - `{kind:'patch-subdivide', direction:'u'|'v', value}`
  - `{kind:'patch-elevate', direction:'u'|'v'}`
  - `{kind:'camera-preset', view:'front'|'top'|'side'|'isometric'}`
- Sweeps: add `'patch-u-sweep'`, `'patch-v-sweep'` to `LESSON_ANIMATION_IDS` :54, commands play|pause|replay|stop only. Check consumers still compile: `lessonCatalog.ts:213`, `LessonSession.applyAnimation` :165, `lessonSmokeCoverage.test.ts`.
- Registry `DISCRIMINATORS` :14: add `'patch-visibility': 'target'`.
- 3D `applyLessonView` counterpart: `protected applyLessonView3D(view: LessonView3D)` on `BaseSurfaceGraph`: validate finite, `clampElevation`, `clampDistance`, then `setSurfaceState({camera})`. Validate before any scene replacement (as `checkLessonView` :40 does). Leave the private 2D method untouched.

## 5. Actions, validation, graph method

Registered by `patchLessonActions(host)` (a `LessonActionFeature`; host = narrow interface implemented by the surface graphs; no `view`, Three or labelOverlay access). Handlers throw `Error` on invalid payloads (as `extrapolationActions` does) and `UnsupportedLessonActionError` via `supports` when the graph lacks the feature. All reject non-finite values and wrong types.

| Action | Validation | Graph call |
|---|---|---|
| patch-evaluation (tensor) | u,v finite in [0,1]; w absent | `setParameters(u,v)` |
| patch-evaluation (triangular) | u,v finite; if w present `abs(u+v+w-1)<=tol`; each >= -tol; u+v<=1+tol | `setParameters(u,v)` |
| patch-visibility | target in the 7, supported per class | `setVisibility(key,..)`; `setShowDeCasteljau`; derivatives needs a new public setter for its three switches |
| patch-subdivide | tensor-subdivision only; direction u/v; 0.05<=value<=0.95 | `setSubdivisionDirection`, `setSubdivisionValue`, `setShowPieces(true)` |
| patch-elevate | tensor-subdivision only; direction u/v; throw if `!canElevateIn` | `elevate(direction)` |
| camera-preset | name in `CAMERA_PRESETS` | `applyCameraPreset(view)` |
| animation patch-u/v-sweep | commands play/pause/replay/stop (`supports`) | driver over `setParameter('u'/'v', ...)` |

## 6. Checkpoint, restore, cancellation

- Already captured: the whole scene store (net, degrees, u, v, camera, visibility, densities, subdivision fields, join fields) via `sceneGraphState()` + `exportPresetData()`; transient `selectedPoint`, `elevationGhost`, `subdivisionPreview`, `tensorComparison`. Camera->checkpoint->restore already round-trips; task 11 mostly needs tests, plus capture code only for new transient fields.
- Sweeps are transient and not captured. `stopLessonAnimations` override stops both drivers; `pausePlayback` pauses at current value; `unmount` disposes. The sweep writes u/v into the store each frame via `setParameter` (so no graph-field mirror; optional throttle like DecasteljauGraph `PARAMETER_PUBLISH_INTERVAL_MS`). A checkpoint taken mid-sweep holds the stored u/v.
- Patch fixture handler must end with `finishSceneReplacement(undefined)` semantics (selection, ghost, previews cleared). That method is private; add a protected template method next to `prepareLessonFixtureScene` (or widen it to protected).
- After elevate/subdivide, restoring an earlier checkpoint must re-equal model (`state.net`, m, n), controls (workspaceRevision reseed) and adapter geometry (`FakeSurfaceView` last scene, revision bump from `syncReplacedScene`); a later checkpoint must reproduce the ghost.

## 7. Risks

- R1 Fixture path overwrites state (section 2). Build state from the checked DTO (`stateOf` is protected on TensorPatchGraph; triangular uses `stateFromDto`), then `replaceState({...getInitialState(), ...patchState, initialized:true})`.
- R2 One-tick rule: handlers write only via `setState`; later actions may read `this.state` written by earlier ones; no new graph-field mirrors of scene state. (`ghost` is existing transient, validated by identity.) Test multi-action sequences in one synchronous `act`.
- R3 Renderer objects: no handler touches `view.*`, `labelOverlay` or Three; camera only via `setSurfaceState({camera})`; transient changes via `redrawGeometry()`.
- R4 `applyLessonAction` finally `store.notify()` (BaseGraph :525) refreshes controls after non-store changes; transient changes (selection, previews) must call `redrawGeometry()` so the view revision bumps.
- R5 Preserve curve actions: union/DISCRIMINATORS/prepared-scene edits touch every curve graph; run `LessonActionRegistry.test.ts`, `lessonFixtureScene.test.tsx`, `lessonRestoration.part1-4`.
- R6 Existing setters clamp/ignore silently; lesson actions must throw so bad authored content fails loudly. Keep setter behavior unchanged.
- R7 Do not add a third copy of the barycentric tolerance literal.
- R8 `restoreTransientState(undefined)` means a fresh scene; sweep reset belongs in `stopLessonAnimations`.
- R9 Content bridge: without `sceneAction()` names, task 12 cannot author the actions; `sceneContentAgainstGraphs.test.tsx` applies all authored content to real graphs. Decide whether S3 adds names now.
- R10 Shared lesson runtime changes require the full `$smoke-tester` checklist and evidence file `docs/reviews/bezier-patches/surface-lesson-runtime.md`.
- R11 Add localization keys only for new UI strings (sl.ts/en.ts lockstep, `npx tsc --noEmit --pretty false`, production build).

## 8. Spec contradictions and open points

1. Spec camera "az, el, zoom/distance, projection, 3D box": code has az, el, distance, target, and a one-value projection; no box. Define `LessonView3D` as camera (+ optional fit box) or amend the spec; no scene-state box without a Preset DTO change (ADR 0016 vocabulary impact).
2. `patch-elevate {direction}` and `patch-subdivide {direction,value}` are tensor-shaped; triangular has `elevate()` without direction and a point split. Spec lists no triangular variants. Recommend tensor-only now; add direction-less triangular elevate only if task 12 needs it.
3. Spec transient "de Casteljau drawing cache" has no counterpart (construction rebuilt from state); nothing to capture.
4. `patch-visibility` targets `shading`, `tangent-plane`, `normal` exist only on some Demonstrations; `twist` switch exists but is not in the spec list (add or leave unreachable).
5. Task acceptance "elevate/subdivide->read": subdivision is a non-destructive preview; "read" must mean `correspondence()`/state, not a changed net.
6. Task text says "u/v sweeps" with no ids; ids proposed in section 4.
7. Spec says Presets/lessons "reopen at the authored view", yet the 2D lesson `view` is ignored by surface graphs today; hence the explicit `view3d`.

## 9. Existing tests to extend

- `src/graphs/base/lesson/LessonActionRegistry.test.ts` (patch-visibility discriminator).
- `src/graphs/base/lessonFixtureScene.test.tsx` pattern (`withGraph`, `observeScene`); add patch cases or sibling `patchLessonActions.test.tsx` using `realGraphTestHarness` and `FakeSurfaceView` (`viewFactory` option).
- `graphTransientStateContract.tsx` + `GraphTransientState.part1-4.test.tsx` (patch graphs already iterated; extend only for new transient keys).
- `src/learning/runtime/LessonSession.test.ts`, `lessonRestorationContract.tsx`, `lessonRestoration.part1-4`, `animation.test.ts`, `lessonCatalog.test.ts`, `lessonSmokeCoverage.test.ts`, `src/learning/content/sceneContentAgainstGraphs.test.tsx`.
- Per graph: `TensorPatchGraph.test.tsx`, `TensorSubdivisionGraph.test.tsx`, `TriangularPatchGraph.test.tsx`, `BaseSurfaceGraph.test.tsx`.
- Math checks (kernel tests exist): evaluation through the action equals direct kernel `eval`; elevation leaves the surface unchanged at sample points; `correspondence()` equals kernel pieces; triangular sums inside/outside tolerance.

## 10. Recommended split (3 sequential slices)

**S1 Model, patch fixture, 3D view, shared actions (largest).** Owns: `src/learning/model.ts`; `LessonActionRegistry.ts` (DISCRIMINATORS); new `src/graphs/patches/patchLessonActions.ts`; `BaseSurfaceGraph.tsx` (`applyLessonView3D`, fixture route, host interface, `registerLessonActions`); `BaseGraph.tsx` only for the prepared-scene source switch and protected fixture template; `TensorPatchGraph.tsx`, `TriangularPatchGraph.tsx`, `TensorSubdivisionGraph.tsx`, `TensorDerivativesGraph.tsx`, `TensorDeCasteljauGraph.tsx` (registrations, derivatives setter); optional kernel tolerance export. New test `patchLessonActions.test.tsx` (synchronous edit->evaluate, elevate/subdivide->read, camera preset, invalid payloads leave state intact, triangular tolerance). Accept: `npx tsc --noEmit --pretty false`, focused vitest for the files above plus `LessonActionRegistry.test.ts`, `lessonFixtureScene.test.tsx`, GraphTransientState parts; no curve regressions.

**S2 Checkpoints, sweeps, cancellation.** Owns: animation ids/registrations (`model.ts`, `patchLessonActions.ts`); sweep drivers plus `stopLessonAnimations`/`pausePlayback`/`unmount` in `TensorPatchGraph.tsx` and `TriangularPatchGraph.tsx` (or one helper in BaseSurfaceGraph); tests with injected scheduler: checkpoint/restore of camera, selection, elevation ghost, subdivision preview; sweeps cancelled on restore/exit/unmount; restored model + controls + FakeSurfaceView geometry after elevate/subdivide; `LessonSession.test.ts` / `lessonRestorationContract.tsx` with a patch graph. Accept: focused tests, `just check`.

**S3 Content bridge, docs, review evidence.** Owns: `lessonCatalog.ts` + `guidedLessons.ts` scene-action names (no authored content), capabilities doc note, `docs/reviews/bezier-patches/surface-lesson-runtime.md`; run `just check`, engineering and mathematical review, full smoke (midway return/focus, completion retaining editability, cancellation/remount, bilingual). `lessonMathNotation.test.ts` untouched.

Order S1 -> S2 -> S3. Handler decisions needed before S1: LessonView3D box or not, triangular elevate/subdivide scope, `twist` target, whether the content bridge is task 11 or 12.

## 11. Handler decisions (handler 20, 2026-10-29)

Settled before S1; the spec's lesson bullets are amended to match in S3.

1. `LessonView3D` is the camera only: `{az, el, distance, target?: LessonPoint3, projection?: 'perspective'}`, validated with the existing clamps. No 3D box: `target` and `distance` are the framing, and adding a box would change the Preset DTO with no consumer. Applied through an explicit lesson `view3d`; the 2D `view` stays ignored on surface graphs.
2. `patch-elevate`: tensor `{direction: 'u'|'v'}` on `patch-subdivision` (throws when `!canElevateIn`); triangular `{}` (no direction) on `patch-triangular`, exact `setDegree(n + 1)`, throws at degree 4. A direction on a triangular graph, or none on a tensor graph, throws. `patch-subdivide`: tensor `{direction, value}` with `0.05 ≤ value ≤ 0.95`; triangular `{}` turns on the three-piece preview at the current `(u, v, w)`. Other graphs: unsupported.
3. No de Casteljau drawing cache exists (the construction is rebuilt from state); nothing extra to capture.
4. `patch-visibility` targets are the spec's seven plus `twist`; each graph supports only the switches it has.
5. "Subdivide → read" reads the preview state and `correspondence()`; subdivision never changes the net. "Elevate → read" reads the changed net and degrees.
6. Sweep animation ids: `patch-u-sweep`, `patch-v-sweep`.
7. The content-side `sceneAction()` bridge belongs to task 11 (S3) so task 13 can author scenes; task 12 is prose only.
