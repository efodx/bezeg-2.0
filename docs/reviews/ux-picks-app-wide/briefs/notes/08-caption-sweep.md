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

# Batch 2 (stream A, 2026-11-27), PARTIAL: handoff at the 175k signal

## Verdicts (against each graph's declaration() and panel rows)
| Graph | Caption lines | Verdict |
|---|---|---|
| definite-integral, derivative | `f(x) = ...` | removed; declared Funkcija row (`integral_formula_label`, `derivative_formula_label`, fragments) |
| bisection | formula | removed; Funkcija row from `bisectionExample().latex` (sign-step is a cases formula) |
| bisection | step/width | removed: rows `step`, `width` |
| bisection | status (exact root, same sign, hypothesis, stagnation, limit) | removed: `statuses()` line in the Odčitki panel says the same (checked every termination) |
| euler-method | equation | removed; Funkcija row ("Enačba") from `eulerExample().latex` |
| euler-method | h/end/value/error, ratio, stopped | removed: rows h,end,value,error,ratio and status `left-window`/`non-finite` |
| quadrature | rule, n/approximation/error, ratio | removed; Funkcija row; rows n, approximation, error, ratio |
| root-finding | formula, step/error, status | removed; Funkcija row; rows step, error; panel status covers every termination |
| interp-least-squares | title, equation, sum, optimum, reason, key | removed: rows degree/equation/sum/optimal-sum, status `reason`, legend (points, residual, square). No Funkcija row (equation is a fit result row) |
| fourier-series | title+rule, N/x/eps, values, peak, key | removed; Funkcija row (`EXAMPLE_FORMULA_TEX`); rows n,x,epsilon,sum,target,error,peak-x,peak-value,overshoot; legend |
| fourier-coefficients | projection title, coefficient, sums, key; decay title, key | removed: rows selected, square-integral, parseval, n; legend. Note: for a_0 the old caption showed a_0, the row shows a_0/2 (constant term); the value a_0 itself no longer appears |

Code: BisectionGraph, EulerGraph, QuadratureGraph, RootFindingGraph (boardStatus deleted), LeastSquaresGraph, FourierCoefficientsGraph, FourierSeriesGraph, DefiniteIntegralGraph, DerivativeGraph; fragments bisection, euler-method, quadrature, root-finding, fourier-series, definite-integral, derivative gain `*_formula_label`.

## Lesson prose (sl + en)
fourierCoefficientsGuidedLessons.ts: "Graf izpiše tudi Parsevalovo vsoto" -> "Odčitki izpišejo ..." and "kar graf prikaže kot koeficient" -> "kar Odčitki prikažejo ...", both en lines too. interpolationLeastSquaresLesson.ts: "graf izpiše razlog" -> "Odčitki izpišejo razlog" (sl, en).

## Catalog keys deleted from sl.ts and en.ts (34 each, grep-checked unused, in lockstep)
Batch 1 list (arc_board_lengths, area_board_signed, area_board_area, continuity_board_limits, integral_board_values, derivative_board_slopes, function_inverse_board_point/slopes, function_transformation_board_point/_undefined, trig_reference_legend) plus bisection_board_*, root_finding_board_*, euler_ode_board_*, quadrature_board_*, interp_lsq_board_{title,manual_title,sum,optimal,key}, fourier_board_*, fourier_coef_board_*, fourier_decay_board_*. `interp_lsq_board_reason` stays (used).

## Tests switched (row/status/formula assertion replaces each caption assertion)
DefiniteIntegral, Derivative (formula.tex, text count 0, board object count 6->5), Bisection (progress from rows, status text from statuses(), count 17->16), RootFinding (status text via renderMessage), Euler.host, Quadrature.host, LeastSquares.host, FourierCoefficients.host (n row), FourierSeries.host. Host tests of graphs with a Funkcija row mock MathJax like AccumulationGraph.host (Euler, Quadrature, FourierSeries, Bisection, RootFinding); RootFinding.host calls `openTools()` again before Reset because the taller Odčitki card folds Orodja.

## Observed checks
- typecheck passed (after all edits). `just lint src/graphs/functions` passed. `just lint src` fails only in files not mine: parity.test.tsx 52:119 parse error, randomnessMarkov/randomnessWalk tests unused `chooseControl`.
- `just unit src/graphs/functions src/learning/content declarationContract src/localization`: second run 7 failed, all caption-related, then fixed and rerun: RootFinding.host, Euler.host, Quadrature.host, Bisection.test, DefiniteIntegral.test passed (32 s run). NOT rerun in full after the last fixes, nor after the key deletions and lesson-prose edits.
- Golden (BEZEG_PARITY_GOLDEN_CHECK=1, not re-recorded): fail for definite-integral, derivative, euler-method, quadrature, root-finding, interp-least-squares, fourier-series, fourier-coefficients: 59 differing states, every one a `captions` line only. bisection has no golden.

## NOT done (next)
1. Full `just unit` rerun of the four paths above plus `just unit FirstTask`.
2. `just build`, then `just smoke <spec>` for tests/guided-lessons.smoke.spec.cjs and tests/unified-learning.smoke.spec.cjs (the only specs naming these graphs), then `just smoke-lesson <id> --port 4391 --workers=1` for definite-integral-guided, derivative-guided, euler-method-guided, quadrature-guided, root-finding-guided, interp-least-squares-guided, fourier-series-guided, fourier-coefficients-guided, and the bisection lesson (id not found yet; grep the lesson registry).
3. Browser shots at 1440x900 and 1280x720 of the first step of each, to confirm no board text remains and the Funkcija row shows (MathJax rendering of the sign-step cases formula and fourier series `x\in(-\pi,\pi)` unseen).
4. Re-record goldens (handler).

## Batch 2 checks (2026-11-27)
- a_0 (owner decision): FourierCoefficientsGraph.tsx declares row `a0` ("Koeficient a₀" / "Coefficient a₀", key `fourier_coef_readout_a0`) beside the `selected` a_0/2 row when k = 0 and term a is selected. FourierCoefficientsGraph.host.test.tsx asserts label and value (seen red once before the row existed); declaration.test expects the extra row for the a0 state.
- `just unit` (functions, content, declarationContract, localization): passed (873 s, before the a0 row); after it, FourierCoefficientsGraph tests + FirstTask: only ProjectiveFirstTask (other worker) fails. `just build` passed.
- smoke-lesson passed for all nine ids; root-finding needed tests/guided-lessons.smoke.spec.cjs:2387-2390 switched from caption text to the `step` readout and `data-root-finding-status` attributes. Full guided-lessons and unified-learning specs passed.
- Golden check (parityGolden.test.tsx, not re-recorded): differ for definite-integral, derivative, quadrature, root-finding, fourier-series, fourier-coefficients (captions lines only) and projective-pascal (other worker). euler-method, interp-least-squares, bisection not reported as differing (9 failures counted, 7 distinct ids seen; unexplained).
- Shots (/tmp/shots, graph page default state, not lesson step 1): bisection, fourier-series, fourier-coefficients viewed: no board text, Funkcija row MathJax renders (f(x)=x²−2, sgn x). Others not viewed. In fourier-series the Orodja card overlaps the taller Odčitki card.
