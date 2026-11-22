# View-setting sites in `src/` (task 01b, slice 1)

Method: search for `setBoundingBox(`, `zoomIn(`, `zoomOut(`, `zoom100(`, `zoomElements(`, `moveOrigin(`, `setZoom(`, `board.keepaspectratio =`, `board.boundingBox =` in non-test files, then reading each enclosing method and its callers. Branch `board-workspace`, 2026-11-22.

## Summary

Total: 77 sites in 49 non-test files (75 `setBoundingBox(`, 2 `zoomIn`/`zoomOut`). There are no `zoom100`, `zoomElements`, `moveOrigin`, `setZoom` calls and no direct `keepaspectratio`/`boundingBox` assignments in non-test code. Pan (BaseGraph.tsx:935) is a `setBoundingBox` call.

Contradiction with the task file: it says about 149 sites in 81 files. Non-test code has 77 in 49. The task file's figure must include test files (71 test files contain the call).

Counts per class (helper rows counted once, by the helper's own role; callers listed under each row):

| class | sites |
|---|---|
| initial | 10 |
| reset | 1 |
| preset | 4 |
| lesson | 4 |
| fit | 12 |
| resize | 6 |
| export | 1 |
| other | 6 |
| follows-parameter | 33 |

Counts per board kind: main board 69; secondary 8 (PH hodograph 5, surface-view board 1, parameter inset board 1, and 1 hodograph in the test-scene helper `realGraphScenes.ts:251`). No site sets the view of a thumbnail or separate export board: figure export uses the main board (BaseGraph.tsx:1363).

Helpers that funnel many callers:

- `BaseGraph.showInitialView` (BaseGraph.tsx:1184): callers `importPreset` (1166, preset without boardState), `exportPresetFigures` (1345, export), and the overrides in Logistic/BaseFunction/Contour/LP/Growth/Cobweb plus `keepOpeningView(... showInitialView)` in ComplexPowerGraph.tsx:163 and EulerCircleGraph.tsx:196 (initial). LogisticMapGraph.reframeToSize (190) calls it for resize.
- `BaseGraph.reloadSelectedScene` (BaseGraph.tsx:464, set at 490): callers 197 (language reload, other), 392, 397, 407 (preset select), 457 (Reset).
- `BaseGraph.fitToVisiblePoints` (BaseGraph.tsx:912): fit button (929), and refit-when-outside from BaseCurveGraph.tsx:262, PointSetGraph.tsx:230.
- Per-graph `fit()` helpers (BSpline, Hermite, Interpolation, Subdivision, ParametricCurve `fitToCurve`): each is called from `initialize` (initial), `fitPresetView` (preset), a lesson `prepareLessonDefaultScene` (lesson; Hermite, Interpolation, Parametric) and parameter setters or point edits (follows-parameter / refit-when-outside).
- `syncBoard` / `applyFrame` / `applyView` / `showFrame` in the dynamics, recursion, levelsets, mechanics, random, trig, lines, kinematics, waves graphs: key-gated, run on every scene sync after a state change (follows-parameter), and on `initialize`; `reframeToSize` variants call them on container resize.
- `ensurePointsVisible` (Correlation) / `ensureValuesVisible` (Summary): called from add/move/edit of data (fit when outside the box).

Surprises:

- Hodograph views are set in four places (BasePhBezierCurveGraph.tsx:147, 168, 255, 258) plus AuxiliaryBoardLifetime.ts:115; the board lifetime reapplies the preserved box on every resize.
- `BaseFunctionGraph.importPreset` (303), `AccumulationGraph.importPreset` (165) and `DefiniteIntegralGraph.importPreset` (115) set a view on a preset without `boardState` when the example/function changed: a view write that follows an example change inside the preset path.
- `PointInPolygonGraph.loadFigure` (229) is reachable from both the UI figure button and a lesson action.
- Several graphs pass `keepaspect = false` (Fourier, Waves, Growth, Cobweb, BSpline, Logistic, Simulation, surface view) and others `true`; BaseGraph passes `this.equalAxisUnits`.
- `graphTransientStateContract.tsx` and `realGraphScenes.ts` are non-test-named files that exist for tests.

## Table (by file)

Board: main unless stated. Class abbreviations as in the brief; "follows" = follows-parameter.

### base/

| site | function | class | notes |
|---|---|---|---|
| BaseGraph.tsx:490 | `reloadSelectedScene` | reset | default view before reset/preset reload; callers listed above (Reset 457, preset select 392/397/407, language 197) |
| BaseGraph.tsx:874 | `restoreLessonState` afterImport | lesson | checkpoint restore with stored `boardState` |
| BaseGraph.tsx:905 | `applyLessonView` | lesson | callers 633 (scene action), 674 (afterImport) |
| BaseGraph.tsx:922 | `fitToVisiblePoints` | fit | fit button 929; refit when point leaves view (BaseCurveGraph:262, PointSetGraph:230) |
| BaseGraph.tsx:930 | `navigateBoard` zoomIn | other | zoom-in button |
| BaseGraph.tsx:931 | `navigateBoard` zoomOut | other | zoom-out button |
| BaseGraph.tsx:935 | `navigateBoard` pan | other | pan buttons (up/down/left/right), 15% shift |
| BaseGraph.tsx:1014 | `createMainView` | initial | only when `!equalAxisUnits`: exact starting box after board creation |
| BaseGraph.tsx:1185 | `showInitialView` | initial | helper; callers: importPreset 1166 (preset), exportPresetFigures 1345 (export), overrides, keepOpeningView (initial) |
| BaseGraph.tsx:1363 | `exportPresetFigures` finish | export | main board, per-Preset figure capture with stored `boardState` |
| BaseGraph.tsx:1401 | `importBoardState` | preset | caller importPreset 1164 |
| graphTransientStateContract.tsx:107 | test contract helper | other | test support: copies a reference graph's box onto a surface graph |
| realGraphScenes.ts:249 | `changeScene` | other | test support, main board |
| realGraphScenes.ts:251 | `changeScene` | other | test support, hodograph (secondary) |

### bernstein/, combinatorics/, compgeo/

| site | function | class | notes |
|---|---|---|---|
| BernsteinGraph.tsx:113 | `initialize` | initial | |
| LatticePathGraph.tsx:204 | `frameBoard` | follows | frame key from state (view/a/b); callers `syncBoard` 351 (follows), `endDrag` 215 (refit when drag ended outside the box) |
| HullRobustnessGraph.tsx:265 | `syncModeView` | follows | `setRobustnessMode` 246, `syncScene` 341; restores saved chain box |
| HullRobustnessGraph.tsx:320 | `showBox` | follows | mode switch (Kettner/chain) through `syncModeView` 266 |
| PointInPolygonGraph.tsx:229 | `loadFigure` | follows | figure setter; callers UI figure button 511 and lesson action `applyPointSetAction` 252 |

### curves/

| site | function | class | notes |
|---|---|---|---|
| ArcLengthParametrizationGraph.tsx:351 | `showKindView` | follows | `setCurveKind` 364 (afterImport) |
| CurveOffsetGraph.tsx:279 | `showKindView` | follows | `setCurveKind` 292 |
| BSplineBasisGraph.tsx:159 | `fit` | fit | callers: `initialize` 128 (initial), `fitPresetView` 123 (preset), `setDegree` 182, `setClamped` 189, `setNormalized` 195 (follows), `editKnot` 246 (refit outside) |
| HermiteGraph.tsx:135 | `fit` | fit | callers: `initialize` 101 (initial), `fitPresetView` 96 (preset), `prepareLessonDefaultScene` 80 (lesson), `refitFor` 264 (refit outside) |
| InterpolationGraph.tsx:157 | `fit` | fit | callers: `initialize` 125, `fitPresetView` 120, `prepareLessonDefaultScene` 99, `refitFor` 219 |
| SubdivisionCurveGraph.tsx:164 | `fit` | fit | callers: `initialize` 132 (initial), `fitPresetView` 127 (preset), `resetRounds` 225, `addPoint` 268 (follows), `editPoint` 254 (refit outside) |
| ParametricCurveGraph.tsx:157 | `fitToCurve` | fit | callers: `initialize` 127, `fitPresetView` 106, `prepareLessonDefaultScene` 122, `setCurve` 181 and `setRadius` 188 (follows) |
| KinematicsGraph.tsx:413 | `applyFrame` | follows | callers `initialize` 301 (initial), `syncReplacedScene` 334, `syncBoard` 349 |
| AuxiliaryBoardLifetime.ts:115 | `resize` | resize | hodograph board, reapplies preserved box after `resizeContainer` |
| BasePhBezierCurveGraph.tsx:147 | `restoreTransientState` | lesson | hodograph; restores saved box from transient state (lesson checkpoint / figure restore) |
| BasePhBezierCurveGraph.tsx:168 | `afterTypedHodographEdit` | fit | hodograph; refit only if typed w is outside |
| BasePhBezierCurveGraph.tsx:255 | `handleHodographBoardResize` | resize | hodograph; applies pending restored box |
| BasePhBezierCurveGraph.tsx:258 | `handleHodographBoardResize` | resize | hodograph; default `[-5,5,5,-5]` |

### dynamics/, recursion/, random/, trig/, lines/, mechanics/, linear/, levelsets/

| site | function | class | notes |
|---|---|---|---|
| LogisticMapGraph.tsx:177 | `showInitialView` (override) | initial | callers `initialize` 269, `reframeToSize` 190 (resize) |
| PhasePortraitGraph.tsx:441 | `applyView` | follows | callers `initialize` 388, `syncBoard` 428, key-gated |
| GrowthGraph.tsx:188 | `showInitialView` (override) | initial | |
| GrowthGraph.tsx:287 | `applyFrame` | follows | callers `initialize` 242, `syncBoard` 278 |
| RecursionCobwebGraph.tsx:133 | `showInitialView` (override) | initial | |
| RecursionCobwebGraph.tsx:230 | `applyFrame` | follows | callers `initialize` 171, `syncBoard` 221 |
| SimulationGraph.tsx:525 | `applyFrame` | follows | callers `initialize` 459, `syncBoard` 492; skipped once after an imported view |
| TriangleSolverGraph.tsx:339 | `frameBoard` | follows | caller `syncBoard` 325 |
| LineGeometryGraph.tsx:373 | `frameBoard` | follows | callers `syncBoard` 362, `buildScene` 643 |
| DescentGraph.tsx:421 | `showFrame` | follows | callers `applyFrame` 414 (via `initialize` 350, `syncBoard` 402), `reframeToSize` 437 (resize) |
| LinearMapGraph.tsx:934 | `refitView` | follows | callers `syncSceneToModel` 919, handle "up" 863/876; skipped while `keepImportedView` |
| ContourMapGraph.tsx:222 | `showInitialView` (override) | initial | |
| ContourMapGraph.tsx:249 | `reframeToSize` | resize | settle timer after container resize |
| ContourMapGraph.tsx:510 | `applyView` | follows | callers `initialize` 420, `syncBoard` 484, key-gated |
| LinearProgramGraph.tsx:157 | `showInitialView` (override) | initial | |
| LinearProgramGraph.tsx:301 | `applyView` | follows | callers `initialize` 239, `syncBoard` 276 |

### functions/

| site | function | class | notes |
|---|---|---|---|
| BaseFunctionGraph.tsx:214 | `showInitialView` (override) | initial | example view or default box |
| BaseFunctionGraph.tsx:303 | `importPreset` | preset | example changed, no `boardState`: sets the example's box |
| BaseFunctionGraph.tsx:415 | `initialize` | initial | skipped if an imported `boardState` is kept |
| BaseFunctionGraph.tsx:452 | `prepareLessonDefaultScene` | lesson | default box |
| AccumulationGraph.tsx:126 | `setFunction` | follows | |
| AccumulationGraph.tsx:165 | `importPreset` | preset | function changed, no `boardState` |
| BinomialNormalGraph.tsx:105 | `fitToBars` | fit | callers `setExample` 110 (follows), `lessonFunctionActions` 123/127/134 (lesson) |
| CltGraph.tsx:117 | `refitIfChanged` | follows | callers `replaceAndRefit` 123, `setCdf` 143 |
| ConvexityGraph.tsx:153 | `setExample` | follows | |
| CorrelationGraph.tsx:197 | `ensurePointsVisible` | fit | refit when a point is outside; callers `addPoint` 205, `setPoint` 216, `editPoint` 270 |
| CorrelationGraph.tsx:262 | `setExample` | follows | |
| DarbouxGraph.tsx:126 | `setExample` | follows | |
| DefiniteIntegralGraph.tsx:78 | `setFunction` | follows | |
| DefiniteIntegralGraph.tsx:115 | `importPreset` | preset | function changed, no `boardState` |
| DensityAreaGraph.tsx:94 | `fitToCurve` | fit | caller `setExample` 99 (follows) |
| EulerGraph.tsx:89 | `setExample` | follows | |
| ExtremaGraph.tsx:135 | `setExample` | follows | |
| FixedPointGraph.tsx:158 | `setExample` | follows | |
| FourierSeriesGraph.tsx:145 | `setExample` | follows | |
| FourierSeriesGraph.tsx:175 | `zoomToPeak` | fit | "zoom to peak" button 349; `setN` 154 when zoomed |
| GeometricSeriesGraph.tsx:154 | `applyEdit` | follows | only when a, q or tolerance changed; callers: example/a/q/terms/tolerance setters |
| QuadratureGraph.tsx:131 | `setFunction` | follows | |
| SequenceGraph.tsx:194 | `setExample` | follows | |
| SummaryStatisticsGraph.tsx:109 | `ensureValuesVisible` | fit | callers `moveValue` 116, `addValue` 121, `editValue` 160 |
| SummaryStatisticsGraph.tsx:152 | `setExample` | follows | |
| TaylorGraph.tsx:144 | `setExample` | follows | |
| WavesGraph.tsx:403 | `showFrame` | follows | callers `applyFrame` 386/396 (via `initialize` 304, `syncBoard` 360), `syncReplacedScene` 345, `reframeToSize` 415 (resize); `keepNextFrame` skips it after an imported view |

### patches/

| site | function | class | notes |
|---|---|---|---|
| parameterInset.ts:51 | `mountParameterInset` ResizeObserver | resize | parameter inset board (secondary), fixed spec box reapplied on each resize |
| jsxSurfaceView.ts:877 | `resizeBoard` | resize | surface-view board (secondary), centred box `[-w/2, h/2, w/2, -h/2]`, `keepaspect=false` |
