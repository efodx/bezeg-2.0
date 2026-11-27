# Caption sweep inventory (stream A, 2026-11-27)

The owner decided on 2026-11-27 to drop board caption lines that only repeat a legend entry or a readout row. The decision is in the "Board captions" bullet of `docs/tasks/ux-picks-app-wide/08-convert-all-graphs.md`, and Taylor's removal in `e0bfe3576` is the pattern.

This is a first pass by an Explore agent (Haiku). Verdicts are unverified: the sweep worker re-checks each line against the declaration's `legend` and `rows` before removing anything. Excluded here: accumulation, convexity and darboux (stream B), the compgeo graphs, and taylor (already done).

| Graph (file) | Caption code | Caption lines | First-pass verdict |
|---|---|---|---|
| ArcLength | functions/ArcLengthGraph.tsx:151 | f(x)=sin x; polyline/arc lengths | equation UNIQUE; lengths REPEAT rows |
| AreaBetweenCurves | functions/AreaBetweenCurvesGraph.tsx:184 | signed/area; f(x), g(x) | numbers REPEAT rows; f/g REPEAT legend |
| Bisection | functions/BisectionGraph.tsx:340 | title; progress; status | title UNIQUE; rest UNSURE |
| Continuity | functions/ContinuityGraph.tsx:120 | status; limits | REPEAT rows |
| DefiniteIntegral | functions/DefiniteIntegralGraph.tsx:189 | f(x); sum/exact | f(x) UNIQUE; values REPEAT rows |
| Derivative | functions/DerivativeGraph.tsx:135 | f(x); slopes | f(x) UNIQUE; slopes REPEAT rows |
| Euler | functions/EulerGraph.tsx:253 | title; ODE values; ratio | values REPEAT rows; ratio UNSURE |
| ExponentialFunction | functions/ExponentialFunctionGraph.tsx:91 | f(x); mirror line | f(x) UNIQUE; mirror partly REPEATS |
| FourierCoefficients | functions/FourierCoefficientsGraph.tsx:378 | title; coefficient; sums; key; decay | coefficient, sums, key REPEAT |
| FourierSeries | functions/FourierSeriesGraph.tsx:310 | title; parameters; values; peak; key | title UNIQUE; rest REPEAT |
| FunctionInverse | functions/FunctionInverseGraph.tsx:220 | rule; point; slopes | REPEAT rows |
| FunctionTransformation | functions/FunctionTransformationGraph.tsx:200 | rule; point | REPEAT rows |
| LeastSquares | functions/LeastSquaresGraph.tsx:243 | title; equation; sum; optimal; fit | UNSURE |
| LinearFunction | functions/LinearFunctionGraph.tsx:178 | line equation | REPEATS row |
| Quadrature | functions/QuadratureGraph.tsx:202 | f(x); values; ratio | f(x) UNIQUE; values REPEAT |
| RootFinding | functions/RootFindingGraph.tsx:267 | title; progress; status | title UNIQUE; progress REPEATS; status UNSURE |
| Trigonometric | functions/TrigonometricFunctionsGraph.tsx:161 | equation; reference | REPEAT row and legend |
| LinearMap | linear/LinearMapGraph.tsx:939 | columns; iterate; trace/det | UNSURE |
| ComplexReciprocal | complex/ComplexReciprocalGraph.tsx:381 | operands; z-bar; 1/z; w/z; z'; off-view | REPEAT rows; off-view UNIQUE |
| ComplexRoots | complex/ComplexRootsGraph.tsx:310 | operands; hidden; zero; roots; test | partly REPEAT; rest UNSURE |
| ComplexPower | complex/ComplexPowerGraph.tsx:339 | z; power; zero | z REPEATS; zero UNSURE |
| EulerCircle | complex/EulerCircleGraph.tsx:370 | point; velocity; acceleration; sum; second; product | REPEAT rows |
| LatticePath | combinatorics/LatticePathGraph.tsx:475 | target; start; route; triangle; binomial | REPEAT rows; triangle-off UNIQUE |
| CountingTree | combinatorics/CountingTreeGraph.tsx:426 | lines; multiset; n! | multiset/n! REPEAT; rest UNSURE |
| LogisticMap | dynamics/LogisticMapGraph.tsx:517 | start; fixed; r; cursor | REPEAT rows |
| Growth | recursion/GrowthGraph.tsx:385 | bars; nth; limit; chord; points | REPEAT rows |
| RecursionCobweb | recursion/RecursionCobwebGraph.tsx:338 | map; diagonal; legend; start; iterate | start/iterate/legend REPEAT; diagonal UNSURE |

Not yet listed: other declared graphs outside functions, complex, combinatorics, dynamics and recursion, such as the curve and B-spline graphs, De Casteljau, triangle centres, projective, isometries, line geometry, linear program, unit circle and triangle solver. The sweep's first session lists them.
