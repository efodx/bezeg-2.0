# Bézier drawing experiment — 2026-10-08

## Outcome

Point-only polynomial/rational evaluation improves measured shared curve work,
but does not resolve the owner's OnePlus Nord N10 animation lag. The owner
tested both production bundles and found both too laggy. No renderer, sampling
quality, construction, route, preset, or cache-invalidation change has been made.

The baseline restores only the two evaluator sources from
`22072a15314bb395ae19a38f5fcd964f4d4f9f2f`; both bundles use the same graph and
benchmark harness. Optimized source was last edited at 15:50 UTC and its tested
bundle built at 16:03 UTC, before the supplied phone runs. There was no later
evaluator fix that the phone missed. Build metadata identifies the optimized
source as `working-tree`, rather than an immutable commit.

## Actual phone results

One uninstrumented run per version, polynomial-default animation, five control
points, construction and labels visible, whole-curve mode off. Each run has 60
warm-up and 240 recorded frames. Reported browser: Chrome/153 on Android; viewport
384 × 704 CSS pixels; DPR 2.8125. Hardware identification comes from the owner.
Battery, thermal state, power mode, and actual refresh rate were not recorded.
The optimized run preceded the baseline run. One pair cannot establish run
variability, but the owner's qualitative rejection and recorded timings agree.

| Metric | Original | Point-only evaluator |
| --- | ---: | ---: |
| Median frame interval | 116.66 ms | 100.00 ms |
| p95 frame interval | 199.99 ms | 183.33 ms |
| Approximate cadence from median | 8.6 fps | 10.0 fps |
| Median synchronous update completion | 123.10 ms | 97.80 ms |
| p95 synchronous update completion | 189.50 ms | 123.60 ms |

Median frame interval falls about 14%, update completion about 21%. Update
completion includes scripted input through React/board completion, not paint
latency. The frame-interval median and update median summarize different arrays.
All 240 intervals in both runs exceed the harness's diagnostic 25 ms threshold.
Raw files: [phone before](bezier-phone-before.json), [phone after](bezier-phone-after.json).

A provisional investigation gate is a median frame interval ≤33.34 ms (30 fps),
pending owner agreement on acceptable responsiveness and tail behavior. This is
not a retrospectively satisfied acceptance criterion. The replay command
`node scripts/bezier-benchmark/check-frames.cjs docs/bezier-phone-after.json 33.34`
currently fails: median 100.00 ms, p95 183.33 ms. The same device benchmark and
owner interaction review remain required after further changes.

## Desktop evidence for the first experiment

Production browser, Windows Chrome/155, 1280 × 720, DPR 1, diagnostics off.
Three matched rational-default animation runs were collected; other scenes and
scripted interactions below have one run each. No artificial CPU throttling was
configured. Fixtures and actual scene state are included in the raw reports.

| Scene / interaction | Update median before → after | Frame p95 before → after |
| --- | ---: | ---: |
| Rational default animation, run 1 | 22.5 → 11.6 ms | 33.34 → 16.80 ms |
| Rational default animation, run 2 | 25.4 → 11.2 ms | 33.40 → 16.77 ms |
| Rational default animation, run 3 | 23.1 → 11.3 ms | 33.34 → 16.73 ms |
| Rational default point movement | 23.5 → 11.1 ms | 33.33 → 16.77 ms |
| Rational default parameter slider | 27.1 → 11.0 ms | 33.50 → 16.73 ms |
| Rational default weight edit | 25.8 → 11.1 ms | 33.50 → 16.73 ms |
| Polynomial default animation | 26.9 → 12.0 ms | 33.40 → 16.74 ms |
| Polynomial degree 7 animation | 51.5 → 17.8 ms | 83.33 → 33.37 ms |
| Rational degree 7 animation | 55.0 → 18.2 ms | 83.33 → 33.40 ms |

The median of the three rational-default update medians falls from 23.1 to
11.3 ms. Stress scenes still miss frames. Desktop gains do not establish mobile
acceptance. Exploratory timing runs mixed with hot-method instrumentation were
excluded. Raw files: [desktop before](bezier-drawing-before.json),
[desktop after](bezier-drawing-after.json).

Supplementary Node v22.1.0 measurements evaluate 501 parameters per redraw, with
separate X/Y calls, changing geometry and advancing the cache revision. After
100 warm-up redraws, seven runs of 200 redraws are recorded. Median redraw times:
polynomial default 0.590→0.159 ms; rational default 0.810→0.179 ms; polynomial
degree 7 1.199→0.179 ms; rational degree 7 1.251→0.222 ms. Checksums agree exactly.
This is isolated evaluation evidence, not frame or input latency. Its p95 is a
percentile of seven run averages. Raw files: [evaluation before](bezier-evaluation-before.json),
[evaluation after](bezier-evaluation-after.json).

## Mechanism and correctness

Cache misses now compute a final point with in-place interpolation instead of
retaining every intermediate triangular row. Rational interpolation keeps the
existing projected recurrence and singular-input behavior. Full tables remain
available for teaching constructions, subdivision, and elevation. Existing
global invalidation and X/Y sharing are retained.

Fifteen mathematical tests passed against the original and optimized evaluators.
They cover independent Bernstein references, endpoints, extrapolation,
positive/equal/supported zero and negative weights, old intermediate-singularity
behavior, construction agreement, subdivision/elevation, geometry edits and
reactive inputs, and spline/PH consumers. Mixed absolute/relative tolerance is
1e-10, sufficient to detect meaningful changes while allowing floating-point
rounding in these fixtures. This does not certify every degenerate curve.

Root and diagnostic TypeScript checks and the production build passed. The full
suite was run once: the 15 geometry tests passed; the existing starter
`App.test.tsx` failed because it mounts the router-dependent app without a Router.
It was left unchanged. Existing build warnings remain.

Manual production rational-scene review exercised keyboard parameter movement,
point dragging, and animation start/stop, with construction visible and no
console errors. This was qualitative visible-response review, not measured
input-to-paint latency.

## Review

Mathematical review found no actionable recurrence or input-semantics defects.
Standards review identified uncontrolled benchmark input/animation and inaccurate
scene metadata; both were fixed by locking inherited controls and recording actual
geometry and visibility. Follow-up review had no unresolved defects. Spec review
found no implementation scope defect, but required comparable repeated timings
and actual phone acceptance. Desktop repeats are retained; phone acceptance has
now failed. No claim of completed mobile optimization is justified.

## Next bounded investigation

Ranked predictions are: (1) repeated sampling dominates, so its measured phase
will account for most element work; (2) full-update label sizing dominates, so
ordinary updates will materially reduce total time; (3) React/control or SVG
rendering dominates, so sampling/label improvements will leave large residual
or renderer time. Measure before selecting another app optimization.

The diagnostic `current` bundle adds coarse phase timings and an optional,
temporary ordinary-board-update probe. No ordinary application code uses that
probe. The first desktop phase comparison did not improve total update median
(8.9→9.3 ms); label sizing accounted for only about 0.9 ms there. Those desktop
runs do not identify the phone bottleneck. They are retained in
[desktop phase probe](bezier-board-phase-desktop.json); that initial probe predates
the added curve-sampling phase.

A subsequent [updated desktop probe](bezier-board-phase-current.json) verified
the added curve-sampling phase: update median 10.1 ms, sampling median 2.6 ms,
renderer median 2.8 ms, label-size median 0.9 ms. These are diagnostic timings,
not directly comparable headline acceptance runs. It completed without console
errors; the diagnostic TypeScript check and production bundle build passed.

The [phone phase comparison](bezier-board-phase-phone.json) records one run per
mode with timing wrappers enabled:

| Median phase | Full update | Ordinary update probe |
| --- | ---: | ---: |
| Synchronous update completion | 102.7 ms | 102.4 ms |
| Element updates | 39.3 ms | 34.1 ms |
| Curve sampling (within element updates) | 30.0 ms | 31.2 ms |
| Label sizing (within element updates) | 6.5 ms | 0.5 ms |
| Renderer work | 32.6 ms | 36.8 ms |

Frame median/p95 is 116.66/183.33 ms for full updates and 100.00/166.66 ms
for ordinary updates. The almost unchanged synchronous-update median rejects
ordinary updates as a sufficient fix. The probe also skips updates of objects
marked non-regular, not just label sizing, so it does not isolate text work.
Phase medians cannot be added to recover the total median. Remaining work outside
the measured board phases includes React/control work and construction visibility
mutations. Rendering time excludes asynchronous layout and paint.

The next diagnostic-only probe avoids repeated construction show calls when
visibility and point count are unchanged. It leaves parameter callbacks and full
board updates intact. The [desktop comparison](bezier-visibility-desktop.json)
measured only 0.1 ms median in those show calls; total update medians were
10.6/8.4 ms for one original/stable pair, which cannot isolate run variability.
No application visibility optimization has been accepted.
Concurrent workspace UI changes are outside this performance task; new `current`
builds are compared internally, not equated with the original frozen bundles.

The next phone comparison targets the measured sampling cost: a benchmark-only
probe skips sampling curves with a false own visibility predicate. The one-button
comparison retains all full-update behavior and disables the other experiments.
Hidden curves may have glider dependencies in other scenes, so no general app
policy is inferred. Methods are restored after each run or disposal. Any adopted
adapter change will need equivalent visible geometry and edit/visibility checks.

The [automatic desktop sampling comparison](bezier-sampling-desktop.json) verified
300 hidden-curve updates skipped over warm-up and measurement. Sampling median
fell from 4.5 to 2.5 ms; total update medians were 15.1/14.9 ms, so this pair does
not demonstrate an end-to-end fix. Frame p95 remained about 33.3 ms. Phone results
are needed to assess the measured 30 ms sampling cost on the target device.
The comparison completed automatically and retained both raw reports. Root and
diagnostic typechecks pass; the production diagnostic bundle builds successfully.

## Mathematical evaluation follow-up — 2026-10-08

### Cost separation

The polynomial-default browser diagnostic uses the five-point scene and records
2,458,800 `eval` calls over 300 warm-up and measured frames: 1,229,100 cache
misses and 1,229,700 hits. It calls the full construction recurrence and builds
the complete construction scheme once per frame (300 calls each). There are
9,300 board updates in that run. The rational-default four-point scene has the
same evaluation and construction call counts and 5,400 board updates.

Separate hot-method timers attribute 751.6 ms to polynomial point evaluations
and 2.9 ms to the full-table recurrence, versus 1,241.1 ms and 8.0 ms for the
rational scene. Complete scheme construction, including Point objects, totals
9.3 ms and 16.0 ms respectively across 300 frames. These per-call wrappers
substantially perturb the run: the polynomial diagnostic's frame median rises
to 33.3 ms, and the rational diagnostic's to 50.0 ms. Treat the timings as
diagnostic attribution, not interaction results. The browser-side allocation
bytes are unavailable; the Node probe records GC events instead.

The separate Node v22.1.0 probe evaluates 501 parameters per redraw, changes a
control point, and invalidates the same cache for seven runs of 200 redraws.
Its scratch-row candidate preserves the existing recurrence and returned point
objects while reusing coordinate rows for curves with at least five points.
Current-to-candidate median redraw times are 0.435→0.269 ms for the five-point
polynomial, 0.702→0.450 ms for the degree-7 polynomial, and 0.616→0.517 ms for
the degree-7 rational curve. The four-point rational candidate was slower in
this isolated probe (0.521→0.646 ms), so the application keeps that path's
original row allocation. Candidate and baseline checksums match for all four
fixtures. GC events fell from 30 to 5 for the polynomial default, 37 to 7 for
the polynomial stress scene, and 41 to 11 for the rational stress scene; the
four-point rational count fell from 29 to 24 despite its slower timing. The
full-table medians are 0.006–0.016 ms per call across the fixtures, with one
full scheme per animation frame in the browser diagnostics. Full-table work is
not a material remaining cost for this scene.

The probe output preserves per-run timings, checksums, GC entries, and table
measurements in [the math probe report](bezier-math-probe-2026-10-08.json).

### Production drawing comparison

The production diagnostic bundles were compared in the same Chrome 155 Windows
browser session at 1280×720, DPR 1, with no benchmark CPU throttling, the default
construction and labels visible, and animation running. Each default scene has
three uninstrumented runs; each degree-7 stress scene has two. The table reports
the median across run medians and the observed run range:

| Scene | Current update median (range) | Scratch-row update median (range) | Current frame median / p95 | Scratch-row frame median / p95 |
| --- | ---: | ---: | ---: | ---: |
| Polynomial default, 5 points | 30.2 ms (26.7–36.4) | 20.9 ms (20.2–21.1) | 33.3 / 50.0 ms | 16.9 / 33.4 ms |
| Rational default, 4 points | 29.1 ms (29.0–29.7) | 30.9 ms (25.9–32.5) | 33.3 / 50.0 ms | 33.3 / 50.0 ms |
| Polynomial degree 7, 8 points | 40.1 ms (37.9–42.3) | 34.9 ms (33.2–36.6) | 50.0 / 66.7 ms | 41.7 / 50.0 ms |
| Rational degree 7, 8 points | 46.7 ms (45.0–48.4) | 39.1 ms (37.4–40.8) | 50.0 / 66.7 ms | 50.0 / 58.3 ms |

A matched coarse phase probe on the five-point polynomial scene measures curve
sampling at 14.5 ms before and 7.1 ms after; total update completion falls from
30.1 to 22.1 ms. Renderer medians are 6.9 and 6.6 ms, while label sizing stays
at 0.9 ms. This shows the scratch-row change contributes through the actual
curve-sampling path. The frame/update run summaries and phase measurements are
preserved in [the browser results](bezier-math-browser-results-2026-10-08.json).

The measurements support retaining scratch rows for curves with five or more
control points. Each cache miss refreshes every coordinate into the reusable
rows, so function-backed points and same-degree point replacement remain live.
Curves with four or fewer points keep the original allocation path. The full
De Casteljau scheme, intermediate rows, cache invalidation, sampling quality,
routes, and presets are unchanged.

### Correctness and remaining limit

The Bézier geometry suite passes 17 tests with the existing mixed absolute and
relative tolerance of 1e-10. The two added checks exercise function-backed
coordinates on the five-point polynomial scratch path and function-backed
coordinates plus weights on the five-point rational scratch path. The suite also
covers independent Bernstein references, endpoints and extrapolation, rational
weights including supported zero/negative values and existing singular
behavior, final construction-row agreement, subdivision, elevation, cache
refresh, splines, and PH consumers.

The targeted Jest suite passes 17/17 tests, and
`npx tsc --project scripts/bezier-benchmark/tsconfig.json --pretty false`
passes. The production benchmark `current` and `after` bundles build
successfully. The full app build stops at the
uncommitted localization edit in `src/ErrorPage.tsx:6`: its `t` call supplies
one argument where the active translation type requires two.

This is desktop evidence. The OnePlus Nord N10 matched before/after check has not
been repeated, so phone acceptance remains unverified; no conclusion that the
mobile lag is resolved is justified. The next check is to repeat the existing
phone animation benchmark against the same five-point polynomial scene and
construction settings on the candidate build.

The original point-only evaluator and its 15 mathematical checks were committed
as `494dce7`. The scratch-row implementation and its two additional checks are
committed as `2aa5805`; the targeted Jest suite and benchmark typecheck pass.
The full app build remains blocked by the unrelated localization type error
described above.
The latest incremental Standards review found an acceptance replay permitting
benchmark-only experiments; it now rejects them. Spec review found stale phone
evidence and overclaimed isolation of label sizing; both are corrected here and
in the harness instructions.

See [benchmark instructions](../scripts/bezier-benchmark/README.md). Neither the
first experiment nor the diagnostic work deploys the app or publishes tickets.

## De Casteljau demonstration playback — 2026-10-10

### Measured causes

Production build, Windows Chrome with phone emulation (384 × 704, DPR 2.8125,
touch) and 6× CPU throttling. The unchanged rational scene ran at an 83–100 ms
median frame interval, matching the owner's 100 ms Nord N10 result, so this
setup was used as the phone stand-in. A source-mapped CPU profile and trace of
`/bezeg-2.0/rational/rational-decasteljau` during playback attributed per-frame
main-thread time to:

- `componentDidUpdate` → `unsuspendBoardUpdate` → JSXGraph `fullUpdate`: about
  45 ms. A full update re-measures every HTML text and schedules one
  `setTimeout` per text (about 8.6 ms of timer tasks per frame).
- On the JSXGraph 1.9.2 baseline, `setObjectViewport` took about 11–14 ms. On every HTML text style
  update it reads the text's and container's bounding rectangles, then writes a
  clip path, forcing one synchronous layout per label (28 labels here).
- The hidden "whole curve" was sampled every frame because JSXGraph samples
  before checking visibility; it cost more than the visible curve
  (5.9 vs 4.9 ms of evaluation).
- React re-rendered the whole workspace for every frame's `setState`
  (about 16–17 ms), including `DemonstrationWorkspace` navigation links.

Runtime patches confirmed the ranking before implementation: React-free
parameter updates with ordinary board updates, plus the clipping and hidden-curve
fixes, raised the throttled rational scene from 69 to 160 frames in 5 s.

### Change

Scoped to the De Casteljau demonstrations (`DecasteljauGraph`, its rational
subclass, and `DecasteljauGraph2`); shared drag and slider paths are unchanged.

- The drawn parameter is owned by the graph. Each animation frame sets it and
  performs one ordinary `boardUpdate()` (cache invalidation plus
  `board.update()`), not suspend/`fullUpdate`. React state follows at most every
  100 ms and exactly on play, pause, finish, stop, slider input, and lesson
  actions. Externally restored state (figures, lessons, presets) still moves the
  parameter; other graph-state changes keep the previous full refresh.
- Preset export, figure entry capture, and lesson checkpoints record the drawn
  parameter rather than the throttled display value.
- The remaining-curve overlay is created only while "whole curve" is enabled.
- `skipRedundantHtmlTextClipping` skips JSXGraph's per-label clip only for HTML
  texts with the default zero viewport; the board container already clips
  overflow. Earlier clip paths are cleared; other viewports and SVG elements
  keep JSXGraph behavior.
- In the alternative demonstration, the two interpolating curves are sampled
  again only when their control points, the board view, or JSXGraph's
  drag/settled plot quality change.

Per-frame cache invalidation is retained: curve evaluation caches are keyed by
parameter in an unbounded map that is cleared on revision change.

### Results (frames drawn in 5 s at 6× throttle)

| Route | Before (2 runs) | After |
| --- | ---: | ---: |
| `rational/rational-decasteljau` | 76, 78 | 144, 142 |
| `bezier/decasteljau` | 72, 71 | 138, 137 |
| `bezier/decasteljau2` | 73, 69 | 153, 162 (before plot-quality key); 112–152 over 3 later runs |

Median frame interval fell from 83 ms to 33 ms on the first two routes. These
are single-machine emulated results; CPU throttling does not model the phone GPU.

### Equivalence checks

A scripted desktop comparison of the old and new production builds compared
rounded SVG geometry and HTML label positions after setting t = 0.37 with the
slider, toggling the whole curve on and off, and dragging a control point with
paced moves. All three routes matched. Pausing playback leaves the readout,
React state, drawn parameter, curve parameter, and exported preset parameter
equal. No console errors were recorded. Unit tests cover lag-safe parameter
synchronization, full refresh for other state, exact preset export, the
state-change classifier, and clipping-skip conditions. TypeScript, the full
Jest suite (161 tests), and the production build pass. The Playwright smoke
suite was not run because its bundled browser is not installed. The Nord N10
before/after check remains outstanding.

## Per-curve geometry versions — 2026-10-12

[Task 6](reviews/engineering-implementation-history.md) of the [React architecture refactor](specs/react-architecture-refactor.md) replaced the global geometry revision with per-point and per-curve version stamps (`src/bezeg/impl/versioning.ts`).

### Method

Headless Chromium 156 (Playwright), Windows 11, viewport 1600×1000, production builds served under `/bezeg-2.0`. Each scene opens fresh; 2 warm-up and 6 measured repetitions of 90 scripted pointer moves (or `t` slider steps), one double-rAF wait per move. The metric is the synchronous handler time from a capture-phase `pointermove` to the next task. Builds alternate A/B/A/B/A/B; three runs per side are pooled (1098 events per scene per side). Final board geometry (all visible point coordinates on both boards, rounded to 3 decimals) was identical across builds in every run. The machine had intermittent background builds, so per-run medians on one build vary by several milliseconds; differences of 1–2 ms are within that noise.

### First candidate (per-object versions, no memoization)

Baseline `ed85e58` against `171e483`. Bézier, De Casteljau, rational, rational De Casteljau and spline scenes stayed within noise. Dragging a hodograph point on the quintic PH route regressed: median 10.4 → 24.9 ms (w0) and 10.3 → 35.5 ms (w1), p95 17 → 62–74 ms; every candidate run was slower than every baseline run. Cause: the old code checked one global revision in O(1), while each read of a PH derived point rescanned its inputs' versions, multiplied through nested derived closures.

### Fix and result

Version reads are memoized against the global stamp counter: a version can only change through `nextVersion()`, so while the counter is unchanged a memoized version is returned in O(1). Baseline `ed85e58` against the fix (`25130bb` on the task branch):

| Scene | Median A → B (ms) | p95 A → B (ms) |
|---|---|---|
| Quintic PH, drag w0 | 13.2 → 14.0 | 19.3 → 21.8 |
| Quintic PH, drag w1 | 14.5 → 14.7 | 22.0 → 27.2 |
| Bézier, drag control point | 5.7 → 5.7 | 10.1 → 11.1 |
| Rational De Casteljau, slider t | 8.3 → 6.9 | 11.9 → 16.8 |

The PH regression is resolved within run-to-run noise. No speed-up is claimed for the other scenes. Phone and CPU-throttled runs were not repeated. The harness (`run.cjs`, `ab.cjs`, `analyze.cjs`) was kept outside the repository for this session.

## Controlled inspector sliders — 2026-10-13

[Task 4](reviews/engineering-implementation-history.md) made inspector inputs controlled: a slider backed by a curve adapter notifies the graph's scene store on every input, which re-renders the inspector. Measured as the synchronous `input` handler time (including React's render and the JSXGraph update), headless Chromium, 1600×1000, six alternating runs per build, 366 samples per run (pooled n = 2196), against the `e35075f` master build:

| Slider | Median master → task 4 (ms) | p95 master → task 4 (ms) |
|---|---|---|
| Bézier extrapolation (`/bezier/extrapolation`) | 3.6 → 5.5 | 5.3 → 9.8 |
| Quintic PH offset distance (`/ph/quintic`) | 8.0 → 9.7 | 10.6 → 12.8 |

The added cost (about 2 ms per input) was consistent in every alternating pair. Both sliders stay within a 60 Hz frame at p95, with less margin than before. Accepted for correctness (controls can no longer show stale values); narrowing re-renders to the changed control group is a candidate optimization if profiling on target devices shows it matters. Phone and throttled runs were not repeated.
