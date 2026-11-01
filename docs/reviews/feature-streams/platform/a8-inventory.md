# A8 inventory (HEAD 51e2e54b, read-only). Paths under src/.

## 1. Listed math-in-graph items
| Item | Now | Duplicates | Target | Tests |
|---|---|---|---|---|
| accumulationFill (signed fill) | graphs/functions/AccumulationGraph.tsx:71-91 (exported; built on analysis/accumulation.ts accumulationPieces :65) | none; AreaBetween/DefInt fills already come from analysis (areaFill, fillData) | analysis/accumulation.ts | AccumulationGraph.test.ts:327-341 (only direct tests); analysis/accumulation.test.ts covers pieces only |
| sampleJumpPieces + leftLimit | graphs/functions/BisectionGraph.tsx:54-80 (used :251,:252,:256) | none. analysis/continuity.ts:49 has a different leftLimit(a): name clash when moving | analysis/bisection.ts (rename, e.g. jumpLeftLimit) | BisectionGraph.test.ts:420-431; analysis/bisection.test.ts none |
| grid snapping in Base | BaseFunctionGraph.tsx:72 gridValue(value, step). Only caller: its test UniformConvergenceGraph.test.ts:319-320. Dead in app code. | analysis/uniformConvergence.ts:39 gridUnits(value, step) and analysis/complex.ts:70 gridUnits(value) (fixed 1/20) | analysis/numbers.ts: one gridUnits(value, step, tol) used by both; gridValue = cleanNumber(units*step) | complex.test.ts:44-46; uniformConvergence via validators |
| uniformConvergence.ts:39, complex.ts:70 | exist; already in analysis | see above | see above | see above |
| alphaParameterization | graphs/curves/parametrisations/AlphaParamBezierCurveGraph.tsx:23 | none (Spline/Uniform graphs do not reimplement it) | src/bezeg (curve code) | AlphaParamBezierCurveGraph.test.ts:151-169 |

## 2. Other math in function/complex .tsx
- BaseFunctionGraph.tsx:553-557 slidingPoint drag: round(X/step)*step, clamp, cleanNumber (grid snapping again; interaction-bound).
- BaseFunctionGraph.tsx:443 signMarkX pixel clearance; ExtremaGraph.tsx:243 label-on-axis test (layout, keep).
- ComplexMultiplicationGraph.tsx:73-74 (view fit), :136 outsideDefaultView, :229 modulus equality "=" vs approx sign (a real predicate, could go to analysis/complex.ts), :261 and ComplexReciprocalGraph.tsx:250 label crowding hypot; ComplexReciprocalGraph.tsx:337-345 radius drag distance and atan2 handle angle (interaction).
- SequenceGraph.tsx:431 small `1 + Math...` inside status text args (not checked in detail).
- LinearFunctionGraph.tsx:90 hasLeg predicate; MeanValueGraph.tsx:108 match tolerance predicate.
- `clean = Math.round(v*1e9)/1e9+0` is identical to analysis/numbers.ts:5 cleanNumber: ContinuityGraph.tsx:17, DerivativeGraph.tsx:20, ExponentialFunctionGraph.tsx:17, LinearFunctionGraph.tsx:18, TrigonometricFunctionsGraph.tsx:22.
- BisectionGraph.tsx:37 formatPrecise (formatting, own test).
No other signed fills, root or area computations. Families: 18 in graphs/functions plus 3 in graphs/complex (spec says 20).

## 3. Shared drawing
Real, >=2 graphs:
- Signed fill curve setup: AccumulationGraph.tsx:246-258, AreaBetweenCurvesGraph.tsx:119-128, DefiniteIntegralGraph.tsx:146-156. Same attributes (fillOpacity 0.42, strokeOpacity 0.9, strokeWidth max(1, w*0.35), highlight false, fixed) and same updateDataArray copying `[part]` x/y into dataX/dataY. Differences: Accumulation adds dash for negative and a clamp; Area clips with limits() after the lookup. Proposal: base helper `signedFill(color, part, data, {dash?})`. Darboux (:187-211) and FixedPoint (:251-269) use different attributes: not shareable beyond the FillCurve type.
- Model-keyed caches `if (cache?.model !== model) cache = {model, value}` reset in onSceneRemoved: AccumulationGraph.tsx:135,164-167,357; ArcLengthGraph.tsx:45,86-87,164; AreaBetweenCurvesGraph.tsx:61,102-103,198; DefiniteIntegralGraph.tsx:63,133-136,202; BisectionGraph.tsx:101,142-145 (not cleared on scene removal; IterativeFunctionGraph.tsx:144 only pauses). Proposal: base `modelCache(compute)` cleared by the base in removeGeneratedObjects/onSceneRemoved (BaseFunctionGraph.tsx:332-343, :350-355).
Reject (rename one line):
- a thick-width helper (min/factors differ: AccumulationGraph.tsx:228 3/1.6, BisectionGraph.tsx:242 3/2, MeanValueGraph.tsx:169 3/2); a curve-creation wrapper; per-graph `strokeWidth = () => displaySettings.strokeWidth` (Base displayStrokeWidth :218 exists).
- Reuse (not new): Base displayThinWidth(factor) (:222) replaces ad-hoc `thin` at AccumulationGraph.tsx:227, ConvexityGraph.tsx:228, DarbouxGraph.tsx:188, ExtremaGraph.tsx:254, MeanValueGraph.tsx:168, TaylorGraph.tsx:210.

## 4. Redeclarations
- BoundingBox: Base declares it non-exported (BaseFunctionGraph.tsx:43), so Base must export it. Locals: AccumulationGraph.tsx:39, ArcLengthGraph.tsx:26, AreaBetweenCurvesGraph.tsx:39, ConvexityGraph.tsx:26, DarbouxGraph.tsx:26, DefiniteIntegralGraph.tsx:37, ExtremaGraph.tsx:24, FixedPointGraph.tsx:27, SequenceGraph.tsx:30, TaylorGraph.tsx:21, UniformConvergenceGraph.tsx:24, complex/ComplexMultiplicationGraph.tsx:21, ComplexReciprocalGraph.tsx:23, ComplexRootsGraph.tsx:21.
- FillCurve (Base exports it :82): local copies AccumulationGraph.tsx:54, AreaBetweenCurvesGraph.tsx:33, DarbouxGraph.tsx:41, DefiniteIntegralGraph.tsx:31 (FixedPointGraph.tsx:2 already imports it).
- Stroke widths: section 3.

## 5. Stale comment
BaseFunctionGraph.tsx:19-21 (spec said 17-19): "the synchronous model: `this.model` is the source of truth; React state only mirrors it for rendering. A Guided lesson scene applies all of its actions in one tick while `setState` is asynchronous, so lesson actions, drag handlers and inspector inputs must read and write `this.model` (through `commitModel`), never `this.state`;". True now: graph setState writes the scene store synchronously, so a later action may read this.state; board side effects run in onStateChange after the host commits. commitModel (:262-270) still writes this.model, then setState. Reword the claim; do not remove this.model in A8 (AGENTS.md warns against graph-field mirrors; flag to handler as a separate question).

## 6. Test-consolidation task 5
docs/tasks/test-consolidation/05-function-drawing-contract.md, implemented 1653fbb; coverage.md:137-149 "Task 5 disposition". All exclusions removed; STALE_VIEW_CACHED_CURVES no longer exists in src (grep empty). Causes were harness artifacts (boardSignature read points past numberPoints; empty fill stayed visible), plus a load timeout; no app cache bug found; fillCache is model-keyed and view clamping happens in updateDataArray. Repaired, so cache changes are safe and guarded by the unfiltered GraphTransientState comparisons. Recorded gaps: no zoom/pan/resize-at-unchanged-model regression test; no browser drag measurement. A8's cache slice should add that test and measure drags.

## 7. Slice plan
S1 math to analysis (~18 turns; no curves files): accumulationFill -> analysis/accumulation.ts; sampleJumpPieces/leftLimit -> analysis/bisection.ts (rename leftLimit); unified gridUnits in analysis/numbers.ts used by uniformConvergence.ts and complex.ts; gridValue uses it (move its test); five `clean` -> cleanNumber; direct analysis tests migrated from graph tests. Owns AccumulationGraph.tsx/test, BisectionGraph.tsx/test, analysis/{accumulation,bisection,numbers,uniformConvergence,complex}.ts + tests, BaseFunctionGraph.tsx (gridValue only), Continuity/Derivative/Exponential/Linear/Trig graphs. Checks: just unit src/analysis and src/graphs/functions, tsc.
S2 base sharing (~22 turns; after S1): export BoundingBox and delete 14 copies, 4 FillCurve copies, use displayThinWidth, add signedFill (3 graphs) and modelCache (5 graphs, base-cleared), fix stale comment, add resize/zoom-at-unchanged-model test. Owns BaseFunctionGraph.tsx, graphs/functions/*.tsx, graphs/complex/*.tsx. Checks: just unit src/graphs/functions src/graphs/complex, GraphTransientState and real-graph contract tests, tsc, just build; browser integral/area/accumulation/Darboux/bisection drag timings before/after (handler).
S3 alphaParameterization (~6 turns; the only slice touching curves: AlphaParamBezierCurveGraph.tsx/test + a src/bezeg file). Recommend "no change" or defer until A6 merges: single use, already a pure exported function with direct tests.
S1 and S2 are file-disjoint from src/graphs/curves and src/bezeg/impl/curve.
Also "no change": slidingPoint drag snap, pixel/label layout math (Base :443, Extrema :243, complex hypot/atan2), Darboux/FixedPoint fills.
