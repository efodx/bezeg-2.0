# Bezeg unit-test audit (2026-11-08)

Read-only. Sources: `node_modules/.vite/vitest/<hash>/results.json` (last local run, Vitest 5, per-file test duration excluding environment setup and import), file contents (heuristics), full git history (1944 commits, 2026-10-09..11-08). Scripts: `audit.cjs`, `report.cjs`, data `audit.json` in this folder.

## 1. Durations

- Test files on disk: 650 (results.json has 643 entries; 4 stale entries for deleted files, 11 new files without a timing).
- Summed per-file test time: **2057.3 s (34.3 CPU-min)**; median file 179 ms.
- 269 s wall x 10 workers = ~2690 worker-s, so ~630 s (~1 s per file) is environment setup, module import, setupTests and idle tail on top of the 2057 s of test time.
- Concentration: top 10 files = 42%, top 25 = 55%, top 50 = 65%, top 100 = 77% of test time.
- The four `lessonRestoration.partN` files alone: 561 s = 27%. The longest single file (153.6 s) is more than half the wall time, so it is the critical path at 10 workers.

### Top 40 files

| # | s | category | lines | tests | file |
|---|---|---|---|---|---|
| 1 | 153.6 | real-board-catalog-sweep | 4 | 2 | `src/learning/runtime/lessonRestoration.part4.test.tsx` |
| 2 | 146.3 | real-board-catalog-sweep | 4 | 2 | `src/learning/runtime/lessonRestoration.part3.test.tsx` |
| 3 | 140.4 | real-board-catalog-sweep | 4 | 2 | `src/learning/runtime/lessonRestoration.part2.test.tsx` |
| 4 | 120.7 | real-board-catalog-sweep | 4 | 2 | `src/learning/runtime/lessonRestoration.part1.test.tsx` |
| 5 | 110.1 | real-board | 397 | 7 | `src/graphs/base/sceneReplacementContract.test.tsx` |
| 6 | 95.2 | real-board-catalog-sweep | 128 | 8 | `src/learning/content/sceneContentAgainstGraphs.test.tsx` |
| 7 | 31.5 | real-board | 52 | 5 | `src/graphs/patches/jsxSurfaceFraming.test.tsx` |
| 8 | 26.9 | real-board | 140 | 6 | `src/graphs/base/presets/PresetCatalog.test.tsx` |
| 9 | 23.9 | real-board | 374 | 9 | `src/learning/content/epicyclesGuidedLessons.test.ts` |
| 10 | 23.4 | real-board | 4 | 9 | `src/graphs/base/GraphTransientState.part4.test.tsx` |
| 11 | 23.2 | real-board | 536 | 13 | `src/learning/content/curveGeometryGuidedLessons.envelope.test.ts` |
| 12 | 23.1 | real-board | 1082 | 32 | `src/learning/content/curveGeometryGuidedLessons.test.ts` |
| 13 | 23.0 | real-board | 473 | 17 | `src/learning/content/arcLengthGuidedLessons.test.tsx` |
| 14 | 22.5 | real-board | 145 | 0 | `src/graphs/base/sharedControls.graphs.test.tsx` |
| 15 | 21.9 | real-board | 4 | 9 | `src/graphs/base/GraphTransientState.part2.test.tsx` |
| 16 | 21.2 | real-board | 411 | 13 | `src/graphs/compgeo/InscribedAngleGraph.host.test.tsx` |
| 17 | 19.1 | real-board | 4 | 9 | `src/graphs/base/GraphTransientState.part1.test.tsx` |
| 18 | 18.6 | real-board | 496 | 14 | `src/learning/content/curveGeometryGuidedLessons.offset.test.ts` |
| 19 | 16.5 | real-board | 543 | 18 | `src/graphs/compgeo/SimsonLineGraph.host.test.tsx` |
| 20 | 14.5 | real-board | 94 | 1 | `src/learning/content/guidedExampleScenes.test.tsx` |
| 21 | 14.2 | real-board | 249 | 6 | `src/graphs/compgeo/BezierClippingControls.host.test.tsx` |
| 22 | 11.6 | real-board | 387 | 13 | `src/graphs/compgeo/MonotoneTriangulationGraph.host.test.tsx` |
| 23 | 11.5 | real-board | 621 | 25 | `src/graphs/compgeo/DelaunayGraph.host.test.tsx` |
| 24 | 11.5 | real-board | 620 | 23 | `src/graphs/compgeo/InversionGraph.host.test.tsx` |
| 25 | 11.1 | real-board | 479 | 15 | `src/learning/content/degreeReductionGuidedLessons.test.tsx` |
| 26 | 10.5 | real-board | 575 | 25 | `src/graphs/compgeo/BentleyOttmannGraph.host.test.tsx` |
| 27 | 10.0 | real-board | 834 | 23 | `src/learning/content/interpolationGuidedLessons.test.ts` |
| 28 | 9.8 | real-board | 725 | 32 | `src/graphs/compgeo/VoronoiGraph.host.test.tsx` |
| 29 | 9.2 | real-board | 738 | 33 | `src/graphs/compgeo/FortuneGraph.host.test.tsx` |
| 30 | 9.1 | real-board | 506 | 25 | `src/graphs/curves/bspline/DeBoorGraph.test.tsx` |
| 31 | 8.6 | real-board | 374 | 12 | `src/graphs/compgeo/NotablePointsGraph.host.test.tsx` |
| 32 | 8.6 | real-board | 363 | 19 | `src/graphs/curves/bspline/BSplineBlossomGraph.test.tsx` |
| 33 | 8.3 | real-board | 487 | 28 | `src/graphs/compgeo/HullRobustnessGraph.host.test.tsx` |
| 34 | 8.1 | real-board | 428 | 20 | `src/graphs/patches/TensorPatchEditing.test.tsx` |
| 35 | 8.1 | real-board-catalog-sweep | 1281 | 43 | `src/learning/content/triangleGeometryChapter.test.ts` |
| 36 | 7.8 | real-board | 53 | 2 | `src/graphs/patches/jsxSurfaceDepth.test.tsx` |
| 37 | 7.8 | real-board | 569 | 25 | `src/graphs/compgeo/IntervalSweepGraph.host.test.tsx` |
| 38 | 7.7 | real-board | 286 | 10 | `src/graphs/patches/surface-view/jsxSurfaceView.test.ts` |
| 39 | 7.6 | real-board | 508 | 24 | `src/graphs/functions/SummaryStatisticsGraph.host.test.tsx` |
| 40 | 7.5 | real-board | 423 | 16 | `src/graphs/compgeo/EarClippingGraph.host.test.tsx` |

Note: `partN` files are 4-line shims; their tests come from `lessonRestorationContract.tsx` / `graphTransientStateContract.tsx` (test counts are per describe.each over lessons).

### By directory

| dir | files | lines | s | share |
|---|---|---|---|---|
| `src/learning/runtime` | 12 | 1829 | 565.1 | 27% |
| `src/learning/content` | 90 | 28103 | 395.9 | 19% |
| `src/graphs/compgeo` | 77 | 18792 | 274.7 | 13% |
| `src/graphs/base` | 47 | 5271 | 264.2 | 13% |
| `src/graphs/patches` | 58 | 10683 | 164.9 | 8% |
| `src/graphs/functions` | 58 | 21705 | 119.2 | 6% |
| `src/graphs/curves` | 65 | 13777 | 104.8 | 5% |
| `src/graphs/projective` | 17 | 3464 | 42.9 | 2% |
| `src/analysis` | 82 | 15861 | 29.3 | 1% |
| `src/compgeo` | 29 | 7263 | 21.5 | 1% |
| `src/bezeg/impl` | 26 | 5736 | 11.8 | 1% |
| `src` | 9 | 1449 | 9.3 | 0% |
| `src/compgeo/collisions` | 4 | 961 | 9.2 | 0% |
| `src/learning` | 6 | 528 | 8.6 | 0% |
| `src/compgeo/sweep` | 9 | 2726 | 7.4 | 0% |
| `src/learning/playground` | 9 | 2725 | 6.9 | 0% |
| `src/inputs` | 10 | 1395 | 6.3 | 0% |
| `src/projective` | 6 | 1595 | 3.5 | 0% |
| `src/graphs/linear` | 2 | 621 | 3.0 | 0% |
| `src/localization` | 2 | 194 | 2.8 | 0% |
| `src/graphs/complex` | 4 | 1920 | 2.7 | 0% |
| `src/learning/chapter` | 17 | 2546 | 1.6 | 0% |
| `src/linear` | 5 | 837 | 1.3 | 0% |
| `src/graphs/bernstein` | 2 | 164 | 0.3 | 0% |
| `src/graphs/styles` | 2 | 112 | 0.2 | 0% |
| `src/mathjax` | 1 | 108 | 0.0 | 0% |
| `src/storage` | 1 | 17 | 0.0 | 0% |

## 2. Categories

Heuristic, first match wins: real board (imports `realGraphTestHarness`, `initBoard`, jsxgraph, `mountGraph`/`createGraph`) + loops over a lesson/demonstration registry = *real-board-catalog-sweep*; other real board = *real-board*; `@testing-library/react` render = *react-render* (several `*Real.test.tsx` here also mount real graphs through a component, so real-board is undercounted); reads files or lint-like name = *content-lint*; loops over a registry = *catalog-loop*; DOM APIs without React = *dom-no-react*; rest = *pure-logic*. Only 1 file uses snapshots (`toMatchSnapshot`), 15 ms.

| category | files | lines | tests (static count) | test s | share | git touches | test-only touches | fix-commit touches |
|---|---|---|---|---|---|---|---|---|
| real-board | 181 | 52065 | 2189 | 1116.0 | 54% | 552 | 35 | 106 |
| real-board-catalog-sweep | 6 | 1425 | 59 | 664.5 | 32% | 15 | 0 | 0 |
| react-render | 80 | 15822 | 722 | 148.7 | 7% | 377 | 9 | 42 |
| pure-logic | 315 | 65467 | 4249 | 98.0 | 5% | 752 | 29 | 85 |
| dom-no-react | 30 | 9136 | 455 | 28.0 | 1% | 150 | 2 | 22 |
| catalog-loop | 26 | 4831 | 251 | 1.5 | 0% | 344 | 14 | 9 |
| content-lint | 12 | 1636 | 84 | 0.6 | 0% | 339 | 22 | 12 |

### jsdom need

- 351 files are pure-logic/catalog/lint with no DOM API use. Of those, **157 import only kernel code** (`src/analysis` 80, `src/compgeo` 40, `src/bezeg` 26, `src/projective` 6, `src/linear` 5; 81 s of test time) and certainly need neither jsdom nor JSXGraph. The other ~194 touch `src/graphs`/`src/learning` modules (graph models, lesson content, localization) and would need checking for import-time `window`/`document` use.
- Every one of the 650 files pays: jsdom environment creation, `src/setupTests.ts` importing `@testing-library/jest-dom/vitest` and **the whole `jsxgraph` bundle** (to wrap `JXG.debug` and `initBoard`), plus beforeEach/afterEach hooks (cheap unless a board was created). With `isolate: true` (default, `forks` pool) none of this is shared between files.

## 3. Redundancy

### Lesson content walked on real graphs by several suites

- `src/learning/runtime/lessonRestoration.part1-4.test.tsx` (561 s): for every one of 118 guided lessons, mounts the real graph twice, walks every frame twice (applying every scene action and animation), closes, compares full board signatures.
- `src/learning/content/sceneContentAgainstGraphs.test.tsx` (95 s): for every guided lesson mounts the real graph and applies every scene's actions, failing on a rejected action. The restoration walk already applies every frame's actions through `LessonSession` on the same graphs, so the first `describe` is largely subsumed (a rejection would throw in the walk); only the activities `describe` and the limit probes are unique.
- `src/learning/content/guidedExampleScenes.test.tsx` (14.5 s) applies example scene actions again; plus 12 per-chapter `*GuidedLessons.test.ts` files (44 s) mount real graphs per lesson for lesson-specific assertions (these are legitimately specific).
- `src/graphs/base/sceneReplacementContract.test.tsx` (110 s, one file, unsplit) runs a family x entry matrix of real graphs; `GraphTransientState.part1-4` (68 s locally, sampled; every graph in CI) runs the transient-state contract over `graphFactories`.

### Catalog totals asserted in many files (expectation churn)

The number of demonstrations/lessons, **118**, is hard-coded in `src/demonstrations.test.ts` (lines 135, 182), `src/Routes.test.tsx:112`, `src/learning/content/guidedExamplePreviewCopy.test.ts:23` (+ 125 copy entries at :28); `src/learning/chapter/authoredChapterCoverage.test.ts` pins 56/24/135; `src/learning/LearningPage.test.tsx` has 10 hard counts; `src/graphs/base/presets/PresetCatalog.test.tsx` keeps hand-written key lists of every preset route. Every new demonstration or lesson must edit 4-8 test files. Git shows these are the most-touched tests in the repo:

| touches | test-only | with src | fix commits | test s | file |
|---|---|---|---|---|---|
| 145 | 3 | 142 | 2 | 0.0 | `src/learning/runtime/lessonCatalog.test.ts` |
| 99 | 4 | 95 | 1 | 0.1 | `src/learning/content/familyChapters.test.ts` |
| 87 | 1 | 86 | 5 | 0.3 | `src/learning/content/lessonMathNotation.test.ts` |
| 74 | 4 | 70 | 0 | 26.9 | `src/graphs/base/presets/PresetCatalog.test.tsx` |
| 73 | 3 | 70 | 1 | 0.0 | `src/Routes.test.tsx` |
| 73 | 2 | 71 | 1 | 0.0 | `src/demonstrations.test.ts` |
| 64 | 16 | 48 | 2 | 0.0 | `src/learning/content/guidedExamplePreviewCopy.test.ts` |
| 64 | 0 | 64 | 1 | 3.4 | `src/DemonstrationsPage.test.tsx` |
| 55 | 9 | 46 | 2 | 0.0 | `src/learning/chapter/authoredChapterCoverage.test.ts` |
| 44 | 4 | 40 | 2 | 6.9 | `src/learning/LearningPage.test.tsx` |
| 32 | 0 | 32 | 0 | 0.1 | `src/learning/chapter/guidedExamplePreviews.test.ts` |
| 22 | 1 | 21 | 2 | 3.2 | `src/learning/runtime/GuidedLesson.test.tsx` |
| 22 | 0 | 22 | 1 | 0.0 | `src/graphs/base/presets/PresetImport.test.ts` |
| 21 | 0 | 21 | 1 | 3.0 | `src/graphs/base/DemonstrationWorkspace.test.tsx` |
| 16 | 1 | 15 | 0 | 4.2 | `src/learning/content/compgeoGuidedLessons.test.ts` |

22 commits are pure recount/rebase-count fixes, e.g. `f09be357 test: recount coverage 121 and preview copy 107/114 after the rebase onto the conic-focal lesson`, `1837597f test: Demonstration total 102 after ...`, `380b2a0e test: route catalog count includes interp-runge (fixes CI after IA-A-2d)`. These assertions "fail" on every parallel-stream rebase without signalling a bug; a derived check (every catalog entry has a route, a copy entry, a chapter home) catches the same omissions without a literal.

### Near-duplicate file families (6-token shingle Jaccard >= 0.45, strings/numbers abstracted)

- 9 files: `graphs/functions/ConvexityGraph.host.test.tsx` (1.7 s), `graphs/functions/ExtremaGraph.host.test.tsx` (1.9 s), `graphs/functions/MeanValueGraph.host.test.tsx` (2.3 s), `graphs/functions/TaylorGraph.host.test.tsx` (2.1 s), `graphs/functions/DarbouxGraph.host.test.tsx` (2.2 s), `graphs/functions/AccumulationGraph.host.test.tsx` (2.8 s), `graphs/functions/UniformConvergenceGraph.host.test.tsx` (2.2 s), `graphs/complex/ComplexMultiplicationGraph.host.test.tsx` (2.2 s), `graphs/functions/QuadratureGraph.host.test.tsx` (2.8 s)
- 5 files: `graphs/functions/ConvexityGraph.test.ts` (0.1 s), `graphs/functions/ExtremaGraph.test.ts` (0.3 s), `graphs/functions/DarbouxGraph.test.ts` (0.1 s), `graphs/functions/MeanValueGraph.test.ts` (0.1 s), `graphs/functions/TaylorGraph.test.ts` (0.2 s)
- 4 files: `graphs/compgeo/eulerLinePresetCollection.test.ts` (0.0 s), `graphs/compgeo/notablePointsPresetCollection.test.ts` (0.0 s), `graphs/compgeo/inscribedAnglePresetCollection.test.ts` (0.0 s), `graphs/compgeo/simsonLinePresetCollection.test.ts` (0.0 s)
- 4 files: `graphs/compgeo/BentleyOttmannLessonActions.host.test.tsx` (6.2 s), `graphs/compgeo/IntervalSweepLessonActions.host.test.tsx` (3.2 s), `graphs/compgeo/EarClippingLessonActions.host.test.tsx` (6.2 s), `graphs/compgeo/BezierHullsLessonActions.host.test.tsx` (2.2 s)
- 4 files: `graphs/functions/FixedPointGraph.host.test.tsx` (3.9 s), `graphs/functions/SequenceGraph.host.test.tsx` (5.0 s), `graphs/functions/BisectionGraph.host.test.tsx` (3.9 s), `graphs/functions/RootFindingGraph.host.test.tsx` (1.4 s)
- 3 files: `graphs/functions/ArcLengthGraph.test.ts` (0.2 s), `graphs/functions/DefiniteIntegralGraph.test.ts` (0.3 s), `graphs/functions/AreaBetweenCurvesGraph.test.ts` (0.1 s)
- 3 files: `graphs/functions/FixedPointGraph.test.ts` (0.3 s), `graphs/functions/SequenceGraph.test.ts` (0.7 s), `graphs/functions/BisectionGraph.test.ts` (0.2 s)
- 2 files: `graphs/functions/EulerGraph.lesson.test.ts` (0.0 s), `graphs/functions/QuadratureGraph.lesson.test.ts` (0.0 s)
- 2 files: `graphs/compgeo/EulerLineGraph.host.test.tsx` (6.8 s), `graphs/compgeo/NotablePointsGraph.host.test.tsx` (8.6 s)
- 2 files: `graphs/compgeo/PointSetIntervals.host.test.tsx` (4.5 s), `graphs/compgeo/PointSetSegments.host.test.tsx` (2.7 s)
- 2 files: `compgeo/giftWrapping.test.ts` (0.2 s), `compgeo/slowHull.test.ts` (0.4 s)
- 2 files: `graphs/curves/bezier/ExtrapolationGraph.test.ts` (0.0 s), `graphs/curves/rational/RationalExtrapolationGraph.test.ts` (0.0 s)
- 2 files: `graphs/patches/TensorPatchExport.test.tsx` (3.5 s), `graphs/patches/TriangularPatchExport.test.tsx` (1.8 s)
- 2 files: `learning/content/additionalGuidedLessons.test.ts` (0.0 s), `learning/content/expansionGuidedLessons.test.ts` (0.0 s)

Largest: 9 function/complex `*Graph.host.test.tsx` files (Convexity, Extrema, MeanValue, Taylor, Darboux, Accumulation, UniformConvergence, ComplexMultiplication, Quadrature; ~20 s total, pairwise similarity up to 0.84) share the same mount/readout/slider/preset scaffold; four `*LessonActions.host.test.tsx` (16 s) and four compgeo `*PresetCollection.test.ts` are similar. These are candidates for one table-driven host contract with per-graph rows, not deletion: each file still has some graph-specific assertions.

Name families: *Graph.host.test.tsx x19 (97.2 s); *Graph.test.ts x18 (2.3 s); *Model.test.ts x16 (6.3 s); *GuidedLessons.test.ts x12 (44.2 s); *Chapter.test.ts x10 (0.5 s); *Examples.test.ts x8 (0.3 s); *PresetCollection.test.ts x5 (0.1 s); *Page.test.tsx x4 (12.5 s); *TransientState.partN.test.tsx x4 (68.3 s); *LessonActions.host.test.tsx x4 (16.0 s); *Restoration.partN.test.tsx x4 (561.1 s); *PresetCollections.test.ts x3 (0.4 s); *FunctionGraph.test.ts x3 (0.1 s); *PatchGraph.test.tsx x3 (12.3 s).

### Tests typecheck or a single catalog test would cover

- Ten `*Chapter.test.ts` files (`src/learning/content/*Chapter.test.ts`, 0.5 s total, ~2,400 lines) and `familyChapters.test.ts` (99 touches) largely assert registry structure (ids exist, every lesson has a home, ordering). A shared chapter-registry invariant test plus `DemonstrationId` typing would cover the structural part; keep the prose/math claims.
- Content lints (`lessonMathNotation`, `guidedExamplePreviewCopy`, `mathAltText`, ...) are cheap (<1 s total) and catch real authoring errors (lessonMathNotation appears in 5 fix commits); keep them, but drop the literal totals.

## 4. Catch value from git history

- 792 of 1944 commits touch a test file; only 72 are test-only (no src change). 2418 of 2529 test-file touches came with src changes: tests are written alongside features, so history cannot show red-before-green directly, and commit messages almost never say a test caught something (4 hits, 2 are WIP notes of failing tests).
- 198 commits start with `fix`; 128 (65%) changed a test, i.e. most fixes add or adjust a regression test. Tests most often touched by fix commits are real-graph host tests (`BSplineNurbsGraph`, `UniformConvergenceGraph`, `ParametricCurveGraph`, `FixedPointGraph`, `sceneReplacementContract`, `VoronoiGraph.host`, `DelaunayGraph.host`, `TensorPatchEditing`, `NumberInput`): real-board files have 106 fix-commit touches against 35 test-only touches, the best ratio. These guard real rendering/lifecycle bugs (e.g. `0be8f98f fix: the NURBS graph builds one scene per mount and import`, `12565d18 fix: every graph family removes its own scene objects`).
- Content-lint and catalog-loop files: 683 touches but only 21 fix-commit touches and 36 test-only touches, the worst ratio; the churn is count maintenance, not bug catching.
- The 6 catalog-sweep files (incl. lessonRestoration, sceneContentAgainstGraphs) were touched only 15 times and never by a fix commit: either nothing regressed there, or failures surfaced and were fixed in feature commits. Their 664 s cost is currently not visibly paid back by history; they are a contract safety net whose value is unproven by the record.
- 273 test files were touched exactly once (written, never revisited).

## 5. Global per-file costs (config)

- `vite.config.mts`: `environment: 'jsdom'` for all files, no `environmentMatchGlobs`/projects; default `pool: forks`, `isolate: true`; `execArgv: ['--expose-gc']`; `mockReset: true`; `testTimeout` 15 s; custom `PartSequencer` for `*.partN` sharding; `provide.transientStateScope` computes a git diff at config load (one `git` call per run).
- `src/setupTests.ts`: imports `@testing-library/jest-dom/vitest` and `jsxgraph` in every file; patches `JXG.debug` and `initBoard`; afterEach frees leftover boards, yields 5 ms only if a board was created, and calls `gc()` only above 384 MB heap. Per-file cost is the jsdom window plus the JSXGraph module evaluation, multiplied by 650 forks.
- No MathJax is loaded in tests.

## Recommendations

1. **Sample `lessonRestoration` locally like GraphTransientState** (sample + lessons whose graph/lesson files changed; all in CI). Saves ~450-500 of 561 CPU-s locally (~22-25% of test time) and removes the 153 s critical-path file; wall time likely 269 s -> ~180-200 s. Also split into 8 parts so the CI critical path falls to ~75 s.
2. **Fold `sceneContentAgainstGraphs` "Guided example scenes" into the restoration walk** (or vice versa: one mount per lesson that both checks rejection and restoration). Saves up to ~90 CPU-s; keep the activities and limit-probe describes.
3. **Replace literal catalog totals with derived invariants** (`demonstrations.test.ts`, `Routes.test.tsx`, `guidedExamplePreviewCopy.test.ts`, `authoredChapterCoverage.test.ts`, `LearningPage.test.tsx`, `PresetCatalog.test.tsx` key lists). No runtime saving, but removes the most-churned test edits (~22 recount commits, 4-8 files per new lesson, rebase conflicts between parallel streams).
4. **Run kernel tests in a `node` project** (Vitest `projects`: `src/{analysis,compgeo,bezeg,linear,projective}/**` with `environment: node` and a setup file without jsxgraph/jest-dom). 157 files; estimated 0.3-0.6 CPU-s saved per file -> ~50-90 CPU-s, ~5-10 s wall. Optionally move setupTests' jsxgraph patch behind a lazy hook so DOM-only files skip it.
5. **Table-drive the near-duplicate host tests** (9 function `*Graph.host`, 4 `*LessonActions.host`, 4 compgeo preset collections, chapter-structure tests). Small time saving (~10-20 s), mainly fewer lines to maintain; and split `sceneReplacementContract.test.tsx` (110 s single file) into parts so it stops being the second-longest tail.

Bottom line: the real-graph host/component tests (181 files, 54% of time) show the clearest bug-catching record. The cost is concentrated in 6 catalog-wide real-graph sweeps (32% of time) with no fix-commit evidence, and the maintenance churn is concentrated in about 8 catalog/count files that mostly assert literals.
