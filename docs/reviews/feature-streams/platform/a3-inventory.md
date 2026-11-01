# A3 inventory: scene replacement entries (read-only, HEAD a8447bd3, 2026-11-01)

Paths under `src/graphs/`. Line numbers are on current HEAD. `BG` = `base/BaseGraph.tsx`.

## 1. Replacement entries in BG

| Entry (BG line) | dispose | sweep | import | replace state | restore transient | initialize | sync/redraw | sync vs deferred, cancel |
|---|---|---|---|---|---|---|---|---|
| Mount `mount` 697-725 | no (fresh board) | no | 713-717 `importPreset` (view, graphState, `storedPresetData`) or `importPresetData(defaultPreset)` | `store.replaceState(initial)` only on remount (703); `setBaseState` 708 | 720 `(undefined)` | 722 `initialize()` (TODO "remove this") | 723 `syncReplacedScene` | sync; none (`session.markReady`) |
| Preset reload `reloadSelectedScene` 326-344 (select, delete, reset, import file) -> `applyFigurePreset` 975 | 994 `disposeFigureScene` | 995-998 | 1000 `importFigurePresetData` -> 582 (`storedPresetData`) | 1022 `replaceSceneState` (`onStateChange` deferred) | 1040 `(undefined)` | 1026 `initialize()` in deferred callback | 1029 sync, 1030 view, `boardUpdate`, `requestFullUpdate` | deferred (awaits setState callback); `isCurrent` (session alive, signal, generation) |
| Figure batch scene `applyPreset` 954 | same | same | same | same | same | same | same | same, batch operation signal |
| Batch `restoreEntryState` 955 | same | same | 1001 `importPresetData(entry data or default)`, NOT via `storedPresetData` (no collection check) | same | 1040 entry `transientState` (cloned) | same | same | same |
| Lesson default scene `prepareLessonDefaultScene` 536 (action 473) | no | no | 538 default data | 540 `replaceState(initial + lessonDefaultState)` sync | `finishSceneReplacement` 548-549 `(undefined)` | no | `syncReplacedScene`, `workspaceRevision++`, `boardUpdate`, `requestRender` | sync; throws if not ready |
| Lesson fixture scene `prepareLessonFixtureScene` 507 (action 486) | no | no | 514 after `collection.check` (reject before touching scene) | 518 | `(undefined)` | no | same finish | sync |
| Lesson checkpoint `restoreLessonState` 628 (registered 141) | no | no | 635 `importPresetData(state.data)`; box 636; display 640-645 | 638 replace, sync | 647 saved transient | no | same finish | sync; ignored if not ready |

Not entries: `importPreset` 862 is a mount helper. Language change rebuild not checked (unverified).

Deliberate differences (reason on record):
- Lesson paths skip `initialize` and board teardown: ADR 0015 (`docs/adr/0015-graph-transient-state-declaration.md`) rejects the figure path for lesson Back steps (rebuilds the whole board, resets function views; `initialize()` is not idempotent, it leaked the De Casteljau plot). Sync redraw so a rollback within one tick is drawn before the host commits.
- Lesson fixtures check data before touching the scene (507 comment).
- Figure path defers state via `replaceSceneState` so `onStateChange` diffs against the pre-load state (1053-1058 comment); cancellation exists only here.
- Mount needs no dispose (new board).

Look accidental or undocumented:
- Mount's `initialize()` is marked TODO; figure path calls it, lesson paths do not (the latter is deliberate, the former not explained).
- Figure path disposes + sweeps, then curve families' `importPresetData` disposes again (BaseCurveGraph 402): double disposal. Lesson paths and mount rely solely on that import-time disposal, which only curve families have; PointSet/CrossRatio/Pascal/PolePolar remove nothing there.
- `restoreEntryState` skips `storedPresetData` validation (1001 vs 582).
- Mount uses `setBaseState` + `importPreset`; others `replaceState`.

## 2. `disposeFigureScene` overrides (non-test) and `importPresetData`

| File:line | Does | super? | Notes |
|---|---|---|---|
| base/BaseCurveGraph 256 | `disposeFigureSceneResources` hook, `workspaceRevision++`, disposes curves, removes tracked points, clears lists | no (base empty) | `importPresetData` 399-402 calls it again: double disposal on figure path |
| bernstein/BernsteinGraph 104 | `removeGeneratedObjects`, clears refs | no | tracked |
| compgeo/BentleyOttmann 200, EarClipping 242, HullTrace 274, IntervalSweep 198 | `controller.pause()` only | yes (PointSetGraph) | removes nothing itself |
| compgeo/PointSetGraph 696 | forgets `drawn`, pending/overlay lists | no | removes NO board objects: suspected sweep reliance; its `importPresetData` 420 only `setState` |
| compgeo/InscribedAngleGraph 153 | `resetScene()` | yes | removal inside `resetScene` unverified |
| curves/hermite 121, interpolation 127 | `removeScene()` (also in `unmount`) | no | tracked; import ends with `ensureScene()` |
| curves/parametric 153 | `stopRoll`, `removeScene` | no | tracked |
| curves/subdivisionCurves 155 | `removeScene` | no | `importPresetData` 96 does not dispose |
| curves/parametrisations/AlphaParamBezier 97, SplineAlphaParametrization 85 | clears `sampleMarkers` | yes | marker objects: suspected sweep reliance unless removed elsewhere |
| functions/BaseFunctionGraph 390 | `removeGeneratedObjects` (or clears caches if session dead) | no | tracked |
| projective/CrossRatio 357, Pascal 412, PolePolar 418 | `drawn = undefined` | no | removes nothing; `removeDrawn` only in `unmount`: strongest suspected sweep reliance |

18 overrides besides the base no-op. About 28 `importPresetData` overrides (list by grep); only BaseCurveGraph's calls `disposeFigureScene`. Patch (Tensor, Coons, Triangular), linear map, complex and surface families have no dispose override: suspected sweep reliance or teardown inside their own redraw (unverified).

## 3. `boardInfrastructureObjectClosure` (BG 1076-1102)

Reads JSXGraph internals: `board.defaultAxes.{x,y}` with `childElements`, `ticks`, `labels`, `defaultTicks`, `ancestors`, `point1`, `point2`; `board.infobox`; `board.sketches` and `board.sketch`. The sweep (995-998) also uses `board.objectsList` and `board.removeObject`.
Adapter: no board adapter class exists (grep "BoardAdapter" finds nothing in src beyond test names `boardSignature`, `boardlessGraph`). `base/GraphSession.ts` already owns board creation and freeing (`createBoard` 58, `freeBoard` 10/83/232, `beginTransition` 192), so it is the closest owner; either a method there or a small `BoardInfrastructure.ts` beside it.

## 4. Existing tests

- `base/GraphSceneReload.test.tsx`: reset drops optional keys (asserts one element in `objectsList` 55/61), subdivide-cap reset, inspector controls after reset, preset selection during export, mount with missing selection. One cycle each.
- `base/GraphTransientState*.test.tsx` (5 files): transient restore through figure Preset and checkpoint, playback, farin, repeated subdivision; part at line 117 asserts pointer-sketch curves survive batch replacement. No object counts, no axes/infobox check.
- `base/export/PresetFigureBatch.test.ts`: batch order, entry restore, failure, abort; no board object counts.
- `learning/runtime/lessonRestorationContract.tsx` + `lessonRestoration.part1-4`: closing a lesson twice restores graph and resources (131), stays interactive; `objectsList` use at 45 is label-focused.
- `learning/content/sceneContentAgainstGraphs.test.tsx`: lesson scene content against real graphs.
- 74 test files mention `objectsList`, mostly single draws per family.

Gaps vs task: no test repeats replacement N times per entry and compares board object counts with the first cycle; no assertion that live `defaultAxes` and `infobox` survive; no listener or family-construction duplication check; no test that the sweep removes nothing; mount only covered by StrictMode-style remount in a few tests.

## 5. Proposed slices (~20 turns each)

- S1 contract tests, no source change. New `base/sceneReplacementContract.test.tsx`: each of the five entries (remount, reload/reset, batch `applyPreset`, lesson default scene, checkpoint restore) 3 times on real graphs; assert stable `objectsList.length`, same `defaultAxes`/`infobox`, listener and constructor counts via spies. Families: a Bezier curve (BaseCurveGraph), a spline (BaseSplineCurveGraph), PH (A5 `curves/ph/AuxiliaryBoardLifetime.ts` child board), a function graph (BaseFunctionGraph), Hermite or Subdivision (own `removeScene`), plus PointSet and one projective (Pascal or CrossRatio) as suspected sweep users. Add a test seam counting sweep-removed objects, to list which families lean on it. Risk: projective and PointSet may fail first; record as findings, do not weaken.
- S2 one replacement module. New `base/SceneReplacement.ts` with the ordered steps (dispose once, optional sweep, import, replace, transient, initialize policy, sync) and per-entry options for the deliberate differences (initialize none/sync/deferred, sweep on/off, cancellation). `BaseGraph.tsx` entries become option calls; drop the second dispose at BaseCurveGraph 402. Risks: `GraphSession.beginTransition` and `isCurrent` coupling; A2's `base/export/FigureExportOperation.ts` wraps `applyPreset`/`restoreEntryState` (keep its signal contract); A5's PH auxiliary board lifetime must be disposed once via `disposeFigureSceneResources`; keep ADR 0015 order and synchronous lesson redraw.
- S3 family teardown ownership. PointSetGraph, CrossRatio, Pascal, PolePolar (and Alpha/Spline markers, InscribedAngle, patches, linear, complex if S1 finds leaks) remove their own objects in `disposeFigureScene`; the sweep becomes a checked fallback that asserts it removed nothing in tests (warns in dev). Files: those graphs only.
- S4 sweep removal, only if S3 shows zero sweep removals across all real-graph tests; move remaining infrastructure knowledge to `GraphSession` or delete it. Risk: pointer-sketch curves and infobox (GraphTransientState test at 117).

Unverified: language-change rebuild; teardown of patch/complex/linear graphs; whether Inscribed and Alpha markers are removed elsewhere. No tests were run.
