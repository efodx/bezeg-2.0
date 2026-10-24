# Deepen graph transient state, Preset collections, and scene-action limits

**Status:** implemented on 2026-10-21. The transient-state and Preset-collection decisions are recorded in [ADR 0015](../adr/0015-graph-transient-state-declaration.md) and [ADR 0016](../adr/0016-preset-collections-owned-by-graph-families.md); scene-action limits and the 51-case content check are summarized in the [engineering implementation history](../reviews/engineering-implementation-history.md#graph-contracts).
**Source:** a second architecture review on 2026-10-20 covering the hot spots of the last 150 commits, excluding the completed [visit, preview capture and scene recovery tasks](architecture-deepening.md). It was presented as a temporary HTML report; the durable scope and evidence are recorded here.
**Contracts:** [guardrails](../guardrails.md), [Guided lessons](guided-lessons.md), [standalone learning](standalone-learning.md), [curve ownership](curve-ownership-refactor.md), and [React architecture refactor](react-architecture-refactor.md).

## Purpose and scope

Each task concentrates knowledge that every Demonstration currently restates for itself, so that one module owns it and one test can cover all 45 Demonstrations through the same interface the callers use. These are source-backed opportunities with some suspected defects to be confirmed by tests first. None is a measured performance problem.

Do not prescribe method names or introduce a generic framework in advance. Apply the deletion test: an extraction must concentrate complexity rather than move it into more shallow modules. Keep an adapter only where behavior actually varies.

| Task | Recommendation | Primary outcome |
| --- | --- | --- |
| Graph transient state | Strong; first choice | A graph declares its transient state once, and every capture, restore and reset path uses that declaration. Completed; see ADR 0015. |
| Preset collection ownership | Strong | Each Demonstration owns its Preset collection rules; file import keeps only the file envelope and storage writes. Completed; see ADR 0016. |
| Scene-action limits | Worth exploring | Value limits for each scene action are defined once, by the graph or analysis module that enforces them. Completed; see the engineering implementation history. |

## 1. Graph transient state

### Evidence and direction

Transient state is graph state outside Preset data and the scene store, such as subdivision steps, overlay switches, curve selection, Farin weights or the hodograph view. `BaseGraph` (`src/graphs/base/BaseGraph.tsx:431-520`, `340`, `797-860`) handles it through several hook families: `resetSceneFields`, `captureFigureRuntimeState`/`restoreFigureRuntimeState` (also included in lesson checkpoints), `captureLessonState`/`restoreLessonState`, `prepareLessonDefaultScene`, `lessonDefaultState` and `figurePresetGraphState`. Subclasses answer "what is my transient state?" separately for each family:

- `SubdivisionGraph.tsx` saves `stepsDone` in its runtime state (lines 23-31), which the base lesson checkpoint already includes, and saves it again in `captureLessonState` (lines 61-70). The two restores validate differently: finite versus non-negative integer.
- `FarinPointsCurveGraph.tsx:74-100` saves effective weights, Farin-point visibility and standard form only in the lesson checkpoint. Figure batches restore the entry scene through runtime state, so these values may not survive a batch. This is unverified.
- `ElevationGraph.tsx:14-35` keeps `elevationOverlayOn` as a field, resets it in `resetSceneFields` and `prepareLessonDefaultScene`, and includes it in no checkpoint. Lesson Back or rollback after a learner toggles the overlay probably leaves it toggled. This is unverified.
- `DecasteljauGraph.tsx:114-142`, `DecasteljauGraph2.tsx:65-170` and `SplineAlphaParametrizationGraph.tsx:73-80` patch `graphState` around the base checkpoint and redraw after restore. Commit `afeda5d` fixed a rollback drawing defect of this kind.

Deepen the graph's scene-state interface so that a graph declares its transient state, and the redraw needed after its scene is replaced, once. The base module then applies that declaration to lesson checkpoints, lesson default scenes, figure batch entry restore, fresh figure scenes and Preset replacement. Existing tests such as `GraphHostRealGraph.test.tsx` show that mounted real graphs are testable without a browser.

### Acceptance criteria

1. Tests over every graph in `graphFactories` establish the current behavior first: change a scene, capture it, change it again, restore it, and compare Preset data, scene state, transient state and observable board state. Record confirmed defects, including the Subdivision, Farin and Elevation cases above, before changing behavior.
2. Each graph states its transient state in one place. No subclass saves the same value in two checkpoint families, and lesson checkpoints, figure batch restore and default-scene reset agree on what is saved and how it is validated.
3. Restoring any checkpoint leaves the drawn board consistent with the restored state in the same synchronous sequence, including rollback within one tick.
4. The parametrized test covers every Demonstration and replaces graph-specific duplicates where it gives the same evidence. Graph-specific tests remain for mathematically distinct behavior.
5. Synchronous scene actions, deferred host board effects, graph ownership, disposal, and the `LessonSession`/`ActivitySession` interfaces remain unchanged. No graph-field mirrors of scene-store state are introduced; any existing mirror, such as the De Casteljau drawn parameter, is either removed or documented as a deliberate drawing cache.
6. Transient state never enters Preset files, URLs or persistent progress. Preset formats and routes remain compatible.

## 2. Preset collection ownership

### Evidence and direction

`src/graphs/base/presets/PresetImport.ts` (277 lines, importing from about 30 modules) keeps per-collection knowledge in central lists: 45 `collectionIds` (lines 46-50), 19 `functionModelParsers` (52-54), 11 `diagnoseX` functions and their map (66-191), `curveTypes` (55, duplicating `ClassMapper` names), a spline curve-type table and a `preset-rational-` prefix rule (252-258), and a graph-state check driven by key-name regular expressions (199-211). Each graph separately declares the same collection key through `presets()` and its own data parsing through `importPresetData`.

- Adding a function Demonstration requires editing three lists in this file. Nothing checks across the catalog that the 44 keys graphs declare match the central list. The list also accepts `g1-spline`, which no graph declares; it may be a legacy file contract.
- File import calls each `parseXModel` directly, while `BaseFunctionGraph.importPresetData` (lines 269-281) parses and then commits through the graph. Diagnostics are re-derived beside the parsers, so the reason for a rejection can drift from the parser that rejects.
- Preset data crosses the `BaseGraph` seam loosely typed: `defaultPreset()` returns a string, curve graphs return arrays, and `importPresetData(data: any)` accepts either.

Deepen the Preset collection so that each Demonstration, or each graph family where the rules really are shared, owns a static definition: its frozen collection key, its data check with diagnostics, and its expected curve type or count. File import and the graph's own import use the same definition. File import keeps only the file envelope, conflict reporting and storage writes.

### Acceptance criteria

1. Collection keys and DTO names are unchanged. The fate of `g1-spline` is decided from history and recorded: kept as an accepted legacy key, or removed with its user impact stated.
2. Adding a Demonstration's Preset rules touches its own definition, not central lists in the file importer. A test fails if a graph's collection key has no definition or a definition has no graph, apart from documented legacy keys.
3. File import and graph import apply the same validation to the same data, and the diagnostic for a rejection comes from the same definition that rejects it. Unsupported files still fail with an actionable localized error.
4. A catalog-wide test exports, preflights and imports each Demonstration's default Preset. Existing rejection cases in `PresetImport.test.ts` keep their coverage, moved beside the definitions they exercise where that improves locality.
5. Preset data has a type per graph family instead of `any`/`string` at the `BaseGraph` seam, if this can be done without changing stored formats; otherwise record why not.
6. Preflight validates without creating graphs or boards, and the atomic write with rollback in `commitPresetImport` is preserved. Previously exported files from every collection still import.

## 3. Scene-action limits

### Evidence and direction

`sceneAction()` in `src/learning/runtime/lessonCatalog.ts:7-183` translates content scene actions into `LessonAction` values, mostly one to one, and checks value ranges with literals that restate the graph handlers' own checks:

- Subdivision `0.01..0.99` appears in `sceneAction` and in `SubdivisionGraph1.tsx:121-131`; Bernstein degree is `> 5` in `sceneAction` and `BERNSTEIN_MAX_DEGREE` in `BernsteinGraph.tsx:11,77`; the PH offset `±3` appears in `BasePhBezierCurveGraph.tsx:203`.
- `set-parameterization-samples` is accepted from 0 to 50, which matches `SPLINE_ALPHA_MAX_SAMPLES` but not `AlphaParamBezierCurveGraph` (1 to `ALPHA_PARAM_MAX_SAMPLES` = 40). Content can pass the content check and fail only when applied.
- Function parameter values are checked only for finiteness; their ranges are enforced only by the graphs.
- Chapter activities (`src/learning/chapter/activities.ts`) author `LessonAction` values directly and bypass `sceneAction` checks, so the graph handlers are already the only authority for them.
- `splineGuidedLessons.ts:9-12` says some names are not yet in `SUPPORTED_SCENE_ACTION_NAMES`, but they are.

The existing test `LessonActionRegistry.test.ts:82-88` checks that each lesson action has a handler, not that its value is accepted. Value errors in content are found only by browser smoke tests or learners.

Keep the closed scene-action name list (ADR 0013). Concentrate each action's limits in the graph or analysis module that enforces them, so the content-side translation reads those limits instead of restating them, and test lesson content against the real handlers.

### Acceptance criteria

1. The closed `SUPPORTED_SCENE_ACTION_NAMES` list and the `LessonAction` union remain compile-time lockstep, as ADR 0013 requires. No open action registry is introduced.
2. Each numeric limit used by a scene action is defined once, by the module that enforces it, and both the content check and the graph handler use that definition. Where one action targets graphs with different limits, the check is made against the target Demonstration's limit.
3. A unit test applies every scene of every Guided lesson, and the actions of every Chapter activity, to its Demonstration's graph and fails on any rejected value, in addition to the existing handler-existence test. Hand-picked boundary tests in `lessonCatalog.test.ts` that this test supersedes may be removed.
4. Stale comments about the name list are corrected. Lesson content, learner-visible behavior and `tests/guided-lessons.smoke.spec.cjs` rows remain unchanged unless the new test finds out-of-range content; any such content fix is reviewed for mathematical meaning.
5. Scene actions remain synchronous within one tick, and error messages for invalid authored content remain actionable for authors.

## Sequencing, decisions and verification

Implementation sequencing: task 01 established the real-graph baseline, task 02 followed at the shared Preset seam, and task 03 proceeded independently using the real-graph harness. All three are complete.

Respect ADRs [0002](../adr/0002-guided-lessons-static-content-and-graph-capabilities.md), [0006](../adr/0006-model-input-ownership-before-renderer-migration.md), [0012](../adr/0012-iterative-playback-controller.md), [0013](../adr/0013-iteration-driven-by-scene-actions.md) and [0014](../adr/0014-study-chapters-share-demonstrations.md). No reversal is proposed. Record consequential choices with real alternatives in an ADR; use the glossary only for domain vocabulary.

For implementation, start with `just --list` and select focused checks from [commands](../commands.md). Use mathematical checks where curve, weight or function-model validation changes. Apply `$smoke-tester` and the [browser checklist](../smoke-tests.md) when behavior or interaction paths change; shared workspace or lesson-runtime changes require the full checklist. Record actual checks and gaps, not inferred passes. Update [current architecture](../current-architecture.md) when ownership changes, and record any route or Preset compatibility impact.

Preparing these Markdown documents requires link/content review and whitespace checks, not application builds or browser smoke tests.
