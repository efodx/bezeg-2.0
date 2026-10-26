# Concept-led demonstration preview acceptance

> Correction (2026-10-26): the rational de Casteljau runtime already supports weighted levels and the evaluated point. The historical blocked disposition below came from the capture recipe hiding that construction. See [rational/PH repair](rational-preview-repair.md) for the replacement capture, current acceptance and provenance; Bernstein remains a separate gap.

Source: [the bounded specification](../specs/concept-led-demonstration-previews.md), implemented on 2026-10-18. Runtime defaults, routes, presets, lessons, player activation, and mathematical definitions are unchanged. This is capture tooling and static media work.

The implementation revises 22 clips and retains 23. Two retained clips remain **blocked**, rather than accepted for their new primary concept: Bernstein needs shared probe/value presentation; rational de Casteljau needs visible weighted interpolation levels. These are explicit follow-up seams, not permission to add runtime features here. All secondary comparisons in the specification remain deferred.

## Evidence conventions

Every ID below resolves to its own `captures[]` and `motions[]` entry in [`manifest.json`](../../src/images/demonstrations/catalog/manifest.json). Those entries supply the exact supported recipe actions, poster checkpoint, fixed camera, schedule/holds, per-sample independent mathematics, source-frame hashes, encoder settings, source revision/fingerprints, byte count, and reset boundaries. The source registry is [`demonstration-preview-recipes.cjs`](../../scripts/demonstration-preview-recipes.cjs); motion assertions live in the main, curve, analysis, and concept motion modules beside it.

`Revised/pass` and `Retained/pass` indicate acceptance within the observed verification below. Blocked rows never inherit a pass from successful media decoding. This integrated record supersedes the workers' initial capture-pending handoffs and earlier timings.

First/last source frames equal the PNG poster. Exact algorithms/refinements progress forward, hold the result, and restart at the declared reset frame; no reverse iteration is implied. Each checkpoint starts from a fresh route and replays its complete declared action prefix. Continuous sweeps retain the existing supported input grid. Curves use equal coordinate scales; coordinate plots retain useful axes. Posters are reviewed separately as reduced-motion content.

## Per-ID disposition and discovery

| ID | Disposition | Discovery and evidence focus |
| --- | --- | --- |
| `bernstein` | Blocked; asset retained | Nonnegative partition of unity checks remain valid, but degree switching cannot show shared-parameter contributions. Add a graph-owned probe/value construction in a separately bounded runtime spec. |
| `complex-multiplication` | Retained/pass | Fixed factor, moving unit multiplier and product have different markers; product angle follows the sum. This shows rotation, not varying scale. |
| `bezier` | Retained/pass | One interior control moves while the other controls remain fixed; polygon and outline show cause and effect. |
| `decasteljau` | Retained/pass | Separated interpolation levels culminate on the stable full curve; independent levels and Bernstein evaluation agree. |
| `decasteljau-alternative` | Retained/pass | Two component curves interpolate to the evaluated final point. |
| `affine` | Retained/pass | Exact supported rotations transform curve and polygon together; fixed camera and before/after holds. |
| `subdivision` | Revised/pass | Perform the actual split, enable the second child polygon, hold both exact representations for 60 frames, restart at 84. Both child curves and polygon edges are checked. |
| `repeated-subdivision` | Revised/pass | Exact rounds 0→1→2, refined polygons over the same curve, then restart at 84; holds 20/18/46/12. Independent parent-interval coverage checks every piece. |
| `extrapolation` | Revised/pass | Start at t=1, extend to 1.2 and return; original endpoint/polygon anchor the continuation. Independent polynomial evaluation and extension samples agree. |
| `elevation` | Retained/pass | Exact added controls preserve the outline; no fractional degree. |
| `rational` | Revised/pass | Selected w₁ changes 2→4→0.5→2 with all coordinates fixed. Weight labels and selected point identify the cause; weighted Bernstein checks attraction toward that point. |
| `rational-decasteljau` | Blocked; asset retained | Prefix tracing is not weighted interpolation. Add graph-owned weighted levels in a separately bounded runtime spec; do not replace them with invented capture geometry. |
| `rational-elevation` | Retained/pass | Exact elevated controls and weights preserve the rational outline. |
| `rational-extrapolation` | Revised/pass | Cross t=1 to 1.2; fixed weights and independent rational evaluation verify this bounded pole-free continuation. |
| `rational-subdivision` | Revised/pass | Actual split, both polygons and distinguishing inner weights; all eight source labels are checked against homogeneous subdivision. Existing collision handling keeps selective labels readable. Holds 24/48/24, reset at 72. |
| `farin` | Retained/pass | Edge point changes the effective downstream weight chain; every adjacent ratio is checked. This is not described as changing only one weight. |
| `circle` | Revised/pass | Three exact arcs versus four exact arcs on the same circle. Re-enable all four polygons after the count replaces the curves; holds 24/60/12. |
| `spline-cn` | Revised/pass | Degree-2 C1 versus C0 exact states with a long join-comparison hold. C1 derivative agreement and a nontrivial C0 derivative jump are checked in the native global parameter. |
| `spline-c1` | Revised/pass | Move central free point 3. Visible midpoint joins and central polygon legs accompany maintained first derivatives; fixed camera contains the construction. |
| `spline-c2` | Revised/pass | Move central free point 3; both adjacent spans must respond while computed inner points and join remain visible. Position, first/second derivatives use the native uniform span parameter. |
| `spline-g1` | Retained/pass | Unequal collinear join legs retain tangent direction; no claim of equal derivative magnitudes. |
| `spline-g1-symmetric` | Retained/pass | Non-midpoint join parameters visibly differ from the C1 midpoint construction. |
| `ph-cubic` | Retained/pass | Signed normal offset changes sides while the base curve stays fixed. Distance, orthogonality and sampled cusp margin are checked. |
| `ph-quintic` | Retained/pass | Separated offset on the tighter PH shape; same signed-normal checks, without claiming arbitrary distances are cusp-free. |
| `spline-parameterization` | Retained/pass | Fixed interpolation data and marker count; alpha changes the knot-dependent shape and sampling. |
| `weighted-parameterization` | Retained/pass | Fixed curve and marker count; alpha redistributes parameter samples spatially. |
| `uniform-parameterization` | Revised/pass | Same ten markers, weighted then uniform arc-length mode; stable curve and independent arc fractions, holds 24/60/12. |
| `linear-function` | Retained/pass | Slope triangle and changing rise about the fixed intercept, including negative slope. |
| `exponential-function` | Retained/pass | Growth/decay across base 1 with the common (0,1) anchor retained. |
| `trigonometric-functions` | Retained/pass | Phase translates a recognizable wave without changing amplitude or period. |
| `continuity` | Retained/pass | Open/closed endpoints close their jump at a=1.5. |
| `derivative` | Retained/pass | Finite secant approaches the distinct exact tangent; the nonzero step remains an approximation. |
| `definite-integral` | Revised/pass | Left sums 6→12→24→48, hold approximation, restart at 84. Independent sums and fixed integrand distinguish this from paired bounds. |
| `area-between-curves` | Retained/pass | Moving bound changes genuine shaded area between fixed graphs; both intersections remain visible. |
| `arc-length` | Revised/pass | Exact counts 2→4→6→8→12; chord sums approach the independent arc integral, then deliberate reset. |
| `bisection` | Revised/pass | Informative first halving, then steps 2–4 with midpoint/discarded half. Root containment, halved widths, midpoint and function values are checked; discovery hold 42 frames, reset at 84. |
| `mean-value` | Revised/pass | Fixed secant; tangent c=.5→1→1.5→1, reveal the match and hold, then reset to the unrevealed poster. Independent slopes verify the parallel-line payoff. |
| `accumulation` | Revised/pass | x=2→π→4: positive contribution, horizontal tangent at the maximum, then negative contribution reducing A. Full-precision π is checked from the board despite a four-decimal input draft. Signed fill intervals, boundaries, areas and non-color edge patterns are checked. Reset at 84. |
| `darboux` | Revised/pass | Exact partitions 4→8→16→32 squeeze lower/upper bounds, hold, restart at 84. Independent bounds retain the integral between them. |
| `extrema` | Retained/pass | Domain boundary crosses the stationary point; minimum classification transfers to the endpoint. |
| `convexity` | Revised/pass | Move tangent below the fixed chord/curve comparison, then reveal the second-derivative conclusion. Independent inequalities, actual convex/tangent verdicts and in-frame conclusion evidence are checked. Reset at 84. |
| `taylor` | Revised/pass | Degrees 2→3→4, holds 24/24/36/12. Wider left view keeps error visible away from center 0; function, derivatives' polynomial and evaluation point 1 stay fixed. |
| `sequence` | Revised/pass | Certified ε=.3,N=5 → ε=.1,N=5 fails → ε=.1,N=11 certifies. All 16 terms and L remain fixed; exact all-tail criterion Nε>1 is checked, then restart. |
| `uniform-convergence` | Revised/pass | Fixed domain [0,.8] and epsilon; exact n=5,8,11,16,25 moves the endpoint worst-error marker into the band. Independent supremum .8ⁿ; [0,1] contrast is a deferred secondary story. |
| `fixed-point` | Revised/pass | Hold start fixed; show cobweb iterations 1→2→3→4→5, hold staircase, reset to 1. Actual polyline vertices follow T(x)=(x+1)/2 and error 2⁻ᵏ. |

## Verification and limits

Accepted within the capture/media boundary: 22 revised concepts and 21 retained concepts; two primary concepts remain blocked by the named runtime capabilities. Overall concept acceptance remains partial for those two IDs. The 23 retained clip files and their motion evidence are unchanged from the source revision.

- Started verification with `just --list`. All 54 focused Node capture/manifest/motion tests passed, including a real VP9 encode and exact decoded-background color checks. All 45 delivered records pass the generated-preview validator, including independent sampled mathematical assertions and source/poster hashes.
- Player/catalog unit coverage: 22 tests passed. `just typecheck` and the provenance-recorded production build passed. Build retains the existing Sass deprecation and large-chunk warnings.
- Production browser suites for motion previews, homepage and picker: 22/22 passed on the final build (Chromium, desktop and 390px). Coverage includes all 45 decodes, hover/focus and touch activation, offscreen cleanup, reduced-motion posters, failed/delayed media, asset reuse, navigation and layout. An initial assertion expected the historical 25 expanded recipes; it was replaced with narrow-screen decoding of the entire 45-ID catalog. No application failure was observed.
- A separate production-browser pass observed a complete four-second decoded loop for every clip with no page errors; the final C0 polygon refresh received its own additional full-cycle pass. This automated playback evidence is distinct from visual review.
- Handler and release reviewer inspected beginning/transition/payoff/reset source samples at 360×220 for all 45 IDs. The reviewer also sampled 11 priority previews in the live production catalog, observed full loops for fixed point and C1/C2, and checked the 390px layout. The final C0 card received an additional actual-card-size review: the corner and both polygon legs are readable against the smooth C1 poster. Its large continuity-order caption remains an optional runtime presentation enhancement.
- Parallel mathematical and engineering reviews found missing child-representation/construction assertions and a weak convexity-verdict check; repairs were verified in the tests and real captures. All actionable findings are closed. Independent checks use 1e-9 for fixed coordinates and PH distance, up to 3e-5 for sampled rational geometry, 1e-5 for spline join positions, .03/.5 for first/second one-sided finite differences in the native global parameter (h=1e-4), .002 for normalized arc fractions, and .005 for sampled fill-polygon area. These tolerate sampling/truncation and display precision rather than redefining the mathematics.
- Revised clips remain silent, 720×440, four seconds, 24 fps and ≤300 KiB. Largest delivered clip: 301,271 bytes. FFmpeg 6.1.1 satisfied the unchanged RGB/VP9 color contract; tested 7.1.1/9.0.2 builds failed required primaries metadata and their outputs were rejected. The fingerprint now includes the concept module and recipe source as well as the existing capture modules.

No physical projector or physical phone has been tested; projection/readability evidence is screen-based. No full lesson smoke was run because lesson/runtime code did not change. Browser findings do not establish actual GitHub Pages deployment. No new runtime capability is claimed for either blocked concept.

## Bounded follow-up proposals

Bernstein needs a graph-owned shared parameter, visible probe/markers on each basis function, and a readable contribution/partition-of-unity presentation. A follow-up spec should bound degree/parameter controls, graph disposal, keyboard access, and independent nonnegativity/sum checks. Switching degree alone remains insufficient.

Rational de Casteljau needs graph-owned weighted intermediate levels and the evaluated point driven by its existing parameter and positive weights. A follow-up spec should define the projected homogeneous recurrence, level styling at card size, ownership/disposal, and agreement with independent rational Bernstein evaluation. Existing prefix tracing must remain identified as tracing until that construction exists.
