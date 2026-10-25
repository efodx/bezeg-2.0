# Architecture deepening backlog

**Status:** planned, 2026-10-25. Implementation is queued in [ten tasks](../tasks/architecture-deepening-backlog/README.md); none is started.
**Source:** a whole-app architecture review on 2026-10-25 (graph host, mathematics and graph families, learning runtime and content, localization, test helpers), checked against `origin/master` at `2f602d0`. It re-verified the six candidates of the earlier same-day report and added new ones. A temporary HTML report presented the candidates; the durable scope and evidence are recorded here.
**Contracts:** [guardrails](../guardrails.md), [Guided lessons](guided-lessons.md), [curve ownership](curve-ownership-refactor.md), [React architecture refactor](react-architecture-refactor.md), [test consolidation](test-consolidation.md).

## Purpose and scope

Each task turns shallow modules into deep ones, so that one module owns knowledge that callers currently restate. Callers learn fewer rules, maintainers gain locality, and the module's interface becomes the test surface. These are source-backed opportunities. Suspected defects must be confirmed with a failing test before they are repaired.

Do not prescribe interfaces or method names in advance, and do not introduce a generic framework. Apply the deletion test: an extraction must concentrate complexity, not move it into more shallow modules. Keep an adapter only where behavior actually varies; one adapter is a hypothetical seam, two make it real.

Previous rounds are complete and are not reopened: [visit, preview capture and scene recovery](architecture-deepening.md), [transient state, Preset collections and scene-action limits](graph-contract-deepening.md) (ADRs 0015, 0016), the React refactor (scene store per graph, `GraphSession`) and the curve ownership refactor (numeric model points, adapter-owned bindings). The global geometry cache has already been replaced by per-object version stamps. Test consolidation is planned separately and owns smoke-suite restructuring.

## Candidates

| # | Task | Strength | Size | Lane |
| --- | --- | --- | --- | --- |
| 1 | Preset storage integrity | Strong | S–M | Host |
| 2 | Figure export operation | Strong | M | Host |
| 3 | One scene replacement path with positive teardown | Worth exploring | M–L | Host |
| 4 | Completed generic spline changes | Strong | S | Curves |
| 5 | PH auxiliary-board lifetime | Strong | M | Curves |
| 6 | Curve editing gesture mathematics | Worth exploring | M | Curves |
| 7 | One owner for function-model rules | Strong | M | Functions |
| 8 | Function graph shared drawing and analysis | Worth exploring | M | Functions |
| 9 | One typed lesson action vocabulary | Strong | M | Learning |
| 10 | Derived Demonstration and lesson registration | Worth exploring | M | Learning |

### 1. Preset storage integrity

`src/graphs/base/presets/Presets.ts:54-62` catches only storage access. It then parses outside the catch and casts the result to `Presets` without a check. Backup export (`Presets.ts:36-46`) parses every `preset-*` value unchecked. One corrupt stored value can throw from these unguarded callers:
- BaseGraph mount (`BaseGraph.tsx:696`), save (289), delete (300) and reload (318);
- `PresetSelector.tsx:27` (read on every render), 200 and 226.

Imported files get full envelope checks (`PresetImport.ts:39-54`). Stored data is checked only later, per selected Preset (`BaseGraph.storedPresetData`, 568-575). `Presets.test.ts` has no corrupt-storage case. Deepen the Preset storage module so that it owns persisted collection integrity and returns actionable read and write outcomes. Reuse the family collection checks from ADR 0016; do not add a second validation framework. `NamespacedStorage` already has depth and remains the storage adapter.

### 2. Figure export operation

There are four notions of "busy":
- BaseGraph counters (`BaseGraph.tsx:111-123`, derived at 338-352);
- a global export lock in localization (`localization/index.ts:17-18, 43-49`), entered from `FigureCapture.ts:258-268, 312-321`;
- a `WeakSet` batch lock (`PresetFigureBatch.ts:66-82`);
- a deferred reload.

`saveAsSVG` (743-755) and `saveAsPNG2` (839-851) duplicate acquisition and release, and their guard keeps the counter at 0 or 1, so it is really a boolean. The export failure message appears only in the language selector. Tests reach private methods through casts (`BisectionGraph.test.ts:584`, `FixedPointGraph.test.ts:744`, `SequenceGraph.test.ts:726`). Deepen one export operation module that owns admission, busy state, completion, failure and language stability. Keep `FigureCapture` and the batch implementation as they are.

### 3. One scene replacement path with positive teardown

BaseGraph replaces a scene three ways with different steps:
- Mount (675-712): import, restore, initialize, sync. No sweep.
- Preset reload and figures (`applyFigurePreset`, 928-1004): dispose, sweep, import, replace, restore, deferred initialize, sync.
- Lesson paths (485-497, 514-532, 606-624): import, replace, restore, sync. No initialize, no sweep.

The sweep (947-950) removes every board object except those found by `boardInfrastructureObjectClosure` (1027-1052), which walks JSXGraph internals. `disposeFigureScene` runs twice per figure load (947, and again through `importPresetData`, `BaseCurveGraph.tsx:402`). Concentrate scene replacement in one module whose teardown follows owned objects; keep any remaining infrastructure knowledge in the board adapter. Retain the sweep as a checked fallback until repeated-replacement tests prove ownership is complete. This must not weaken ADR 0015's transient contract or the completed lesson recovery semantics.

### 4. Completed generic spline changes

`GenericBezierSpline` setters only record `degree` and `continuity` (`GenericBezierSpline.ts:69-91`). Callers must regenerate afterwards, as ADR 0010's last consequence records. Two layers then repeat the work:
- `JXGGenericSplineCurve.ts` repeats set, generate, refresh, relabel in the constructor and in four inc/dec methods (14-20, 55-93), and `AbstractJXGSplineCurve.ts:26-48` adds six more refresh/label calls.
- `CnSplineGraph.tsx:38-60, 76-85, 94-120` validates twice and reaches targets through single-step loops that regenerate on every step.

The `increaseDegree` guard (`JXGGenericSplineCurve.ts:74`, `continuity === degree + 1`) is unreachable. It is harmless, because raising the degree keeps continuity valid, but the adapter has no degree limit of its own. Deepen a completed spline change so that validity and span freshness live together. Intermediate parameter combinations stay internal, so automatic regeneration in every setter is wrong. Amend ADR 0010's consequence when done.

### 5. PH auxiliary-board lifetime

`HodographInputBox.tsx:17-73` creates the only board outside `GraphSession.initBoard`. It also owns that board's resize observation and release.

`BasePhBezierCurveGraph.tsx` holds the rest of the lifetime: five lifetime fields (31-35), the parent link (189, 221, 243), session cleanup with a fallback (212-248), and pending-box init (250-264). It also creates the hodograph `ModelPointBinding`s itself (173-190) and may replace `model.w`. This departs from ADR 0006's direction that adapters own bindings: main-board points bind inside `AbstractJXGPointControlledCurve.ts:541-575`, and `JXGPHBezierCurve.ts:48-57` already serializes the `w` points.

Deepen one auxiliary-board lifetime module with idempotent release and remount. The graph keeps PH mathematics, and the view supplies the live host element. This is a bounded pilot for the ownership direction of task 3.

### 6. Curve editing gesture mathematics

`AbstractJXGPointControlledCurve.ts` (703 lines, about 69 methods) mixes point binding, a select/drag/resize/rotate state machine (171-295), bounding-box and handle drawing, hull, polygon, evaluation point and state export. Two of its gestures have unchecked edge cases:
- `rotate` (187-194) uses `atan` of slope differences, so it divides by zero when the pointer is vertically aligned with the centre, and it jumps across ±90°.
- `resize` (176-185) divides by box width or height, so a degenerate box gives Inf/NaN.

No test drives `processMouseMove`, `startRotating` or `resize`. Degree elevation is implemented twice (`polynomial-bezier-curve.ts:14-25` and `AbstractJXGBezierCurve.ts:20-30`). Reproduce the gesture defects first. Then move gesture transform mathematics behind a tested module in the mathematical layer, next to `abstract-point-controlled-curve.ts` (moveFor/scale/rotate, currently untested). The adapter keeps pointer and drawing work.

### 7. One owner for function-model rules

Each of 11 function models states its rules three times:
- the `analysis/*Model.ts` parser (for example `convexityModel.ts:29-35`);
- a `diagnoseX` function in `functionPresetCollections.ts:54-170` that re-checks ranges to pick a message;
- graph setters that throw `DomainError` with English text: 79 throws across 20 graph files, for example `ConvexityGraph.tsx:147-171`.

Adding one field touches three files in two directories. Deepen each analysis model module so that it owns validity and the diagnosis of invalid values. Preset collections and graph setters then consume one answer. ADR 0016 stays: collections remain owned by graph families.

### 8. Function graph shared drawing and analysis

`BaseFunctionGraph.tsx` exists, but the 20 function graphs still repeat the same pieces:
- `type BoundingBox` (12 graphs);
- a local `strokeWidth` (13, while 4 use the base helper);
- `interface FillCurve` (4, although the base exports it);
- hand-rolled `{model, data}` caches cleared in `onSceneRemoved` (5, next to the base `memoView` used by 8);
- copy-pasted signed positive/negative fill setup (AreaBetween, DefiniteIntegral, Accumulation, Darboux).

Some mathematics also lives in graph files:
- signed-area fill in `AccumulationGraph.tsx:69`, besides `analysis/areaBetween.ts` and `analysis/riemann.ts`;
- piecewise sampling in `BisectionGraph.tsx:53-78`, besides `analysis/continuity.ts:79-98`;
- grid snapping three times;
- `alphaParameterization` exported from a graph file.

Deepen the base only where at least two graphs share real behavior, and move the mathematics into `src/analysis`. Reject mechanical helpers that fail the deletion test. Correct the stale "asynchronous setState" comment at `BaseFunctionGraph.tsx:17-19`.

### 9. One typed lesson action vocabulary

Lessons reach graphs through three vocabularies:
- content strings (`SUPPORTED_SCENE_ACTION_NAMES`, 39 names, `guidedLessons.ts:85-125`, with a 37-line mapping comment);
- a ~160-line translation chain in `lessonCatalog.ts:29-190`;
- the typed `LessonAction` union (~32 kinds, `model.ts:78-107`).

A mismatch appears only at runtime or in `sceneContentAgainstGraphs.test.tsx`. `FunctionParameterName` and its runtime list are written out twice (`model.ts:19-24`). `adaptContent` (`lessonCatalog.ts:236-268`) rebuilds a second schema that duplicates runtime types and hard-codes `-pilot`/`-guided` ids.

Authored fields such as `learnerInteraction` (253 occurrences) are never read. `step.action`/`frame.action` and `LessonSession.applyCurrentAction` run only from fixtures. Let content author the typed vocabulary directly, as ADR 0002 already requires ("static, typed, localized content"), and remove the translation layer. Decide explicitly which review-only authored fields stay, and who reads them.

### 10. Derived Demonstration and lesson registration

Adding a Demonstration always touches seven places:
- `demonstrations.ts`;
- `graphFactories.ts`;
- `sl.ts` and `en.ts`;
- generated `demonstrationPreviewAssets.ts`, which fails typecheck until capture runs;
- `scripts/demonstration-preview-recipes.cjs`;
- the family collection file.

A lesson adds `lessonAvailability.ts:4-14` (45 hand-kept ids, with comments telling authors to edit it), content, `model.ts` names and a smoke row that re-types titles. `App.tsx:16` and `DemonstrationWorkspace.tsx:53` both resolve the same Demonstration. The title then travels App → SiteContext → GraphHost → `BaseGraph.workspaceTitle` (403), and BaseGraph's description default duplicates App's.

`src/images/demonstrations/catalog/manifest.json` (≈14k lines) is read only by the capture script and contains 64 absolute paths from a contributor's machine. Derive availability and registration from one source where a failing build or test can enforce completeness. Move the capture manifest out of `src` and strip machine paths. Content files grouped by rollout batch (for example `affine` in expansion, `circle` in rationalConstruction) may be regrouped by topic in the same task.

## Considered and deferred

- **Lesson overlay presentation** (the earlier report's candidate 6). Uncommitted overlay edits and `lesson-overlay-minimize.md` already move most of it. Remaining items are the mirrored `lessonMode`, dead `registerExit`, and about 13 effects in `GuidedLesson`. Revisit after that work lands.
- **BaseGraph as a whole.** It has 41 overridable members, 10 never overridden, and inheritance up to 5 levels. Tasks 1–3 remove its preset, export and replacement clusters. Re-measure afterwards instead of planning a broad split now.
- **Localization locality.** 1,053 of 1,175 keys are used by exactly one file; 34 keys are dead; 26 inline `language === 'sl'` strings bypass `t()`. A per-area catalog would reduce merge contention, but it changes the localization workflow. Plan it separately with `docs/localization.md`.
- **Smoke helper duplication.** The board lookup is copied in 9 files and `openEnglish` 4 times. Fold this into test consolidation instead of a parallel change.
- **`DemonstrationWorkspace` chapter coupling.** It hard-codes Bézier chapter copy and ids. Revisit with the overlay work.
- **Stale documentation.** ADR 0006, ADR 0002, `performance-plan.md:36` and `bezier-performance-results.md:321,337` still describe the removed global cache. Correct this with whichever task next touches those documents.

## Shared acceptance

1. Mathematical meaning is preserved. Affected mathematical checks, the real-graph contract tests (`GraphTransientState`, lesson restoration, `sceneContentAgainstGraphs`) and existing interface tests pass without weakened assertions or new exclusions.
2. Each task demonstrates the deletion test. Callers lose named knowledge (listed in the task's evidence record), and new tests exercise the deepened module through the interface its callers use.
3. Suspected defects (corrupt-storage throws, gesture NaN, spline degree limit, double disposal) are reproduced by a failing test before repair, or recorded as not reproducible.
4. Stored Presets, files and routes stay compatible unless the task records a breaking change with its reason and user impact.
5. Typecheck, unit tests and the production build pass. Changes to controls, rendering or lessons get focused browser validation per the [browser checklist](../smoke-tests.md). Dragging or slider paths are measured before and after when the task touches them.
6. An ADR consequence that a task changes (ADR 0010 for task 4) is amended in the same change.
