# Audit 2: control logic and lesson commands (partial, budget handoff)

Status: partial. The budget hook stopped the run before the full table was appended. Findings below were verified by reading the cited lines.

## Part 1 rows

- P1 Refusal guard. `src/graphs/functions/BaseFunctionGraph.tsx:477` `ignoreOutOfDomain` swallows DomainError silently (164 call-site lines in functions/). `src/graphs/functions/CorrelationGraph.tsx:150`, `SummaryStatisticsGraph.tsx:95`, `CltGraph.tsx:114` `guarded()` show error.reason as notice (16 call-site lines). Expected: one refusal channel (C7, decision 3). Seam: one `runInspectorEdit` in BaseFunctionGraph that owns DomainError to notice and clear-on-success.
- P2 Notice shapes. `CorrelationGraph.tsx:162` Message; `EpicycleGraph.tsx:123` rejectionValue wrapped in `epicycle_rejected` (line 299); `InterpolationGraph.tsx:157` and `SubdivisionCurveGraph.tsx:266,278` state enum; `PointSetGraph.tsx:155` `noticeValue {kind}`. Seam: one notice type and setter.
- P3 Clear on success. Correlation clears on any success. Epicycle `EpicycleGraph.tsx:262` clears only when the model changed, so an accepted no-op keeps a stale refusal (code path only).
- P4 Typed-edit contract. Curve `editPoint` returns a string (Interpolation, Hermite, Subdivision). LSQ `LeastSquaresGraph.tsx:103` returns a string from a thrown DomainError. Correlation `CorrelationGraph.tsx:235` and Epicycle `EpicycleGraph.tsx:293` catch. Seam: one adapter for all typed fields.
- P5 Add at cap. `InterpolationGraph.tsx:204`, `HermiteGraph.tsx:232`, `SubdivisionCurveGraph.tsx:251` return silently. `correlationModel.ts:138` ok:false is shown via guarded (`CorrelationGraph.tsx:385`). `leastSquaresModel.ts:126` is swallowed at `LeastSquaresGraph.tsx:262`. Seam: model returns ok:false, shared guard shows it.
- P6 New-point position. Curves `InterpolationGraph.tsx:206`, `HermiteGraph.tsx:233`, `SubdivisionCurveGraph.tsx:253` and Correlation `correlationModel.ts:139` use last point plus one. LSQ `leastSquaresModel.ts:127` uses the rightmost x. Summary `summaryStatisticsModel.ts:150` uses the median. PointSet `PointSetGraph.tsx:177` uses the click. Seam: one `nextPointAfter` helper with named exceptions.
- P7 Refit after add. Curves call `ensureScene(); fit();` unconditionally (`InterpolationGraph.tsx:210`, `HermiteGraph.tsx:239`, `SubdivisionCurveGraph.tsx:257`). Correlation and Summary refit only when outside (`CorrelationGraph.tsx:169`, `SummaryStatisticsGraph.tsx:114`). LSQ `LeastSquaresGraph.tsx:77` has no visibility step. The out-of-view test is copied three times in the curve editPoint (`InterpolationGraph.tsx:186`, `HermiteGraph.tsx:190`, `SubdivisionCurveGraph.tsx:242`).
- P8 Minimum. Silent return in `InterpolationGraph.tsx:215`, `HermiteGraph.tsx:244`, `SubdivisionCurveGraph.tsx:262` (open). Notice for closed (`SubdivisionCurveGraph.tsx:266`). Board delete guard in `CurveEditingFeature.ts:121`. Guard in `JXGRationalBezierCurve.ts:122`. None in `AbstractJXGPointControlledCurve.ts:161`. The minimum lives in four places.
- P9 Pause on edit. Subdivision pauses on every accepted edit (`SubdivisionCurveGraph.tsx:224,237,255,268,281`). Epicycle halts only on a changed model (`EpicycleGraph.tsx:262`). Curve graphs without playback do nothing.
- P10 Playback wrappers. `DelaunayGraph.tsx:198`, `EarClippingGraph.tsx:161`, `HullTraceGraph.tsx:191` define the same nextStep, play, pause with exportBusy and atEnd guards. HullTrace adds `syncControllerInterval()`. Seam: a shared playback mixin. Not checked: the other eight files.
- P11 Custom example. `undefined` means custom in `CorrelationGraph.tsx:376`, `CltGraph.tsx:237`, `ConicFocalGraph.tsx:252`, `EulerLinePanel.tsx:77`. String 'custom' in state in `BSplineExtractionGraph.tsx:25,78,242` and the other two B-spline graphs. Disabled option in `EpicycleGraph.tsx:474`. Filtered in onChange in `ConicFocalGraph.tsx:253` and `GeometricSeriesGraph.tsx:265`. Seam: one `exampleChoice` helper.
- P12 Lesson path versus button. Correlation button is guarded (`CorrelationGraph.tsx:385`), lesson is bare (`CorrelationGraph.tsx:212`), so a lesson add at cap throws. Interpolation button and lesson both call the silent addPoint (`InterpolationGraph.tsx:272`, `:250`). `model.ts:477` says a cap refusal changes nothing, `model.ts:526` says refused with a message.

## Part 2 matrix (add, remove, move)

| Graph | Add | Remove | Move or set | Lesson action (model.ts) |
| --- | --- | --- | --- | --- |
| Interpolation | `addPoint()` no coordinates, `InterpolationGraph.tsx:203` | `removePoint()` last only, `:215` | `movePoint(i,x,y)` `:165`, `editPoint` typed | `add-point` no coordinates, `model.ts:477`, used in `interpolationGuidedLessons.ts:30` |
| Hermite | `addPoint()` no coordinates, `HermiteGraph.tsx:231` | `removePoint()` last only, `:244` | `movePoint(i,x,y)` `:160`, `moveTangent` | `add-point` no coordinates, `model.ts:487`, used in `interpolationGuidedLessons.ts:231` |
| Subdivision | `addPoint()` no coordinates, `SubdivisionCurveGraph.tsx:250` | `removePoint()` last only, `:262` | `movePoint(i,x,y)` `:224` | none |
| Correlation | `addPoint()` no coordinates, `CorrelationGraph.tsx:177` | `removePoint(index?)` `:182` | `setPoint(i,x,y)` `:186` | `add-point` no coordinates `model.ts:527` (no content caller found); `remove-point` index `model.ts:528` (no content caller); `set-point` x,y `model.ts:526` used in `probabilityGuidedLessons.ts:703` |
| LSQ | `addPoint()` no coordinates, `LeastSquaresGraph.tsx:77` | `removePoint()` last only, `:81` | `setPoint(i,value)` | no add or remove action; `set-point` x,y `model.ts:503` used in `interpolationLeastSquaresLesson.ts:28` |
| Summary | `addValue(value?)` accepts a value, `SummaryStatisticsGraph.tsx:128` | `removeValue(index)` `:` | `moveValue(i,value)` | `add-value` optional value `model.ts:517` used in `probabilityGuidedLessons.ts:545`; `remove-value` index `model.ts:518` (no content caller) |
| PointSet | `addPointAt(GridPoint)` accepts coordinates, `PointSetGraph.tsx:177` | `removePoint(index)` `PointSetGraph.tsx:257` | none per point | no add or remove; `set-points` replaces the whole list `model.ts:303`, used in `compgeoGuidedLessons.ts:14-15` |
| Curve object (board) | `addPoint(x,y)` accepts coordinates, `AbstractJXGPointControlledCurve.ts:155` | `removePoint(i)` `:161` | none | no lesson action for generic Bezier add or remove |
| Coons | none | none | `move-point` name, index, xyz, `model.ts:537` used in `coonsGuidedLessons.ts:24` | yes |
| Bezier extraction | none | none | `move-point` index, to, `model.ts:265` used in `bsplineExtractionGuidedLessons.ts:141` | yes |

Lesson summary: add with explicit coordinates is supported only by summary `add-value` (optional value) in lessons, and by the curve and PointSet graph methods. Interpolation, Hermite and Correlation lesson adds take no coordinates. Zeros (polynomial and rational) have no lesson action in `model.ts`.

## Not verified

- DeBoor and the other eight playback files for the exportBusy guard (P10).
- Full `BaseGraph` catch at `BaseGraph.tsx:209` for how lesson DomainError is reported (P12).
- Whether LSQ `commitModel` refits (P7).
- Reachability of `JXGBSplineCurve.ts:69` throw from board paths.
- Lesson coverage of Correlation add and remove is by grep only, not by running tests. No tests or builds were run.
