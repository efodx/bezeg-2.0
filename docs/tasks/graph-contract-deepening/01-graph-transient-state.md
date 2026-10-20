# Declare graph transient state once

**Source spec:** [Graph contract deepening, section 1](../../specs/graph-contract-deepening.md#1-graph-transient-state)
**Status:** done on 2026-10-21; decision recorded in [ADR 0015](../../adr/0015-graph-transient-state-declaration.md).
**Priority:** strong; first choice. Test first.

## Goal

Give each graph one place to declare the transient state outside Preset data and the scene store, plus the redraw its scene needs after replacement, and have `BaseGraph` apply that declaration on every capture, restore and reset path. Callers gain leverage from a smaller subclass interface; maintainers gain locality because a missed path can no longer be a per-graph omission.

## Scope and sequence

1. Read the source spec's six acceptance criteria and ADRs 0006, 0012 and 0013, plus the scene-recovery evidence in [architecture deepening task 03](../architecture-deepening/03-scene-recovery.md). Inspect `BaseGraph.tsx` (scene hooks around lines 340 and 431-520, figure batch replacement around 797-860), `BaseCurveGraph.tsx`, `BaseFunctionGraph.tsx`, and every subclass overriding `resetSceneFields`, `captureFigureRuntimeState`, `restoreFigureRuntimeState`, `captureLessonState`, `restoreLessonState`, `prepareLessonDefaultScene`, `lessonDefaultState` or `figurePresetGraphState`.
2. Inventory each graph's transient state: fields outside the scene store that change what is drawn or what controls show. Include known cases (Subdivision `stepsDone`, Elevation overlay, Farin weights and form, curve selection, PH hodograph view, De Casteljau drawn parameter, spline alpha samples) and any others found.
3. Write a parametrized real-graph test over `graphFactories`, building on the `GraphHostRealGraph.test.tsx` harness: change, capture, change, restore and compare for lesson checkpoints, the lesson default scene and figure batch entry restore. Confirm or rule out the Subdivision, Farin and Elevation suspicions and record the result before changing behavior.
4. Design the declaration and its base-module use. Consider at least two shapes before choosing (for example one transient-state descriptor per graph versus a single capture/restore pair with a reset), and apply the deletion test to each. Do not build a generic serialization framework.
5. Migrate graphs to the declaration, removing duplicate checkpoint overrides and per-path redraw patches. Keep graph-specific overrides only where behavior is mathematically distinct, and say why in the code.
6. Remove or justify graph-field mirrors of scene-store state, per AGENTS.md.

## Verification and completion

- Start with `just --list`; run the new parametrized test plus focused SceneStore, GraphHost, GraphHostRealGraph, GraphSceneReload, GraphSession, LessonSession, activities, ChapterActivityVisit and figure-export suites, then `just typecheck` and `just build`.
- Cover synchronous rollback within one tick, disposed or unready graphs, and figure batch cancellation. Check that no transient state reaches Preset exports or storage.
- This changes shared graph runtime used by lessons, activities and figure export, so run `$smoke-tester` with the full [browser checklist](../../smoke-tests.md). Report failures and incomplete coverage.
- Review the diff with parallel subagents for mathematical/state correctness and engineering constraints.
- Record the inventory, confirmed defects, chosen shape and rejected alternative in this file. Update [current architecture](../../current-architecture.md) for the new ownership. Commit and push under AGENTS.md.

## Completion evidence

### Inventory

Transient state is graph state outside Preset data and the scene store that changes what is drawn or what controls show. "Before" names the hook families that held it at `850b6ac`.

| Graph | Transient state | Before | After |
| --- | --- | --- | --- |
| Every curve graph (`BaseCurveGraph`) | Selected curve (adapter flag); rational standard form; rational effective weights (DTOs store display-normalized weights in standard form) | Selection, editing mode and standard forms in runtime state (lesson checkpoint and batch entry), applied twice on the figure path (`figurePresetGraphState` and `restoreFigureRuntimeState`); effective weights only in the batch entry preset (`captureFigureEntryPreset`) and in Farin's own lesson override | `selectedCurveIndex` and `rationalCurves[{standardForm, effectiveWeights}]`, applied once. The editing mode is scene state only; it returns to moving without a selection |
| `repeated-subdivision` | `stepsDone` | Runtime state and `captureLessonState` (saved twice; finite versus non-negative integer validation); reset in `resetSceneFields` and `prepareLessonDefaultScene` | Not transient: derived from the Preset data as ceil(log2 pieces), capped at `MAX_SUBDIVISION_STEPS`. Every step halves every piece and the pieces offer no other subdivision, so k steps give 2^k pieces; an imported Preset with subdivided pieces counts their steps, and the cap still bounds the pieces at 2^5 |
| `elevation` | Overlay switch; polygon visibility the overlay replaced | No checkpoint; reset in `resetSceneFields` and `prepareLessonDefaultScene` | `elevationOverlayOn`, `polygonShownBeforeOverlay` (undefined in a fresh scene, derived from the imported curve) |
| `farin` | None of its own: Farin visibility is in the DTO; weights and form belong to the base curve graph | `captureLessonState`/`restoreLessonState` override | Overrides deleted |
| PH graphs (`ph-cubic`, `ph-quintic`, `uniform-parameterization`) | Hodograph child-board view | Runtime state; reset in `resetSceneFields` | `hodographBoundingBox` (pending until the inspector recreates the child board) |
| `decasteljau`, `rational-decasteljau`, `decasteljau-alternative` | Playback driver and `animationStatus` | `decasteljau-alternative` stopped it in its `prepareLessonDefaultScene`; only the figure path coerced a saved `playing` to `paused`, so a checkpoint captured during playback restored `playing` with no driver | Every scene replacement stops the driver and shows a scene saved while playing as paused at its parameter (`restoreTransientState` in both graphs, shared `statusAfterSceneReplacement`) |
| `decasteljau`, `rational-decasteljau`, `decasteljau-alternative` | Drawn parameter: a deliberate drawing cache of scene-store `t` (playback publishes `t` at a display cadence) | `exportPreset` and `captureLessonState` overrides patched `t`; restore and default-scene patches redrew; `figurePresetGraphState` reset it | Documented cache. `sceneGraphState` saves it; `syncReplacedScene` resets it from the restored `t` on every path |
| All graphs | Display settings | Lesson checkpoint only | Unchanged: graph preferences that Preset replacement keeps, restored only by lesson checkpoints |

Drawing that a Preset import does not rebuild (not transient state; declared in `syncReplacedScene`): disabled curve operations on `affine`, `elevation`, `repeated-subdivision`, `rational-elevation` and every `subdivision`/`rational-subdivision` piece; sample markers on `spline-parameterization`, `weighted-parameterization` and `uniform-parameterization`; Bernstein polynomials; cubic PH control-polygon geometry; default circle pieces; the `subdivision` scheme parameter; the De Casteljau whole-curve plot; the function-graph scene state that mirrors the model.

### Behavior before the change

[`GraphTransientState.test.tsx`](../../../src/graphs/base/GraphTransientState.test.tsx) mounts every graph in `graphFactories` (46) through `GraphHost` and a real JSXGraph board, using the shared [`realGraphTestHarness.tsx`](../../../src/graphs/base/realGraphTestHarness.tsx). It changes the scene (supported lesson actions, curve selection, every inspector switch, view, element size, hodograph view), captures, changes again, restores, and compares Preset data, scene state, transient state, curve adapters, the visible board objects and the inspector controls. Eight scenarios per graph, with model edits for function graphs: lesson checkpoint, rollback within one tick (checked before the host commits), lesson default scene, Preset replacement (reset), figure batch (each Preset as freshly loaded, then entry restore), batch cancellation by unmount, disposed and never-mounted graphs, and Preset export. Run at `850b6ac` with only the harness: 332 passed, 28 failed.

Review repairs strengthened the test. Every replacement test first asserts that its change was observable (allow-list `NO_SYNCHRONOUS_SCENE_CHANGE`, empty). The figure batch adds a stored Preset with Preset data and scene state, compared with loading it through the Preset selector (`circle` has no Preset collection; `bernstein` has no Preset data). Curves carry five samples. Transient state is also read from the graph fields directly, so a field the declaration omits is still compared. After a checkpoint restore, a twin graph that reached the captured scene through the same changes must look identical after the same follow-up change, which exposes restorable state that is not drawn. Graph-specific cases cover a De Casteljau Preset saved while `playing`, a checkpoint captured during playback, a Farin Preset saved in standard form and a repeated-subdivision Preset with four pieces.

The strengthened test also surfaced pre-existing function-graph drawing defects, reproduced by running it at `850b6ac` in a temporary worktree and outside this task's scope. Regions drawn from caches keyed by the model only (for example the definite-integral `fillCache`) keep data sampled for an earlier view: `arc-length`, `area-between-curves`, `darboux`, `definite-integral` and `fixed-point` in the default scene, and `area-between-curves` in the batch. The `accumulation` region shown at capture differs from the one redrawn after restore; the cause was not isolated. The test leaves only those curves out of those comparisons (`STALE_VIEW_CACHED_CURVES`) and compares everything else.

- **Subdivision: confirmed in code, not observable for valid values.** `stepsDone` was saved in two families with two validations; checkpoint round trips passed. Related, confirmed: batch Preset figures kept the live step count instead of a fresh scene's 0, and lesson restore dropped the disabled operations from every piece.
- **Farin: ruled out.** All eight scenarios passed: the batch entry preset kept effective weights, the DTO kept Farin visibility and runtime state kept the standard form.
- **Elevation: confirmed.** A lesson checkpoint left the overlay and its switch as the learner last toggled them and overwrote the remembered polygon visibility; batch Preset figures showed the live overlay instead of the default; the restored curve offered subdivision, extrapolation, shrink, construction and degree elevation previews.
- **Other confirmed defects.** Lesson restore dropped disabled curve operations on `affine`, `rational-elevation`, `subdivision` and `rational-subdivision` (the last two also on batch entry restore, for the second piece). Rational lesson checkpoints lost effective weights in standard form, so `rational-subdivision` showed a different piece (Farin had a private workaround). `ph-cubic` lost its control-polygon geometry and curve-visibility binding on lesson restore. `extrapolation` and `rational-extrapolation` lost the extrapolation point on batch entry restore, because the selection was applied twice and the second deselect removed it. Before the host commit, Bernstein polynomials, weighted and uniform samples, the De Casteljau drawn parameter in the default scene and the `subdivision` scheme parameter were stale. `spline-parameterization` wrote α into a disposed graph's state before its readiness check.
- **Found while migrating.** Lesson restore and the default scene merged scene state, so an optional key such as the De Casteljau `wholeCurve` could survive; a per-graph override masked it.

Raw baseline logs stayed in the worker scratchpad (not committed).

### Design

Chosen shape: a capture/restore pair plus one scene sync, applied by `BaseGraph` in a fixed order on every replacement path (Preset data, scene state, `restoreTransientState`, `syncReplacedScene`).

- `captureTransientState()` / `restoreTransientState(saved | undefined)`: undefined means the fresh-scene value, so one method replaces `resetSceneFields`, the runtime pair, the lesson pair and the default-scene resets. Restores validate and fall back to fresh values. Keys must not be scene-store keys (the test checks exported Presets).
- `syncReplacedScene()`: idempotent drawing for what an import does not rebuild. Graphs whose `onStateChange` reconciles the same drawing share one method.
- `sceneGraphState()`: the scene state a Preset or checkpoint saves (De Casteljau drawn `t`, function-graph model).
- Paths: mount; Preset load, reset and import; batch Presets (fresh transient state); batch entry restore (captured state, applied before the host renders); lesson checkpoints and the lesson default scene (synchronous, state replaced rather than merged, workspace revision advanced so scene-backed controls and the hodograph board are rebuilt). `captureLessonState`/`restoreLessonState` are private; `captureFigureEntryPreset`, `captureFigureRuntimeState`, `restoreFigureRuntimeState` and `resetSceneFields` are gone.

Rejected: a transient-state descriptor per graph (a field list with read, write, default and validate, applied generically by the base). Deletion test: the fields are not independent. Weights must be set with Farin sliders rebuilt around them, selection must follow the import, and the overlay's remembered polygon derives from the imported DTO. The entries would restate ordering in closures, and the base would grow a generic validation layer: a serialization framework of shallow per-field modules. Also rejected: running the figure path's full board teardown and `initialize()` for lesson restores. That would rebuild every board on each Back step and reset function-graph views, and `initialize()` is not idempotent across paths (it leaked the De Casteljau whole curve). Deleting the chosen hooks would scatter per-path knowledge back across five paths.

Remaining graph-specific overrides: `BaseFunctionGraph.prepareLessonDefaultScene` (default view, drawn before the host commits) and `figurePresetGraphState` (model over stored state). The decision and both rejected alternatives are recorded in [ADR 0015](../../adr/0015-graph-transient-state-declaration.md).

### Acceptance mapping

| Criterion | Evidence |
| --- | --- |
| 1. Behavior established first | Baseline run and defects above, recorded before behavior changes |
| 2. One declaration, one validation | Each graph overrides one pair. Subdivision no longer saves `stepsDone` at all; it is derived from the pieces (`SubdivisionGraph.test.ts` covers checkpoints and imported subdivided Presets). The editing mode is saved only as scene state. Restores validate weights as finite and greater than zero, the same as the `rational-weights` action, and accept only numeric editing modes |
| 3. Consistent drawing in one synchronous sequence | The rollback scenario compares the board before the host commits for all 46 graphs; the hodograph child board is compared after commit, and its view is compared in-tick through the declared state |
| 4. Every Demonstration covered | 366 cases (360 parametrized, 6 graph-specific). Graph-specific tests remain where they assert distinct mechanics (fake-board call order, validation, mathematics, LessonSession integration); updated: De Casteljau, De Casteljau alternative, Subdivision, Subdivision 1, AlphaParam, Farin and the rational adapter (new `setEffectiveWeights` test) |
| 5. Contracts unchanged | `LessonSession`/`ActivitySession` interfaces and synchronous actions unchanged; `onStateChange` still deferred; board ownership and disposal unchanged; cubic PH geometry and the whole-curve plot now have explicit ownership; the De Casteljau parameter is documented as a drawing cache |
| 6. Transient state stays out of Presets | Export key check and no storage writes during checkpoints and batches, for every graph; Preset format and routes unchanged |

### Verification

- `just unit src/graphs/base/GraphTransientState.test.tsx`: 366 passed.
- `just unit` with the parametrized, SceneStore, GraphHost, GraphHostRealGraph, GraphSceneReload, GraphSession, LessonSession, activities, ChapterActivityVisit, export, curve, Bernstein and function suites: 70 files, 1312 tests passed.
- `just unit` (full): 150 files, 2899 tests passed. `just typecheck` passed. `just build` passed (existing Sass deprecation and chunk-size warnings).
- Parallel review (state correctness, engineering constraints): no high-severity findings; test vacuity, De Casteljau playing-status restore, Subdivision step count, restore validation, an `any`, the missing ADR and user-impact notes were fixed before commit.
- `just smoke-built` on the final working tree: 233 passed, including every Guided lesson row, standalone learning, library picker, workflows (language switch, Preset save/reopen) and lesson graph access at narrow width and 200% text.
- Handler browser checks on the production preview: on `rational-elevation`, a selected curve with weight w1 = 2.5 in standard form survived lesson entry, Next, Back and Exit with identical inputs and curve paths; on `decasteljau`, a scene captured during playback was restored on Exit paused at t = 0.80 with the construction drawn at that parameter. No console errors from the app.

### Limits and compatibility

- User-visible changes:
  - Batch Preset figures use fresh transient state (Elevation overlay on, De Casteljau playback stopped), matching what selecting the Preset shows. The entry scene is still restored exactly.
  - A scene saved during De Casteljau playback (a checkpoint, a Preset or a batch entry scene) is restored paused at its parameter.
  - A repeated-subdivision Preset with subdivided pieces counts their steps toward the cap.
  - The selected-curve editing mode now resets to moving whenever no curve is selected after a replacement. The mode is scene state only.
  - `workspaceRevision` now advances on every lesson default scene and checkpoint restore. Child boards (the PH hodograph) are re-seeded, and scene-backed inspector controls are reset from the restored scene.
- The lesson checkpoint value now has `transientState` instead of `runtimeState`, and no `farin` or top-level `stepsDone`. Checkpoints live in memory only, so stored data and routes are unaffected; Preset files are unchanged.
- Not verified: manual dragging and the PH generating-point editor outside the automated suite, physical-device keyboard and touch, real PNG capture (mocked in the test), real layout sizes (the harness sizes jsdom elements to 600 by 400) and classroom projection.
- Follow-up: six function graphs (accumulation, arc-length, area-between-curves, darboux, definite-integral, fixed-point) cache region curves by model and ignore the view, so they draw stale regions after a view change. This reproduces at 850b6ac; the test lists them in `STALE_VIEW_CACHED_CURVES`.
