# Inventory part 1: `src/graphs/functions`

Read from code at the worktree head (no browser run). Line numbers are for files in `src/graphs/functions/`. Status/readout: every panel renders `FunctionReadout` (C27 shared within the family) and, where it has a status, a `role="status" aria-live="polite"` group (C21 local: see item 8).
Common to all rows: C10 uses `ChoiceSelect` unless noted; C8 `NumberInput` commits per its own rule; C7/C23 use `ignoreOutOfDomain` (`BaseFunctionGraph.tsx:477`), which discards the `DomainError` reason, except where a `rejectedHint` or notice is named. Host Reset (C9) and host Fit (C20) exist on every graph (`BaseGraph.tsx:446`, `:711`).

## Panels

| Panel | Path | Shared | Local | Exception candidate |
| --- | --- | --- | --- | --- |
| Accumulation | AccumulationGraph.tsx:300-380 | C10, C8 (a, x) | C11 reveal button (:328) | none |
| ArcLength | ArcLengthGraph.tsx:160-192 | C8 (a, b), C13 (n) | none | none |
| AreaBetweenCurves | AreaBetweenCurvesGraph.tsx:185-220 | C10 (function, mode), C8 | none | none |
| BinomialNormal | BinomialNormalGraph.tsx:200-255 | C10, C11, C13 (n, p), C8 (p exact, k) | C20 "fit the view to the bars" react-bootstrap Button (:209) | none: remove, host Fit with `fitView` |
| Bisection | BisectionGraph.tsx:275-358 | C10, C8, C12 | C28 `formatPrecise` (9 decimals) | none |
| CLT | CltGraph.tsx:236-292 | C10, C11, C12, C13 (n, heights) | C22 private `notice` + `guarded` (:~99) | none |
| ConicFocal | ConicFocalGraph.tsx:245-318 | C10, C11, C13 (ε, ℓ, φ, weight) | C6 "matched weight" button, `aria-disabled` without a reason (:275); weight slider `disabled` (:270); `custom` option appended (:252) | none (P has only the slider as its path, see item 2) |
| Continuity | ContinuityGraph.tsx:120-153 | C13 | none | none |
| Convexity | ConvexityGraph.tsx:365-445 | C10, C8 (a, b, t) | C11 reveal button (:388) | none |
| Correlation | CorrelationGraph.tsx:375-454 | C1, C2, C5 (`CountSetter`), C4 (`PointListInput`), C10, C11 | C22 private notice; C18 drag refuses with notice (:244-252) | none |
| Darboux | DarbouxGraph.tsx:270-355 | C10, C8 (a, b), C8 (n as `NumberInput`) | C11 two reveal buttons (:304, :306); C6 Refine button native `disabled` + help (:292); n is a count by `NumberInput`, C5 candidate | none |
| DefiniteIntegral | DefiniteIntegralGraph.tsx:186-240 | C10 (function, method), C8, C13 (n) | none | none |
| DensityArea | DensityAreaGraph.tsx:155-211 | C10, C13 (μ, σ), C8 (a, b) | C20 "fit the view to the curve" Button (:164) | none: remove |
| Derivative | DerivativeGraph.tsx:140-187 | C10, C8 (x0), C13 (h), C11 | `stepOutOfBand` on the h slider (:155) | listed exception stays Slider-based |
| Epicycle | EpicycleGraph.tsx:470-629 | C10 (example, parametrization), C13 (N, time), C8 (handle coordinates) | C5 hand −1/+1 `Button`s beside the N slider, native `disabled` without reason (:488-491); C12 own Play/Pause `Button` + time slider (:609); C17 Shift+arrow handler (:515); C22 `rejectionValue` + `role=alert` (:589); C27 own scroll table | none |
| Euler | EulerGraph.tsx:280-360 | C10, C8 (x0, y0, end), C11 (exact) | C12 own Next step and Show all buttons, `aria-disabled` (:308-311); C13 step size = slider over an index into `STEP_SIZES` (:296) | none |
| ExponentialFunction | ExponentialFunctionGraph.tsx:90-125 | C13, C11 | none | none |
| Extrema | ExtremaGraph.tsx:365-448 | C10, C8 (a, b) | C11 reveal button (:387) | none |
| FixedPoint | FixedPointGraph.tsx:355-489 | C10, C8 (x0, digits), C12 | C11 reveal button (:388) | none |
| FourierCoefficients | FourierCoefficientsGraph.tsx:395-536 | C10 (view, scale, layout, term), C8 (handle values, K, decay N, harmonic), C11 | C17 Shift+arrow `onKeyDown` (:382, clamps silently at limit); four integer `NumberInput`s are counts, C5 candidates | none |
| FourierSeries | FourierSeriesGraph.tsx:320-420 | C10, C8 (x, ε) | C5 hand −/+ `count-setter-button` copy, `aria-disabled` + reason (:333-340); C20 two local view buttons "zoom to peak" / "whole view" (:359-360) | none; local view buttons are C20 candidates |
| FunctionInverse | FunctionInverseGraph.tsx:270-330 | C10, C8 (base, x0) | C11 two reveal buttons (:290, :294); C9 local Reset (:298) | none |
| FunctionTransformation | FunctionTransformationGraph.tsx:225-285 | C10, C8 (a, b, c, d, u) | C11 reveal (:247); C9 local Reset (:251) | none |
| GeometricSeries | GeometricSeriesGraph.tsx:260-325 | C10, C13 (a, q), C8 (terms, tolerance), C12 | none | none |
| LeastSquares | LeastSquaresGraph.tsx:255-348 | C1, C2, C5 (`CountSetter` points and degree, C26), C4 (`PointListInput`), C11, C13 | `ignoreOutOfDomain` around add/remove (:262) | none |
| LinearFunction | LinearFunctionGraph.tsx:165-215 | C8 (x1, y1, x2, y2, k, n) | `disabled` k and n fields when no line (:185, :188) | none |
| MeanValue | MeanValueGraph.tsx:300-403 | C10, C8 (a, b, c with ordering bounds) | C11 reveal (:324) | none |
| PolynomialZeros | PolynomialZerosGraph.tsx:283-334 | C10, C8 (k, zero positions) | `ZeroListEditor` (C1, C2, C4 local); C11 reveal (:299); C9 local Reset (:303) | zero list pairs z and multiplicity (see below) |
| Quadrature | QuadratureGraph.tsx:218-292 | C10 (rule, function), C8, C13 (n; `counts` per rule) | none | none |
| RationalFunction | RationalFunctionGraph.tsx:470-545 | C10, C8 (k), C13 (probe) | two `ZeroListEditor`s; C9 local Reset (:493) | zero list, as above |
| RootFinding | RootFindingGraph.tsx:262-361 | C10 (method, example), C8 (x0, x1), C12 | none | none |
| RungeInterpolation | RungeInterpolationGraph.tsx:212-277 | C10 (function, rule), C11 | C5 hand −/+ copy with `aria-disabled` (:225-231), a `NumberInput` between | none |
| Sequence | SequenceGraph.tsx:345-477 | C10, C8 (ε, L, threshold), C12 | C11 reveal (:381) | none |
| SummaryStatistics | SummaryStatisticsGraph.tsx:360-450 | C1, C2, C4 (`ValueListInput`), C10 (example, rule, σ), C11 | C1 local "Add value" button, `aria-disabled` (:374); C22 private notice + `guarded` (:95) | none |
| Taylor | TaylorGraph.tsx:320-433 | C10, C8 (center, x) | C5 hand −/+ copy with native `disabled` + describedby (:343-349); C11 reveal (:363) | none |
| TrigonometricFunctions | TrigonometricFunctionsGraph.tsx:158-208 | C10, C13 (A, ω, φ, midline), C11 | none | none |
| UniformConvergence | UniformConvergenceGraph.tsx:335-468 | C10, C8 (r, x, ε) | C5 hand −/+ copy (:361-367); C11 reveal (:381) | none |
| ZeroListEditor (panel part) | ZeroListEditor.tsx:60-106 | C10 (multiplicity select), C8 | C1 add button native `disabled` + reason (:100, :102); C2 per-row remove (:95), no reason at minimum; C22 own notice region (:59) | zero list pairs (below) |

Row count: 38 (37 graph panels plus the shared `ZeroListEditor`); the TSV lists 39 function files, the 39th being the helper `BaseFunctionGraph.tsx` (`Slider=1` there is only the name `localizedSliderValue`, :89). Files that are only helpers: `BaseFunctionGraph.tsx`, `IterativeFunctionGraph.tsx`, `FunctionReadout.tsx` (readout and legend), `FourierSpectrumBars.tsx` and `FourierDecaySpectra.tsx` (display only), `playbackElementTree.ts`, `functionPresetCollections.ts`, `*Messages.ts`. EpicycleGraph contains three sub-panels (`EpicyclePlayback`, `EpicycleRejection`, the table) counted in its row.

## Open items

**Item 1 (function graph bodies).** The table above is the answer, read from the JSX of every file's `renderControls`. Facts found beyond the spec:
- The hand count steppers are in Taylor, UniformConvergence, Runge, FourierSeries and Epicycle (`EpicycleGraph.tsx:487-491`: a −1/+1 `Button` pair beside a Slider; the spec's list says "Fourier and Epicycle"; FourierCoefficients has no stepper).
- Disabled protocols differ inside the family: `aria-disabled` + reason in FourierSeries, Runge and UniformConvergence; native `disabled` + `aria-describedby` in Taylor, Darboux Refine and ZeroListEditor Add; native `disabled` without a reason in Epicycle's −1/+1.
- 16 raw reveal/display buttons with `data-revealed` in 13 files (Accumulation :328, Convexity :388, Darboux :304 :306, Extrema :387, FixedPoint :388, FunctionInverse :290 :294, FunctionTransformation :247, MeanValue :324, PolynomialZeros :299, Sequence :381, Taylor :363, UniformConvergence :381). Some are display toggles (inverse, tangent, derivative, ghost) rather than results hidden until asked; the handler should decide which become `OnOffSwitch` and which the shared Reveal button.
- Integer counts entered by `NumberInput`, C5 candidates: Darboux n (:288), FourierCoefficients K, decay N and harmonic (:415, :445, :451), GeometricSeries terms (:274), Binomial k is a value, not a count.
- Euler's "step size" Slider ranges over an index into `STEP_SIZES` (:296), so the slider position is not the step value.
- Two react-bootstrap `Button`s (`BinomialNormalGraph.tsx:209`, `DensityAreaGraph.tsx:164`) are the C20 inspector fit buttons; `Epicycle` also uses react-bootstrap `Button`s for Play and −1/+1.

**Item 2 (typed path for each draggable point).** Read from code. All of these have one: Accumulation a, x (`NumberInput`, :315 :317); ArcLength a, b; AreaBetweenCurves a, b; BinomialNormal k (:221); Convexity a, b, t; Darboux a, b; DefiniteIntegral a, b; DensityArea a, b; Derivative x0 (:151); Extrema a, b; Euler P0 as x0 and y0 (:289 :291); FourierSeries x; FourierCoefficients value handles (`NumberInput` per slot, :438); FunctionInverse marker x0; FunctionTransformation both markers as u (:241); LinearFunction P1, P2 (:172); MeanValue a, b, c; PolynomialZeros and RationalFunction gliders (one `NumberInput` per zero in `ZeroListEditor`, :84); Quadrature a, b; RootFinding x0, x1; Taylor center, x; UniformConvergence x; Epicycle vertices and cubic handles (`renderHandleFields`, :526-548); LeastSquares points (`PointListInput`, :263); Correlation points (:386); Summary dots (`ValueListInput`, :368).
Without a typed path:
- **ConicFocal point P** (`ConicFocalGraph.tsx:200`): it moves the polar angle φ. The only inspector control for φ is a `Slider` (:262, step 0.01); there is no `NumberInput`. The slider is keyboard-operable, but decision 11 asks for a typed path.
Not draggable (checked): Bisection a, b, m (`styles.point.fixed`, :243); Exponential, Continuity, Rational probe and hole, FixedPoint markers, Runge nodes (:30 comment), Sequence, Taylor/Uniform value markers.

**Item 4 (local Reset buttons).** See `## Local Reset`.

**Item 7 (typed clamp, drag refusal), this directory.**
- Typed clamp: none found. Every typed path ends in a setter that throws `DomainError` (comment "reject, never clamp" in 21 model headers, for example `ConvexityGraph.tsx:86`). `TrigonometricFunctionsGraph.tsx:63` clamps after `isPhase` already accepted the value (inferred dead); it does not snap off-grid values beyond arithmetic noise.
- Silent keyboard clamp at the limit: Shift+Arrow in `FourierCoefficientsGraph.tsx:388` and `EpicycleGraph.tsx:518` (matches decision 7).
- Drag stops at the limit silently: `slidingPoint`/`axisPoint` clamp into [min, max] (`BaseFunctionGraph.tsx:605`); Euler :220-221; FunctionInverse :170; FunctionTransformation :146; LeastSquares :212; Epicycle `snapEpicycleValue` (`epicycleModel.ts:282`); Fourier handle `snapFourierValue` (`fourierCoefficientsModel.ts:275`); Polynomial/Rational :192/:337 (matches decision 3).
- Drag refused by a mathematical rule, silent: `axisPoint` puts the point back when `write` throws (`BaseFunctionGraph.tsx:584-586`), with no message, on Darboux a<b, Convexity, Extrema, MeanValue, UniformConvergence (r not below x), ConicFocal (:204-206), Euler. Decision 7 says such a refusal keeps a stated reason. Candidates to change.
- Drag refusal with a stated reason (already conforming): Epicycle `attempt` -> `showRejection` (:293-304); PolynomialZeros/Rational merge or zero-list rule (`applyEdit`, :60-69, notice region in `ZeroListEditor.tsx:59`).
- Drag refusal with a notice beside PointSet and Correlation: **Summary statistics** also (`dragValue`, :174-181, `setNotice`), but `moveSummaryValue` (`summaryStatisticsModel.ts:134-140`) refuses only a non-finite or out-of-range value, which is a coordinate limit; under decision 3 that notice is lost like Correlation's. Correlation: `CorrelationGraph.tsx:244-252`, `correlationModel.ts:127`.
- LinearFunction drag: `readPoints` ignores a position `parseLinearModel` rejects (:110-113) and does not move the point back (inferred from reading: the JSXGraph point stays where the pointer is, the model keeps the old value).

**Item 8 (mute announcements during Play), code reading only.** No function graph mutes. The six Play graphs (Bisection `:354`, Clt `:290`, FixedPoint `:482`, GeometricSeries `:318`, RootFinding `:354`, Sequence `:470`) render `role="status" aria-live="polite"` unconditionally; `playing` (`BisectionGraph.tsx:275`, `SequenceGraph.tsx:347`, and the same in the other four) feeds only `PlaybackButtons`/`playbackBlocks`. Their status text is a paragraph per status inside the live group, so every change re-reads the whole group. Sequence has no gate. Epicycle's status (`EpicycleGraph.tsx:558`) is `aria-live="polite" aria-atomic` and depends on N, not on time, so Play does not trigger it. Euler has no Play. So the spec's "written six times" does not occur in `src/graphs/functions`; nothing here is a gate to unify, and the shared rule must add one to six graphs. Screen-reader speech was not tested.

## Exception candidates

- **Zero list (PolynomialZeros, RationalFunction, `ZeroListEditor`).** Each entry pairs a position with a multiplicity 1-3, and add uses a first-free-position rule (decision 1 keeps it). Shared control it would otherwise use: C1/C2/C4 point list with a typed position per row. Proposed: the list stays one component, but its multiplicity is the shared `ChoiceSelect` already, add/remove move to the shared protocol (C6 reason, C7 channel) and the position field to the shared commit rule; exception reduces to "row has a second field".
- **Derivative h slider `stepOutOfBand`** (`DerivativeGraph.tsx:155`). Domain rule (h cannot be zero, skip the dead band); `Slider` stays. As the spec lists.
- **ConicFocal P without a typed field.** Technical reason: P is parametrised by φ on a conic with possibly unbounded points; the typed path is the φ slider. Prefer adding a φ `NumberInput` over an exception.
- **Euler step size slider over an index.** Optional: a `ChoiceSelect` over the sizes would be clearer; not an exception.
- **FourierSeries "zoom to peak" and "whole view"** (:359-360). The peak window is a domain-chosen view (`fourierZoomWindow`); can be supplied through `fitView` plus one extra view. Candidate for an exception to "Fit only"; the whole-view button equals Fit.
- **Epicycle Play and time slider** (:609-614). Time is host state (a frame driver, `useSyncExternalStore`) and does not stop at a step, unlike `PlaybackButtons`. Candidate exception to C12 until `PlaybackButtons` supports a continuous run.

## Local Reset

Host Reset is `BaseGraph.reset()` -> `reloadSelectedScene()` (`BaseGraph.tsx:294-296`): it reloads the selected stored Preset or the default scene, including the view, with transient state cleared.

| Button | What it restores | Same as host Reset? |
| --- | --- | --- |
| FunctionInverse "reset" (`FunctionInverseGraph.tsx:298`, `resetValues` :105) | `commitModel(defaultModel())` | Same model only when no stored Preset is selected. With a stored Preset selected the host restores the Preset, the local one restores the default model. The view is unchanged by the local one. |
| FunctionTransformation (:251, :98) | `commitModel(defaultModel())` | Same as above. |
| PolynomialZeros (:303, :113) | `commitModel(defaultModel())` | Same as above. |
| RationalFunction (:493, :141) | `notices.set(undefined)` + `commitModel(defaultModel())` | Same as above; the host clears the notice too (`restoreTransientState` :146). |
| Playback Reset in Bisection, FixedPoint, RootFinding (`resetIteration` -> `{...model, step: 0}`), Sequence (`resetSequenceTerms` -> `terms: 1`), GeometricSeries (`resetSeriesTerms`), CLT (`n: 1`, notice cleared :101) | Step only, same example and parameters; stops playback | Not the same: host Reset restores the whole scene. These are the C9 run Reset and stay with a distinct label. |
| ConicFocal "matched weight" (`ConicFocalGraph.tsx:275`) | `setWeight(null)` | Not a Reset in effect: only the bridge weight. |

Fits recommendation (not a decision): the four `resetValues` buttons restore the default model, so the host Reset gives the same result for the default scene and a different one only when a stored Preset is selected (host restores that Preset, which is arguably expected). Remove under decision 5 unless the handler wants the "default model while a Preset is selected" behaviour.

## Spec differences

- **C5 hand copies:** the spec names "Taylor, UniformConvergence, Runge, Fourier and Epicycle". Source: FourierSeries has a hand stepper (`FourierSeriesGraph.tsx:333-340`), FourierCoefficients has none (integer `NumberInput`s only), Epicycle has a −1/+1 pair beside a slider, not beside a field (`EpicycleGraph.tsx:487-491`).
- **C21 "Silent during Play is written six times":** none of the six Play function graphs, nor Epicycle, has such a gate (item 8). If the six writings are elsewhere (compgeo), the functions family has none; C21 "visible status group that re-reads every line" is confirmed (`role="status" aria-live="polite"` in 25 function files).
- **Decision 8 (off-grid typed values snap with a notice):** the function family does the opposite on purpose: `gridValue` "never rounds a real value such as 0.851 to the grid" (`BaseFunctionGraph.tsx:68-73`) and the models refuse off-grid values ("reject, never round", for example `FourierCoefficientsGraph.tsx:86`). Applying decision 8 changes the models' validity rules and their tests, not only the controls.
- **Decision 3 (drag stops silently at the limit):** Summary statistics' drag shows a notice for an out-of-range value (`SummaryStatisticsGraph.tsx:176`), as Correlation does; the spec's Correlation/PointSet list omits it.
- **Decision 11 (typed list is the keyboard path):** ConicFocal P has no typed field (item 2).
- **C18 cursor:** `bindMovablePointCursor` is missing here on LinearFunction P1/P2, the FourierCoefficients value handles and the Epicycle vertex/control handles (no import in those files); the rest of the family gets it through `slidingPoint` (`BaseFunctionGraph.tsx:602`) or explicit calls.
- **C20 Show all:** neither Notable nor EulerLine is in this directory; Euler's `show-all` (:310) is a playback action, as the evidence notes say.
- **`ignoreOutOfDomain` count:** 166 call sites in `src/graphs/functions` alone (text search), of the spec's "about 185" for all of `src/graphs`; `guarded()` appears in CLT, Correlation and Summary only, as the spec says.
