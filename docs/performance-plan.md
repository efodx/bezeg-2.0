# Curve interaction performance plan

## Goal

Make control-point dragging and mathematical sliders feel responsive, including complex curves and visible constructions. Establish evidence before selecting optimizations or replacing JSXGraph. The first shared Bézier experiment and phone measurements are recorded in [the results report](bezier-performance-results.md). The point-only evaluator helps but does not resolve phone lag.

The follow-up [math evaluation investigation](specs/bezier-math-evaluation-performance.md) measured point evaluation, full construction tables, and the surrounding drawing path. Scratch-row reuse reduced the matched desktop curve-sampling and update medians; the OnePlus Nord N10 acceptance check remains unverified. See the [recorded results](bezier-performance-results.md).

## Baseline scenes

| Scene | Exercise | Costs to distinguish |
| --- | --- | --- |
| Polynomial Bézier | Drag a control point at ordinary and higher point counts | Evaluation, allocation, sampling, board redraw |
| De Casteljau | Move t and drag a point with construction visible | Auxiliary points/segments and evaluation |
| Rational Bézier | Drag a point and change a weight | Rational evaluation, invalid/near-singular input handling |
| Spline | Move editable points across multiple segments | Continuity dependencies, whole-curve vs affected-segment work |
| Quintic PH | Edit hodograph points and adjust offsets/count | Derived geometry, secondary board, offset evaluation |
| Parameterization | Change α / sample count | Parameter solving, repeated point evaluation |

Start from default examples; add named stress examples with saved configurations. Record actual point, segment, and offset counts rather than inventing a supported maximum during planning.

## Measurement protocol

Record commit, production build, browser/version, device, viewport, refresh rate, visible constructions, and input method. Keep those constant for each before/after comparison. Include an ordinary desktop and a representative touch device when available. Use a short repeatable drag or slider gesture, repeat it, and record median and tail behavior rather than only the best run.

Measure input-to-visible-update delay, frame duration/dropped frames, numerical evaluation counts and time, allocation pressure, board update counts, and React commits/remounts where relevant. Include repeated route switches and preset loading to detect lifecycle accumulation. Separate startup/bundle loading from interaction latency.

Set actual performance budgets after this baseline. A device's frame interval provides context, not an automatic promise that every stress case will run at its refresh rate. Record raw results, chosen budgets, and any acceptable stress-case limits in this document during implementation.

## Candidate experiments

### Reported mobile animation lag

On 2026-10-08, the owner reported lagging animation on a OnePlus Nord N10 and identified `/bezeg/rational/rational-decasteljau` as an investigation starting point, rather than a confirmed worst-case scene. The owner is open to improvements in shared architecture and recalls earlier performance workarounds. The phone browser, scene configuration, build mode, and measured frame timings are not yet established.

Source inspection shows that this animation updates React state on each frame and reaches the shared board-update path, which advances the global cache revision even when control points and weights have not changed. Curve evaluation retains the full De Casteljau table on cache misses; the displayed construction also has a table cache. These are hypotheses for profiling, not measured causes or accepted optimization decisions. Distinguish parameter progression, construction updates, curve sampling, React work, and board rendering in the baseline. Record the exact scene and use production builds for comparisons.

The owner clarified the first investigation's direction: improve drawing performance for Bézier curves generally and determine whether that is sufficient to address mobile lag. Use a De Casteljau demonstration, or an equivalent repeatable in-app benchmark, to exercise the shared path. Start with polynomial and rational Bézier curves; a broader architecture migration is not the initial objective. The phone's browser is described only as its default browser and has not been identified. The owner agreed to preserve visual quality and construction steps, use repeatable evaluation and animation benchmarks, and perform a before/after phone check. See the [bounded implementation spec](specs/bezier-drawing-performance.md), awaiting final shared-understanding confirmation.

On 2026-10-10, profiling attributed most playback time to per-frame full board updates, per-label forced layouts in JSXGraph 1.9.2 HTML-text clipping, sampling the hidden whole curve, and React workspace re-renders. The owner chose to fix only the De Casteljau demonstrations for now; the shared drag and slider paths still use full updates. See [De Casteljau demonstration playback](bezier-performance-results.md#de-casteljau-demonstration-playback--2026-10-10). Phone confirmation is outstanding.

### Experiments to evaluate

1. Evaluate a point without retaining the entire De Casteljau construction table. Keep the full table available for demonstrations that show it.
2. Reuse one evaluated point for X and Y at a parameter where appropriate. Measure existing cache hit rates first; the current cache already avoids some repeated arithmetic.
3. Move from graph-global invalidation toward revisions owned by the relevant geometry. The first bounded step landed on 2026-10-09: `geometryCache` now lives under `src/bezeg`, geometry setters invalidate their derived values, and construction-parameter changes no longer invalidate unrelated geometry. Cache granularity remained global until 2026-10-12, when per-point and per-curve version stamps replaced the global revision ([task 6](reviews/engineering-implementation-history.md)); its measured effect is recorded in the [performance results](bezier-performance-results.md).
4. Batch affected board mutations and coalesce excessive pointer updates to an animation frame if profiling supports it. Flush the final input so the settled curve is exact.
5. Reduce rebuilding of auxiliary objects and unnecessary React remounts. Add explicit lifecycle cleanup where missing.
6. Investigate sampling or alternate drawing backends only if evaluation/update improvements leave drawing as the measured bottleneck. Compare touch behavior, selection, formulas, exports, and mathematical fidelity as well as speed.

These are experiments in increasing scope, not a commitment to every optimization. Workers or a renderer replacement require a reason from profiling; neither is the default starting point.

## Report template

For each experiment record: scene configuration, changed mechanism, baseline and new results, affected mathematical checks, device/input coverage, remaining limits, and the decision to keep or discard it. Retain comparable configurations so later changes can be assessed on the same work.
