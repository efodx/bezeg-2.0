# Task 4 consumer inventory: live function model

Source: [04-live-function-model.md](04-live-function-model.md), Work item 1 (spec section 4, F1-F4). Pins today's behavior; no production code changed. Characterization tests: `src/graphs/functions/BaseFunctionGraph.authority.test.tsx`. Raw counts: `docs/reviews/feature-streams/contracts/task4-inv-counts.txt` and `task4-inv-counts2.txt` (line counts, not occurrences).

## Classes (42 rows: 36 direct subclasses of `BaseFunctionGraph`, of which `IterativeFunctionGraph` is abstract, plus 6 through it)

Columns: st = `this.state.<f>` lines, ds = `= this.state` destructures, ss = `stateSnapshot()`, mr = `this.model` reads, mc = `modelCache`, mv = `memoView`. No class writes `this.model =` (mw = 0) or calls `setState` (sp = 0); only `commitModel` (`BaseFunctionGraph.tsx:263`) does. Dispositions: F flat reader, S snapshot reader, C reader with caches, P preset override, M model only.

| Class | st | ds | ss | mr | mc | mv | Overrides | Disposition |
|---|---|---|---|---|---|---|---|---|
| ComplexMultiplicationGraph | 0 | 0 | 3 | 18 | 0 | 2 | - | S: stateSnapshot reader; take snapshot from the model |
| ComplexReciprocalGraph | 0 | 0 | 3 | 21 | 0 | 1 | - | S: stateSnapshot reader; take snapshot from the model |
| ComplexRootsGraph | 0 | 0 | 3 | 15 | 0 | 1 | - | S: stateSnapshot reader; take snapshot from the model |
| AccumulationGraph | 0 | 1 | 0 | 14 | 1 | 0 | importPreset | P: preset override (importPreset); migrate with care |
| ArcLengthGraph | 0 | 2 | 0 | 6 | 1 | 0 | - | C: flat read plus cache; read model, keep cache key |
| AreaBetweenCurvesGraph | 0 | 3 | 0 | 5 | 1 | 0 | - | C: flat read plus cache; read model, keep cache key |
| BinomialNormalGraph | 0 | 0 | 2 | 15 | 4 | 1 | - | S: stateSnapshot reader; take snapshot from the model |
| ConicFocalGraph | 0 | 0 | 2 | 9 | 0 | 1 | - | S: stateSnapshot reader; take snapshot from the model |
| ContinuityGraph | 0 | 2 | 0 | 2 | 0 | 0 | - | F: flat reader; switch to the model accessor |
| ConvexityGraph | 0 | 1 | 0 | 9 | 0 | 2 | - | C: flat read plus cache; read model, keep cache key |
| CorrelationGraph | 0 | 0 | 2 | 19 | 0 | 1 | importPresetData | P: preset override (importPresetData); migrate with care |
| DarbouxGraph | 0 | 1 | 0 | 15 | 0 | 2 | - | C: flat read plus cache; read model, keep cache key |
| DefiniteIntegralGraph | 0 | 2 | 0 | 13 | 1 | 0 | importPreset | P: preset override (importPreset); migrate with care |
| DensityAreaGraph | 0 | 0 | 2 | 10 | 1 | 1 | - | S: stateSnapshot reader; take snapshot from the model |
| DerivativeGraph | 1 | 2 | 0 | 8 | 0 | 0 | - | F: flat reader; switch to the model accessor |
| EpicycleGraph | 0 | 0 | 2 | 24 | 0 | 0 | importPresetData | P: preset override (importPresetData); migrate with care |
| EulerGraph | 0 | 1 | 0 | 17 | 0 | 1 | - | C: flat read plus cache; read model, keep cache key |
| ExponentialFunctionGraph | 1 | 2 | 0 | 3 | 0 | 0 | - | F: flat reader; switch to the model accessor |
| ExtremaGraph | 0 | 1 | 0 | 9 | 0 | 2 | - | C: flat read plus cache; read model, keep cache key |
| FourierCoefficientsGraph | 0 | 0 | 4 | 33 | 0 | 1 | - | S: stateSnapshot reader; take snapshot from the model |
| FourierSeriesGraph | 0 | 0 | 2 | 18 | 1 | 1 | - | S: stateSnapshot reader; take snapshot from the model |
| FunctionInverseGraph | 0 | 1 | 0 | 13 | 0 | 0 | - | F: flat reader; switch to the model accessor |
| FunctionTransformationGraph | 0 | 1 | 0 | 11 | 0 | 0 | - | F: flat reader; switch to the model accessor |
| IterativeFunctionGraph | 0 | 0 | 0 | 1 | 0 | 0 | importPresetData | abstract base; importPresetData override, check with its 6 subclasses |
| LeastSquaresGraph | 0 | 0 | 2 | 20 | 0 | 1 | - | S: stateSnapshot reader; take snapshot from the model |
| LinearFunctionGraph | 0 | 2 | 0 | 5 | 0 | 0 | - | F: flat reader; switch to the model accessor |
| MeanValueGraph | 0 | 1 | 0 | 8 | 0 | 0 | - | F: flat reader; switch to the model accessor |
| PolynomialZerosGraph | 1 | 1 | 0 | 19 | 0 | 0 | - | F: flat reader; switch to the model accessor |
| QuadratureGraph | 0 | 1 | 0 | 10 | 0 | 1 | importPresetData | P: preset override (importPresetData); migrate with care |
| RationalFunctionGraph | 0 | 1 | 0 | 27 | 1 | 0 | - | C: flat read plus cache; read model, keep cache key |
| RungeInterpolationGraph | 0 | 0 | 2 | 12 | 1 | 0 | - | S: stateSnapshot reader; take snapshot from the model |
| SummaryStatisticsGraph | 0 | 0 | 2 | 25 | 0 | 1 | importPresetData | P: preset override (importPresetData); migrate with care |
| TaylorGraph | 0 | 1 | 0 | 15 | 0 | 2 | - | C: flat read plus cache; read model, keep cache key |
| TrigonometricFunctionsGraph | 1 | 2 | 0 | 7 | 0 | 0 | - | F: flat reader; switch to the model accessor |
| UniformConvergenceGraph | 0 | 0 | 3 | 15 | 0 | 2 | - | S: stateSnapshot reader; take snapshot from the model |
| LinearMapGraph | 0 | 0 | 2 | 19 | 0 | 1 | importPresetData exportPresetData | P: preset override (importPresetData, exportPresetData); migrate with care |
| BisectionGraph | 0 | 2 | 0 | 9 | 1 | 0 | - | C: flat read plus cache; read model, keep cache key |
| CltGraph | 0 | 0 | 2 | 17 | 0 | 1 | importPresetData | P: preset override (importPresetData); migrate with care |
| FixedPointGraph | 0 | 0 | 3 | 15 | 0 | 2 | - | S: stateSnapshot reader; take snapshot from the model |
| GeometricSeriesGraph | 0 | 0 | 2 | 13 | 0 | 1 | - | S: stateSnapshot reader; take snapshot from the model |
| RootFindingGraph | 0 | 2 | 0 | 16 | 1 | 0 | - | C: flat read plus cache; read model, keep cache key |
| SequenceGraph | 0 | 0 | 3 | 13 | 0 | 2 | - | S: stateSnapshot reader; take snapshot from the model |
Pilot candidate: `LinearFunctionGraph` (no caches, no overrides). Cache heaviest: `BinomialNormalGraph` (4 modelCache, 1 memoView); both are covered by the characterization tests.

## No subclass overrides

`onStateChange`, `sceneGraphState`, `syncReplacedScene`, `figurePresetGraphState`, `getInitialState`. No subclass adds non-model fields to state. Subclass-private mutable fields (`notice`, `adjustment`, playback controller) live outside the store. No model has a field named `initialized`, so there is no host/model field collision.

## Flat readers of the scene state

- Via `this.state`: Arc, AreaBetween, Continuity, Convexity, Darboux, Derivative, DefiniteIntegral, Euler, Exponential, Extrema, FunctionInverse, FunctionTransformation, Linear (`LinearFunctionGraph.tsx:169`, `:198` in `renderControls`, `renderReadout`), MeanValue, PolynomialZeros, Quadrature, RationalFunction, Taylor, Trig, Accumulation, Bisection, RootFinding.
- Via `stateSnapshot()`: Complex x3, Binomial, ConicFocal, Correlation, DensityArea, Epicycle, FourierCoefficients, FourierSeries, LeastSquares, Runge, Summary, UniformConvergence, LinearMap, Clt, FixedPoint, GeometricSeries, Sequence.
- `src/learning` has no flat-state reader (only `history.replaceState`).
- Tests that read flat state: `BaseFunctionGraph.test.ts:143,167` (167 reconciles `{...graph.state, ...graph.model}`), about 45 `*.test.ts(x)` under functions, complex and linear, `learning/runtime/GuidedLesson.test.tsx`, `functions/refusalTexts.testutil.ts`. `graphTransientStateContract.tsx:392` asserts function-graph `Object.keys(preset.graphState)` equals `Object.keys(graph.state)`, so it breaks under a nested or stripped representation.
- Precedent for a nested `model`: compgeo and projective graphs keep `model` in state and strip it on export (`PointSetGraph:451-457`; `PRESET_DATA_STATE_KEYS`, `graphTransientStateContract.tsx:67`).

## Capture, import, export and figure paths

| Path | Site | Today |
|---|---|---|
| `state` getter | `BaseGraph.tsx:166` | Store state, flat, includes the model fields. |
| `commitModel` | `BaseFunctionGraph.tsx:263` | Stores the given object as `this.model`, `setState({...next})`, then `syncSceneToModel()` unless `syncScene: false`, then `boardUpdate()`. Skips state and board after unmount. |
| `importPresetData` / `exportPresetData` | `:272-279` | Copy (`{...data}`, `{...this.model}`). |
| `sceneGraphState` | `BaseGraph.tsx:407`, override `BaseFunctionGraph.tsx:434` | Spreads `this.model` over state. |
| `exportPreset` | `BaseGraph.tsx:920-926` | `graphState` (flat, with model fields) plus `data`. |
| `importPreset` | `BaseGraph.tsx:933-939`, override `:289-300` | `graphState` first via `setBaseState`, then `importPresetData(storedPresetData(data))`; data wins. Null or undefined data imports the default model. |
| checkpoint capture / restore | `BaseGraph.tsx:664-706` | Captures `graphState` and `data`; restore imports data, replaces flat state, then `syncReplacedScene` (`BaseFunctionGraph.tsx:439`) writes the model back into state: the checkpoint's `data` wins. |
| mount / unmount | `BaseGraph.tsx:758-790`, `BaseFunctionGraph.tsx:189` | A remount calls `replaceState(getInitialState())`; unmount resets `this.model`. |
| figure batch | `BaseGraph.tsx:1060-1085`, `BaseFunctionGraph.tsx:453` | `importFigurePresetData` then deferred state `figurePresetGraphState` (model spread over state). The spread is hidden by `syncReplacedScene`; either one alone can go, both not (see the worker note). |
| `replaceSceneState` | `BaseGraph.tsx:1100` | Replaces the whole state. |

`SceneStore.setState` always replaces the state object (no equality check), so state identity is not a stable signal. Preset import overrides read `this.model.fn` around `super`: `importPreset` Accumulation:159, DefiniteIntegral:112; `importPresetData` Epicycle:206, Correlation:254, SummaryStatistics:214, Quadrature:111, Clt:185, IterativeFunctionGraph:130, LinearMap:106; `exportPresetData` LinearMap:102.

## modelCache and memoView consumers

modelCache recomputes when handed a different model object, so model identity is observable through it. `commitModel` keeps the given object; `importPresetData` and `exportPresetData` copy. Linear `setCoordinate` always commits a fresh object even for an equal value; Binomial skips the commit when the edit returns the same model (`BinomialNormalGraph.tsx:80`), a valid no-op. Users: Binomial (4 + memoView), then 1 modelCache each in Bisection, Accumulation, Arc, AreaBetween, DefiniteIntegral, DensityArea, FourierSeries, RationalFunction, Runge, RootFinding. memoView users: see the mv column.

## Stored graphState and checkGraphState

- A stored `graphState` carries flat model fields beside `data`; today `data` wins on import, restore and figure.
- Ten collections override `checkGraphState` in `functionPresetCollections.ts` because array or flat model fields live in graphState: FourierCoefficients :158, LeastSquares :189, Clt :218, Summary :233, Correlation :248, PolynomialZeros :294, RationalFunction :328, ConicFocal :366, Euler :384, Epicycle :409. The rest use the generic `checkSceneState` (`PresetCollection.ts:36`).
- `checkSceneState` applies name rules to flat model fields: `n`, `degree`, `t`, `alpha`, `d`, `v` must be finite numbers (`n` an integer at least 1) and keys starting with show, is, allow, hide, labelAll, curveSelected, initialized must be booleans. A latent collision; no model value was found to violate it (not exhaustively checked).
- Storage namespace: stored Presets live under `bezeg-2.0:preset-<key>` through `appStorage`; `commitPresetImport` and `preflightPresetImport` default to raw `window.localStorage`, so tests pass `appStorage`.
