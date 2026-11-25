# Task 07 slice 5: where the old visible-points fit still ran

Director-eligible today: Taylor, function transformations, linear map, De Casteljau, phase portrait, bisection (Coons is a surface: no director). All but the paths below already set the view only through the director or the graph's own default box.

Paths that ran the old fit (`BaseGraph.fitToVisiblePoints`, BaseGraph.tsx:~1009, via `fitView`):

| Path | Where | Now |
|---|---|---|
| Fit button | DemonstrationWorkspace.tsx:~312 already calls `director.fitNow()`; `navigateBoard('fit')` (BaseGraph.tsx:~1026, reached by `props.navigate`) still ran the old fit | `fitNow()` when a director is set |
| Typed point edit on a curve graph (De Casteljau, others) | BaseCurveGraph.tsx:262 `refitWhenOutside(... fitToVisiblePoints)` | `fitToVisiblePoints` returns at once with a director; the director's triggers (mark change) cover it |
| Typed point edit on a point-set graph (triangle centres, notable points, cross-ratio if declared) | PointSetGraph.tsx:230 | same |
| Lesson actions, preset load, resize | none call the old fit (lesson view uses `applyLessonView`/`boardView.setIntent`, resize is the director's `resized()`) | unchanged |

Not the old fit, left alone: LinearMapGraph.tsx:1006 `refitView` (sets the graph's own default box on a mode or matrix change, not from visible points); `fitView` overrides (Fortune, Voronoi, HullRobustness, BSplineBasis, BinomialNormal, DensityArea, BaseFunctionGraph) are only reached through `fitToVisiblePoints`. Hermite, Interpolation, BSplineBasis, Subdivision and similar call their own private `fit()`; they declare no marks.

Mechanism: the workspace tells the graph about its director (`viewDirectorChanged` panel prop, BaseGraph `setViewDirector`); undeclared graphs never get one, so they keep today's behaviour.
