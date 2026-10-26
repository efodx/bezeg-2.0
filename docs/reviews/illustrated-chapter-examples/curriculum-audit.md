# Illustrated chapter examples: curriculum audit

Source: [Illustrated guided examples within chapter flow](../../specs/illustrated-chapter-examples.md), especially A1–A3 and A6. Task: [00 — Audit teaching flow and example overlap](../../tasks/illustrated-chapter-examples/00-curriculum-audit.md).

## Baseline and method

This audit uses clean revision `2c3df6a` (2026-10-26). I loaded the chapter data and ran the actual `getChapterGuidedExamples` and `resolveGuidedExample` functions through Vite's SSR module loader, then compared resolved owners, prompts, lesson frames, and scene-action summaries. This counts what each chapter renderer would resolve, rather than estimating from the three source registries. It also exposes overlaps the per-source counts hide.

| Chapter | Sections | Short/activity cards | Authored-lesson cards | Resolved |
|---|---:|---:|---:|---:|
| `bezier-curves` | 8 | 6 | 9 | 15 |
| `foundations` | 5 | 6 | 6 | 12 |
| `rational-curves` | 5 | 15 | 16 | 31 |
| `splines` | 5 | 11 | 12 | 23 |
| `ph-curves` | 5 | 7 | 7 | 14 |
| `parametrization` | 5 | 7 | 8 | 15 |
| `functions-and-calculus` | 5 | 11 | 12 | 23 |
| `analysis` | 6 | 21 | 21 | 42 |
| **Total** | **44** | **84** | **91** | **175** |

Every section was enumerated; 43 sections resolve at least one card. `bezier-curves.motivation` is the sole empty section. There are 82 same-section, same-demonstration short/long pairs, plus repeated long lessons copied into multiple family sections. Those pairs are candidates for editorial review, not proof of overlap. The decisions below use their stated learner task and frames as well as the prepared scene.

The complete machine-readable source-to-home map is [baseline-examples.json](baseline-examples.json). It records all 175 resolved entries, their exact baseline IDs and launch paths, owners, first actions, bilingual title and goal, retained destination, disposition, and the complete retained-home inventory.

### Identity and legacy route notation

The proposed stable card key is `chapter.section.demonstration[.purpose]`. It identifies the retained teaching goal, independent of renderer or URL syntax. In the disposition tables:

- `A:id` is a Bézier legacy `?chapter=bezier-curves&activity=id` route.
- `F:chapter.section.demo` is the current `?explore=chapter.section.demo` short family route and its current card id `family.chapter.section.demo`.
- `L:chapter.section.demo` is the current `?example=lesson.chapter.section.demo` authored-lesson route and card id `lesson.chapter.section.demo`.
- `→ key` means preserve this old entry as an alias to that retained card and restore its new owning section/reading position. `+` means merge the short task into the longer card's prompt/frames. `keep` means retain the stated separate goal.

Keep `activity`, `explore`, `example` and catalog `learn=1` as resolving entry forms. `learn=1` continues to resolve through the lesson owner; supply an explicit owner where a retained card moves. Retain all old section ids and anchors as aliases to the placement listed below. No serialized lesson or browser preset data changes are proposed.

## Ordered placement and source dispositions

Paragraph anchors (`p1`, `p2`, etc.) refer to the current authored section paragraphs. Bézier block anchors (`b1`, `b2`, etc.) refer to the ordered English block sequence; Slovenian has the matching block content. The implementation can split/rewrite at these anchors, but should keep the Slovenian and English concept order equivalent. Each row names every current resolved entry in that section and maps it to a retained key.

### Bézier curves

Placement: `motivation` stays prose-only. In `control-points`, introduce the cubic and control polygon, then retain `bezier-curves.control-points.bezier` after b3, before the current activity marker; fold the two-drag prompt into the first observation/action frame. In `parameter`, retain `bezier-curves.parameter.decasteljau-parameter` after b2, before the quartic parameter activity. In `interpolation`, place the three-control derivation after b11, then the reusable De Casteljau lesson, the distinct alternative recursive construction, and finally the five-control quartic activity after b12 as a return to the opening example. In `bernstein-form`, retain the Bernstein lesson after b7 and fold in the degree-two coefficient activity before b8's current figure/prompt. Retain `bezier-curves.geometric-properties.geometric-bounds` after b5. In `affine-transformations`, retain the affine lesson after b4 and incorporate the transformation prompt. In `next-ideas`, retain the four separate lessons in this order after b2: elevation, one subdivision, repeated subdivision, extrapolation; add short transitions between them so the sequence explains exact representation, an exact cut, polygon refinement, then extension outside `[0,1]`.

| Current section | Resolved entries and disposition |
|---|---|
| `motivation` | No entries. Preserve as the chapter opening. |
| `control-points` | `A:shape-control` + `L:bezier-curves.control-points.bezier` → **bezier-curves.control-points.bezier**. The short two-control-move task is covered by the long lesson's endpoint/control-point frames; keep its prompt as the hands-on first frame, not a second card. |
| `parameter` | `A:curve-parameter` **keep** → **bezier-curves.parameter.decasteljau-parameter**. It uniquely opens the five-control quartic and distinguishes parameter spacing from distance. |
| `interpolation` | `A:repeated-interpolation` **keep** → **bezier-curves.interpolation.quartic-interpolation** (five controls/four rounds); `L:bezier-curves.interpolation.decasteljau` **keep** → **bezier-curves.interpolation.decasteljau** (quadratic/cubic derivation and changing `t`); `L:bezier-curves.interpolation.decasteljau-alternative` **keep** → **bezier-curves.interpolation.alternative-recursion** (two helper curves and parameter-dependent weighted interpolation). These have different prepared degrees and different teaching claims. |
| `bernstein-form` | `A:blending-coefficients` + `L:bezier-curves.bernstein-form.bernstein` → **bezier-curves.bernstein-form.bernstein**. Merge: the lesson checks nonnegative basis functions and partition of unity; the short task's degree-two endpoint/central coefficient comparison is its focused first observation. |
| `geometric-properties` | `A:geometric-bounds` **keep** → **bezier-curves.geometric-properties.convex-hull**. Its claim is the convex-hull bound, supported by nonnegative weights summing to one; this is not the control-point endpoint lesson. |
| `affine-transformations` | `A:transform-shape` + `L:bezier-curves.affine-transformations.affine` → **bezier-curves.affine-transformations.affine**. The multi-frame lesson covers translation, rotation, scale, and degree invariance; merge the short prompt into its opening. |
| `next-ideas` | `L:bezier-curves.next-ideas.elevation` **keep** → **bezier-curves.next-ideas.elevation**; `L:...subdivision` **keep** → **bezier-curves.next-ideas.subdivision**; `L:...repeated-subdivision` **keep** → **bezier-curves.next-ideas.repeated-subdivision**; `L:...extrapolation` **keep** → **bezier-curves.next-ideas.extrapolation**. Different constructions and observations; do not collapse them because they share a demonstration route. |

### Foundations

Place the single five-frame Bernstein lesson in `reading-bernstein` after p1's formula and before p2's graphical interpretation. Keep the short degree-comparison card after `worked-weight.p1`. Its prompt compares Bernstein weights at degrees two and three; the visible graph should start at degree two with stacked area off, so the learner can make the comparison. The calculation of the weighted point at \(t=1/2\) remains in the section prose and does not require a graph construction. Place complex multiplication after `complex-plane.p2`, where rotation, scale, and argument addition have been defined. The investigation paragraph remains a synthesis/reflection, not a second copy of each card.

| Current section | Resolved entries and disposition |
|---|---|
| `why-weights` | `F:foundations.why-weights.bernstein` and `L:foundations.why-weights.bernstein` → **foundations.reading-bernstein.bernstein**. Alias the duplicate lesson placement; its degree/weight count goal is covered at the canonical home. |
| `reading-bernstein` | `F:foundations.reading-bernstein.bernstein` + `L:foundations.reading-bernstein.bernstein` → **foundations.reading-bernstein.bernstein**. Merge the short formula/nonnegativity/weighted-average prompt into the lesson's frames about basis values and sum one. |
| `worked-weight` | `F:foundations.worked-weight.bernstein` **keep** → **foundations.worked-weight.bernstein.degree-comparison**; `L:foundations.worked-weight.bernstein` → **foundations.reading-bernstein.bernstein**. The short prompt compares the degree-two basis with degree three; the repeated basis-graph lesson is not needed here. Keep the worked \((2,1)\) weighted-point arithmetic in prose. |
| `complex-plane` | `F:foundations.complex-plane.complex-multiplication` + `L:foundations.complex-plane.complex-multiplication` → **foundations.complex-plane.complex-multiplication**. Merge: the seven-frame prediction/verification lesson already includes multiplication by (i), (-1), (2), general factors, and arguments modulo (2pi). |
| `investigate-limits` | `F` and `L` entries for both `bernstein` → **foundations.reading-bernstein.bernstein**; `F` and `L` entries for `complex-multiplication` → **foundations.complex-plane.complex-multiplication**. Aliases to the earlier canonical scenes; keep p1/p2 as the limitation/synthesis reading. |

### Rational curves

Place the weight-influence card after `why-rational.p2` and rational De Casteljau after `homogeneous.p2`. Keep the exact quarter-circle derivation in prose; the separate full-circle card follows `worked-conic.p2`/p3 and varies the number of rational arcs. Put the three distinct operation cards in `operations` after p1: rational degree elevation, rational subdivision, and Farin points. Put extrapolation after `investigate-rational.p2`, next to the denominator warning, and link its old operations/investigation entries there. Leave p2 of `investigate-rational` as a limitation/reflection passage, not a repeated gallery.

| Current section | Resolved entries and disposition |
|---|---|
| `why-rational` | `F:rational-curves.why-rational.rational` + `L:rational-curves.why-rational.rational` → **rational-curves.why-rational.rational-weight**. Merge the second-weight influence prompt into the long lesson; retain the denominator/positivity caveat in the reading. |
| `homogeneous` | `F:rational-curves.homogeneous.rational-decasteljau` + `L:rational-curves.homogeneous.rational-decasteljau` → **rational-curves.homogeneous.rational-decasteljau**. Merge the changing-(t) prompt into the rational prefix/evaluation frames. |
| `worked-conic` | Both `rational` entries → **rational-curves.why-rational.rational-weight** (aliases; they repeat weight choice, not the quarter-arc proof). `F` + `L:rational-curves.worked-conic.circle` → **rational-curves.worked-conic.circle**. Retain the full-circle arc count as a scene distinct from the exact quadratic quarter-circle derivation in p1/p2. |
| `operations` | `F` + `L` for `rational-elevation` → **rational-curves.operations.rational-elevation**; for `rational-subdivision` → **rational-curves.operations.rational-subdivision**; for `farin` → **rational-curves.operations.farin**. Merge each focused action into its long frames. `F` + `L` for `rational-extrapolation` → **rational-curves.investigate-rational.rational-extrapolation** because its denominator condition belongs beside the p2 warning. `L:rational-curves.operations.rational-decasteljau` → **rational-curves.homogeneous.rational-decasteljau**. |
| `investigate-rational` | For each of `rational`, `rational-decasteljau`, `rational-elevation`, `rational-extrapolation`, `rational-subdivision`, `farin`, and `circle`, map both its `F` and `L` entries to the canonical home above. This removes seven repeated long lessons and seven repeated prompts; p1/p2 remain authored synthesis and limitation text. |

### Splines

Keep the general piecewise `C^n` example after `piecewise.p1`, then put `C^1` and `C^2` continuity comparisons after `continuity-levels.p2`. Put asymmetric `G^1` and symmetric `G^1` in `geometric-vs-parametric` after p2, preserving their different parameter constraints. Retain a dedicated worked-join card between `worked-join.p1` and p2, before the global-parameter chain-rule passage. Its scene must remain `worked-parabola-join`, with `L(t)=(t,t^2)`, `R(s)=(1+s,1+2s+s^2)`, first derivatives `(1,2)` at `(1,1)`, the distinct second derivatives `(0,2)`, and the `s^2` coefficient variation. It is not a variant of the general C1 or symmetric spline scene.

| Current section | Resolved entries and disposition |
|---|---|
| `piecewise` | `F:splines.piecewise.spline-cn` + `L:splines.piecewise.spline-cn` → **splines.piecewise.spline-cn**. Merge the free-control/counter prompt into the frames on local control and continuity order. |
| `continuity-levels` | `F` + `L` for `spline-c1` → **splines.continuity-levels.spline-c1**; `F` + `L` for `spline-c2` → **splines.continuity-levels.spline-c2**. Merge labels/computed-point prompts into their matching construction lesson. `L:splines.continuity-levels.spline-cn` → **splines.piecewise.spline-cn**. C1 and C2 remain distinct conditions and prepared constructions. |
| `geometric-vs-parametric` | `F` + `L` for `spline-g1` → **splines.geometric-vs-parametric.spline-g1**; for `spline-g1-symmetric` → **splines.geometric-vs-parametric.spline-g1-symmetric**. Merge prompts. Keep the free (b_1) G1 case distinct from the three-parameter symmetric sufficient condition. |
| `worked-join` | `F:splines.worked-join.spline-c1` + `L:splines.worked-join.spline-c1` → **splines.worked-join.spline-c1.parabola-derivatives**. Merge only the card shell; preserve the explicit pair of parabolas and both derivative comparisons above. |
| `investigate-splines` | For each of `spline-cn`, `spline-c1`, `spline-c2`, `spline-g1`, and `spline-g1-symmetric`, map both `F` and `L` copies to the corresponding canonical card in `piecewise`, `continuity-levels`, or `geometric-vs-parametric`. Retain p1/p2 as the cross-topic investigation and limits discussion; no second gallery of identical prepared constructions. |

### PH curves

The cubic and quintic authored lessons are shared by demonstration ID, so repeated long-lesson entries resolve to one home per degree: cubic speed in `arc-length-problem`, and quintic offsets in `offsets`. The family prompts are separately authored in the baseline, with different wording and goals: the cubic generator editor in `complex-hodograph`, signed-offset singularity checks in `investigate-ph`, and cubic-vs-quintic comparison in `arc-length-problem` remain distinct. The cubic offset prompts in `arc-length-problem` and `worked-length` use the same prepared scene/actions and both ask the learner to vary offsets while watching the source-length readout; merge the former into the latter, whose wording also distinguishes source length from offset length. Keep the explicit calculation in `worked-length` prose, followed by this graph exploration. In `offsets`, merge the signed-distance prompt with the quintic offset lesson after p1.

| Current section | Resolved entries and disposition |
|---|---|
| `arc-length-problem` | `L:ph-curves.arc-length-problem.ph-cubic` **keep** → **ph-curves.arc-length-problem.ph-cubic-speed**. `F:...ph-cubic` merges into **ph-curves.worked-length.ph-cubic-offset-length** because it repeats the offset/source-length action below. `F:...ph-quintic` **keep** → **ph-curves.arc-length-problem.ph-quintic-comparison** (it compares distinct degrees and parameterizations). `L:...ph-quintic` → **ph-curves.offsets.ph-quintic-offsets**. |
| `complex-hodograph` | `F:ph-curves.complex-hodograph.ph-cubic` **keep** → **ph-curves.complex-hodograph.ph-cubic-generator**; `L:ph-curves.complex-hodograph.ph-cubic` → **ph-curves.arc-length-problem.ph-cubic-speed**. Changing the generator in the separate editor is not the lesson's speed identity check. |
| `worked-length` | `F:ph-curves.worked-length.ph-cubic` **keep** → **ph-curves.worked-length.ph-cubic-offset-length**; merge the earlier `arc-length-problem` cubic offset prompt into this card. `L:ph-curves.worked-length.ph-cubic` → **ph-curves.arc-length-problem.ph-cubic-speed**. The authored lesson repeats the cubic lesson; no distinct exact integral frame is authored here. Keep the section's written calculation and distinguish the source-length readout from the exact integral `4/3`. |
| `offsets` | `F:ph-curves.offsets.ph-quintic` + `L:ph-curves.offsets.ph-quintic` → **ph-curves.offsets.ph-quintic-offsets**. Merge signed distance (d=0.5,0,-0.5) into the existing offset-side frames. |
| `investigate-ph` | Keep both family prompts as **ph-curves.investigate-ph.ph-cubic-singularity** and **ph-curves.investigate-ph.ph-quintic-singularity**: they ask about signed offsets approaching/intersecting for each degree. Map both authored lesson copies to their primary homes above. |

### Parametrization

Retain one spline-parameterization graph card at `weighted-knot`, plus the separate weighted-vs-uniform traversal comparison. Its generic α/count prompt and the `worked-timing` α=0.7/12-point prompt use the same demonstration, prepared scene/actions, and repeated authored lesson; merge the focused comparison prompt into the `weighted-knot` card. Keep the chord-share calculation in `worked-timing` prose, where it explains the graph prompt without creating a duplicate graph card. Keep the uniform arc-length sampling lesson in `uniform-timing`. `trace-vs-parameter` and `investigate-param` become explanatory/reflection passages linking to these homes. The spline α control can alter knot allocation and geometry; the separate weighted-parameterization lesson changes sample timing along a fixed trace. Keep those claims distinct.

| Current section | Resolved entries and disposition |
|---|---|
| `trace-vs-parameter` | `F` + `L:parametrization.trace-vs-parameter.spline-parameterization` → **parametrization.weighted-knot.spline-parameterization**. Alias the repeat; retain the section's prose distinction between trace and traversal. |
| `weighted-knot` | `F:parametrization.weighted-knot.spline-parameterization` + `L:...spline-parameterization` → **parametrization.weighted-knot.spline-parameterization**. `L:parametrization.weighted-knot.weighted-parameterization` **keep** → **parametrization.weighted-knot.weighted-parameterization**. |
| `worked-timing` | `F` + `L:parametrization.worked-timing.spline-parameterization` → **parametrization.weighted-knot.spline-parameterization**; merge the α=0.7/12-point comparison prompt into the retained graph card while leaving its chord-share calculation in this section's prose. The repeated authored lesson ID/frames do not create another card. |
| `uniform-timing` | `F` + `L:parametrization.uniform-timing.uniform-parameterization` → **parametrization.uniform-timing.uniform-parameterization**; merge the switch/sampling prompt into the uniform-vs-weighted comparison. |
| `investigate-param` | `F` and `L` `spline-parameterization` → **parametrization.weighted-knot.spline-parameterization**; `F` and `L` `weighted-parameterization` → **parametrization.weighted-knot.weighted-parameterization**; `F` and `L` `uniform-parameterization` → **parametrization.uniform-timing.uniform-parameterization**. All are aliases to the homes above. |

### Functions and calculus

Keep the three function-rule examples after `function-rules.p1` and p2's trigonometric caveat; retain continuity after p1, derivative after p1, exact integral after `integrals.p1`, and accumulation after p2. In `applications`, retain only area-between-curves and the polygonal arc-length estimate; route derivative and integral copies to their prior homes. Merge each short prompt into its matching long lesson where the control/action and goal agree.

| Current section | Resolved entries and disposition |
|---|---|
| `function-rules` | `F` + `L` for `linear-function` → **functions-and-calculus.function-rules.linear-function**; for `exponential-function` → **functions-and-calculus.function-rules.exponential-function**; for `trigonometric-functions` → **functions-and-calculus.function-rules.trigonometric-functions**. Merge prompt/control tasks into each corresponding lesson. |
| `continuity` | `F` + `L:functions-and-calculus.continuity.continuity` → **functions-and-calculus.continuity.continuity**. Merge the one-sided-limit/value prompt into the lesson. |
| `derivatives` | `F` + `L:functions-and-calculus.derivatives.derivative` → **functions-and-calculus.derivatives.derivative**. `F:functions-and-calculus.derivatives.arc-length` → **functions-and-calculus.applications.arc-length**; `L:...derivatives.arc-length` → same. The arc-length computation belongs with applications and its counterpart is retained there. |
| `integrals` | `F` + `L:functions-and-calculus.integrals.definite-integral` → **functions-and-calculus.integrals.definite-integral**; `L:functions-and-calculus.integrals.accumulation` **keep** → **functions-and-calculus.integrals.accumulation**. |
| `applications` | `F` + `L` for `area-between-curves` → **functions-and-calculus.applications.area-between-curves**; `F` + `L` for `arc-length` → **functions-and-calculus.applications.arc-length**. `F` + `L` `definite-integral` → **functions-and-calculus.integrals.definite-integral**; `F` + `L` `derivative` → **functions-and-calculus.derivatives.derivative**. |

### Analysis

Keep the concept examples at their theorem/topic sections: bisection after `existence.p2`; Darboux after `integrability.p1`; mean value after `derivative-results.p1`, then extrema and convexity after p2 is split to introduce each claim; Taylor after `taylor.p2`; and sequence, uniform convergence, fixed point in `convergence` after p1, p3, and p4 respectively. The current four-paragraph convergence section needs interleaving so uniform-convergence follows the uniform definition, supremum bound, and worked domain examples; fixed point follows its p4 prerequisites. `investigate` stays synthesis prose and aliases all repeated lesson links to these homes. The mean-value example reached from `existence` resolves to `derivative-results`; accumulation examples in this chapter resolve to the Functions and Calculus integral home.

| Current section | Resolved entries and disposition |
|---|---|
| `existence` | `F` + `L:analysis.existence.bisection` → **analysis.existence.bisection**. `F:analysis.existence.mean-value` + `L:analysis.existence.mean-value` → **analysis.derivative-results.mean-value**. |
| `integrability` | `F` + `L:analysis.integrability.darboux` → **analysis.integrability.darboux**. `F` + `L:analysis.integrability.accumulation` → **functions-and-calculus.integrals.accumulation**. |
| `derivative-results` | `F` + `L` for `mean-value` → **analysis.derivative-results.mean-value**; `extrema` → **analysis.derivative-results.extrema**; `convexity` → **analysis.derivative-results.convexity**. Merge each prediction prompt into the corresponding complete lesson; keep the three claims separate. |
| `taylor` | `F` + `L:analysis.taylor.taylor` → **analysis.taylor.taylor**. Merge the degree/error comparison prompt into the frames with the Lagrange assumptions and bound. |
| `convergence` | `F` + `L` for `sequence` → **analysis.convergence.sequence**; `uniform-convergence` → **analysis.convergence.uniform-convergence**; `fixed-point` → **analysis.convergence.fixed-point**. Merge each short prompt into its multi-frame concept lesson. |
| `investigate` | For each of `bisection`, `mean-value`, `accumulation`, `darboux`, `extrema`, `convexity`, `taylor`, `sequence`, `uniform-convergence`, and `fixed-point`, map both `F:analysis.investigate.demo` and `L:analysis.investigate.demo` to the canonical key listed above. This removes 20 repeated cards while retaining the two-paragraph synthesis and theorem-hypothesis reflection. |

## Preview and capture ownership

The stable card key owns one bilingual alt-text/caption pair and one captured image. Capture only after the final prepared scene is fixed. Cards with multiple authored frames still use the first prepared graph for the preview; later frames are not alternate preview candidates. Do not reuse section-level catalog figures as card previews without comparing scene state and framing. In particular, the existing rational/circle and PH family figures describe other graph states than the worked rational quarter-circle and some activity prompts. The worked-weight Bernstein scene mismatch is listed above. The spline worked-join preview must show the actual two parabolas and join construction. These are capture/implementation follow-ups, not evidence that the current figures satisfy A4/A5.

## Retained-card count and key map

The proposed inventory retains **56 distinct card keys**: Bézier 12, Foundations 3, Rational 7, Splines 6, PH 7, Parametrization 3, Functions and Calculus 9, and Analysis 9. Keys are the final component of each disposition target above; the full key list is:

- Bézier (12): `bezier-curves.control-points.bezier`; `bezier-curves.parameter.decasteljau-parameter`; `bezier-curves.interpolation.quartic-interpolation`; `bezier-curves.interpolation.decasteljau`; `bezier-curves.interpolation.alternative-recursion`; `bezier-curves.bernstein-form.bernstein`; `bezier-curves.geometric-properties.convex-hull`; `bezier-curves.affine-transformations.affine`; `bezier-curves.next-ideas.elevation`; `bezier-curves.next-ideas.subdivision`; `bezier-curves.next-ideas.repeated-subdivision`; `bezier-curves.next-ideas.extrapolation`.
- Foundations (3): `foundations.reading-bernstein.bernstein`; `foundations.worked-weight.bernstein.degree-comparison`; `foundations.complex-plane.complex-multiplication`.
- Rational (7): `rational-curves.why-rational.rational-weight`; `rational-curves.homogeneous.rational-decasteljau`; `rational-curves.worked-conic.circle`; `rational-curves.operations.rational-elevation`; `rational-curves.operations.rational-subdivision`; `rational-curves.operations.farin`; `rational-curves.investigate-rational.rational-extrapolation`.
- Splines (6): `splines.piecewise.spline-cn`; `splines.continuity-levels.spline-c1`; `splines.continuity-levels.spline-c2`; `splines.geometric-vs-parametric.spline-g1`; `splines.geometric-vs-parametric.spline-g1-symmetric`; `splines.worked-join.spline-c1.parabola-derivatives`.
- PH (7): `ph-curves.arc-length-problem.ph-cubic-speed`; `ph-curves.arc-length-problem.ph-quintic-comparison`; `ph-curves.complex-hodograph.ph-cubic-generator`; `ph-curves.worked-length.ph-cubic-offset-length`; `ph-curves.offsets.ph-quintic-offsets`; `ph-curves.investigate-ph.ph-cubic-singularity`; `ph-curves.investigate-ph.ph-quintic-singularity`.
- Parametrization (3): `parametrization.weighted-knot.spline-parameterization`; `parametrization.weighted-knot.weighted-parameterization`; `parametrization.uniform-timing.uniform-parameterization`.
- Functions and Calculus (9): `functions-and-calculus.function-rules.linear-function`; `functions-and-calculus.function-rules.exponential-function`; `functions-and-calculus.function-rules.trigonometric-functions`; `functions-and-calculus.continuity.continuity`; `functions-and-calculus.derivatives.derivative`; `functions-and-calculus.integrals.definite-integral`; `functions-and-calculus.integrals.accumulation`; `functions-and-calculus.applications.area-between-curves`; `functions-and-calculus.applications.arc-length`.
- Analysis (9): `analysis.existence.bisection`; `analysis.derivative-results.mean-value`; `analysis.integrability.darboux`; `analysis.derivative-results.extrema`; `analysis.derivative-results.convexity`; `analysis.taylor.taylor`; `analysis.convergence.sequence`; `analysis.convergence.uniform-convergence`; `analysis.convergence.fixed-point`.

## Coverage and remaining checks

This is an editorial proposal at the named baseline, not a runtime change. The old route aliases and section mappings above must be encoded and checked against all 175 resolved entries before removing cards. The primary unresolved asset-level work is verifying each retained card's first-frame scene against its claims and capturing/proving its actual initial graph. No mathematical tests, build, screenshots, or browser checks are required for this documentation-only audit; those belong to implementation and acceptance tasks.
