# Mathematical Bézier evaluation performance investigation

Status: completed 2026-10-08. The investigation retained a measured scratch-row optimization for curves with at least five control points; the OnePlus Nord N10 acceptance check remains unverified. See the [recorded results](../bezier-performance-results.md) and [engineering implementation history](../reviews/engineering-implementation-history.md). This follows the [shared Bézier drawing experiment](bezier-drawing-performance.md).

## Problem

The point-only polynomial/rational evaluator reduced isolated evaluation time and improved the phone's median frame interval from 116.66 ms to 100 ms, but the phone animation remains too slow. Further mathematical optimization may help, but the latest phone phase profile times JSXGraph curve sampling as a whole; it does not separate evaluator arithmetic, cache behavior, full construction-table evaluation, or allocation cost.

The De Casteljau demonstration updates two curve paths: its main path covers `[0, t]`, and a second path covers `[t, 1]` when the complementary portion is shown. In the default view, only the complementary path is hidden. The recorded 30 ms curve-sampling phase includes board curve updates and cannot be attributed entirely to that hidden path or to mathematical evaluation. JSXGraph's configured default uses adaptive plotting; do not infer a fixed sample count from its separate `numberPointsHigh`/`numberPointsLow` settings.

Determine how much remaining interaction time is mathematical work and whether an exact math-layer change can reduce it enough to improve the real drawing path. If math is no longer a material cost, record that result and recommend where investigation should move next. Do not assume that another evaluator-only gain will resolve phone lag.

## Scope

- Profile polynomial and rational Bézier point evaluation, full De Casteljau table evaluation used by teaching constructions, and the cache invalidation path used by parameter-only animation.
- Use the default five-point De Casteljau scene and the existing degree-7 polynomial/rational stress scenes. Record actual control-point and weight counts; do not invent a supported degree limit.
- Evaluate math-side candidates only when measurements support them. Candidate directions include reusing scratch storage to reduce per-sample allocations, a batch evaluation seam if it reduces real caller work, and geometry-scoped cache revisions if repeated parameters are observed across parameter-only frames.
- Keep the full construction table and visible intermediate steps available. A point evaluator may avoid constructing rows it does not consume; a displayed construction still needs its complete mathematical data.
- Verify shared consumers affected by an evaluator or cache change, including subdivision, elevation, splines, and PH curves.

## Out of scope

- JSXGraph sampling-density or adaptive-plot changes, renderer changes, custom curve drawing, and animation/React scheduling changes. Record these as follow-up directions if the math profile does not explain enough of the cost.
- A broad geometry/cache architecture migration, worker, package/build migration, or route, preset, and storage change.
- Changing mathematical semantics, silently reducing drawing quality, or removing displayed construction steps to claim a speedup.

## Investigation and measurement

1. Preserve the current point-only implementation as the baseline and record the exact commit/build, source state, scene, browser, viewport, device, and visible construction/label settings.
2. Measure pure evaluator work separately from the browser update path. Collect evaluation calls, cache hits/misses, full-table calls, evaluator time, and allocation/GC evidence where the runtime supports it. Run hot-method instrumentation separately from uninstrumented frame measurements.
3. Measure full De Casteljau table work separately from point-only `eval`. Check whether X/Y callbacks already share results before proposing a batch API; the current per-parameter cache already does so within one cache revision.
4. Compare candidates one at a time against the same baseline with repeated runs. Use the existing evaluator benchmark for isolated work and the production De Casteljau benchmark for end-to-end effects. Treat desktop CPU throttling as supplemental evidence, not as a phone result.
5. If a candidate wins in isolation, repeat the matched production browser scene and arrange the same before/after phone check used by the original experiment. Distinguish frame interval, synchronous update completion, and input-to-visible latency.
6. Add no new optimization if the measured math share is too small or its gain is within run-to-run variation. In that case, record the evidence and hand off to a separately scoped sampling, React/update, or renderer investigation.

## Mathematical verification

For any changed evaluation or cache path:

- Compare polynomial evaluation with an independent Bernstein reference and rational evaluation with an independent weighted-Bernstein reference.
- Cover endpoints, repeated parameters, supported extrapolation, equal and positive rational weights, supported zero/negative weights away from poles, and existing singular-input behavior.
- Check the displayed construction's final row against point evaluation, plus subdivision parameter equivalence and degree-elevation invariance where affected.
- Check cache refresh after point moves/replacement/add/remove, weight edits, and function-backed coordinates or weights. Smoke-check spline and PH consumers for shared evaluator changes.
- State tolerances and rationale. Retain the existing mixed absolute/relative tolerance of `1e-10` where it remains appropriate; tighten or relax only with an explicit numerical reason.

## Acceptance criteria

- The report separates evaluator arithmetic/allocation, full-table work, cache effects, and the surrounding curve-sampling/update path to the extent the tools allow. Unisolated costs are called out rather than attributed by guess.
- At least one plausible math-side candidate is measured against the current implementation, or the report explains why no candidate merits implementation.
- A retained math change improves repeated isolated math measurements beyond observed run variability and shows a corresponding improvement or clearly bounded contribution in the production interaction. An isolated evaluator win alone does not count as resolving mobile lag.
- All mathematical checks relevant to the chosen change pass with documented tolerances, and visible curve geometry/construction values remain equivalent.
- No change to routes, presets, mathematical teaching steps, or sampling quality is required for this scope.
- Update the experiment report with raw results, candidate decision, correctness evidence, device/input coverage, and the remaining measured bottleneck. Report mobile acceptance as unverified until the owner repeats the matched phone check.

## Delivery

Keep this investigation and any implementation bounded to the math path. If the results justify a change, implement only the measured candidate in a separate, reviewable change and link its commit and checks from the experiment report. If the math path is not material, close with the measurements and a recommendation for the next scope; do not expand this task into rendering work.
