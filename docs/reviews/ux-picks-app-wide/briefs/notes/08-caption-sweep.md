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

# Batch 3 (stream A, 2026-11-27): complex and linear-map

## Verdicts
| Graph | Caption line | Verdict |
|---|---|---|
| complex-reciprocal | operands, z-bar, 1/z, w/z, z' (incl. hidden/undefined/pole words) | removed: rows z, w, conjugate, reciprocal, quotient, inversion; statuses predict, centre-pole |
| complex-reciprocal | "outside the view: ..." | KEPT: the board warning follows the zoomed box; the status uses the default view, so it differs; the only board text left, bottom-left |
| complex-roots | w and n; roots hidden; w = 0; roots z_k; test z, z^n | removed (whole caption): rows w, degree, roots/root-k, test, test-power; statuses predict, zero. Point names w, z_k on markers stay |
| complex-power | `z = value` | changed to the bare name "z" (a name on the geometry, like z², z³); the value is row z and the status |
| complex-power | `z²`, `z³`... | KEPT: names of the drawn powers; only z^n is a row |
| complex-power | `z⁴, modul 4` (beyond view) | KEPT: the modulus is in no row; the status lists only which powers |
| complex-power | `z = 0: no argument` | removed: status `complex_power_graph_status_zero` |
| euler-circle | point, v, a, S N, second, product | removed (all six, caption helper too): rows point, velocity, acceleration, sum, second, product; legend entries of the same ids |
| linear-map | columns; iterate; trace/det; composition det; det; orientation | removed (whole caption): rows a1/a2, iterate/step, tau/delta, product-det, det, orientation |

## Code
ComplexReciprocalGraph (boardValue, imports), ComplexRootsGraph, ComplexPowerGraph (imports), EulerCircleGraph (caption, scaleOf, pointText/secondText/productText), LinearMapGraph (caption, orientationText, COMPACT_BOARD_WIDTH import). No fragment keys.

## Lesson prose
complexEulerGuidedLessons.ts:193 (sl, en): "napis ob puščici na grafu" -> "v legendi poišči črtkano puščico pospeška" ("find the dashed acceleration arrow in the legend"). Other lessons name no removed caption.

## Catalog keys now unused, in sl.ts/en.ts (handler deletes; none in a fragment)
- complex_recip_board_hidden, complex_recip_board_undefined, complex_recip_board_value, complex_recip_board_inversion_pole (complex_recip_board_off_view stays)
- complex_roots_board_operands, complex_roots_board_root, complex_roots_board_roots_hidden, complex_roots_board_zero, complex_roots_board_test
- complex_power_graph_cap_z, complex_power_graph_cap_zero (cap_power and cap_out stay used)
- euler_circle_graph_cap_point, _velocity_near, _acceleration_near, _sum_near, _second, _product
- linear_map_board_columns, _det, _orientation, _iterate, _trace_det, _composition
- complex_board_operands stays (ComplexMultiplication). linear_map_orientation_* stay (rows).
Until deleted, three key-usage tests fail on "unused: <key>": ComplexPowerGraph.test (complex_power_graph key audit), EulerCircleGraph.test (euler_circle_graph audit), LinearMapIteration.host.test ("no linear_map key after linear_map_prompt is unused"). Not run again after the deletion because I may not edit sl.ts/en.ts.

## Tests switched
Reciprocal (initial state, 1/z, w/z, z', hidden, language: row assertions replace caption lines; the off-view board line test stays; the narrow-board length checks dropped, the circle line no longer exists), Roots (caption asserts now `[]`, rows already asserted every value; OBJECT_COUNT 23 -> 22; language test keeps the sl and en rows), Power (z caption is "z", no `z = ` text; zero caption asserted absent, status assertion unchanged), Euler (the caption test now asserts no caption text, rows point/second/product/sum/velocity/acceleration, legend ids; the two caption language checks dropped, rows `cos` remain), LinearMap.test and host (orientation caption lines dropped beside the existing `orientation` row asserts; det A = 0 -> row `det` '0'; decimal comma check moved to row `a1`).

## Observed checks
- typecheck: only the other worker's error (WavesGraph.test.tsx `captionLines`). `just lint` on the five graph files passed.
- `just unit` (src/graphs/complex, src/graphs/linear, content complex/linearMaps/declarationContract, localization): 7 failures first, after fixes only the three key-usage tests above (the first-run LinearMapGraph failure was my own deletion of `vector`, restored). Roots/Euler/LinearMap files rerun: only the Euler key audit fails.
- Golden (BEZEG_PARITY_GOLDEN_CHECK=1, not re-recorded): complex-euler, complex-power, complex-reciprocal, complex-roots differ in 27 states, every one a `captions` line only (power: `z = 1 + i` -> `z`). linear-map has no golden. waves differs (other worker).
- `just unit FirstTask`: one failure, FunctionsFirstTask waves (other worker).
- `just build` needed 5 reruns (inputs changed while the other worker edited); passed. `just smoke tests/unified-learning.smoke.spec.cjs` and `tests/guided-lessons.smoke.spec.cjs` passed (the only specs naming these ids). `just smoke-lesson` passed for complex-reciprocal, complex-roots, complex-power, complex-euler, linear-map, linear-map-composition (--port 4391 --workers=1). linear-map did NOT show the `valueWidthDrift null` probe failure here.
- Shots, 1440x900, graph page default state (lesson step 1 not shot; no lesson URL known): reciprocal: axis names Im, point names z, w, z-bar only. roots: Im, w. power: z, z², z³, z⁴ modul 4, z⁵ modul 5,66 (z⁴ and z⁵ labels at the left clear of the cards). euler: no text. linear-map: point names (a₂=Ae₂, a₁=Ae₁, e₁, e₂, p, Ap, A(e₁+e₂), O). Nothing sits under a card. 1280x720 not shot.

# Batch 4 (stream A, 2026-11-27): lattice-paths, counting-tree, logistic-map, recursion-growth, recursion-cobweb

## Verdicts
| Graph | Caption line | Verdict |
|---|---|---|
| lattice-paths | target; selected route | removed: rows target, route |
| lattice-paths | triangle-off sentence | removed: status triangle_off |
| lattice-paths | expansion binomial title | removed: row binomial |
| lattice-paths | start; split legend; triangle legend; expansion legend; over-cap line | KEPT: no declared legend (`legend: never`), these explain line styles/bars; start names the origin |
| counting-tree | tree and table title "kind: n, k" | removed: kind row + n/k setters |
| counting-tree | multiset formula and n! | removed: rows arrangements, all-different |
| counting-tree | cap_tree, multiset note, table rows, groups caption, row-view title/weights/selected/k | KEPT (explanations; table rows are the only all-kinds view; CB2 lesson names the groups caption) |
| logistic-map | start, fixed, 2-cycle, iterate, cursor | removed: rows x0, fixed, cycle, iterate, column, period |
| logistic-map | map rule, diagonal, cobweb, diagram, second split, onset, r tick marks | KEPT (rules/notes/axis marks; legend entries are bare names) |
| recursion-growth | n-th term "a10 = 21" | removed: row nth |
| recursion-growth | bars, limit, 4 interest lines, points, chord, axis names | KEPT: no declared legend; they are the only names of the lines (limit moved to row 1) |
| recursion-cobweb | start | removed: row start |
| recursion-cobweb | fixed, iterate | now shown only when off view ("outside the view"); in view = rows |
| recursion-cobweb | map rule, diagonal, cobweb note | KEPT |

## Code
LatticePathGraph, CountingTreeGraph (treeTitle, TITLE consts), LogisticMapGraph (cursor wrap/period helpers, openingWindow no longer reserves cursor room), GrowthGraph, RecursionCobwebGraph; combinatoricsPreviewCopy.ts alt texts (lattice, expansion, counting-tree). Lesson prose: none named a removed caption.

## Keys deleted (sl+en, lockstep, grepped)
combinatorics_lattice_cap_target/_route/_triangle_off; phase_graph_logistic_cap_start/_fixed/_cycle/_iterate/_cursor; recursion_graph_growth_cap_nth; recursion_graph_cap_start/_fixed/_iterate (_fixed_off, _iterate_off stay).

## Tests switched
Lattice (route, triangle-off, language), CountingTree (multiset formula, tree caption rows), Logistic (captions, cursor, narrow board, key count 49->44), Growth (nth row, SCENE_OBJECTS 55->54, shown count), Cobweb (default, off-view iterate, SCENE_OBJECTS 12->11, narrow count).

## Observed checks
- tsc clean, eslint clean on all changed files. `just unit` (combinatorics, dynamics, recursion graphs; content combinatorics/phasePortraits/recursion/declarationContract; localization) passed after fixes (one Growth shown-count fix rerun passed with FirstTask). Build passed. smoke-lesson counting-tree recursion-growth recursion-cobweb logistic-map passed; `just smoke` demonstrations and guided-lessons specs passed.
- Golden (check only, not re-recorded): all five differ only in `captions` lines (output read with head -5 per graph, so not every state was inspected).
- NOT done: browser shots viewed (taken to .tmp-b4-shots2 for logistic, lattice, counting; first logistic shot was blank, routes for growth `/analysis/growth`, cobweb `/analysis/recursion` not shot); scratch .tmp-b4-* files and .tmp-b4-shots* dirs left in the worktree root for handler to delete; 1280x720 not checked. lattice-paths-cb1/3/4 have no smoke-lesson id.
