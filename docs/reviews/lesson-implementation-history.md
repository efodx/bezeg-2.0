# Lesson implementation history

This record preserves useful implementation findings from completed lesson handoffs. Current contracts and open follow-ups belong in the linked specs and reviews. Historical suite counts and unperformed checks below describe their original release runs; they are not current acceptance claims. The owner's [2026-10-24 release policy](../guardrails.md#release-policy--owner-decision-2026-10-24) governs current release status.

## Analysis guided lessons

Batch A (released 2026-10-15) recorded that its final production smoke run was 151/154 before fixes; the three failures concerned label visibility, a long formula at 390 px, and an incorrect smoke expectation. The affected rows passed after fixes, but the full 154-row suite was not rerun. The accumulation preview's `a` label touched a tick, and narrow mean-value labels crowded; no physical touch device or projector was used, and Pages hosting was not locally exercised.

Batch B's final production smoke run passed 183/183 after fixing missing preview manifest entries and formula overflow. Hosted Linux Chromium exposed additional formula-width failures, fixed by splitting long prose formulas. The layout round fixed initial caption/label collisions using wider views, outward endpoint labels, compact labels below 520 px, and sign marks away from the y-axis. The later known narrow-screen residuals were a crowded extrema sine example, convexity inflection label crossing the curve, and Darboux `a` label touching the y-axis. Previews remained zoomed out because the shared capture script fits the caption. No physical touch device or projector was used, and Pages hosting was not locally exercised.

Batch C's final production smoke suite passed 199/199; hosted Linux caught a Taylor prose-width issue fixed by breaking an inline sum into shorter formulas. Historical layout residuals were the sequence epsilon band crossing x ticks at `epsilon = 0.5`, the complex zero example's `zw` label obscuring the `1` tick at 390 px, a flat sequence preview from equal-axis-unit framing, and formula boxes that scroll without a visible cue. No physical touch device or projector was used, and Pages hosting was not locally exercised. These are historical observations; verify current behavior before reopening them as defects. The parent spec owns the mathematical contracts and the 2026-10-24 release policy removes general language-review gates.

## Accumulation graph decisions

The accumulated-integral implementation chose one shared board and y-scale rather than coordinated separate boards: the tangent slope of A equals the height of f, and separate scales could obscure that relationship. It also retained one graph-owned session board with one capture/restore/disposal path. Both functions share a horizontal axis and differ by solid/dashed line patterns, labeled points and a textual legend.

The original per-function views (x range × y range) were: sin, [-1.2, 6.7] × [-3.1, 3.1]; x², [-2.5, 5.5] × [-2, 6]; exp, [-5, 9.6] × [-1.5, 10]. Unit tests checked that f(2) and A(2), with a = 0, lie inside the chosen bounds. The original topic handoff did not independently verify projection/narrow-width readability; later batch smoke evidence has its own scope above. Changing the function keeps a, x and reveal state, applies the per-function view, and respects an explicit preset view.

Hiding A also hides its point, tangent, value, slope, positive/negative contributions and sign status so the answer is not leaked during prediction. Inputs, f(x) and signed shading remain available. Reveal survives edits and checkpoint/preset restore. Signed shading uses a constant number of curve/mark objects and splits sin at its zeros; narrow stretches below 3% of the board width omit sign marks. The real GraphHost/jsdom check found JSXGraph evaluating function closures with non-finite parameters during setup; those closures return NaN rather than calling the pure accumulation evaluator with invalid input. Fake-board tests alone had missed that initialization behavior.

## Function concepts

The eight concept task records are superseded by the parent spec's independently recomputed examples and its later 81-suite/1,104-test and 140/140 browser evidence. The retired handoffs also established these implementation contracts: coincident linear points produce a `degenerate` state and coordinates are bounded to magnitude 1,000; derivative function changes preserve `x₀`, `h`, and view; integral function changes apply the function's default view while a preset's explicit view takes precedence; integral generated shapes keep a constant object count as `n` changes; arc-length endpoints stay on the graph, length is nonnegative and independent of endpoint order, and generated object count does not grow with `n`.

The integral graph deliberately applies a per-function view on selection because lesson scenes need a readable `sin` interval through `2π`; the derivative graph keeps its view. For arc length, the polyline remains below the exact arc length in the documented example, and the readout's length does not inherit the definite integral's orientation. These statements preserve the original implementation choices and checks, not new test results.

## Guided lesson runtime and pilot content

The current [runtime spec](../specs/guided-lessons.md), [architecture guide](../current-architecture.md), and [UX audit](guided-lessons-ux-audit-2026-10-24.md) own the runtime behavior and actionable defects. The pilot content's source mapping and implementation correspondence are in the [content expansion blueprint](../specs/guided-lessons-content-expansion.md) and the standalone chapter records. Retired handoffs add no separate current runtime requirement. The graph-access repair's criterion-by-criterion evidence remains in its [browser report](lesson-graph-access/browser-smoke.md), linked directly from the graph-access spec.

## Rollout cohorts B–E

Cohort B fixed a missing Bernstein partition-of-unity identity and a formula/Continue overlap at 390 px. The earlier browser review's start counted 17 checks and the full built suite passed 51 checks; these are historical run totals. Farin-plus-elevation was reachable only by importing a preset because the elevation route did not expose the Farin switch.

Cohort C fixed stale PH sample parameters and regeneration tied to the wrong length check. Content checks recomputed α = 1/4 and 3/4 samples, symmetry, default length `L = s(1) = 1003/60` against Simpson quadrature, σ values, three equal-arc-length parameters, and ten-sample chord ratios of about 1.05 in uniform mode and 4.10 in weighted mode. Its historical full suite passed 65 checks. The blueprint records its exact contracts; pending terminology observations are not release gates under current policy.

Cohort D fixed scene re-import rebinding for generated subdivision curves, synchronous `pendingT` reads within one scene tick, missing rational split weight labels, and off-screen extrapolation instructions. For rational extrapolation, the third weight becomes negative above about `t = 1.366`, while the original denominator stays positive, so there is no pole; negative representation weights remove the convex-hull property but do not invalidate the construction. The historical report did not provide a single final smoke total here; do not infer one.

Cohort E's 187/187 built smoke run included 153/153 lesson checks. A Farin-slider drag was not tested; G¹ inspector sliders were labeled “Parameter” with “Parameter b” above them; `spline-cn` and `spline-c2` each have a three-number default point (`[-1.5, -2, 5]`, `[1, -2, 5]`) whose third coordinate is ignored by the importer. The default-data question remains visible in the blueprint. The historical report also observed `spline-cn` derived points outside its default view; the lesson added zoom-out guidance.

## Standalone learning pilot

The [standalone implementation report](standalone-learning/implementation.md) remains the source for its route, chapter, six activity, and hosted evidence. The task handoff introduced no distinct implementation evidence that needs duplication here. Its original device and owner-review statements are historical; current status follows the release policy and the parent spec's concrete open review items.

## Lesson graph access

The current UX audit owns remaining lesson graph-obstruction findings. The completed repair's criterion-level test evidence, browser sizes, and screenshots remain in [the browser smoke report](lesson-graph-access/browser-smoke.md); the source spec will link to that report. Physical-device and screen-reader limitations in that report remain factual coverage limits and are not acceptance claims.
