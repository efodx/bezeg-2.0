# Investigate and optimize mathematical Bézier evaluation

Source spec: [Mathematical Bézier evaluation performance investigation](../../specs/bezier-math-evaluation-performance.md).

## Outcome — 2026-10-08

Retained scratch-row reuse for curves with five or more control points. The
four-point rational default keeps its original path. The candidate improved the
matched production polynomial default and both degree-7 update medians; the
matched OnePlus Nord N10 phone check remains unverified. Measurements, run
settings, and mathematical checks are recorded in the [experiment report](../../bezier-performance-results.md).

## Objective

Measure the remaining mathematical cost in De Casteljau drawing and determine whether an exact math-layer optimization can improve the real interaction. Implement at most one bounded candidate, and only when measurements show a worthwhile gain. If not, record the result and recommend the next area to investigate.

## References and dependencies

- [Shared Bézier drawing spec](../../specs/bezier-drawing-performance.md)
- [First experiment and phone results](../../bezier-performance-results.md)
- Existing point-only evaluator change: commit `494dce7`
- Existing evaluator benchmark: `scripts/bezier-benchmark/evaluate.cjs`
- Existing production browser benchmark: `scripts/bezier-benchmark/README.md`

## Work

1. Capture the current source/build baseline and reproduce the existing evaluator benchmark for the five-point default and degree-7 polynomial/rational fixtures.
2. Separate point-evaluation calls/cache misses from full De Casteljau-table calls and the surrounding JSXGraph sampling/update time. Avoid timing every hot callback in the headline frame runs.
3. Compare math-only candidates independently. Start with reducing per-evaluation allocation while retaining the current recurrence; consider cache lifetime or a batch API only if call counts show expected reuse or duplicated work.
4. For a candidate that wins beyond run variability, implement only that math-layer change and add correctness checks at the real affected seam. Keep existing construction computations where the visible lesson requires them.
5. Re-run mathematical checks, isolated benchmarks, and the matched production browser scene. Record any phone result supplied for the same build and scene; distinguish it from desktop or simulated-throttling evidence.
6. Update `docs/bezier-performance-results.md` with the measurements, decision, math checks, and remaining bottleneck. If no candidate is worthwhile, record the negative result without changing app code.

## Acceptance criteria

- The investigation distinguishes point evaluation, full construction evaluation, cache behavior, curve sampling, and renderer/update work as far as available instrumentation permits.
- Any retained change improves repeated isolated math measurements beyond run-to-run variation and demonstrates an end-to-end contribution without degrading the matched scene.
- Relevant mathematical checks pass for the affected evaluator/cache seam, including reference-value, construction, subdivision/elevation, invalidation, and shared spline/PH checks as applicable.
- No approximation, reduced sampling quality, missing construction step, route change, or preset change is used to claim a math-layer win.
- The results report states whether phone acceptance was repeated and identifies any remaining non-math bottleneck.
