# Caption sweep, stream A batch 1 (function graphs), 2026-11-27

Verdicts checked against each graph's `declaration()` legend and `functionPanel()` rows.

| Graph | Caption line | Verdict |
|---|---|---|
| arc-length | `f(x) = sin x` | removed: legend entry "Graf f(x) = sin x" |
| arc-length | polyline/arc lengths | removed: rows `polyline`, `arc` |
| area-between-curves | signed/area values | removed: rows `signed`, `unsigned` |
| area-between-curves | f(x), g(x) formulas | removed: legend entries `f`, `g`. The on-curve letter labels `f`, `g` stay (curve names, not a caption) |
| continuity | status | removed: row `status` (same message); point colour still shows it |
| continuity | limits | removed: rows `left-limit`, `right-limit` |
| definite-integral | `f(x) = ...` | KEPT: the legend says only "Graf funkcije f", no row shows the rule |
| definite-integral | sum / exact | removed: rows `sum`, `exact` |
| derivative | `f(x) = ...` | KEPT: same reason |
| derivative | secant / exact slope | removed: rows `quotient`, `derivative` |
| exponential-function | `f(x) = a^x` | KEPT: rows show a, f(0), f(1), not the rule |
| exponential-function | `(1/a)^x = ... (mirror graph)` | KEPT, handler decision: no legend exists (`legend: never`), so it is the only name of the dashed mirror curve; only its base value repeats row `mirror-base` |
| function-inverse | rule, point, slopes | removed: rows `pair`, `point`/`mirror`, `forward-slope`/`inverse-slope` |
| function-transformation | rule, point | removed: rows `rule` (identical `transformRuleText`), `base-point`/`image-point` |
| linear-function | equation | removed: row `equation`. Triangle labels (dx, dy, P1, P2, (0,n)) stay: annotations on the geometry |
| trigonometric-functions | equation | removed: row `equation` |
| trigonometric-functions | reference line | removed: legend entry `reference` while shown |

Remaining board text at 1440x900 (shots): continuity (1,3-a) and (1,a); derivative f(x)=x^2, P, Q; integral f(x)=x^2, a, b; area-between f, g, P1, P2, a, b; arc-length A, B; linear P1, P2, dx, dy, (0,n); exponential f(x)=2^x, (0,1), (1,a); trigonometric none; transformations none; inverse none. No remaining line sits under a card at 1440x900.

Lesson prose (functionGuidedLessons.ts, sl and en): linear equation "on the graph" -> Readouts card (two steps); continuity "the graph says the jump/continuous" -> the Continuity row of the Readouts card (two steps).

Tests switched to rows/legend: ArcLength, AreaBetweenCurves, Continuity (status row replaces caption and its text colour contrast check, which only applied to the removed text), DefiniteIntegral, Derivative, LinearFunction, TrigonometricFunctions (legend), BaseFunctionGraph.authority (equation row).

## Catalog keys now unused, in sl.ts/en.ts (handler deletes)
arc_board_lengths, area_board_signed, area_board_area, continuity_board_limits, integral_board_values, derivative_board_slopes, function_inverse_board_point, function_inverse_board_slopes, function_transformation_board_point, function_transformation_board_point_undefined, trig_reference_legend. None are in a fragment.

## Golden (BEZEG_PARITY_GOLDEN_CHECK=1, not re-recorded)
Fail for arc-length, area-between-curves, continuity, definite-integral, derivative, linear-function, trigonometric-functions, function-inverse: 36 differing states, every one a `captions` line only. function-transformation and exponential-function: no difference.

## Checks
typecheck passed; lint on changed files passed; `just unit src/graphs/functions functionGuidedLessons schoolFunctionGraphs lessonMathNotation declarationContract src/localization` passed; `just unit FirstTask` passed.
