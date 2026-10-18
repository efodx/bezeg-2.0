# Concept-led demonstration previews

Status: specified on 2026-10-18 at the owner's request following review of all 45 current motion previews. This document records the complete recommendation set; implementation has not started. The current request authorizes documentation, not code, asset regeneration, or runtime changes.

## Problem and intended outcome

Several previews animate an available control without making the demonstration's defining idea visible. Rational Bézier resembles ordinary control-point dragging; fixed-point iteration moves an already completed cobweb; C1/C2 spline motion draws attention away from the joins. A mathematically correct clip can still communicate the wrong lesson.

Each preview must communicate one observable discovery, understandable at card size without reading small numerical annotations. Write its intended takeaway before choosing its input or camera. Motion should expose a process, a relationship, or an invariant rather than merely establish that the graph is interactive.

The review used the capture definitions and decoded samples of all 45 shipped clips at 360 × 220. It establishes editorial direction, not complete playback, accessibility, or implementation verification. Support for proposed choreography must be checked against current controls before implementation; conditional proposals below are not claims of existing capability.

## Relationship to existing specifications

Extends [representative previews](representative-demonstration-previews.md) and [continuous motion previews](continuous-motion-previews.md). For clips revised under this spec, the per-demonstration intent and choreography below supersede earlier input paths, recipe states, and uniform out-and-back scheduling. Earlier capture records remain historical evidence.

Preserve the existing [hover/focus activation](hover-motion-previews.md), [touch activation](touch-motion-previews.md), [loading behavior](catalog-preview-loading.md), and [video color requirements](preview-video-color.md). This is a content and choreography revision, not a request to change when playback starts. Catalog, picker, and homepage reuse the same assets and player.

Keep the static client-only architecture, routes, route defaults, stored presets, lessons, worked examples, and mathematical definitions unchanged. Capture-only recipes, posters, cameras, and schedules may change. Use supported controls or existing graph-owned actions; no React internals, production capture bridges, artificial geometry, or pixel morphing. Runtime features needed for an ideal preview require a separately bounded implementation spec and authorization. No new application dependencies are selected here.

## Choreography and presentation

Use **setup → meaningful change → discovery hold → reset** as the default structure. The discovery receives more time and visual emphasis than the reset.

- Algorithms visibly perform successive exact steps. Do not replace iteration with deformation of a completed result.
- Relationships arrive at or preserve a revealing geometric condition. Make both related objects visible together.
- Approximation and limit clips expose remaining error and the action that reduces it.
- Invariant clips change a representation while retaining a stable reference curve or construction.
- Continuous sweeps suit weights, slopes, offsets, and moving constructions. Discrete counts, degrees, and iteration states remain exact held states.
- Retain a smooth return when it helps the concept. For convergence and iterative algorithms, hold the result, then reset deliberately to the setup. A reset is visibly a restart, not reverse mathematical iteration; do not interpolate through invalid intermediate states or fade geometry to hide it.

Keep one fixed camera per clip. Preserve equal coordinate scales for geometric constructions and useful axes for coordinate plots. Focus spline cameras on the join and extrapolation cameras on the original endpoint plus extension. Context must remain sufficient to understand the comparison.

Use selective, readable labels and existing line styles as well as color. A large, concise degree, iteration, weight, or error label can support the story where supported; tiny readouts cannot carry its meaning. Do not add labels by modifying runtime graph presentation under this spec. If existing capture presentation cannot provide an essential distinction, record the dependency.

Retain the existing silent 720 × 440, four-second, 24 fps, at-most-300-KiB-per-clip delivery contract and PNG poster fallback. Allocate holds and exact steps within that budget; reduce the number of steps before sacrificing comprehension. First and last settled source frames match the poster exactly. A deliberate reset may precede the final setup hold. Record that reset boundary explicitly rather than claiming continuous motion across it. Any required duration or budget change needs a separate decision.

Choose a poster that communicates the concept on its own. For process clips it may be an informative initial checkpoint rather than an empty board; preserve enough subsequent steps to show progression. Review the reduced-motion poster independently.

## Full demonstration inventory

“Retain” means retain the central idea, with the specified framing or emphasis; it does not require recapturing an already successful clip. “Revise” requires new choreography. Dependencies describe ideal outcomes that must not be silently replaced with unrelated motion.

### Foundations and polynomial Bézier curves

| ID | Disposition and choreography | Visible takeaway / acceptance focus |
| --- | --- | --- |
| `bernstein` | Revise. Keep degree fixed and sweep a shared parameter, exposing basis values at the same location. Degree 3 → 4 is a secondary comparison only. Shared probe/value presentation is conditional on supported controls. | Contributions redistribute while remaining nonnegative and summing to one. If unsupported, record the dependency; degree switching alone does not fulfill this intent. |
| `complex-multiplication` | Retain rotation through multiplication. Keep the fixed factor, moving multiplier, and product distinguishable; hold a recognizable angular relationship. | The product angle is the sum of factor angles. Current unit-circle motion illustrates rotation; do not claim it demonstrates changing scale. |
| `bezier` | Retain one interior control-point drag with supporting polygon and other points fixed. | Moving this point reshapes the curve predictably; preserve clear cause and effect. |
| `decasteljau` | Retain the parameter sweep with separated interpolation levels and final point on the curve. | Repeated linear interpolation constructs the curve point; levels remain readable away from endpoint collapse. |
| `decasteljau-alternative` | Retain the component-curve interpolation sweep. | Interpolating the lower-degree component curves yields the final curve point. Keep components distinguishable from the result. |
| `affine` | Retain supported transformation steps, with polygon and curve transformed together. | Transforming the control representation transforms the curve consistently. Preserve geometric scale and a readable before/after hold. |
| `subdivision` | Revise emphasis. Choose the split, reveal both child polygons, and hold the unchanged outline. Existing live construction can supply the transition. | One curve becomes two exact representations meeting at the split point. A moving color boundary alone is insufficient. |
| `repeated-subdivision` | Retain exact successive rounds; emphasize accumulated refined polygons against the fixed curve. | More pieces cover the same curve, while their polygons approach its shape. Hold the refined result before reset. |
| `extrapolation` | Revise. Begin at parameter 1 and extend beyond the original endpoint; distinguish the original segment from continuation using supported presentation. | The same polynomial continues beyond its original parameter interval. The current 1.2 → 1.3 sweep misses the boundary crossing. |
| `elevation` | Retain exact before/after degree elevation; emphasize added controls, stable outline, and readable degree where supported. | More control points, identical curve. No interpolation between mathematical degrees. |

### Rational Bézier curves

| ID | Disposition and choreography | Visible takeaway / acceptance focus |
| --- | --- | --- |
| `rational` | Revise. Keep all control coordinates fixed and vary one positive weight through supported input. Identify the affected weight and point. | Weight changes reshape the curve without moving its polygon; increasing the weight attracts the curve toward that point. Avoid duplicating ordinary Bézier dragging. |
| `rational-decasteljau` | Revise concept. Show weighted interpolation levels producing the evaluated point, if exposed by supported graph actions. | The weighted construction explains rational evaluation. Current prefix growth is only tracing. The existing capture notes report no exposed intermediate levels: verify and record a runtime dependency if still true; do not mark a tracing-only clip as this concept's completion. |
| `rational-elevation` | Retain exact elevation comparison with useful weight information and a clear before/after hold. | Both control representation and weights change while the rational curve stays identical. |
| `rational-extrapolation` | Revise. Cross parameter 1 from the original endpoint into a valid continuation, with the original segment distinguishable. | Rational evaluation extends beyond the interval. Choose a bounded, pole-free sweep; do not imply every continuation is globally safe. |
| `rational-subdivision` | Revise. Show the split and both exact child representations, including supporting polygons and relevant weights. | Two rational pieces reconstruct the original curve. The current changing color split does not sufficiently explain the representation change. |
| `farin` | Retain the moving edge-division construction and curve response. Keep relevant weight ratios and edge points readable. | Farin points provide a geometric interpretation of weight ratios. Check every affected adjacent ratio; do not describe this as changing only one weight unless that is what the supported interaction does. |
| `circle` | Refine the three-arc/four-arc exact comparison. Keep comparable supporting construction visible in both states. | Different rational arc decompositions produce the same exact circle. Do not let the four-arc state lose the construction that explains the three-arc state. |

### Splines, PH curves, and parameterization

| ID | Disposition and choreography | Visible takeaway / acceptance focus |
| --- | --- | --- |
| `spline-cn` | Refine the continuity-order comparison. Select a representative join, hold the exact states, and identify the active continuity order where supported. | Continuity constraints change how adjacent pieces meet. A global shape jump without a readable join is insufficient; use an example where the changed constraint is apparent. |
| `spline-c1` | Revise. Move a free point affecting neighboring segments around a central join, with its midpoint/control-leg construction visible. | First-derivative continuity is maintained as the surrounding shape changes. Moving an outer endpoint away from the join is insufficient. |
| `spline-c2` | Revise. Choose a free point that makes the coupled response on both sides of a central join visible; retain the relevant construction. | The construction maintains second-derivative as well as first-derivative continuity. A smooth-looking outline alone cannot establish C2; identify any missing explanatory presentation as a dependency. |
| `spline-g1` | Retain parameter changes around a prominent join with unequal control-leg lengths visible. | Tangent direction agrees even when derivative magnitudes differ. Do not imply C1 solely from visual smoothness. |
| `spline-g1-symmetric` | Refine the join-parameter sweep and framing around the same shared-tangent/unequal-leg relationship. | Preserve geometric continuity as the join construction changes; make its distinction from the symmetric C1 preview visible. |
| `ph-cubic` | Retain a moderate signed offset sweep, with base curve fixed and both curves readable. | A constant-distance offset follows the base curve on either side. Do not imply the thumbnail proves exact arc-length computability. |
| `ph-quintic` | Retain a useful cusp-free offset sweep; preserve the tighter shape and adequate separation at card size. | Show the offset relationship on this more complex PH shape without crowding or suggesting cusp-free behavior at arbitrary distances. |
| `spline-parameterization` | Retain alpha changes with a fixed marker count and free interpolation data fixed. | Knot-dependent construction changes both spline shape and sampling. Do not present this as reparameterization of an unchanged geometric curve. |
| `weighted-parameterization` | Retain the parameter sweep redistributing a fixed number of markers on the fixed curve. | Equal parameter steps can yield different spatial spacing. Keep marker motion distinct from control-point motion. |
| `uniform-parameterization` | Revise. Prefer a supported comparison between ordinary parameter sampling and equal arc-length sampling at the same marker count. Alternative: equal-time travel under the two parameterizations if supported. | Uniform arc-length spacing/speed is the discovery. Increasing marker count demonstrates density only. Verify selector/animation capabilities and record unsupported alternatives rather than inventing a capture-only evaluator. |

### Functions and calculus

| ID | Disposition and choreography | Visible takeaway / acceptance focus |
| --- | --- | --- |
| `linear-function` | Retain slope changes about a fixed intercept with the slope triangle. | Rise relative to run determines slope, including its sign. |
| `exponential-function` | Retain base changes across 1, keeping the common point (0,1) visible; hold growth and decay states. | The base controls growth versus decay while the anchor remains fixed. |
| `trigonometric-functions` | Retain phase changes with a recognizable cycle and coordinate context. | Changing phase translates the wave horizontally, preserving amplitude and period. |
| `continuity` | Retain closing the jump and hold at the matching parameter. | One-sided limits and the function value meet at continuity. Open/closed endpoints remain distinguishable before the match. |
| `derivative` | Retain shrinking the secant step toward a visible exact tangent, with a discovery hold. | Secant slopes approach the tangent slope. A finite nonzero step is an approximation, not the exact derivative. |
| `definite-integral` | Retain exact rectangle-count refinements with the integrand fixed. Stop before density becomes the main visual feature. | A single area approximation approaches the integral; distinguish this story from Darboux's paired bounds. |
| `area-between-curves` | Retain the moving bound and changing shaded region with both intersections visible. | Accumulated area lies between the two graphs over the selected interval. Keep boundaries and the shaded region visually linked. |
| `arc-length` | Retain coarse-to-fine polygonal approximation with fixed endpoints and curve. | Summed chord lengths approach the curved arc length. Hold a coarse state long enough to see the initial discrepancy. |

### Analysis: complete choreography

| ID | Disposition and choreography | Visible takeaway / acceptance focus |
| --- | --- | --- |
| `bisection` | Refine exact step progression. Begin with a wide bracket, mark its midpoint and the discarded half using supported presentation, then perform three or four halvings. Hold the final bracket. | A root is trapped without knowing its exact value. Shrinking uncertainty is primary; midpoint motion is secondary. Each retained bracket contains the root and has the expected halved width. |
| `mean-value` | Revise. Keep the secant fixed; move a tangent from shallower to matching to steeper, then return and hold at the match. Reveal the matching-point construction at the payoff rather than leaving it permanently revealed. | Somewhere the instantaneous rate equals the interval's average rate. The two parallel lines must be the visual destination. |
| `accumulation` | Refine the bound sweep through positive and negative integrand regions. Link signed area, accumulation point, and tangent. Pause at an integrand zero where accumulation changes from increasing to decreasing. | The height of the integrand controls the slope of accumulation. Filling area alone is insufficient; show the slope relationship and signed contribution. |
| `darboux` | Refine coarse-to-fine exact partitions with distinguishable lower and upper sums; emphasize the diminishing region between them and hold the close bounds. | Two guaranteed bounds squeeze toward one integral. Preserve lower ≤ integral ≤ upper, rather than merely showing more rectangles. |
| `extrema` | Refine the existing endpoint sweep past the quadratic vertex. Hold before and after crossing; emphasize the minimum's transfer from interior stationary point to endpoint. | Extrema depend on the domain, and a boundary minimum need not have derivative zero. Classifications must update correctly at the crossing. |
| `convexity` | Refine the moving tangent over a fixed chord interval. Show graph below chord and above tangent; reveal the second-derivative conclusion after the geometric observation. | A global shape property constrains every local tangent on the interval. Keep both comparisons visible rather than merely rotating a tangent. |
| `taylor` | Refine to a few exact held degrees with fixed expansion center, target function, and enough distance from the center to retain visible error. | Matching more local derivative information extends useful agreement in this example. Do not spend most of the clip with indistinguishable curves or imply arbitrary Taylor series always converge globally. |
| `sequence` | Revise. Start with a band and certified tail, narrow epsilon until the old threshold fails, then increase N until the tail is certified again. | Greater accuracy requires going farther along the sequence. A finite display illustrates the tail; the analytic certificate establishes the all-later-terms statement. Keep L fixed and distinguish N from number of displayed terms. |
| `uniform-convergence` | Refine increasing n with fixed epsilon and a visible worst-error marker over the entire fixed domain. Hold when the supremum enters the band. | One threshold works everywhere at once, not just at the selected point. A separate secondary comparison may contrast a domain ending below 1 with [0,1], including the endpoint behavior and correct limit. Do not squeeze both stories into an unreadable four-second clip or substitute a pointwise error for the supremum. |
| `fixed-point` | Revise. Hold the start fixed and build each vertical/horizontal cobweb step in order, approaching the diagonal intersection. Hold the staircase before reset. | Feeding output back as input approaches a fixed point for this contracting example. Keep the iteration count consistent with visible steps; do not imply all maps or starting values converge. Starting-value comparisons are secondary. |

## Implementation boundaries and sequencing

The full inventory is the scope; priorities define order, not exclusions.

1. Resolve capability dependencies without modifying runtime: weighted input for `rational`; join-affecting free controls for C1/C2; existing sampling selectors for `uniform-parameterization`; shared probe presentation for `bernstein`; interpolation visibility for `rational-decasteljau`. Inspect reveal/reset support for analysis timelines. Record supported controls, required presentation, and explicit dependencies before selecting recipes.
2. First revision batch: `rational`, `fixed-point`, `spline-c1`, `spline-c2`, and `uniform-parameterization`. These have the clearest gap between the current motion and intended concept. An unsupported item stays open while independent clips proceed.
3. Revise analysis narratives, especially `sequence`, `mean-value`, and `accumulation`, then the remaining refinement, approximation, and bound stories.
4. Revise subdivision/extrapolation pairs, Bernstein and rational de Casteljau as capabilities permit; refine circle, continuity comparisons, and elevation emphasis.
5. Review retained concepts against the same criteria. Keep successful assets unchanged and preserve their evidence; recapture only for an identified failure or necessary shared capture change.

Multi-input sequences such as epsilon then N are explicitly allowed in capture recipes. Each phase changes only its declared input; all other inputs remain fixed. The old single-input restriction must not force a weaker mathematical story. Capture recipe changes do not change the live demonstration's initial scene.

If an ideal narrative needs a new runtime construction or annotation capability, document the exact missing seam and a bounded follow-up proposal. Leave the existing asset in place until an accepted replacement is ready; mark it as not yet meeting the new intent. Do not ship fabricated construction geometry or claim editorial completion through a technically valid but unrelated sweep.

## Acceptance criteria and evidence

1. Account for all 45 IDs with intended takeaway, disposition, supported control sequence, poster checkpoint, fixed camera, holds/reset, mathematical invariants, and verification status. Retained clips receive an explicit pass or actionable finding. Dependencies and secondary alternatives remain separately identified.
2. At actual 360 × 220 card size, a reviewer can identify what changed, what stayed fixed, and the discovery without relying on tiny captions. Check the beginning, transition, payoff, and reset, plus full playback. Mathematical validity alone does not pass a conceptually misleading preview.
3. Verify every sampled mathematical state against independent formulas or properties relevant to its row: weight effects and fixed controls; subdivision/elevation equivalence; spline join derivatives with stated parameter scaling; PH signed normal distance and cusp margin; exact algorithm iterates/brackets; integral bounds; Taylor values; sequence certificates; uniform supremum on the actual domain. Record tolerances and reject vacuous or path-only assertions where numerical relationships are required.
4. Discrete states are exact and supported; no fractional degrees, fabricated iteration steps, or interpolated topology. Algorithm resets are identifiable restarts. Refine/iterate → hold → reset must not read as a claim that convergence runs backward.
5. Posters stand alone and match first/last source frames. All revised clips satisfy dimensions, duration, frame rate, silence, byte budget, fixed-camera rules, and manifest provenance. Record recipe identity, schedule/phase boundaries, source revision, frame hashes, invariants, encoder settings, and any deliberate reset. Compressed video frames need not equal PNG pixels.
6. Review desktop, 390px layout, and actual card-size legibility. Curves, joins, construction points, markers, and essential annotations stay inside the fixed camera without collisions that obscure the takeaway. Check reduced-motion posters, non-color distinctions, and projection-oriented readability; explicitly report physical projector/device coverage gaps.
7. Begin verification with `just --list`; use the [command guide](../commands.md). Run affected capture/manifest tests, player/catalog tests if touched, typecheck, and a provenance-recorded production build. If localization changes become separately authorized, preserve Slovenian/English key parity and run the required localization checks.
8. Before release, obtain parallel mathematical and engineering review, plus visual/accessibility review for revised content. Smoke-test the affected catalog, picker, and homepage workflows on a stable production build using the repository smoke workflow and [browser checklist](../smoke-tests.md): activation, offscreen cleanup, reduced motion, failed media, asset reuse, navigation, and revised clips at desktop/390px. Report unavailable skills or incomplete coverage explicitly. No full lesson smoke is required unless runtime scope changes separately.
9. Publish a per-ID acceptance record distinguishing implemented/pass, retained/pass, blocked by named capability, and deferred secondary comparison. No unresolved primary concept can be marked complete. Update described preview behavior in architecture/capability guidance only when implementation changes it.

No route or preset migration is intended. The user-visible change on later implementation is the content and pacing of preview media; opening a demonstration continues to use its existing runtime defaults.
