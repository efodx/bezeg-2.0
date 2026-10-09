# Faster shared Bézier drawing

Status: scope confirmed; point-only evaluation implemented and verified, but phone acceptance failed. Interview date: 2026-10-08. See [experiment results](../bezier-performance-results.md). A bounded board-phase investigation is in progress; the separate [math evaluation follow-up](bezier-math-evaluation-performance.md) explores whether further exact math-side savings remain. No additional app optimization has been selected.

## Problem and agreed direction

The owner reports lagging animation on a OnePlus Nord N10. The rational De Casteljau demonstration is a useful starting point, not an established worst-case scene. Improve polynomial and rational Bézier drawing generally, then determine whether those improvements sufficiently address the mobile symptom. Preserve current visual quality, mathematical meaning, displayed construction steps, and animation playback speed.

Use repeatable curve-evaluation measurements and a De Casteljau animation benchmark, followed by an owner-run before/after check on the phone. The phone browser is currently identified only as its default browser; record its name and version when measuring. Numeric device budgets will be chosen from the baseline rather than assumed from desktop results.

## Scope

- Measure the shared evaluation and JSXGraph drawing path before selecting an optimization. Distinguish arithmetic/allocation, cache behavior, sampling, construction updates, React work, and board rendering.
- Improve shared polynomial and rational evaluation or closely related drawing work when supported by measurements. Retain full construction evaluation for demonstrations that require intermediate rows.
- Keep JSXGraph, the current build tool, UI, routes, and preset formats for this experiment. A renderer replacement, workers, reduced drawing fidelity, or a broader application rewrite requires separately scoped evidence and decisions.
- Verify affected consumers of shared evaluation, including spline and PH demonstrations, without expanding this work into their redesign.

## Source hypotheses

`PolynomialBezierCurve.eval` retains the full De Casteljau table although it consumes only the final point, and allocates two result point objects on a cache miss. Rational curves inherit this evaluator with a different interpolation scheme. Separate X/Y callbacks already share a per-parameter cache, so duplicate callback calls do not establish duplicate arithmetic.

De Casteljau animation updates React state and the shared board path advances a global cache revision even when points and weights stay fixed. Preserving evaluations across frames might help, but mutable and function-backed coordinates/weights require correct dependency tracking. Removing invalidation without proving edit correctness is unacceptable. These are source observations, not measured bottleneck conclusions.

## Benchmark protocol

1. Capture the current implementation and use production builds for before/after comparisons. Record commit and local changes, device/browser/version, viewport, input method, labels, construction visibility, parameter range, and animation speed.
2. Use the default polynomial and rational De Casteljau scenes. Add one deterministic higher-degree scene with explicit coordinates, weights, and point count, saved with the benchmark. Exercise animation, moving control points, the parameter slider, and a rational weight edit. Parameter-only animation cannot alone demonstrate faster drawing after geometry edits.
3. Provide a repeatable browser benchmark or equivalent app test that exercises the real shared path. Keep diagnostic controls separate from ordinary educational controls. Collect frame intervals and median/p95 behavior over repeated comparable runs; record dropped-frame criteria explicitly. Do not equate frame intervals with measured input latency.
4. Collect diagnostic evaluation counts, cache misses, evaluation time, board updates, and React work as practical. Use separate minimally instrumented frame runs to avoid per-evaluation instrumentation distorting the headline result. Include an input-to-visible-update check for dragging/sliders.
5. Retain raw baseline and after results, warm-up and run duration, and scene configuration. Compare repeated-run variability before claiming a gain. Desktop results and simulated throttling supplement the actual phone check; they do not replace it.
6. After baseline, record a phone frame/latency budget before optimizing. Keep the chosen change only if improvement exceeds run variability and representative interactions do not materially regress. If curve-path work is insufficient, report the remaining measured cost before proposing another scope.

## Acceptance and verification

- The retained optimization improves measured shared curve work and end-to-end drawing in the recorded scenes; report median and p95 results, including regressions. A faster isolated evaluator alone does not close the mobile-lag goal.
- The owner can repeat the same scene/check on the Nord N10 and confirms that animation and controls are acceptably responsive against the baseline and recorded budget. Until that check is complete, report the mobile outcome as unverified.
- Curve appearance, construction visibility and intermediate values, labels, settled geometry, and elapsed-time animation progression remain equivalent. No deliberate reduction in sampling quality is included.
- Check polynomial evaluation against an independent Bernstein reference and rational evaluation against a weighted Bernstein reference. Cover endpoints, repeated parameters, equal/positive rational weights, supported zero/negative weights away from poles, and supported extrapolation parameters. Preserve existing singular-input behavior unless a separate correctness fix is justified and documented.
- Check final construction-row agreement with evaluation, subdivision parameter equivalence, and degree-elevation invariance where affected. State numeric tolerances and their rationale.
- If changing caching, verify point dragging, replacement/add/remove, weight edits, function-backed coordinates/weights, and all affected constructions. If changing shared polynomial evaluation, smoke-check spline and PH consumers. Match additional checks to the actual change.
- Run the existing production build and relevant mathematical tests. Check start/stop, route changes, and repeated benchmark runs for leftover instrumentation/listeners or animation work introduced by this change.

## Delivery and tracking

Keep the spec and results in the repository, with the experiment report linked from `docs/performance-plan.md`. Bezeg uses repository-local planning and implementation documents; this work does not publish tickets or deploy the app. Update architecture documentation only if the retained implementation changes its described behavior. No ADR is needed for a routine reversible evaluation optimization; record one only if a consequential trade-off is actually selected.

## Remaining evidence

The owner supplied one phone run per version and rejected both as too laggy. Median frame intervals were 116.66 ms before and 100.00 ms after on the default polynomial scene. The reported browser is Chrome/153; raw results and limitations are in the experiment report. A provisional 33.34 ms median investigation gate has been recorded after this first experiment; owner agreement and repeatable phone acceptance remain outstanding. Board-phase probes distinguish sampling, element updates, text sizing, and renderer work before choosing another change. No broader architectural migration has been selected.
