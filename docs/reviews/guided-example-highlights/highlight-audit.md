# Guided example highlight audit (task 00, redone against master 8f23b566)

Spec: [guided-example-highlights](../../specs/guided-example-highlights.md) H1, H2, H4. Task: [00](../../tasks/guided-example-highlights/00-highlight-audit.md). Documentation only; no code changed.

## Owner decisions

Eleven items need the owner before tasks 03-04 start (D1 changes spec scope). D7 (a second audit pass) is dropped: the pass is done.

1. **D1 Scope: 67 examples, 29 figures, nine chapters, not 56 / 16 / eight.** The Bezier patches chapter adds 11 section-owned examples (own registry, own thumbnails under `examples/patches/`) and 12 figure placements; the family chapters have 17 figures, not 16. Confirm patch cards and patch figures are in H1, H2, H7 (recommended yes) and that "56" becomes 67 in the spec and acceptance.
2. **D2 Patch figures are duplicates.** 11 patch figures re-use the card start-scene thumbnails (`patchChapter.ts:26-31`); the 12th is the catalog default `patch-tensor` image. Recommended: drop all 12 (the highlight or the card image carries them). Confirm that the patch card image also becomes a highlight (needs patch recipes) rather than staying the start scene.
3. **D3 Section with figures but no card: parametrization/trace-vs-parameter.** Two figures (alpha=0.7 spline, alpha=0.25 single curve) whose carrier cards sit in the next section, weighted-knot. After removal the section is prose-only. Recommended: add a prose pointer to the weighted-knot cards; or accept.
4. **D4 No example shows the 4x3 net.** The `curve-to-patch` prose computes a 4x3 net (12 points, degrees (3,2)); no card shows it (the card has a 6-point net) and the old figure explicitly did not either. Concept stays prose-only; confirm, or add a prepared 4x3 scene to the example.
5. **D5 Figures whose exact state is not reachable by any example prompt.** Spline alpha=0.7 with 12 samples (fig 9); G1 spline b1=0.65 (fig 6); catalog cubic PH d=0.35 (fig 7); catalog quintic PH curve (fig 8, lesson curve differs); uniform-timing figure shows weighted mode, the opposite of the card (fig 11). Recommended: accept the example's own state in all five and keep distinctions in prose. Same rule for the ph cubic/quintic cards, whose catalog default may differ from the lesson curve.
6. **D6 Examples with several candidate pictures.** `bezier-patches.tensor-joins` (C0, C1, G1, teapot: one image); `bezier-patches.properties` (convex hull/affine versus variation counterexample); `bezier-patches.curve-to-patch` (start versus mid-sweep). Recommended: join-c0 (matches old figure, no learner step), hull-affine, and start (recorded as start = best).
8. **D8 Sample-entry choice for task 01.** Recommended samples S1 (quintic PH offset), S2 (rational weight, multi-frame), S3 (weighted parameterization alpha slider); confirm.
9. **D9 The two quartic activities share one prepared scene.** `repeated-interpolation` and `curve-parameter` both start at `decasteljau-quartic`, t=1/2, scheme and full curve on, so their card images would be identical. Recommended: quartic-interpolation = start (rows 4,3,2,1, final point (0,7/4)); decasteljau-parameter = t=1/4 (unequal arc lengths).
10. **D10 PH singularity cards need a distance from the fixture.** `ph-cubic-singularity` and `ph-quintic-singularity` have no lesson frame and the prompt gives no d; the cusp/self-intersection threshold is the minimum radius of curvature, which only the fixture shows. Recommended: task 01 computes d (about 1.5 times that radius), asserts the self-intersection numerically, and the owner accepts a start-plus-offset image if no robust d exists. The quintic-comparison length claim needs two cards and stays prose.
11. **D11 Figures 25 and 26 are not lesson frames.** Fig 25 (secant slope 3, tangent 2) is the start scene plus the tangent switch; fig 26 (six rectangles, sum 2.037) is not reachable (default n=4, sum 1.75, no prompt sets n=6). Recommended: use n=4 and rewrite the six-rectangle sentence at `familyChapters.ts:409`.
12. **D12 Predict-then-reveal cards show the answer.** Functions and analysis prompts ask the learner to predict before pressing Show supremum / Show classification / Show accumulation; the highlight image is the revealed state. Recommended: accept (the card is a preview, the lesson keeps the prediction) and word captions as results, not as questions.


## 1. Inventory (recounted from code)

Method: `retainedExampleHomes` in `src/learning/chapter/retainedExamples.ts:4-61`; patch examples from `patchGuidedExampleRegistry` (`src/learning/content/patchGuidedExampleRegistry.ts`, merged from `patchGuidedExamplesBasics/Evaluation/Advanced.ts`); figures by evaluating `familyChapters[*].sections[*].orderedContent` at runtime (vite-node) and counting `kind: 'figure'` items. `familyChapters` already includes the patch chapter. `bezierChapter.ts` has no figures.

### Examples: 56 retained + 11 patch = 67 (stale: 56)

| Chapter | Retained | Patch | Total |
|---|---|---|---|
| bezier-curves | 12 | - | 12 |
| foundations | 3 | - | 3 |
| rational-curves | 7 | - | 7 |
| splines | 6 | - | 6 |
| ph-curves | 7 | - | 7 |
| parametrization | 3 | - | 3 |
| functions-and-calculus | 9 | - | 9 |
| analysis | 9 | - | 9 |
| bezier-patches | - | 11 | 11 |
| **Total** | **56** | **11** | **67** |

Patch examples are section-owned (id `bezier-patches.<section>.<demo>`), one per section, in all 11 sections. The retained 56 are unchanged. Of the 56, source kinds: lesson 46 (lesson steps and frames drive the example), 3 activity (`convex-hull`, `quartic-interpolation`, `decasteljau-parameter`: copy in `bezierActivityCopy`, no lesson frames), 7 family (worked-weight degree comparison, five PH cards, spline C1 parabola derivatives: a section investigation prompt only, no lesson frames).

### Figures: 17 family + 12 patch = 29 placements (stale: 16)

| Chapter | Figures |
|---|---|
| bezier-curves | 0 |
| foundations | 2 (reading-bernstein, complex-plane) |
| rational-curves | 2 (why-rational, worked-conic) |
| splines | 2 (continuity-levels, geometric-vs-parametric) |
| ph-curves | 2 (arc-length-problem, offsets) |
| parametrization | 3 (trace-vs-parameter x2, uniform-timing) |
| functions-and-calculus | 3 (continuity, derivatives, integrals) |
| analysis | 3 (existence, integrability, convergence) |
| bezier-patches | 12 (curve-to-patch x2, one in each of the other 10 sections) |
| **Total** | **17 + 12 = 29** |

Notes: (a) the "16" is stale by one even for the non-patch chapters (17 now); (b) the 11 patch figures added by `patchChapter.ts:26-31` are the example start-scene card thumbnails (`src/images/learning/examples/patches/<id>.png`) re-used as section figures, so they duplicate the card image exactly; the twelfth is the catalog `patch-tensor` figure in `curve-to-patch` (`patchChapterBasics.ts:13`). (c) The spec says "eight chapters" and "56 cards"; there are now nine chapters and 67 cards.


## 2. Highlight matrix

Conventions. "Frame" is the lesson step id (`steps[].id`; each step is one prepared scene plus its observation frame). "Steps" are learner-equivalent actions applied after the example prepared its scene. Scene ids refer to the prepared fixtures in the lesson files. Values come from the step's actions or from the observation prompt (the prompt asks the learner to do it). "Start" is the prepared scene of step 1. Caption intent is one short sentence (SL/EN written in tasks 03-04). Checks are scene or numeric assertions on the fixture (H4). Rows marked **[S1]-[S3]** are the sample entries for task 01.

Audited: all 67 examples. Lesson-backed rows are in the chapter tables; bezier-curves, functions-and-calculus, analysis and the seven family cards follow the patch table. Fixture values marked "confirm" are inferred from lesson text and must be read from the fixture when writing recipes (task 01).

### foundations (2 lesson-backed; worked-weight in the family table)

| ID | Frame | Steps | Claims and checks | Caption intent |
|---|---|---|---|---|
| foundations.reading-bernstein.bernstein | `bernstein-stacked-area` (degree 3, stacked) | none beyond the step scene `bernstein-stacked-scene` | four cubic weights; top edge of the stack at height 1 -> sum of b_i^3(t)=1 at sampled t; function count 4 | Four cubic weights stacked reach height 1 everywhere. Old caption distinction ("worked example uses quadratic weights 1/4,1/2,1/4") moves to prose |
| foundations.complex-plane.complex-multiplication | `complex-rotation-i-step`, after Show product | press Show product (prompt: only then press it) | z=1+i, w=i, zw=-1+i; argument grows by pi/2; modulus unchanged -> compute (1+i)i=-1+i, \|zw\|=\|z\| | Multiplying by i rotates z=1+i by a quarter turn and keeps its modulus. Equals the old figure |
| foundations.worked-weight.bernstein.degree-comparison | see "family cards without lesson frames" below | | | |

### parametrization

| ID | Frame | Steps | Claims and checks | Caption intent |
|---|---|---|---|---|
| parametrization.uniform-timing.uniform-parameterization | `up-uniform-twenty` (scene `up-uniform-ten-scene`, uniform mode, 10 samples); start `up-uneven-samples` is the contrast, not the payoff | none | samples equally spaced along arc length -> consecutive arc-length gaps equal within tolerance; mode==uniform | Ten points at equal arc length. The old figure was in weighted mode (the opposite point); the highlight inverts it. Prose keeps "sparse points and chords do not prove equal lengths" |
| parametrization.weighted-knot.spline-parameterization | `sp-chordal` (alpha=1) | slider alpha=1 (prompt sweeps 0, 0.5, 1) | joints move with alpha; sample gaps follow piece length -> knot intervals = \|dp_i\|^alpha asserted, joint 3 differs from alpha=0 | alpha=1 spaces samples in proportion to piece length and the spline geometry changes with alpha. Old figure (alpha=0.7, 12 samples) is not reachable by the prompts |
| parametrization.weighted-knot.weighted-parameterization **[S3 nontrivial learner step]** | `wp-quarter-calculation` | set the alpha slider to 0.25, 3 samples (also `wp-density-ten`: 10 points) | same Bezier trace, points crowd toward one end; alpha=1/2 neutral -> sample parameters from the weighted warp; control points and curve unchanged versus alpha=1/2 | One curve, alpha=0.25: same drawn trace, points shifted toward one end. Matches the old figure |

### ph-curves (2 lesson-backed cards here; 5 family cards in the family table below)

| ID | Frame | Steps | Claims and checks | Caption intent |
|---|---|---|---|---|
| ph-curves.offsets.ph-quintic-offsets **[S1 quintic PH offset card]** | `ph-quintic-offset-positive` (step 3) | scene `ph-quintic-offset-positive` already has `parameter offset-distance=0.5` and `curve-visibility offset-curve=true`; learner-equivalent: open the example, reach step 3, set offset distance 0.5, show the offset | blue offset at distance d=0.5 from the green quintic (start (-2,-1), generators (2,0),(2,1),(1,1)) -> for sampled t: \|O(t)-r(t)\|=0.5, (O-r).r'(t)=0, sign positive side; w0-2w1+w2=-1-i nonzero (step 1, not a caption claim); no cusp visible only because d<min radius of curvature on the shown segment (observation, not proof) | The quintic PH curve and its offset at d=0.5, every offset point 0.5 along the normal. Old figure used the catalog default curve, not this lesson curve ("not the integrated cubic from the origin" -> prose) |
| ph-curves.arc-length-problem.ph-cubic-speed | `ph-offsets` (d=1) | scene `ph-offset-positive`, offset-distance=1 | offset point at distance 1 along the normal; at t=1 tangent r'(1)=(3,4) -> normal (-4,3)/5, \|O-r\|=1, perpendicular | Cubic PH curve and its offset at d=1. Old figure had d=0.35 on a different curve |

### rational-curves

| ID | Frame | Steps | Claims and checks | Caption intent |
|---|---|---|---|---|
| rational-curves.why-rational.rational-weight **[S2 multi-frame]** | `rational-base-evaluation` (weights 1,2,1,1, t=1/2); the other frames are `rational-base-default` (1,1,1,1) and `rational-base-heavy` (weight 4) | scene prepared with weights and `curve-evaluation=0.5`; learner-equivalent: set second weight 2 | R(1/2)=(-9/11, 21/11) for weights (1,2,1,1) versus (0,3/2) for equal weights; endpoints stay P0,P3 -> evaluate rational Bezier and compare marked point (the prompt states the value) | Second weight 1->2 pulls the point at t=1/2 from (0,3/2) to (-9/11,21/11). Matches the old figure (weights 1,2,1,1). Old caption's "worked arc is quadratic with weights 1,1/sqrt2,1" -> prose |
| rational-curves.worked-conic.circle | `circle-default` (3 pieces) | none; start is the best moment (the old figure showed the same 3-piece circle) | complete circle from three rational arcs, joints on the circle, control points outside -> x^2+y^2=r^2 within 1e-9 at sampled points of every piece | Three rational arcs make an exact circle. "One quarter arc on the unit circle" -> prose |
| rational-curves.homogeneous.rational-decasteljau | `rational-decasteljau-projection` | t=0.5 preset | projected final point (0,1) vs (0,0) for equal weights | Weighted de Casteljau point is the projection of the homogeneous point. No figure |
| rational-curves.investigate-rational.rational-extrapolation | `rex-example` (t=6/5) | extrapolation-parameter=1.2, press extrapolate | point past the curve end on the continuation; weights follow homogeneous rule | Curve continued to t=6/5. No figure |
| rational-curves.operations.farin | `farin-points` | toggle Farin points | each Farin point nearer the heavier end; last one at the midpoint | Farin points on edges encode weight ratios. No figure |
| rational-curves.operations.rational-elevation | `rational-elevation-once` | one degree elevation | same curve geometry, one more point, new weights | One elevation changes net and weights, not the curve. No figure |
| rational-curves.operations.rational-subdivision | `rsd-half-example` (t=1/2) | subdivision-parameter=0.5, subdivide | two curves share the cut point; new weights | Cut at t=1/2: two rational curves share a point. No figure |

### splines (5 lesson-backed; parabola-derivatives in the family table)

| ID | Frame | Steps | Claims and checks | Caption intent |
|---|---|---|---|---|
| splines.continuity-levels.spline-c1 | `c1-tangent-polygon` | show control polygon | joint is the midpoint of p1p2; curve touches the polygon there -> joint=(p1+p2)/2, one-sided derivatives equal (finite differences). Old caption "illustrates, does not prove" stays | Two quadratic pieces join at the midpoint of p1p2 with a shared tangent |
| splines.continuity-levels.spline-c2 | `c2-joint-polygon` | polygon on | joint midway between neighbouring inner points; inner points at thirds | C^2 cubic pieces: joint between two inner points |
| splines.geometric-vs-parametric.spline-g1 | `g1-condition-polygon`; `g1-small-b` (b=1/4) is an alternative | polygon on | p1, p2, derived point collinear, p2 not the midpoint -> collinearity cross product 0, \|p1p2\| != \|p2q\| | G^1: aligned tangent direction with unequal legs. Old figure had b1=0.65, not reachable; use the default b |
| splines.geometric-vs-parametric.spline-g1-symmetric | `g1s-quarter` (beta1=1/4) | slider beta1=0.25 | joint on edge p1p2 at parameter 1/4; tangent continuous | The joint slides along p1p2 and the tangent stays continuous |
| splines.piecewise.spline-cn | `cn-extrapolate` | polygon on | p1, joint, derived point collinear | One-sided construction. No figure |
| splines.worked-join.spline-c1.parabola-derivatives | see "family cards without lesson frames" below | | | |

### bezier-patches (11 cards; the 11 patch section figures are the start-scene card thumbnails)

| ID | Frame | Steps | Claims and checks | Caption intent |
|---|---|---|---|---|
| bezier-patches.curve-to-patch | `curve-to-patch-scene` (6-point net) | start is acceptable; a mid-sweep v is richer (play the animation, prompt) | cross-section at fixed v moves 0..1; marked point at u=1/2 | A moving curve sweeps out the patch. Owner may accept "start = best" |
| bezier-patches.bilinear-patch | `bilinear-patch-scene` | none; start is the best moment (the marked midpoint is the claim) | S(1/2,1/2)=(1/2,1/2,1/4) for P00=(0,0,0),P10=(1,0,0),P01=(0,1,0),P11=(1,1,1) | The marked midpoint of the bilinear patch has height 1/4 |
| bezier-patches.control-net | `control-net-scene` | none; start is best | nine control points; marked point below the raised point; weights at u=1/4: 9/16,6/16,1/16 sum to 1 | Marked point lies below the raised control point |
| bezier-patches.boundary-iso-curves | `boundary-iso-curves-scene` | none; start is best | boundary u=0 equals first net row; interior controls computed (Q_1=(0,0,0.6)) | Boundary uses a net row, the interior section computed points |
| bezier-patches.tensor-decasteljau | `order-independence` | switch rows/columns once (prompt) | same final point either order | Two directions, one point |
| bezier-patches.properties | `hull-affine` or `variation-counterexample` | show net and patch | patch inside the convex hull of its net / counterexample for variation diminishing | OWNER DECISION: one image, two points |
| bezier-patches.tensor-derivatives | `saddle-derivatives` | rotate view | tangent plane spanned by the partials, normal perpendicular, twist vector | Tangent plane, normal and twist on a saddle |
| bezier-patches.tensor-subdivision | `elevate-saddle` (`split-saddle` second) | press elevate | evaluated point unchanged after elevation | Elevated net, same patch point |
| bezier-patches.tensor-joins | `join-c0`, `join-c1`, `join-g1`, `join-teapot` | pick one of four join scenes | C0 shared edge only; C1 matched derivatives; G1 matched tangent direction | OWNER DECISION: which level is the picture |
| bezier-patches.triangular-patches | `triangular-centroid` | none | centroid value, three boundary Bezier curves | Cubic triangular patch at its centroid |
| bezier-patches.square-vs-triangular | `compare-domains` | none | two shared edges, different interiors | Triangular and tensor patch overlay |

### bezier-curves (12: 9 lessons, 3 activities)

Scene data. Affine lesson curve (1,0),(2,3),(4,2),(5,-1). Symmetric cubic (-3,-2),(-3,2),(3,2),(3,-2). Default cubic (-4,-3),(-3,3),(3,3),(4,-3) is inferred from the lesson text (left subdivision part (-4,-3),(-7/2,0),(-7/4,3/2),(0,3/2)) and must be confirmed against the fixture. The extrapolation default (`ex-default`) differs from it (B(3/2)=(0.5,-9.875) in the lesson text); read it from the fixture in task 01.

| ID | Frame | Steps | Claims and checks | Caption intent |
|---|---|---|---|---|
| bezier-curves.affine-transformations.affine | `affine-quarter-turn` (the start shows nothing transformed) | from `affine-default` apply the rotate transform by 90 degrees (the frame's scene), polygon on, t=1/2 | new controls (4,-1),(1,0),(2,2),(5,3) are the old ones turned 90 degrees ccw about the mean (3,1); B(1/2) moves from (3,7/4) to (9/4,1) -> rotate each old control about (3,1), recompute the Bezier point with weights 1,3,3,1 over 8, compare with the rotated old point | Turning all four control points a quarter turn about (3,1) turns the curve and its marked point the same way |
| bezier-curves.bernstein-form.bernstein | `bernstein-calculation` (degree 3, t=1/2) | none beyond the step scene (degree 3 action) | weights 1/8,3/8,3/8,1/8, sum 1 -> b_i^3(1/2) from the binomial formula, sum 1. Confirm the scene shows a t=1/2 marker, else `bernstein-stacked-area` (already used by foundations.reading-bernstein.bernstein, a duplicate image) | At t=1/2 the four cubic weights are 1/8, 3/8, 3/8, 1/8 and add to 1 |
| bezier-curves.control-points.bezier | `bezier-evaluation` (symmetric cubic, polygon, hull, t=1/2) | none (the step scene sets all of it) | B(1/2)=((-3,-2)+3(-3,2)+3(3,2)+(3,-2))/8=(0,1), inside the hull -> Bernstein sum, point-in-hull half-plane test | The marked curve point (0,1) lies inside the convex hull of the four controls |
| bezier-curves.geometric-properties.convex-hull (activity `geometric-bounds`) | start is best: default cubic, polygon and hull on (the activity actions) | none; the prompt drags an interior control, which is free-form | whole curve inside the hull -> sample B(t), t in [0,1], half-plane tests against the hull edges | The curve stays inside the shaded convex hull of its control points. "Shows examples, does not prove" stays in prose |
| bezier-curves.interpolation.alternative-recursion | `da-recursion-quarter` (default quartic, t=1/4) | set slider t=0.25 | B(t)=(3/4)C1+(1/4)C2 for the helper curves C1 (p0..p3) and C2 (p1..p4); abs(C1B)=t abs(C1C2) -> evaluate both helper curves and the main point at t=1/4 | At t=1/4 the quartic point sits a quarter of the way from the first helper point to the second |
| bezier-curves.interpolation.decasteljau | `decasteljau-cubic` (cubic (-3,-2),(-3,2),(3,2),(3,-2), t=1/2, scheme on) | none beyond the step scene | rows (-3,0),(0,2),(3,0); (-3/2,1),(3/2,1); final (0,1) -> run de Casteljau, final equals B(1/2) | Three rows of midpoints reduce four controls to the curve point (0,1) |
| bezier-curves.interpolation.quartic-interpolation (activity `repeated-interpolation`) | start is best: `decasteljau-quartic` at t=1/2, scheme and full curve on (prepared by the activity actions) | none | five controls, rows of 4,3,2,1 points, final point (0,7/4)=B(1/2) -> run the scheme, count rows (end value from the `decasteljau-default` step text; confirm against the fixture) | Four rounds of interpolation shorten the rows from five points to the single curve point (0,7/4) |
| bezier-curves.parameter.decasteljau-parameter (activity `curve-parameter`) | `decasteljau-quartic`, t=1/4, scheme and full curve on | set slider t=0.25 (prompt moves t from the midpoint toward the ends) | equal parameter steps need not give equal arc lengths -> arc length of B on [0,1/4] versus [1/4,1/2] differs (quadrature, tolerance 1e-3; confirm numerically for this fixture) | Equal parameter steps, unequal distances: t=1/4 is not a quarter of the way along the curve. D9: the two quartic activities otherwise share one image |
| bezier-curves.next-ideas.elevation | `elevation-analysis` (after elevation) | press the elevation button (the step scene already carries the action) | five controls with Q0=P0, Q4=P3, Q_i=(i/4)P_{i-1}+(1-i/4)P_i; curve unchanged -> compare B_old(t) and B_new(t) at samples (1e-12) | Elevation adds a fifth control point and leaves the curve unchanged |
| bezier-curves.next-ideas.extrapolation | `ex-extend` (t=6/5, after Extrapolate) | set the extrapolation parameter 1.2 and press Extrapolate | E(u)=B(6u/5): E(5/6)=B(1)=P3, E(1)=B(6/5), the first part retraces the original -> sample E on [0,5/6] against B. Alternative with no learner step: `ex-marker` (start) | The curve continued to t=6/5: the old arc, then the extension |
| bezier-curves.next-ideas.repeated-subdivision | `rs-after-three` (8 pieces) | press Subdivide three times | 2^3 pieces; max polygon-to-curve distance 2.38, 0.62, 0.16, 0.040 for 0..3 steps, ratio near 1/4 -> subdivide numerically, count pieces, distance below 0.05, ratios between 3.5 and 4.5 | Three halvings leave eight pieces whose polygons already hug the curve |
| bezier-curves.next-ideas.subdivision | `sd-after-half` (default cubic, cut at t=1/2) | press Subdivide at the default t=0.5 | left part (-4,-3),(-7/2,0),(-7/4,3/2),(0,3/2) and a right part sharing the end (0,3/2); union is the original -> L(u)=B(u/2), R(u)=B((1+u)/2) against B | Cutting at t=1/2 gives two cubics that meet at (0,3/2) and together trace the same curve |

### functions-and-calculus (9)

Lessons use predict-then-reveal prompts; the highlight is the revealed state.

| ID | Frame | Steps | Claims and checks | Caption intent |
|---|---|---|---|---|
| functions-and-calculus.applications.arc-length | `arc-more-step` (sin on [0,pi], n=10) | set slider n=10 (start `arc-chord-step` has n=1) | polyline length P10 about 3.8153 below arc length L about 3.8202 -> sum 10 chord lengths, quadrature of sqrt(1+cos^2) (1e-4) | Ten chords of the sine arch are almost as long as the arc (3.8153 versus 3.8202) |
| functions-and-calculus.applications.area-between-curves | `area-difference-step` (mode between, a=1, b=3) | none beyond the scene (mode, a, b actions) | integral of g on [1,3] is 16/3, of f is 2/3, difference 14/3 about 4.6667 (f=(x-2)^2, g=3-(x-2)^2); g not below f on [1,3] -> numeric integrals | The region between the two curves on [1,3] has area 14/3 |
| functions-and-calculus.continuity.continuity | `continuity-one-sided-step` (a=1); same numbers as the start scene | none | filled point (1,1)=f(1)=a, hollow (1,3-a)=(1,2), jump 1 -> evaluate both rules at a=1. Confirms figure 24 | At x=1 the function takes the value 1 but approaches 2 from the right: a jump of 1 |
| functions-and-calculus.derivatives.derivative | `derivative-secant-step` (start: x^2, P=(1,1), Q=(2,4), secant slope 3, tangent hidden) | show the tangent (switch). h=1 plus tangent is not a lesson frame (`derivative-tangent-step` uses h=-0.5) | secant slope (f(2)-f(1))/1=3; tangent slope f'(1)=2 -> compute both. Finalizes figure 25 | The secant through P and Q has slope 3, the tangent at P slope 2 |
| functions-and-calculus.function-rules.exponential-function | `exponential-base-two` (a=2) | set base a=2 | f(0)=1, f(1)=2, f(x+1)=2 f(x) -> values 1,2,4,8 at x=0..3 | For base 2 the graph doubles with every step to the right |
| functions-and-calculus.function-rules.linear-function | `linear-slope-example` (P1=(0,1), P2=(2,5)) | set x1=0,y1=1,x2=2,y2=5 | dx=2, dy=4, k=2, n=1, y=2x+1 -> line through both points | Two points give the slope triangle with k=4/2=2 and the line y=2x+1 |
| functions-and-calculus.function-rules.trigonometric-functions | `trig-worked-example` (A=2, omega=2, phi=pi/2, B=1) | set the four sliders | f=2 sin(2x+pi/2)+1: maximum 3 at x=0, minimum -1, period pi -> evaluate extremes and period | A=2, omega=2, phi=pi/2, B=1 gives maxima 3, minima -1 and period pi |
| functions-and-calculus.integrals.accumulation | `accumulation-reveal-scene` (sin, a=0, x=2, accumulation curve shown) | press Show accumulation A | A(2)=1-cos 2 about 1.4161; the dashed curve passes through it -> quadrature, A'(x)=sin x by finite differences | The accumulated area of the sine from 0 to 2 is 1-cos 2, about 1.4161 |
| functions-and-calculus.integrals.definite-integral | `integral-area-step` = start (x^2 on [0,2], n=4 left rectangles, sum 1.75, integral 8/3) | none | left sum 0.5(0+0.25+1+2.25)=1.75, exact 8/3 -> compute both. Figure 26 (n=6, 2.037) is not the start; see D11 | Four left rectangles under x^2 on [0,2] sum to 1.75, below the exact area 8/3 |

### analysis (9)

| ID | Frame | Steps | Claims and checks | Caption intent |
|---|---|---|---|---|
| analysis.convergence.fixed-point | `fixed-point-contraction-step` (T(x)=(x+1)/2, three Next steps) | press Next step three times | iterates 0, 1/2, 3/4, 7/8 to the fixed point 1; abs(T(x)-T(y))=(1/2)abs(x-y) -> iterate T, error halves (confirm x0=0 in the fixture; the prompt computes T(0)) | Three iterations of T(x)=(x+1)/2 from 0 reach 7/8, the distance to 1 halving each time |
| analysis.convergence.sequence | `sequence-threshold-step` (a_n=1/n, epsilon=0.1, N=11) | set epsilon 0.1, N=11, show the certificate | a_5=0.2 outside the band; least N with 1/N<0.1 is 11 -> check N=11 works, N=10 does not (1/10 is not below 0.1) | For epsilon=0.1 the terms of 1/n stay in the band from N=11 on; N=5 does not work |
| analysis.convergence.uniform-convergence | `uniform-supremum-step` (x^n on [0,0.8], n=5, x=0.5, epsilon 0.1) after Show supremum; `uniform-shared-n-step` is n=11 instead | press Show supremum | error at x=0.5 is 0.03125; supremum 0.8^5=0.32768 at x=0.8; shared N=11 (0.8^11 below 0.1, 0.8^10 above) -> evaluate. Finalizes figure 29 | On [0,0.8] the largest error of x^5 is 0.32768, at the right end |
| analysis.derivative-results.convexity | `convexity-chord-step` (x^2 on [-1,1.5], second derivative shown) | press Show second derivative | chord y=0.5x+1.5; f minus chord =(x+1)(x-1.5), at most 0 on the interval; f''=2>0 -> samples | The convex x^2 lies below the chord y=0.5x+1.5 on [-1,1.5]; f''=2 is positive |
| analysis.derivative-results.extrema | `extrema-square-step` (x^2 on [-1,2]) | press Show classification | f(-1)=1 local max relative to the interval, f(0)=0 global min, f(2)=4 global max -> evaluate candidates | On [-1,2] the parabola has its minimum at 0 and its greatest value at 2; -1 is only a local maximum |
| analysis.derivative-results.mean-value | `mean-value-reveal-step` (x^2 on [0,2], c=1) | press Show matching point | secant slope 2; f'(1)=2 -> tangent at c=1 parallel to the secant | The tangent at (1,1) is parallel to the secant through (0,0) and (2,4) |
| analysis.existence.bisection | `bisection-first-step` | press Next step once | f(1)=-1, f(2)=2, m=1.5, f(m)=0.25>0, kept interval [1,1.5]. Confirms figure 27 | One bisection step on x^2-2 keeps [1,1.5] because the signs at 1 and 1.5 differ |
| analysis.integrability.darboux | `darboux-bounds-step` (x^2 on [0,2], n=4) | press Show lower sum and Show upper sum | infima 0,1/4,1,9/4 give L=1.75; suprema 1/4,1,9/4,4 give U=3.75; integral 8/3 lies between. Confirms figure 28 | The lower and upper Darboux sums, 1.75 and 3.75, enclose the integral 8/3 |
| analysis.taylor.taylor | `taylor-exp-step` (e^x, c=0, x=1, n=6, bound shown) | raise the degree to 6 with the + button, press Show error bound | T6(1)=1957/720 about 2.7181; actual error about 2.3e-4 -> exact sum; bound at least the actual error (bound formula from the fixture) | Degree 6 gives 2.7181 for e, with the error bound above the actual error |

### family cards without lesson frames (7)

Highlights are defined from the section prompt and the demonstration default (thumbnail copy in `guidedExamplePreviewCopy.ts`). The lesson cubic is P0=(-2,-1), generators w0=2, w1=2+i, so r'(t)=((1-t)w0+t w1)^2 and r'(1)=(3,4); the catalog default may differ and must be read from the fixture (D5).

| ID | Frame | Steps | Claims and checks | Caption intent |
|---|---|---|---|---|
| foundations.worked-weight.bernstein.degree-comparison | start is best: `bernstein` default at degree 2, stacked view off | none (the prompt compares degree 2 with 3 by clicking; a degree-3 image duplicates the other Bernstein cards) | three quadratic weights; at t=1/2 they are 1/4, 1/2, 1/4, sum 1 -> evaluate (1-t)^2, 2t(1-t), t^2. Matches the existing preview copy | The middle weight peaks at the midpoint and the end weights reach one at opposite ends |
| ph-curves.arc-length-problem.ph-quintic-comparison | start plus offset on (Display tab) | switch the offset on | quintic PH curve and offset at the default distance; the prompted length comparison with the cubic needs two cards -> offset distance = abs(d) at samples, source length readout unchanged | The quintic PH curve and its offset. The length comparison with the cubic stays in prose |
| ph-curves.complex-hodograph.ph-cubic-generator | start is best (cubic PH curve with its control points and the separate generator field) | none; the prompt moves w0 or w1 freely | r'(t)=((1-t)w0+t w1)^2 at samples; control points from the generators -> finite-difference derivative | A cubic PH curve is fixed by its start point and the two generators w0, w1 |
| ph-curves.worked-length.ph-cubic-offset-length | cubic with offset on, distance d=1 (same state as the `ph-offsets` frame) | switch the offset on, set distance 1 | offset at distance 1 along the normal; the source length readout is the same with and without the offset -> compare length before and after toggling | The offset curve moves; the source length readout does not change (it is not the offset's length) |
| ph-curves.investigate-ph.ph-cubic-singularity | cubic with offset on at a distance beyond the smallest radius of curvature, so the offset has a cusp or self-intersection | switch the offset on, set a signed distance of that size | abs(d) above the minimum radius of curvature of the shown segment -> the offset self-intersects (detect numerically); the value of d needs the fixture, not fixable from the text | At a large distance the offset loops back on itself near the curve's tightest bend. D10 |
| ph-curves.investigate-ph.ph-quintic-singularity | quintic, same idea as the cubic card | as above on the quintic fixture, check both signs of d | as above | As above for the quintic. D10 |
| splines.worked-join.spline-c1.parabola-derivatives | start is best (two parabolic pieces sharing one point; existing preview copy) | none; the prompt moves a free control point | both pieces lie on the same parabola; first and second derivatives agree at the join -> compare one-sided derivatives (finite differences), second derivative 2(p0-2p1+p2) per piece. Confirm the default pieces are one parabola | Two quadratic pieces on one parabola have matching first and second derivatives at the join |

## 3. Figure disposition table (29 placements)

"Carrier" is the example highlight that carries the figure's point. Where a figure state (parameter value, curve) is not reachable from the example's prompts, the row says so; the highlight then shows the example's own state. "Prose" is where a surviving distinction goes. Rows 12-23 are the patch section figures.

| # | Placement | Figure (old caption point) | Carrier highlight | Absorbed by / dropped |
|---|---|---|---|---|
| 1 | foundations/reading-bernstein | cubic Bernstein weights (4 curves) | foundations.reading-bernstein.bernstein, `bernstein-stacked-area` | Prose: "the worked example next section uses quadratic weights 1/4,1/2,1/4, degree two" |
| 2 | foundations/complex-plane | (1+i)i=-1+i, rotation, modulus kept | foundations.complex-plane.complex-multiplication, `complex-rotation-i-step` | Caption carries it fully; nothing left over |
| 3 | rational-curves/why-rational | cubic, weights 1,2,1,1 | rational-curves.why-rational.rational-weight, `rational-base-evaluation` | Prose: worked arc is quadratic with weights 1,1/sqrt2,1; the image is not that arc |
| 4 | rational-curves/worked-conic | full circle r=3 from three arcs | rational-curves.worked-conic.circle, `circle-default` | Prose: the worked proof is one quarter arc on the unit circle, not the three-piece construction |
| 5 | splines/continuity-levels | multi-piece quadratic C1 spline, join, polygon | splines.continuity-levels.spline-c1, `c1-tangent-polygon` | Prose: the picture illustrates, does not prove derivative equality; not the parabola pair of the worked example |
| 6 | splines/geometric-vs-parametric | G1 spline, b1=0.65, aligned tangents | splines.geometric-vs-parametric.spline-g1, `g1-condition-polygon` | b1=0.65 not reachable from the prompts; highlight uses default b. Prose: picture does not prove the G1 condition |
| 7 | ph-curves/arc-length-problem | catalog cubic PH, offset d=0.35 | ph-curves.arc-length-problem.ph-cubic-speed, `ph-offsets` (d=1) | Dropped: catalog curve and d=0.35 differ from the lesson; "different from the integrated curve from the origin" is a dropped distinction. Prose line `familyChapters.ts:329` rewritten |
| 8 | ph-curves/offsets | catalog quintic PH, blue outer offset d=0.5, no cusp | ph-curves.offsets.ph-quintic-offsets, `ph-quintic-offset-positive` (sample S1) | Carried (same d=0.5, lesson curve differs from the catalog curve). "Not the integrated cubic" dropped |
| 9 | parametrization/trace-vs-parameter #0 | spline alpha=0.7, 12 samples | parametrization.weighted-knot.spline-parameterization, `sp-chordal` | FLAG: the section has no card of its own; carrier lives in the next section. alpha=0.7 not reachable; prose keeps "alpha changes spline geometry, not a reparametrisation of one curve" |
| 10 | parametrization/trace-vs-parameter #1 | weighted alpha=0.25, points crowded | parametrization.weighted-knot.weighted-parameterization, `wp-quarter-calculation` (sample S3) | FLAG: same section problem. Prose keeps "neutral value is alpha=1/2" |
| 11 | parametrization/uniform-timing | 10 points, weighted mode (not arc-length) | parametrization.uniform-timing.uniform-parameterization, `up-uniform-twenty` | Opposite state (uniform vs weighted); prose keeps "sparse points and chords do not prove equal arc length" |
| 12 | bezier-patches/curve-to-patch #0 | catalog default patch-tensor scene; says it is NOT the 4x3 net in the text | none needed | Dropped: caption itself says the image does not show the text's net. FLAG: no example shows the 4x3 net with (m,n)=(3,2) and 12 points; text is prose-only (card shows a 6-point net) |
| 13 | bezier-patches/curve-to-patch #1 | 6 control points, iso-curves (= card thumbnail) | bezier-patches.curve-to-patch, `curve-to-patch-scene` | Dropped as exact duplicate of the card image |
| 14 | bezier-patches/bilinear-patch | saddle, 4 points (= card thumbnail) | bezier-patches.bilinear-patch | Dropped duplicate |
| 15 | bezier-patches/control-net | biquadratic raised interior point (= thumbnail) | bezier-patches.control-net | Dropped duplicate |
| 16 | bezier-patches/boundary-iso-curves | net, boundaries, iso-curves (= thumbnail) | bezier-patches.boundary-iso-curves | Dropped duplicate |
| 17 | bezier-patches/tensor-decasteljau | de Casteljau on 9-point net (= thumbnail) | bezier-patches.tensor-decasteljau, `order-independence` | Dropped duplicate |
| 18 | bezier-patches/properties | patch under raised net point (= thumbnail) | bezier-patches.properties | Dropped duplicate; OWNER DECISION on which of two properties the highlight shows |
| 19 | bezier-patches/tensor-derivatives | saddle with tangent plane, normal, twist (= thumbnail) | bezier-patches.tensor-derivatives, `saddle-derivatives` | Dropped duplicate |
| 20 | bezier-patches/tensor-subdivision | degree-elevated saddle (= thumbnail) | bezier-patches.tensor-subdivision, `elevate-saddle` | Dropped duplicate |
| 21 | bezier-patches/tensor-joins | two patches, kink (= thumbnail) | bezier-patches.tensor-joins, `join-c0` | Dropped duplicate; OWNER DECISION: C0/C1/G1/teapot |
| 22 | bezier-patches/triangular-patches | cubic triangular patch (= thumbnail) | bezier-patches.triangular-patches | Dropped duplicate |
| 23 | bezier-patches/square-vs-triangular | triangular over planar tensor net (= thumbnail) | bezier-patches.square-vs-triangular | Dropped duplicate |
| 24 | functions-and-calculus/continuity | jump at x=1, a=1: f(1)=1, left 1, right 2 | functions-and-calculus.continuity.continuity, `continuity-one-sided-step` (a=1; same numbers as the start). Final | Prose: "app example a=1, not a proof of the general continuity criterion" |
| 25 | functions-and-calculus/derivatives | x^2, x0=1, h=1: secant slope 3, tangent 2 | functions-and-calculus.derivatives.derivative, `derivative-secant-step` (start: P=(1,1), Q=(2,4), h=1, secant slope 3) plus the tangent switch (tangent is hidden at the start; slope 2) | Prose keeps "h != 0 before the limit". Final; needs one learner step (D11) |
| 26 | functions-and-calculus/integrals | six left rectangles, sum 2.037, integral 8/3 | functions-and-calculus.integrals.definite-integral, `integral-area-step` (start: n=4 left rectangles, sum 1.75, integral 8/3) | The old n=6 state (sum 2.037) is not reachable; `familyChapters.ts:409` (six coarse rectangles) must be rewritten (D11). Prose keeps "an approximation, exact 8/3, area because x^2>=0" |
| 27 | analysis/existence | one bisection step on x^2-2 over [1,2]: mid 1.5, value 0.25, keep [1,1.5] | analysis.existence.bisection, `bisection-first-step` | Prose: "one step, not the final root" |
| 28 | analysis/integrability | Darboux n=4: L=1.75, U=3.75, integral 8/3 | analysis.integrability.darboux, `darboux-bounds-step` | Prose: "one finite partition; Refine keeps old points" |
| 29 | analysis/convergence | x^n on [0,0.8], n=5: error at x=0.5 0.03125, sup 0.32768 at x=0.8 | analysis.convergence.uniform-convergence, `uniform-supremum-step` (n=5, x=0.5, [0,0.8]) after Show supremum; `uniform-shared-n-step` is n=11, not n=5. Final | `familyChapters.ts:442` refers to the "captured poster" |

Result: no figure's teaching concept is entirely absent from every audited example; flagged items are listed in the Owner decisions section. Rows 24-29 are final (audited with the functions and analysis cards): 24, 27 and 28 match their lesson frames exactly; 25 and 29 need one learner step (tangent switch; Show supremum); 26 differs from the start (n=4 instead of 6).

## 4. Prose that refers to a figure (SL and EN on the same source line)

All in `src/learning/content/familyChapters.ts` (a line holds both the Slovenian string and its English twin):

- 329 (investigation prompt for `ph-cubic`): SL "povezava odpre graf, ne pa stanja z zajete slike", EN "The cubic catalog capture shows ..." (figure 7).
- 375 (parametrization worked paragraph): SL "To je izračun, ne prizor na zajeti sliki zlepka", EN "In the calculation ... " (figure 9).
- 377 (parametrization paragraph): SL "zajeta slika kaže alpha=0,7 in 12 točk", EN "the captured image shows alpha=0.7 and 12 points" (figure 9).
- 409 (integrals paragraph): SL "Zajeti prikaz aplikacije pa uporablja drugo funkcijo, x^2, ...", EN "The captured app view uses a different function, x^2, with six coarse ..." (figure 26).
- 442 (analysis convergence paragraph): SL "Zajeti plakat uporablja [0;0,8] pri n=5", EN "The captured poster uses [0,0.8] at n=5 ..." (figure 29).
- Not references: 408 "končna slika / a finite picture" is general. `bezierChapter.ts:216` "slika in koordinate pripadajo temu prikazu" refers to the live demo, not a section figure; review when task 03 rewrites it.

Figure captions and alts (`familyChapters.ts:46-180`, `patchGuidedPreviewCopy.ts`, `patchChapterBasics.ts:13-17`) go away with the figures. The ordered-content mentions `fig0` and `fig1` in `familyChapterSequences.ts:1-40` and `{kind: 'figure'}` at `familyChapters.ts:205,244` and `patchBasicExampleSequence.ts:14` must also be removed (engineering note for task 02, not an audit finding). The preceding grep is textual; paragraph-level references written without "slika/captured/poster" are not excluded.

## 5. Sample entries for task 01

- **S1 quintic PH offset card**: `ph-curves.offsets.ph-quintic-offsets`, frame `ph-quintic-offset-positive`, offset distance 0.5 on, as in the matrix. The prepared step scene already contains the action sequence, so the recipe can name the frame with no extra steps; the "steps" column records the learner-equivalent path. Check: |O-r|=0.5 and (O-r).r'=0 at sampled t.
- **S2 multi-frame example**: `rational-curves.why-rational.rational-weight` (five frames: weights 1,1,1,1 / 1,2,1,1 / 1,4,1,1 / endpoint check / analysis). Chosen frame `rational-base-evaluation`; tests selecting among several frames and asserting R(1/2)=(-9/11,21/11).
- **S3 nontrivial learner step**: `parametrization.weighted-knot.weighted-parameterization`, frame `wp-quarter-calculation`, with the alpha slider set to 0.25 (also the density frame, 10 points). Tests a slider step and the sample-point warp check.

## 6. Not audited

Nothing: all 67 examples are in the matrix. Open items are the "confirm against the fixture" notes (default cubic and quartic points, extrapolation default, x0 of the fixed-point lesson, PH catalog generators and singularity distance) and the owner decisions above.
