# Current capabilities

Source inventory as of 2026-10-15. Routes below come from the ordered [`Demonstration metadata`](../src/demonstrations.ts), bound to graphs by [`src/Routes.tsx`](../src/Routes.tsx); unexposed implementations are excluded. The table identifies topics and components, not a claim that every interaction has passed runtime validation.

The 2026-10-09 [curve architecture deep dive](curve-architecture-deep-dive.md) adds the drawing/update path, dependency findings, and preservation requirements for future refactoring. The route inventory remains here; proposed library changes are compared in [renderer options](research/curve-renderer-options.md).

All routes in this release use the `/bezeg-2.0` base. The home Explore action and shared header open `/bezeg-2.0/demonstrations`. The collection displays every graph in one ordered grid with topic filters and localized search. Optional `topic` and `q` parameters make filtered selections shareable. Cards offer graph entry and reviewed Guided lesson entry. The active workspace has collection/family/current breadcrumbs and an on-demand switcher instead of a permanent topic tree. Cancelling the picker preserves the active scene and lesson; choosing another graph uses ordinary route navigation. Graph and lesson URLs, Presets, and import/export formats are retained. See [the library redesign](specs/demonstrations-library-redesign.md).

Static graph previews use the existing reviewed route-default asset map; the catalogue and picker do not mount boards or run previews. Their counts, order, family identities, and lesson availability derive from the shared catalogue. The original site remains at `/bezeg`; its browser presets remain isolated and require explicit file export/import.

| Area | Route suffix | Demonstration / component |
| --- | --- | --- |
| Foundations | `/bernstein` | Bernstein polynomials (`BernsteinGraph`) |
| Bézier | `/bezier/curve` | General polynomial curve (`BezierCurveGraph`) |
| Bézier | `/bezier/decasteljau` | De Casteljau construction (`DecasteljauGraph`) |
| Bézier | `/bezier/decasteljau2` | Alternative De Casteljau view (`DecasteljauGraph2`) |
| Bézier | `/bezier/affine` | Affine transformations (`AffineTransformBezierCurveGraph`) |
| Bézier | `/bezier/subdivision-2` | Subdivision (`SubdivisionGraph1`, imported as `DecasteljauGraph3`) |
| Bézier | `/bezier/subdivision` | Repeated subdivision (`SubdivisionGraph`) |
| Bézier | `/bezier/extrapolation` | Extrapolation (`ExtrapolationGraph`) |
| Bézier | `/bezier/elevation` | Degree elevation (`ElevationGraph`) |
| Rational | `/rational/base` | Rational Bézier curve (`RationalBezierCurveGraph`) |
| Rational | `/rational/rational-decasteljau` | Rational De Casteljau construction |
| Rational | `/rational/rational-elevation` | Rational degree elevation |
| Rational | `/rational/rational-extrapolation` | Rational extrapolation |
| Rational | `/rational/rational-subdivision` | Rational subdivision (`RationalSubdivisionGraph2`) |
| Rational | `/rational/farin-points` | Farin points (`FarinPointsCurveGraph`) |
| Rational | `/rational/circlen` | Circle from n curve pieces (`RationalBezierCurveCircleGraphN`) |
| Splines | `/spline/spline` | One-sided Cⁿ spline (`CnSplineGraph`) |
| Splines | `/spline/c1spline` | Symmetric C¹ spline (`C1SplineGraph`) |
| Splines | `/spline/c2spline` | Symmetric C² spline (`C2SplineGraph`) |
| Splines | `/spline/g1spline` | One-sided G¹ spline (`G1SplineGraph`) |
| Splines | `/spline/g1-sym-spline` | Symmetric G¹ spline (`G1SymmetricSplineGraph`) |
| PH | `/ph/cubic` | Cubic PH curve (`CubicPhBezierCurveGraph`) |
| PH | `/ph/quintic` | Quintic PH curve (`QuinticPhBezierCurve`) |
| Parameterization | `/param/param/alphaparam2` | Spline α parameterization |
| Parameterization | `/param/param/alphaparam` | Weighted parameterization |
| Parameterization | `/param/param/uniform` | Uniform / weighted PH parameterization |
| Functions | `/functions/linear` | Linear function through two points (`LinearFunctionGraph`) |
| Functions | `/functions/exponential` | Exponential function (`ExponentialFunctionGraph`) |
| Functions | `/functions/trigonometric` | Trigonometric functions (`TrigonometricFunctionsGraph`) |
| Functions | `/functions/continuity` | Continuity of a piecewise function (`ContinuityGraph`) |
| Functions | `/functions/derivative` | Derivative as a limit of secants (`DerivativeGraph`) |
| Functions | `/functions/integral` | Definite integral and Riemann sums (`DefiniteIntegralGraph`) |
| Functions | `/functions/area-between` | Area between curves (`AreaBetweenCurvesGraph`) |
| Functions | `/functions/arc-length` | Arc length by polylines (`ArcLengthGraph`) |
| Analysis | `/analysis/bisection` | Intermediate value theorem and bisection (`BisectionGraph`) |
| Analysis | `/analysis/mean-value` | Mean value theorem (`MeanValueGraph`) |
| Analysis | `/analysis/accumulation` | Accumulated integral and the fundamental theorem (`AccumulationGraph`) |
| Analysis | `/analysis/extrema` | Local and global extrema on a closed interval (`ExtremaGraph`) |
| Analysis | `/analysis/convexity` | Convexity, concavity and inflection (`ConvexityGraph`) |
| Analysis | `/analysis/darboux` | Lower and upper Darboux sums (`DarbouxGraph`) |
| Analysis | `/analysis/taylor` | Taylor polynomials and the Lagrange remainder (`TaylorGraph`) |

The Analysis family ([ADR 0011](adr/0011-analysis-family.md), [spec](specs/analysis-guided-lessons.md)) holds Batches A (released 2026-10-15) and B (released 2026-10-16) of that spec; Batch C (four more Demonstrations) is not started. Each batch only adds routes, preset collections (`bisection`, `mean-value`, `accumulation`, `extrema`, `convexity`, `darboux`, `taylor`) and lessons; no existing route, stored preset or lesson changed, so there is no breaking change.

The repeated `/param/param/` segment is present in the source. Treat any route cleanup as a compatibility decision.

## Shared user workflows

| Workflow | Current implementation | Review focus |
| --- | --- | --- |
| Find a demonstration | Grouped navigation generated from Demonstration metadata | Discoverability, topic labels, narrow-screen access |
| Manipulate geometry | Drag points; select a curve on the graph or use named curve buttons where selection is supported; applicable curves expose move, resize, rotate, add/delete point modes | Selection feedback, touch/keyboard equivalents, visible mode state |
| Explore a construction | Sliders, counts, switches, and curve-specific commands | Name every parameter; explain effect and valid range |
| Adjust the view | Axis selector; visible pan/zoom buttons; Shift + drag/wheel; labels; visual size slider | Separate viewport zoom from point/text/stroke size |
| Present a graph | Shared workspace has explicit controls for opening and closing the inspector | Projection readability, keyboard access, and physical-device behavior |
| Save an example | Named local presets, reset/delete, file import/export | Storage scope, compatibility, clear errors and recovery |
| Export a figure | SVG serialization, PNG capture, batch images in a ZIP | Mathematical content, formula rendering, consistent result |

All 41 active graph routes use the shared demonstration workspace. The eight function routes (ADR 0007, [spec](specs/function-concepts.md)) and the seven Analysis routes share `BaseFunctionGraph`: a synchronous parameter model stored as the preset `data`, inspector inputs and readouts instead of curve commands, and mathematics in `src/analysis/`. Commands depend on the demonstration and curve attributes. Rational curves add weight controls and standard-form display; PH curves add hodograph editing and offsets; spline demonstrations expose their continuity-specific controls and keep derived points constrained. Do not infer that every command is available on every route.

The [curve ownership foundation](specs/curve-ownership-refactor.md) retains these capabilities and JSXGraph. Rational point deletion now removes the matching weight; adding/deleting while standard-form display or Farin editing is active preserves every remaining effective weight. Batch figure capture waits for each scene and restores the entry geometry, selection and view without saving intermediate presets. Controls are temporarily unavailable during capture; running De Casteljau playback returns paused at the entry parameter, and running bisection playback is paused before a single figure or a batch is captured (`beforeFigureCapture`). Evaluation/sampling and physical-device performance are unchanged by this foundation.

## Demonstration controls and effects

Bounds below describe the UI rather than validated mathematical input domains. See [UI functionality](ui-functionality.md) for shared controls and selection.

| Demonstration | Controls and effects |
| --- | --- |
| Bernstein | Displayed degree 0–5, initially 1; stacked-area switch. Internal `n` counts basis functions, displayed degree is `n − 1`. |
| General polynomial Bézier | Editable points; eligible selected curves offer subdivision/shrink parameters 0–1, extrapolation 1–1.5, De Casteljau parameter 0–1, and degree elevation. |
| De Casteljau | Parameter 0–1, animation switch, speed 0–1, and whole-curve visibility; recursive interpolation and traced curve portion. |
| Alternative De Casteljau | Parameter/animation/speed controls and two curves from overlapping control-point subsets, which follow the live control points, joined by the segment whose point at t traces the curve. |
| Affine transformations | Translations ±0.5 units, scaling ×1.2 or ×0.8, rotations ±18°, and reflection about X/Y. |
| Single subdivision | Parameter 0.01–0.99, construction visibility, and action splitting the first curve into two pieces. |
| Repeated subdivision | Splits every piece at 0.5, at most five rounds (32 pieces); polygon and selected-piece De Casteljau visibility. |
| Polynomial extrapolation / elevation | Dedicated extrapolation parameter 1–1.5 and action, or degree-elevation action; generic mathematical commands are disabled. Elevation shows, by default, the next elevated control points live on the edges of the original control polygon with a dashed elevated polygon (Display switch; runtime-only, not stored in presets). |
| General rational Bézier | Weighted points and eligible Bézier operations; weight visibility, previous/next weight, ±0.25 adjustment, reset to 1, standard-form switch. |
| Rational De Casteljau | Inherits polynomial De Casteljau controls with weighted interpolation. |
| Rational extrapolation / elevation | Dedicated weighted extrapolation (1–1.5) or elevation action. Elevation uses the effective (evaluation) weights, including Farin-slider weights, and rebuilds Farin sliders and weight labels for the new degree. |
| Rational subdivision | Single-split construction with parameter 0.01–0.99; the active route is not repeated halving. |
| Farin points | Farin-point, weight, standard-form switches. Enabling Farin points keeps original points draggable; each Farin slider follows its two control points and keeps its ratio (weights) while points move. Curve selection and curve operations stay disabled until Farin points are turned off. |
| Circle from n pieces | Rational quadratic piece count, initially 3, minimum 2, no explicit maximum; regenerates a radius-3 circle construction. |
| One-sided Cⁿ spline | Continuity count 0…degree−1, degree continuity+1…input-point count; initially degree 2 and continuity 1. |
| Symmetric C¹ / C² | Quadratic C¹ / cubic C² constructions with shared label-all and hide-fixed switches; no degree/continuity counts. |
| One-sided / symmetric G¹ | Per-join β sliders, respectively 0.01–3 / 0.01–0.99, with shared spline visibility switches. |
| Cubic / quintic PH | Secondary editor for two/three generating `w` points; offsets, distance −3…3, count at least 1, and offset control points. Selected commands add control-point lines. Cubic polygon-geometry mode hides the curve and shows length labels, angles, and triangles. A board readout shows the exact polynomial arc length s(1) (Display switch, on by default). |
| Weighted parameterization | α 0–1 (initially 0.5), 1–40 interior samples (initially 10); redistributes samples on a polynomial curve. |
| Spline α parameterization | α 0–1, 0–50 samples (initially 25); changes segment parameter allocation and samples a cubic C² spline. |
| Uniform parameterization | PH weighted/uniform selector, initially weighted despite the title; 1–40 samples, α 0–1 in weighted mode. Uniform uses numerical arc-length inversion for approximately equal distances. The workspace editor adds parameterization alongside PH editing; inherited PH offset controls remain in Display. The legacy graph-command builder contains only the parameterization controls. |
| Linear function | Points P₁, P₂ dragged on a 0.1 grid or typed (\|coordinates\| ≤ 1000); k and n inputs move both points along the new line keeping their x; slope triangle with Δx/Δy. Equal x gives the vertical line `x = c` with k/n disabled; coincident points draw no line. |
| Exponential function | Base a 0.1–5 (step 0.05); points (0,1) and (1,a); mirror switch shows (1/a)ˣ. |
| Trigonometric functions | sin/cos/tan select; A −3…3, ω 0.25–4, φ −π…π in steps of π/12, B −3…3; reference graph switch; midline; tan drawn per branch with dashed asymptotes. |
| Continuity | a 0–3 (step 0.05) for ax² (x ≤ 1) and −ax+3 (x > 1); filled point f(1), hollow point for the right limit; colour and a status text show continuity (tolerance 10⁻⁹). |
| Derivative | x², sin x, eˣ select; point at x₀ dragged along the graph or typed (−4…4); h −2…2 skipping \|h\| < 0.01; exact tangent switch; quotient vs f′(x₀) readout. The view is kept when the function changes. |
| Definite integral | x², sin x, eˣ select (each resets the view to its own box); bounds dragged on the x-axis or typed (−7…7); n 1–150; left/right/midpoint/trapezoid; signed, oriented sums against the exact integral; constant object count for every n. |
| Area between curves | f = (x−2)², g = 3−(x−2)²; bounds −1…5 (default at the intersections 2 ∓ √1.5); mode under f / under g / between; exact signed ∫(g−f) and unsigned ∫\|g−f\|. |
| Arc length | sin x with endpoints A, B dragged along the graph (x rounded to 0.01) or typed (−7…7); n 1–100 polyline segments, drawn as one curve plus one marker curve (constant object count); polyline length vs arc length ∫√(1+f′²) (adaptive Simpson, 1e-9) and their difference. Lengths are never negative: the order of a and b does not matter. |
| Bisection | Example select: x² − 2 on [1, 2] (default), the sign step (−1 for x < 0, otherwise 1) on [−1, 1], x³ − x on [0.5, 2]; endpoints a, b typed (−4…4, a < b); **Next step**, **Play**/**Pause** and **Reset iteration**. Each step shows the midpoint, both function values, the retained half, the interval width and the step count (at most 60). The jump of the sign step is drawn as two pieces; an invalid bracket (equal signs), an endpoint root, an exact midpoint root and floating-point stagnation are stated in words. Editing the example or an endpoint returns to step 0 and pauses; playback takes one step per 600 ms and stops at the end. |
| Mean value theorem | x², x³ or \|x\| select; a, b and an independent tangent point c typed or dragged (−4…4, step 0.01) with a < c < b always (a value that breaks the order is rejected, not clamped); secant and tangent slopes, their difference and an agree/differ status; **Show matching point** reveals the exact points (c = (a + b)/2 for x², ±√((a² + ab + b²)/3) for x³, none or a whole interval for \|x\|), initially hidden. A corner of \|x\| inside (a, b) is reported as a failed differentiability hypothesis. |
| Accumulated integral | sin x, x² or eˣ select; lower bound a and point x typed or dragged (−7…7, step 0.01); one board draws f, the shaded signed region between a and x (+ and − marks as well as colour), the dashed accumulation curve A(x) = ∫ₐˣ f and the tangent to A at x, whose slope is f(x). A(x) is signed (never the unsigned area) and negative for x < a. The accumulation curve and everything that reveals it start hidden (**Show accumulation A**, also a lesson element). |
| Extrema | x², x³, \|x\| or sin x select; a, b typed or dragged (−4…4, step 0.01, a < b). Candidates are the endpoints (square), interior stationary points (diamond, f′ = 0) and corners (triangle, f′ does not exist), with the sign of f′ on each piece as a `+`/`−`/`0` row. **Show classification** reveals local minimum/maximum or neither and the global minimum and maximum, ties included; local means relative to the selected interval (endpoints one-sided). |
| Convexity | x², −x², x³ or x⁴ select; a, b and an independent tangent point t typed or dragged (−2…2, step 0.01, a < b); chord over [a, b] (solid) and tangent at t (dashed) always drawn. **Show second derivative** reveals the sign of f″ as a `+`/`−`/`0` strip, the inflection point and the verdict for [a, b]: convex (graph below the chord, above the tangent when t ∈ [a, b]), concave (reversed), or no claim with the reason (f″ changes sign; t outside [a, b]). Claims come from the analytic sign of f″, never from sampling. |
| Darboux sums | x² on [0, 2] or sin x on [0, 2π] select; a, b typed or dragged (−7…7, step 0.01, a < b); n 1–128 with **Refine** (doubles n, nested partition; disabled at 128 with an explanation). Lower rectangles filled, upper rectangles dashed; exact infimum and supremum from endpoints and critical points; L, U, the exact integral and U − L in the readout; each sum can be hidden for prediction. |
| Taylor approximation | eˣ, sin x, 1/(1 − x) or the flat function e^(−1/x) (x > 0) select; center c and point x typed or dragged within per-example domains (the flat example's center is fixed at 0); degree 0–10 by field or −/+. f solid, Tₙ dashed, the error as a segment at x; Tₙ(x), f(x), signed and absolute error (rounded, tiny values shown as 0). **Show error bound** reveals the Lagrange bound with its hypothesis, or why none is shown (flat). For 1/(1 − x) the convergence interval \|x − c\| < 1 − c is marked; wording separates the finite polynomial from series convergence. |

Sources: [Bernstein](../src/graphs/bernstein/BernsteinGraph.tsx), [polynomial](../src/graphs/curves/bezier), [rational](../src/graphs/curves/rational), [spline](../src/graphs/curves/spline), [PH](../src/graphs/curves/ph), [parameterization](../src/graphs/curves/parametrisations), and [command builders](../src/graphs/curves/object/inputs).

### Current caveats

Rational editing does not clamp weights to positive values; zero denominators can produce undefined coordinates. The circle route now requires at least 3 pieces (breaking change, 2026-10-10): with 2 pieces each arc is a half circle, its middle weight $\cos\frac{\pi}{2}$ is 0, and its middle control point lay near $10^{16}$. Users can no longer select 2 pieces; stored presets with two circle pieces still import as plain rational curves. The spline α-parameterization route now really starts at α = ½, matching its slider; before, the curve was drawn with α = 0 while the slider showed ½, so the route's initial shape changes slightly.

Weighted parameterization uses `(1−α)t / [α(1−t)+(1−α)t]`. α=0.5 preserves the original parameter; α=0/1 collapses interior samples to an endpoint. Spline α instead allocates normalized spans proportional to endpoint chord length raised to α. Uniform PH sampling uses a predictor and four Newton corrections, not exact equal spacing.

The C² default preset contains `continuity: 3`, but its mapped class implements cubic C². These are source observations, not fixes or accepted redesign decisions.

## Guided-learning capability

The product now has an optional, graph-anchored learning flow for all 41 active demonstrations. The three Batch A Analysis lessons (2026-10-15) are bisection with six steps, mean value theorem with six and accumulated integral with seven; the four Batch B lessons (2026-10-16) are extrema and convexity with seven steps each, Darboux sums with six and Taylor approximation with seven. All are in Slovenian and English, ask for a prediction before each reveal, have their numbers asserted in unit tests and a smoke row, but they, like all lessons, still need owner language and classroom review; the Batch B source citations taken from the research notes are listed as unresolved questions until checked against the book. The bisection lesson drives iteration through the typed `run-bisection-command` scene action ([ADR 0013](adr/0013-iteration-driven-by-scene-actions.md)); the frame controls still show only Play, Pause and Replay. The eight function and calculus lessons (2026-10-11/12) are five-step Slovenian/English drafts written from the [function concepts spec](specs/function-concepts.md); every number they state is asserted in unit tests. The three pilots have bounded six-step Slovenian lessons with English counterparts; the other 23 routes have bounded Slovenian/English implementation drafts with explicit Explanation/Calculation/Observation frames, formulas, worked examples, expected observations, and declarative prepared scenes. The spline, Farin-point, and alternative De Casteljau lessons draw on the owner's master's thesis (Štampar, 2024), and the circle lesson on Farin and Piegl & Tiller. The De Casteljau lessons expose explicit one-pass Play/Pause/Replay controls. Iterative playback is available only on the bisection route: the inspector's Next step, Play/Pause and Reset iteration use one shared transition ([ADR 0012](adr/0012-iterative-playback-controller.md)); a reopened preset is paused. Every lesson still requires owner language and classroom review.

The runtime preserves direct graph use, routes, Presets, and static hosting. Static content is keyed by Demonstration identity; lesson scenes and progress are session-only. Demonstration-owned typed Graph actions protect JSXGraph, cache, board, auxiliary-object, and mathematical ownership. Unsupported scene actions fail visibly and restore the pre-scene checkpoint. The workspace and the full catalog use the same exact availability allowlist in [`lessonCatalog.ts`](../src/learning/runtime/lessonCatalog.ts); no route receives a generic fallback lesson; a future route stays lesson-free until it is allowlisted. See the [guided lessons spec](specs/guided-lessons.md), [rollout spec](specs/guided-lessons-rollout.md), [expansion blueprint](specs/guided-lessons-content-expansion.md), [runtime task](tasks/guided-lessons/implement-guided-lesson-runtime.md), and [content task](tasks/guided-lessons/study-and-fill-pilot-content.md).

## Existing code beyond active routes

Circle-from-four-pieces, a derivation graph, and an affine G¹ spline entry are not bound by the routing adapter. Several alternative implementations remain in the source. They are candidates for review, not active product commitments.

`TODO.md` contains proposals such as arbitrary-dimensional points, API cleanup, and caching separation. Evaluate these individually when curating the later backlog; do not expose dormant demonstrations just because their components exist.
