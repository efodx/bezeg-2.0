# Current capabilities

Source inventory as of 2026-10-08. Routes below come from the ordered [`Demonstration metadata`](../src/demonstrations.ts), bound to graphs by [`src/Routes.tsx`](../src/Routes.tsx); unexposed implementations are excluded. The table identifies topics and components, not a claim that every interaction has passed runtime validation.

The 2026-10-09 [curve architecture deep dive](curve-architecture-deep-dive.md) adds the drawing/update path, dependency findings, and preservation requirements for future refactoring. The route inventory remains here; proposed library changes are compared in [renderer options](research/curve-renderer-options.md).

All routes in this release use the `/bezeg-2.0` base. The home route is `/bezeg-2.0`; its Explore action and the header Demonstrations link open the catalog at `/bezeg-2.0/demonstrations`. The catalog offers three starting examples plus every graph route below, grouped by family. Route suffixes and preset interchange files are retained. The separate original site remains at `/bezeg`; its browser presets are isolated and must be exported there and imported explicitly into this release.

Static graph previews illustrate the three starting cards and each of the six mathematical families. All 26 catalog links remain visible; the catalog adds no live graphs or animation.

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

All 26 active graph routes use the shared demonstration workspace. Commands depend on the demonstration and curve attributes. Rational curves add weight controls and standard-form display; PH curves add hodograph editing and offsets; spline demonstrations expose their continuity-specific controls and keep derived points constrained. Do not infer that every command is available on every route.

The [curve ownership foundation](specs/curve-ownership-refactor.md) retains these capabilities and JSXGraph. Rational point deletion now removes the matching weight; adding/deleting while standard-form display or Farin editing is active preserves every remaining effective weight. Batch figure capture waits for each scene and restores the entry geometry, selection and view without saving intermediate presets. Controls are temporarily unavailable during capture; running De Casteljau playback returns paused at the entry parameter. Evaluation/sampling and physical-device performance are unchanged by this foundation.

## Demonstration controls and effects

Bounds below describe the UI rather than validated mathematical input domains. See [UI functionality](ui-functionality.md) for shared controls and selection.

| Demonstration | Controls and effects |
| --- | --- |
| Bernstein | Displayed degree 0–5, initially 1; stacked-area switch. Internal `n` counts basis functions, displayed degree is `n − 1`. |
| General polynomial Bézier | Editable points; eligible selected curves offer subdivision/shrink parameters 0–1, extrapolation 1–1.5, De Casteljau parameter 0–1, and degree elevation. |
| De Casteljau | Parameter 0–1, animation switch, speed 0–1, and whole-curve visibility; recursive interpolation and traced curve portion. |
| Alternative De Casteljau | Parameter/animation/speed controls and two curves from overlapping control-point subsets. The intended connecting segment currently uses the same point twice. |
| Affine transformations | Translations ±0.5 units, scaling ×1.2 or ×0.8, rotations ±18°, and reflection about X/Y. |
| Single subdivision | Parameter 0.01–0.99, construction visibility, and action splitting the first curve into two pieces. |
| Repeated subdivision | Splits every piece at 0.5, at most five rounds (32 pieces); polygon and selected-piece De Casteljau visibility. |
| Polynomial extrapolation / elevation | Dedicated extrapolation parameter 1–1.5 and action, or degree-elevation action; generic mathematical commands are disabled. |
| General rational Bézier | Weighted points and eligible Bézier operations; weight visibility, previous/next weight, ±0.25 adjustment, reset to 1, standard-form switch. |
| Rational De Casteljau | Inherits polynomial De Casteljau controls with weighted interpolation. |
| Rational extrapolation / elevation | Dedicated weighted extrapolation (1–1.5) or elevation action. Elevation uses the effective (evaluation) weights, including Farin-slider weights, and rebuilds Farin sliders and weight labels for the new degree. |
| Rational subdivision | Single-split construction with parameter 0.01–0.99; the active route is not repeated halving. |
| Farin points | Farin-point, weight, standard-form switches. Enabling Farin points keeps original points draggable; each Farin slider follows its two control points and keeps its ratio (weights) while points move. Curve selection and curve operations stay disabled until Farin points are turned off. |
| Circle from n pieces | Rational quadratic piece count, initially 3, minimum 2, no explicit maximum; regenerates a radius-3 circle construction. |
| One-sided Cⁿ spline | Continuity count 0…degree−1, degree continuity+1…input-point count; initially degree 2 and continuity 1. |
| Symmetric C¹ / C² | Quadratic C¹ / cubic C² constructions with shared label-all and hide-fixed switches; no degree/continuity counts. |
| One-sided / symmetric G¹ | Per-join β sliders, respectively 0.01–3 / 0.01–0.99, with shared spline visibility switches. |
| Cubic / quintic PH | Secondary editor for two/three generating `w` points; offsets, distance −3…3, count at least 1, and offset control points. Selected commands add control-point lines. Cubic polygon-geometry mode hides the curve and shows length labels, angles, and triangles. |
| Weighted parameterization | α 0–1 (initially 0.5), 1–40 interior samples (initially 10); redistributes samples on a polynomial curve. |
| Spline α parameterization | α 0–1, 0–50 samples (initially 25); changes segment parameter allocation and samples a cubic C² spline. |
| Uniform parameterization | PH weighted/uniform selector, initially weighted despite the title; 1–40 samples, α 0–1 in weighted mode. Uniform uses numerical arc-length inversion for approximately equal distances. The workspace editor adds parameterization alongside PH editing; inherited PH offset controls remain in Display. The legacy graph-command builder contains only the parameterization controls. |

Sources: [Bernstein](../src/graphs/bernstein/BernsteinGraph.tsx), [polynomial](../src/graphs/curves/bezier), [rational](../src/graphs/curves/rational), [spline](../src/graphs/curves/spline), [PH](../src/graphs/curves/ph), [parameterization](../src/graphs/curves/parametrisations), and [command builders](../src/graphs/curves/object/inputs).

### Current caveats

Rational editing does not clamp weights to positive values; zero denominators can produce undefined coordinates. The circle route now requires at least 3 pieces (breaking change, 2026-10-10): with 2 pieces each arc is a half circle, its middle weight $\cos\frac{\pi}{2}$ is 0, and its middle control point lay near $10^{16}$. Users can no longer select 2 pieces; stored presets with two circle pieces still import as plain rational curves. The spline α-parameterization route now really starts at α = ½, matching its slider; before, the curve was drawn with α = 0 while the slider showed ½, so the route's initial shape changes slightly.

Weighted parameterization uses `(1−α)t / [α(1−t)+(1−α)t]`. α=0.5 preserves the original parameter; α=0/1 collapses interior samples to an endpoint. Spline α instead allocates normalized spans proportional to endpoint chord length raised to α. Uniform PH sampling uses a predictor and four Newton corrections, not exact equal spacing.

The C² default preset contains `continuity: 3`, but its mapped class implements cubic C². These are source observations, not fixes or accepted redesign decisions.

## Guided-learning capability

The product now has an optional, graph-anchored learning flow for all 26 active demonstrations. The three pilots have bounded six-step Slovenian lessons with English counterparts; the other 23 routes have bounded Slovenian/English implementation drafts with explicit Explanation/Calculation/Observation frames, formulas, worked examples, expected observations, and declarative prepared scenes. The spline, Farin-point, and alternative De Casteljau lessons draw on the owner's master's thesis (Štampar, 2024), and the circle lesson on Farin and Piegl & Tiller. The De Casteljau lessons expose explicit one-pass Play/Pause/Replay controls. Every lesson still requires owner language and classroom review.

The runtime preserves direct graph use, routes, Presets, and static hosting. Static content is keyed by Demonstration identity; lesson scenes and progress are session-only. Demonstration-owned typed Graph actions protect JSXGraph, cache, board, auxiliary-object, and mathematical ownership. Unsupported scene actions fail visibly and restore the pre-scene checkpoint. The workspace and the full catalog use the same exact availability allowlist in [`lessonCatalog.ts`](../src/learning/runtime/lessonCatalog.ts); no route receives a generic fallback lesson; a future route stays lesson-free until it is allowlisted. See the [guided lessons spec](specs/guided-lessons.md), [rollout spec](specs/guided-lessons-rollout.md), [expansion blueprint](specs/guided-lessons-content-expansion.md), [runtime task](tasks/guided-lessons/implement-guided-lesson-runtime.md), and [content task](tasks/guided-lessons/study-and-fill-pilot-content.md).

## Existing code beyond active routes

Circle-from-four-pieces, a derivation graph, and an affine G¹ spline entry are not bound by the routing adapter. Several alternative implementations remain in the source. They are candidates for review, not active product commitments.

`TODO.md` contains proposals such as arbitrary-dimensional points, PH arc-length display, API cleanup, and caching separation. Evaluate these individually when curating the later backlog; do not expose dormant demonstrations just because their components exist.
