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

## Drawing playground drag — 2026-10-31

Spec criterion 5 of [the playground spec](specs/bezier-drawing-playground.md). Commit `577ae08` (production build, working tree dirty only by the new script). Machine: 16 GB, 12 threads, under load from other sessions; headless Chromium via Playwright, mouse input, display refresh 60 Hz (16.7 ms frame). Raw per-run numbers: [pg4b-perf-raw.md](reviews/feature-streams/learn-ui/pg4b-perf-raw.md).

Method: `node scripts/playground-perf.cjs` against `just preview 4312`. Each run uses a fresh browser context seeded with a 20-anchor closed drawing (smooth-aligned anchors around an ellipse) and opens `/bezeg-2.0/learn/bezier-curves`. It asserts 20 anchors rendered (and, for the inspect block, four checked overlay switches and the one-curve overlay), drags one out handle with 150 small `mouse.move` steps in a circle, and samples `requestAnimationFrame` intervals inside the drag, discarding the first 15 frames. The run fails if the seed does not load, the handle does not move, or fewer than 60 samples exist. Throttled cases use CDP `Emulation.setCPUThrottlingRate` 4 at 390×844. Each case ran 3 times; the table gives the median of the per-run medians and p95s, with the range in brackets. Each run collected 309–725 frame samples.

| Case | Median ms | p95 ms | Target (median) | Result |
|---|---|---|---|---|
| Draw block, no overlays, desktop 1440×900 | 16.7 (16.7–16.7) | 16.7 (16.7–16.8) | ≤ 16.7 | pass |
| Inspect block, all overlays, desktop | 16.7 (16.7–16.7) | 16.8 (16.7–16.8) | ≤ 16.7 | pass |
| Draw block, no overlays, 390×844, 4× CPU | 16.7 (16.7–16.7) | 16.8 (16.8–16.8) | ≤ 33.3 | pass |
| Inspect block, all overlays, 390×844, 4× CPU | 16.7 (16.7–16.7) | 49.9 (33.4–50.0) | ≤ 33.3 | pass on median; p95 is 33–50 ms (occasional dropped frames, max 100 ms) |
| JSXGraph phone baseline (Nord N10, Chrome 153) | 100 | 183 | — | for comparison |

Limits: the figures are rAF intervals, which saturate at the 16.7 ms refresh interval, so a median of 16.7 ms means "no sustained drops", not headroom. The throttle is a desktop CPU slowdown, not a phone, and the headless browser has no real GPU compositing of a touch device. The targets name only the median; the inspect-block p95 under throttling is reported as a tail concern. No real phone was measured. The drag lasts longer than the nominal 2 s because each scripted move is a round trip.

## Curve gestures and function slider drags — 2026-11-01

Before/after measurement for [backlog tasks 6 and 8](tasks/architecture-deepening-backlog/README.md), as [the performance plan](performance-plan.md) requires. Before = production build of `51e2e54b`; after = production build of `d1162c43` (same `src` as `648d676f`). Machine as above, shared with other sessions' test runs; headless Chromium via Playwright, mouse input, 60 Hz. Raw output: [perf/](reviews/feature-streams/platform/perf/).

Method: `node scripts/curve-gesture-perf.cjs` drags the curve body, a bounding-box corner (resize) and the rotation ring on `/bezier/curve`, `/rational/base` and `/spline/c2spline`. `node scripts/function-slider-perf.cjs` drags the bound point on `/functions/integral`, `/functions/area-between` and `/analysis/darboux`, drags `x` on `/analysis/accumulation`, and clicks "next step" on `/analysis/bisection`. Both sample `requestAnimationFrame` intervals inside the gesture after 15 warm-up frames, and fail if the gesture had no effect on the board or fewer than 60 frames were sampled. Throttled cases use CDP CPU throttling 4 at 390×844. Each cell gives the median of the per-run p95s.

**Desktop 1440×900, no throttle:** every curve and function case has a median of 16.7 ms and a p95 of 16.7–16.8 ms, before and after.

**Curves, drag, 390×844, 4× CPU, p95 ms (3 runs):** bezier 33.4 → 33.4; rational 50.0 → 33.4; c2spline 50.1 → 50.0.

**Functions, 390×844, 4× CPU, p95 ms.** The first two columns are 3 runs per build, run one build after the other. The interleaved columns serve both builds at once and alternate between them, in 3 rounds × 2 runs, so 6 runs per build:

| Case | Before | After | Before, interleaved (range) | After, interleaved (range) |
|---|---|---|---|---|
| integral drag b | 50.0 | 50.0 | — | — |
| area-between drag b | 66.7 | 100.0 (rerun 83.4) | 83.3 (66.7–116.6) | 83.4 (83.3–116.6) |
| accumulation drag x | 83.4 | 150.0 (rerun 100.0) | 108.4 (100–150) | 108.4 (83.4–150) |
| darboux drag b | 50.0 | 50.1 | — | — |
| bisection clicks | 16.8 | 16.8 | — | — |

The apparent area-between and accumulation regression in the sequential runs does not reproduce when the runs are interleaved. The code does the same per-frame work in both builds (see [task 8 evidence](tasks/architecture-deepening-backlog/08-function-graph-sharing.evidence.md#measurement)).

**Rotation defect:** with `PERF_ROTATE_JITTER=0`, a pointer step lies exactly vertical over the centre. Before, rational rotate makes every control point non-finite; after, all three rotate cases pass.

Limits: the scripts use mouse input only; touch was checked separately in the browser smoke. They measure rAF intervals, which saturate at 16.7 ms. The 4× throttle is a desktop slowdown, not a phone. Load from other sessions was not controlled, which is why only interleaved runs separate a build difference from load.

## Live function model in the store — 2026-11-07

Before/after measurement for [task 4 of the mathematical runtime contracts](tasks/mathematical-runtime-contracts/04-live-function-model.md), which moved each function graph's live model into the scene store (`state.model`) and removed the flat mirror. Cache and rendering policy are unchanged, so no difference is expected. Before = production build of `a0e95b32` (clean); after = production build of `f8dfbe85` (the checkout was dirty at build time, with only untracked job files and docs). Same machine and headless Chromium via Playwright as the 2026-11-01 section, mouse input, 60 Hz. Raw output: [perf/perf-interleaved-live-model.txt](reviews/feature-streams/contracts/perf/perf-interleaved-live-model.txt).

Method: as in the 2026-11-01 section, `node scripts/function-slider-perf.cjs` against both builds served at once (ports 4320 and 4318), alternating between them in 3 rounds × 2 runs, so 6 runs per build. All cases of the harness, desktop 1440×900 without throttle and 390×844 at 4× CPU. All six invocations exited 0 (effect checks passed, no page errors).

**Desktop 1440×900, no throttle:** every case has a median of 16.7 ms and a p95 of 16.7–16.8 ms, before and after.

**Functions, 390×844, 4× CPU, p95 ms per run.** Each round ran the before build twice, then the after build twice:

| Case | Before, rounds 1 / 2 / 3 | After, rounds 1 / 2 / 3 |
|---|---|---|
| integral drag b | 33.4 33.5 / 33.4 33.4 / 50.0 50.0 | 33.4 33.4 / 49.9 50.0 / 50.0 50.0 |
| area-between drag b | 50.1 66.6 / 66.7 50.1 / 66.8 66.7 | 66.7 66.6 / 66.7 66.7 / 66.7 66.7 |
| accumulation drag x | 66.7 66.7 / 83.3 66.7 / 83.4 83.4 | 66.7 66.7 / 99.9 83.4 / 83.4 83.4 |
| darboux drag b | 33.4 33.3 / 33.4 33.4 / 50.0 50.0 | 33.4 33.4 / 50.0 50.0 / 50.0 50.0 |
| bisection clicks | 16.8 16.8 / 16.7 16.8 / 16.8 16.8 | 16.7 16.8 / 16.8 16.7 / 16.8 16.7 |

The medians of the throttled cases are 16.7 ms in both builds. The builds match in round 1. In round 3 both read one frame step higher, so machine load rose during the run. Only round 2 separates them, by one frame step for integral, darboux and accumulation, all after the before build. The after build does less per commit, writing one store key instead of the model's fields plus `model`. We read this as no measurable difference; more interleaved rounds would settle the round-2 tilt.

Limits: rAF intervals saturate at 16.7 ms. The 4× throttle is a desktop slowdown, not a phone. Mouse input only. Load from other sessions was not controlled, which is why the builds were interleaved.

## Collision playground step cost — 2026-11-07

`just collision-step-bench` ([script](../scripts/collision-step-benchmark/README.md)); raw tables, counters and method in [cp3-results.md](reviews/collision-playground/cp3-results.md). Commit 8b93633c, Chromium 156.0.8078.4 headless, AMD Ryzen 5 7600, seed 1, 30 warm-up + 120 measured steps, median step ms inside `stepWorld`.

| Profile | Method | 100 | 250 | 500 | 1000 | 2000 | 3000 | 5000 |
|---|---|---|---|---|---|---|---|---|
| Desktop 1440×900, worker | naive | 0.04 | 0.20 | 0.46 | 2.4 | 8.8 | 20.5 | 58.0 |
| Desktop 1440×900, worker | sweep | 0.005 | 0.01 | 0.03 | 0.06 | 0.17 | 0.28 | 0.59 |
| 4× throttle 390×844, main thread | naive | 0.03 | 1.2 | 2.4 | 9.6 | 40.2 | 106 | 317 |
| 4× throttle 390×844, main thread | sweep | 0.005 | 0.02 | 0.18 | 0.38 | 0.80 | 1.27 | 2.84 |

Decision: limits 4 000 (naive) and 5 000 (sweep); reasons in the [collision playground spec](specs/collision-playground.md#containment). The throttled rows run on the main thread because CDP cannot throttle a worker target.

## Collision playground polygon step cost — 2026-11-08

`just collision-step-bench` extended with a shape axis (circle and polygon cells in one run; [script](../scripts/collision-step-benchmark/README.md)). Commit 88dec476 (src dirty: CP9 work in progress, no change under `src/compgeo`), Chromium 156.0.8078.4 headless, AMD Ryzen 5 7600, seed 1, 30 warm-up + 120 measured steps, median ms of one `stepWorld`. Raw tables with p90, max and all counters: [cp9-bench.log](reviews/collision-playground/cp9-bench.log) and `cp9-bench.json`. The circle rows of this run reproduce CP3 within run-to-run variation (throttled naive at 5 000: 273 ms now, 317 ms in CP3).

| Profile | Shape, method | 100 | 250 | 500 | 1000 | 2000 | 3000 | 5000 |
|---|---|---|---|---|---|---|---|---|
| Desktop, worker | polygon naive | 0.03 | 0.13 | 0.49 | 2.0 | 8.7 | 19.4 | 57.5 |
| Desktop, worker | polygon sweep | 0.01 | 0.01 | 0.04 | 0.08 | 0.27 | 0.47 | 0.71 |
| 4× throttle 390×844, main thread | circle naive | 0.03 | 0.42 | 1.98 | 8.5 | 37.0 | 90.3 | 273 |
| 4× throttle 390×844, main thread | polygon naive | 0.02 | 0.59 | 2.2 | 8.8 | 40.1 | 91.4 | 275 |
| 4× throttle 390×844, main thread | circle sweep | 0.005 | 0.02 | 0.03 | 0.23 | 0.64 | 1.2 | 2.3 |
| 4× throttle 390×844, main thread | polygon sweep | 0.005 | 0.03 | 0.20 | 0.40 | 1.0 | 2.0 | 3.7 |

The polygon pipeline adds little to naive (the box stage dominates: 12.5 million box tests at n = 5 000 against 229 candidates, 179 hull passes, 169 touching pairs and 590 piece tests); sweep costs about 1.6 times the circle sweep at n = 5 000 because of the hull and piece tests of 229 candidates. Decision by the CP3 rule: naive 275 ms at 5 000 exceeds 250 ms, and the quadratic fit puts 250 ms at about n = 4 960, so the limit is 4 500 (rounded down to a 500 step); sweep 3.7 ms at the 5 000 cap is under 8 ms, so the cap applies. Limits: polygon naive 4 500, sweep 5 000 (by step cost; CP10 lowered them to 3 000 and 3 500 for drawing cost, see [polygon containment](#collision-playground-polygon-containment-and-sprite-drawing--2026-11-08)). The 4 500 cell itself was not run; interpolation gives about 205 ms.

## Collision playground containment and draw pacing — 2026-11-07

`just collision-containment /bezeg-2.0/learn/sweep-algorithms` ([script](../scripts/collision-containment/README.md)) on the production build, Chromium 156.0.8078.4 headless, AMD Ryzen 5 7600. Profiles: desktop 1440×900 unthrottled; 390×844 touch, DPR 2, 4× CPU throttling on the main thread (the simulation worker runs unthrottled). Naive plays at its limit (4 000) unless stated. Evidence: [investigation and runs](reviews/collision-playground/cp7-containment-investigation.md), [first trial](reviews/collision-playground/cp7-measurements.md).

| State, mobile 4× | Scroll p95 (ms) | Link-click p95 (ms) |
|---|---|---|
| No playground (harness `playground=0`) | 31 | 32 |
| Playground paused | 28 to 30 | 32 |
| Playing, before draw pacing | 77, 84, 104 | 32 to 48 |
| Playing, with draw pacing (three runs) | 52.7, 54.2, 51.6 | 32, 40, 40 |

- **Cause.** The playground plays on its own once in view, and the first "paused" baseline was really playing. Truly paused it costs nothing measurable. While playing, the throttled main thread spent most frame time in Commit and DoUpdateLayers for the DPR-2 canvas at the snapshot rate (trace: 604 main frames, 3 745 ms, against 173 frames, 222 ms without the playground). Draw script was about 540 ms.
- **Change kept.** Adaptive draw pacing (`drawPacing.ts`; [spec decision](specs/collision-playground.md#containment)). When the smoothed rAF interval is above 20 ms, the canvas draws at most every 33 ms. Unloaded displays still draw every frame. Throttled draws fell to about 17 per second, while the simulation and readout were unchanged.
- **Other rows with pacing.** No long animation frame over 50 ms in either profile. Naive-to-sweep switch: mobile median 45 to 52 ms, desktop 21 ms. Sweep-limit draw callback median: 1 ms desktop, 4.7 ms mobile (p95 6.5 to 6.9). Desktop scroll p95: 38 to 40 ms; link: 16 ms.
- **Limits.** Headless Chromium uses the software compositor, so a phone's GPU compositing may differ. No physical phone was measured.

## Collision playground polygon containment and sprite drawing — 2026-11-08

`just collision-containment /bezeg-2.0/learn/convexity-hulls` ([script](../scripts/collision-containment/README.md)) on the production build of the convexity chapter's polygon block, same machine, Chromium and profiles as the circle run above. `COLLISION_CP7_STAGE` selects the overlay: boxes (the default) and pieces (the heaviest). Raw JSON and tables: `docs/reviews/collision-playground/cp10/`.

| Run (limits naive / sweep) | Overlay | Naive: frames > 50 ms (desktop / mobile 4×) | Scroll p95 ms | Switch median ms, mobile 4× | Sweep draw median ms (desktop / mobile 4×) | Off-screen snapshots |
|---|---|---|---|---|---|---|
| Path2D, 4 500 / 5 000 (CP9 as pushed) | boxes | 103 / 88 | 309 / 153 | 411 | 85 / 365 | 0 / 65 |
| Path2D, 4 500 / 5 000 | pieces | 47 / 52 | 983 / 1 719 | 1 992 | 496 / 2 144 | 49 / 221 |
| Sprites, 4 000 / 4 500 | boxes | 0 / 8 | 39 / 62 | 77 | 6.0 / 30.7 | 0 / 0 |
| Sprites, 4 000 / 4 500 | pieces | 0 / 39 | 40 / 77 | 73 | 6.0 / 38.7 | 0 / 0 |
| **Sprites, 3 000 / 3 500 (kept)** | boxes | 0 / 0 | 39 / 66 | 79 | 2.6 / 15.9 | 0 / 0 |
| **Sprites, 3 000 / 3 500 (kept)** | pieces | 0 / 0 | 41 / 73 | 90 | 2.8 / 15.7 | 0 / 0 |

- **Cause.** Polygon mode built a Path2D of every vertex of every body, and of every hull or piece outline with dashes, in each frame. Circles at the same counts had met every target. All long frames were the playground's `requestAnimationFrame` callback.
- **Change kept.** `polygonSprites.ts` rasterises each template once per scale, DPR, overlay and colours; a body is one `drawImage` ([spec](specs/collision-playground.md#containment)). The throttled draw still grew with the body count, and naive at 4 000 left frames over 50 ms, so the polygon limits were lowered for drawing cost to 3 000 (naive) and 3 500 (sweep). This supersedes the limits in the polygon step-cost section above.
- **Other rows (kept run).** Link-click p95 16 ms desktop, 32 ms mobile 4×. Lifecycle: off-screen 0 snapshots in 2 s and resumes when scrolled back; after client-side navigation 0 worker targets and 0 messages in 2 s. The hidden tab was not measurable headless (unit evidence only, as for circles).
- **Noise.** Repeated runs at the same limits varied by about ±15 % in the throttled draw median; the kept run's margin to 33.3 ms is about half.

## F2b geometry routes drag baseline — 2026-11-11

Browser drag frame times for four routes that were previously only jsdom placeholders: `/functions/unit-circle`, `/triangle-solver`, `/line-geometry`, `/isometries`. Script: [scripts/f2b-geometry-browser-perf.cjs](../scripts/f2b-geometry-browser-perf.cjs) (method of `function-browser-perf.cjs`: rAF deltas inside the drag, first 5 frames dropped). Production build recorded at revision `680dbc37` with the working tree dirty (lines/isometries F2b; `git rev-parse HEAD` read `58160d20` when the report was written, after another commit landed), served by `just preview`. Chromium 156.0.8078.4 headless via Playwright, 60 Hz. Raw output: [f2b-geometry-perf-raw.txt](reviews/feature-streams/families-prep/notes/f2b-geometry-perf-raw.txt).

Method: 60 pointer moves 16.7 ms apart (about 1 s of input; the drag lasts about 2 s of wall time because each move round-trips), 5 runs per case in fresh contexts. Desktop 1280×800, mouse, no throttle. Phone 390×844, CDP touch events (`Input.dispatchTouchEvent`), `Emulation.setCPUThrottlingRate` 4. Dragged point: unit circle, the angle handle on its orbit (with all three options on, the angle β handle, which sits on θ and is on top); triangle solver, vertex A (sides mode) on a small Lissajous path; line geometry, point P; isometries, mirror 1 point Q in mirrors mode (the P ends of both mirrors coincide at the origin, so Q is the unambiguous handle). The isometries route has no feature toggles; mirrors mode was used as the one with the most draggable points. Dropped = frames over 25 ms. Board updates = calls of `board.update` during the drag.

| Profile | Scene | Median ms per run | p95 ms per run | Max | Dropped per run | Board updates |
|---|---|---|---|---|---|---|
| Desktop | unit circle, default | 16.7 ×5 | 16.7–16.8 | 16.8 | 0/0/0/0/0 | 61 |
| Desktop | unit circle, symmetries + cosine + second angle | 16.7 ×5 | 16.7–16.8 | 16.8 | 0/0/0/0/0 | 61 |
| Desktop | triangle solver, vertex A, sides | 16.7 ×5 | 16.7–16.8 | 16.8 | 0/0/0/0/0 | 59 |
| Desktop | line geometry, point P | 16.7 ×5 | 16.7–16.8 | 16.8 | 0/0/0/0/0 | 61 |
| Desktop | isometries, mirror 1 Q | 16.7 ×5 | 16.7–16.8 | 16.8 | 0/0/0/0/0 | 112 |
| Phone 4× | unit circle, default | 16.7 ×5 | 16.7–16.8 | 16.8 | 0/0/0/0/0 | 61–62 |
| Phone 4× | unit circle, symmetries + cosine + second angle | 16.7 ×5 | 16.7–16.8 | 33.4 | 0/0/0/0/1 | 62 |
| Phone 4× | triangle solver, vertex A, sides | 16.7 ×5 | 16.7 / 16.8 / 33.3 (run 4) | 33.4 | 1/4/5/10/3 | 60 |
| Phone 4× | line geometry, point P | 16.7 ×5 | 16.7–16.8 | 33.4 | 2/2/0/1/1 | 62 |
| Phone 4× | isometries, mirror 1 Q | 16.7 ×5 | 16.7–16.8 | 33.4 | 3/1/2/6/3 | 110 |

Triangle solver in solve mode (default SSS example), screenshots [1280×800](reviews/feature-streams/families-prep/notes/f2b-perf-shots/triangle-solve-1280x800.png) and [390×844](reviews/feature-streams/families-prep/notes/f2b-perf-shots/triangle-solve-390x844.png): the view fit keeps the whole triangle with its vertex labels and both axes visible, on desktop and on the phone viewport. No bars were present in the default SSS solve view, so none could be judged. The isometries drag issues about twice the board updates (110–112) of the other routes, from its two mirrors and their images.

Conclusion: no median above 16.7 ms and no run with a p95 above 33.3 ms, so no desktop or throttled-phone miss against the budgets. The tail on the 4× phone profile is a few single 33 ms frames per run (worst: triangle solver, up to 10 of about 128 frames, one run with p95 exactly 33.3 ms).

Limits: rAF intervals saturate at 16.7 ms, so the medians show only that no sustained slowdown occurs; the 4× throttle is a desktop slowdown, not a phone; touch is synthetic CDP input; the timer-driven input (move every 16.7 ms plus round trips) is lighter than a real finger or mouse at the device sample rate; the isometries rosette, frieze and similarity modes, the triangle circle and solve modes under drag, and other line modes were not dragged; load from other sessions was not controlled.

## F2b simulation and kinematics browser timings — 2026-11-11

Browser timings owed by [randomness task 03](tasks/randomness/03-simulation-graph.md) (acceptance 4) and [kinematics task 02](tasks/kinematics/03-release-batches.md) for `/probability/simulation` and `/curve-geometry/kinematics`. Script: [scripts/f2b-random-kinematics-browser-perf.cjs](../scripts/f2b-random-kinematics-browser-perf.cjs). Production build of revision `5c500930` (clean tree), copied to a private directory and served by a static server so that concurrent rebuilds could not change it. Chromium 156.0.8078.4 headless via Playwright, 60 Hz. Raw output: `.command-logs/f2b-rk-perf-raw.txt` (untracked; per-run values for every cell).

Method: 5 runs per case in fresh contexts; desktop 1280×800 mouse unthrottled; phone 390×844, CDP touch, `Emulation.setCPUThrottlingRate` 4. Frame time = rAF intervals (first 3 dropped); update = duration of one `board.update` call; long task = longest `PerformanceObserver` `longtask` in the window; dropped = frames over 25 ms. The plan sets no numeric budget, so the criteria of the geometry section above are used: **median at most 16.7 ms and p95 at most 33.3 ms**.
- Simulation: n typed into the trials field plus Enter (edit-to-paint), then Play from 0 at the fastest stop time (100 ms), 4.5 s window. Editing n only redraws the reset frame (0–15 ms), so it is not the cost. The cost of the first frame at n is the last stop of Play, where the whole run of n trials is simulated and drawn; it shows as the longest long task and the largest frame gap. Frequency allows at most 10^4 (the mode default, so the edit changed nothing there); galton and area were run at 10^4 and 10^5, markov at 10^5.
- Kinematics: default cycloid and projectile; Play for 2.5 s; time slider drag (60 moves over 1 s, mouse or touch); keyboard scrub (60 ArrowRight presses 16 ms apart).

| Profile | Case | Frame median | Frame p95 | Max frame | Dropped per run | Update median / max | Longest long task |
|---|---|---|---|---|---|---|---|
| Desktop | galton 10^4 Play | 16.7 | ≤16.8 | 16.8 | 0 | 1.1 / 10.8 | 0 |
| Desktop | galton 10^5 Play | 16.7 | ≤16.8 | 116.7 | 2 | 1.0 / 10.1 | 113–119 |
| Desktop | frequency 10^4, area 10^4 and 10^5, markov 10^5 Play | 16.7 | ≤16.8 | 16.8 | 0 | 1.2–1.5 / ≤2.4 | 0 |
| Phone 4× | galton 10^4 Play | 16.7 | 16.8 | 133.3 | 7–9 | 4.9–5.6 / 53–66 | 79–101 |
| Phone 4× | galton 10^5 Play | 16.7 | 16.8 (33.3 in 2 runs) | 533.3 | 10–11 | 5.2–5.4 / 52–63 | 508–537 |
| Phone 4× | frequency 10^4 Play | 16.7 | 16.8 | 66.7 | 2–3 | 7.0–7.7 / ≤9.6 | 0 |
| Phone 4× | area 10^4 Play | 16.7 | ≤16.8 | 66.8 | 2–4 | 6.6–7.8 / ≤10.4 | 0 |
| Phone 4× | area 10^5 Play | 16.7 | 16.8 | 133.3 | 5–7 | 7.1–7.4 / ≤11.6 | 127–143 |
| Phone 4× | markov 10^5 Play | 16.7 | ≤16.8 | 83.4 | 4–7 | 6.1–6.6 / ≤11.0 | 80–87 |
| Desktop | cycloid and projectile: Play, slider, keyboard | 16.7 | ≤16.8 | 16.8 | 0 | 1.8–2.2 / ≤5.3 | 0 |
| Phone 4× | cycloid Play | 16.7–33.3 (25.0, 16.7, 33.3 ×3) | 33.4–33.5 | 66.6 | 51–63 of ~100 | 11.1–13.0 / 23–26 | 0 (76 in one run) |
| Phone 4× | projectile Play | 33.3 ×5 | 33.4 | 50.0 | 59–63 of ~97 | 12.6–12.9 / 16–21 | 0 |
| Phone 4× | cycloid slider | 16.7 | 33.4 | 66.8 | 34–55 of ~230 | 12.2–12.9 / 27–31 | 69–75 |
| Phone 4× | projectile slider | 16.7 | 33.4 | 50.1 | 50–56 of ~226 | 12.8–13.4 / ~15 | 0 (50–53 in 2 runs) |
| Phone 4× | cycloid keyboard | 16.7 | 33.3 | 50.0 | 12–20 of ~204 | 12.4–12.7 / 30–34 | 60–74 |
| Phone 4× | projectile keyboard | 16.7 | 33.3–33.4 | 50.0 | 16–22 of ~201 | 12.5–13.2 / 15–20 | 0 |

Verdicts against the criteria:
- **Desktop:** met everywhere. The only visible event is galton 10^5, whose whole-run stop is one frame of about 115 ms.
- **Simulation, phone 4×:** median and p95 are met in all modes (p95 33.3 in two galton 10^5 runs), because the heavy work is one stop per Play. That stop misses on its own: galton 10^5 blocks for about 0.5 s (one 533 ms frame), area 10^5 about 0.13 s, markov 10^5 about 0.085 s, galton 10^4 about 0.09 s. Galton 10^5 is the **miss**: a half-second freeze at the end of Play, and whenever the run is jumped to its end. The 4× throttle is a desktop slowdown, not a phone.
- **Kinematics Play, phone 4×:** the median is **missed**: projectile plays at 33.3 ms (30 fps) in every run, cycloid at 16.7–33.3 ms. Each frame does one board update of about 12–13 ms (2 ms on desktop), which with the rest of the frame no longer fits 16.7 ms. Slider and keyboard scrubs meet the median (16.7 ms) with a p95 of 33.3–33.4 ms, at the limit (33.4 is two 16.7 ms intervals); the longest single frame is 66.8 ms.
- Not measured: a real phone, key repeat on a real keyboard, the prefix re-simulation per stop separately, other kinematics motions, memory. Edit-to-paint can read slightly negative (rAF timestamp precedes the keydown clock); it is not used in the verdicts.

`BigInt` against two 32-bit halves, and SVG against canvas. The code keeps the 64-bit generator state as a `BigInt` ([src/random/pcg32.ts:2](../src/random/pcg32.ts), state update at line 64), and both routes draw on JSXGraph SVG boards (0 canvas elements on either route).
- **BigInt:** the alternative was not built, so only the cost of the current choice is known. Each stop re-simulates its prefix, so the final stop costs about 10^6 draws for galton 10^5 (10 rows) and about 2·10^5 for area 10^5. The browser times (about 115 ms desktop, 520 ms at 4×, against about 104 ms in jsdom) and the absence of any long task for area and markov 10^5 on desktop fit a cost proportional to the number of draws, about 0.1 µs per draw. The numbers neither prove nor exclude that `BigInt` is the dominant part. They show the current choice is fine on desktop and misses on the throttled phone for galton 10^5 only. Whether two halves or incremental prefix tallies is the better repair is open; no code was changed.
- **SVG:** simulation board updates cost 1–1.5 ms on desktop and 5–8 ms at 4×, so drawing is not what limits the simulation. In kinematics the update is about 2 ms desktop and 12–13 ms at 4×, and it turns Play into 30 fps on the phone profile. Canvas was not tried, so the data do not show that canvas would fix it; they show SVG is adequate for the simulation and a miss for kinematics Play at 4×.

## F2b solids, level sets and phase portrait browser timings — 2026-11-12

Browser timings owed by the F2b batches for `/analysis/solids`, `/analysis/contours`, `/analysis/linear-program`, `/analysis/phase-portrait` and `/analysis/logistic-map` ([ADR 0051](adr/0051-solids-mesh-in-surface-view-integer-clipping-and-kgon-revolve.md), [0053](adr/0053-level-sets-contour-graph-marching-squares-exact-lp.md), [0054](adr/0054-phase-portraits-separate-graphs-rk4-integer-classification.md)). Script: [scripts/f2b-solids-levelsets-phase-browser-perf.cjs](../scripts/f2b-solids-levelsets-phase-browser-perf.cjs), run as `PREVIEW_BASE_URL=http://127.0.0.1:4391/bezeg-2.0 node scripts/f2b-solids-levelsets-phase-browser-perf.cjs` against a private copy of the production build. Build of revision `d7a92e94` (the same code as `06a5ea0d`), served by a static server so that concurrent rebuilds could not change it; Chromium 156.0.8078.4 headless via Playwright, 60 Hz. Raw output: `.command-logs/f2b-perf3/results.json` (untracked; per-run values for every cell).

Method: 5 runs per case, each in a fresh context; desktop 1280×800 mouse unthrottled; phone 390×844, CDP touch, `Emulation.setCPUThrottlingRate` 4. Frame time = rAF intervals; board update = duration of one `board.update`; long task = `PerformanceObserver` `longtask` over 50 ms. Each case moves one control with timer-driven input and the script fails the run if the control did not move. Criteria as in the 2026-11-11 sections: **median at most 16,7 ms and p95 at most 33,3 ms** (the strict reading, p95 at most 16,7 ms, is also visible in the tables).

Control movement observed: cube plane offset -36 to 36; revolve discs 1 to 60; slab stack shear -3 to 3 (17 and 60 slabs through "Število plošč"); contour level c -45 to 45; probe (0,6; 0,8) to (0,1; 0,3); linear program handle (3,2) to (2,1); phase matrix handle (-4,-2) to (-4,-2,75); phase seed (1,0) to (0,35; -0,65); logistic r 2,5 to 4 and back; step readout "korak 0 od 60" to "korak 4 od 60".

Not reachable or not measured: contour grid size N is fixed at 60 (`GRID_N`, [src/graphs/levelsets/contourScene.ts:21](../src/graphs/levelsets/contourScene.ts)), so N = 40, 80, 120 were not measured; phase portrait seeds are capped at 6 (`SEEDS_MAX`, [src/dynamics/phaseModel.ts:54](../src/dynamics/phaseModel.ts)), so 12, 24, 48 were not measured; revolve segments are fixed at 48 and have no control (the discs slider is the only revolve control); slab stack has 12 triangles per slab (17 slabs = 204, 60 = 720); camera orbit drag, the pendulum and spiral systems were not measured. Logistic first visit and revisit are told apart only by repeating the r sweep.

### desktop
| Case | Frame median | Frame p95 | Max frame | Frames over 25 ms per run (of) | Board update median / max | Long tasks over 50 ms per run (longest) |
|---|---|---|---|---|---|---|
| solids cube: plane offset slider, first sweep | 16,7 | 16,7–16,8 | 67–100 | 2 (131–133) | not on the path (0,0) | 3 (90–110 ms) |
| solids cube: plane offset slider, sweep back | 16,7 | 16,7–16,8 | 67–83 | 2 (128–131) | not on the path (0,0) | 2 (74–87 ms) |
| solids revolve (k=48): discs slider | 16,7 | 16,8–33,3 | 33–50 | 10–13 (203–209) | not on the path (0,0) | 0 (0–50 ms) |
| solids slab stack, 17 slabs: shear slider | 16,7 | 16,7–16,8 | 17 | 0 (122–128) | not on the path (0,0) | 0 (0 ms) |
| solids slab stack, 17 slabs: cursor slider | 16,7 | 16,7–16,8 | 17 | 0 (126–132) | not on the path (0,0) | 0 (0 ms) |
| solids slab stack, 60 slabs (max): shear slider | 16,7 | 16,7–16,8 | 17 | 0 (124–127) | not on the path (0,0) | 0 (0 ms) |
| contours N=60, 1 level(s): level slider | 16,7 | 16,8 | 33–50 | 6 (166–171) | 1,4–1,6 / 10,2–12,9 | 0–2 (0–55 ms) |
| contours N=60, 1 level(s): probe drag | 16,7 | 16,7–16,8 | 17 | 0 (179–207) | 1,1–1,4 / 3,2–4,7 | 0 (0 ms) |
| contours N=60, 5 level(s): level slider | 16,7 | 16,8 | 50–67 | 6–7 (170–181) | 1,6–1,9 / 13,0–18,9 | 3–7 (58–79 ms) |
| contours N=60, 5 level(s): probe drag | 16,7 | 16,7–16,8 | 17 | 0 (186–195) | 1,5–1,7 / 3,2–3,6 | 0 (0 ms) |
| contours N=60, 9 level(s): level slider | 16,7 | 16,8 | 50–67 | 6–7 (170–179) | 1,6–1,9 / 11,8–17,5 | 3–7 (54–79 ms) |
| contours N=60, 9 level(s): probe drag | 16,7 | 16,7–16,8 | 17 | 0 (184–195) | 1,6–1,9 / 3,0–3,7 | 0 (0 ms) |
| linear program: objective handle drag | 16,7 | 16,7–16,8 | 17 | 0 (126–130) | 1,4–1,6 / 2,7–3,0 | 0 (0 ms) |
| phase portrait, 6 seeds: matrix handle drag (all trajectories) | 16,7 | 16,7–16,8 | 17 | 0 (126–130) | 1,2–1,3 / 2,5–3,0 | 0 (0 ms) |
| phase portrait, 6 seeds: seed drag (one trajectory) | 16,7 | 16,7–16,8 | 17 | 0 (135–139) | 1,3–1,4 / 2,3–2,9 | 0 (0 ms) |
| logistic map: r slider, first visit | 16,7 | 16,7–16,8 | 17 | 0 (131–136) | 1,4–1,7 / 2,8–3,4 | 0 (0 ms) |
| logistic map: r slider, revisit | 16,7 | 16,7–16,8 | 17 | 0 (129–131) | 1,4–1,5 / 1,8–2,6 | 0 (0 ms) |
| logistic map: step button x4 (900 ms apart, animated) | 16,7 | 16,7–16,8 | 17 | 0 (222–224) | 1,6–2,1 / 2,0–2,7 | 0 (0 ms) |

### phone 4x
| Case | Frame median | Frame p95 | Max frame | Frames over 25 ms per run (of) | Board update median / max | Long tasks over 50 ms per run (longest) |
|---|---|---|---|---|---|---|
| solids cube: plane offset slider, first sweep | 16,7 | 33,3–33,4 | 833–950 | 18–35 (185–200) | not on the path (0,0) | 2–3 (842–966 ms) |
| solids cube: plane offset slider, sweep back | 16,7 | 16,8–33,3 | 850–917 | 4–13 (200–207) | not on the path (0,0) | 2 (856–923 ms) |
| solids revolve (k=48): discs slider | 16,7 | 216,7–233,3 | 267–300 | 61–64 (156–165) | not on the path (0,0) | 57–58 (247–284 ms) |
| solids slab stack, 17 slabs: shear slider | 16,7 | 33,3–33,4 | 33–50 | 23–24 (165–169) | not on the path (0,0) | 0 (0–50 ms) |
| solids slab stack, 17 slabs: cursor slider | 16,7 | 33,3–33,4 | 33–34 | 24–38 (158–176) | not on the path (0,0) | 0 (0 ms) |
| solids slab stack, 60 slabs (max): shear slider | 16,7 | 33,3–33,4 | 33–50 | 23–30 (156–165) | not on the path (0,0) | 0–1 (0–53 ms) |
| contours N=60, 1 level(s): level slider | 16,7–33,3 | 83,3–100,0 | 317–383 | 57–64 (123–127) | 8,8–10,2 / 60,2–90,4 | 57 (329–392 ms) |
| contours N=60, 1 level(s): probe drag | 33,3–58,4 | 116,8–133,4 | 133–167 | 64–68 (118–125) | 7,1–7,6 / 18,2–23,6 | 59–60 (143–177 ms) |
| contours N=60, 5 level(s): level slider | 16,7–33,3 | 83,4–116,8 | 283–400 | 58–64 (121–125) | 9,0–11,8 / 59,6–90,4 | 57 (293–409 ms) |
| contours N=60, 5 level(s): probe drag | 16,7–16,8 | 83,4–116,7 | 100–150 | 59–62 (123–128) | 6,7–8,7 / 17,2–22,1 | 59–60 (123–150 ms) |
| contours N=60, 9 level(s): level slider | 16,7–16,8 | 66,7–83,4 | 233–267 | 59–60 (124–127) | 7,1–7,9 / 50,2–56,2 | 57 (243–269 ms) |
| contours N=60, 9 level(s): probe drag | 16,7–16,8 | 83,4–116,6 | 100–133 | 58–61 (120–129) | 6,7–9,3 / 12,2–19,6 | 59 (104–150 ms) |
| linear program: objective handle drag | 16,7 | 16,7–33,2 | 33–50 | 3–8 (128–134) | 6,5–7,5 / 10,9–15,1 | 0–1 (0–52 ms) |
| phase portrait, 6 seeds: matrix handle drag (all trajectories) | 16,7 | 16,8 | 33 | 3–6 (131–135) | 4,9–5,5 / 8,8–10,6 | 0 (0 ms) |
| phase portrait, 6 seeds: seed drag (one trajectory) | 16,7 | 33,3–33,4 | 33–50 | 10–45 (132–136) | 6,4–7,8 / 10,7–22,3 | 0–1 (0–54 ms) |
| logistic map: r slider, first visit | 16,7 | 16,7–16,8 | 17–33 | 0–1 (235–247) | 6,8–7,5 / 11,0–13,2 | 0 (0 ms) |
| logistic map: r slider, revisit | 16,7 | 16,7–16,8 | 17 | 0 (229–234) | 6,3–6,8 / 8,2–9,9 | 0 (0 ms) |
| logistic map: step button x4 (900 ms apart, animated) | 16,7 | 16,7–16,8 | 17–33 | 0–1 (230–234) | 8,6–10,6 / 9,7–12,0 | 0–1 (0–52 ms) |

Reading (no decision is taken here; misses are owed to the first release batch and are to be profiled before a fix is chosen):
- **Desktop:** median 16,7 everywhere, p95 at most 16,8 except the revolve discs slider (p95 up to 33,3; 10–13 frames over 25 ms). The cube offset slider has 2 frames of 67–100 ms and 2–3 long tasks of 74–110 ms per sweep, mid-sweep while the plane crosses the cube, repeating on the sweep back, so not a cold start; the cube mesh is 12 triangles and the cause is unexplained. The contour level slider shows 6 frames of 33 ms and up to 7 long tasks of 58–79 ms at 5 and 9 levels.
- **Phone 4×, misses:** cube offset (long tasks 842–966 ms, 2–3 per sweep, also on the sweep back; p95 33,3); revolve discs (p95 217–233, 57 long tasks of 250–284 ms, about every other frame); contour level slider (p95 67–117, about 57 long tasks of 250–410 ms); contour probe drag (1 level: median 33–58, p95 117–133; 5 and 9 levels: median 16,7, p95 83–117, about 59 long tasks of 100–177 ms). One level is not cheaper than 5 or 9.
- **Phone 4×, at the limit** (p95 33,3–33,4, 17–38 frames over 25 ms per run): slab stack at 17 and 60 slabs (the same, so slab count is not the driver), phase seed drag (10–45 frames over 25 ms), linear program handle (3–8).
- **Phone 4×, passes:** phase matrix handle (p95 16,8), logistic r first visit and revisit (p95 16,8, at most 1 frame over 25 ms), logistic step.
- **Contour surface:** board 1 (the surface) is updated on level slider drags (66 updates) and on probe drags (56), contrary to the plan in ADR 0053 that it would not be.

Limits: the 4× throttle is a desktop slowdown, not a phone; touch is synthetic CDP input and needs a 250 ms settle after touchStart at 4×; timer-driven input is lighter than a real finger or mouse; rAF intervals saturate at 16,7 ms; load from other sessions was not controlled; a real phone, memory and the unreachable settings above were not measured.
