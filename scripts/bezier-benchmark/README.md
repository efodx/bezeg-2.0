# Bézier drawing benchmark

This is a separate diagnostic bundle of the real De Casteljau graph component and its shared JSXGraph adapter. It does not add a route or controls to the normal app, change sampling settings, or save presets.

Use the existing installed dependencies. From the repository root:

```powershell
node scripts/bezier-benchmark/build.cjs before 22072a15314bb395ae19a38f5fcd964f4d4f9f2f
node scripts/bezier-benchmark/build.cjs after
node scripts/bezier-benchmark/serve.cjs
```

Open `http://localhost:3001/before/` and `/after/`. `before` substitutes the two evaluator source files from the supplied Git commit at bundle time, without modifying the checkout. Both builds use the same current harness and surrounding graph code. The `current` build label is also available. Generated bundles live in ignored `.benchmark-output/` and survive the normal app build.

For a phone on the same Wi-Fi, opt into listening on the local network:

```powershell
$env:BENCHMARK_HOST = '0.0.0.0'
node scripts/bezier-benchmark/serve.cjs
```

The server prints the computer's LAN addresses. Open one of those on the phone; `localhost` on the phone refers to the phone itself. Stop the server with Ctrl+C when finished. The server serves generated benchmark files and, after `npm run build`, the production app under `/bezeg/` for manual interaction checks. No app deployment or firewall change is performed by these scripts.

## Comparable measurements

- Keep the same device, browser/version, viewport/orientation, labels, scene, and interaction. Record battery/power mode, refresh rate, and any external CPU throttling; the harness does not configure throttling.
- Run three times on each version with diagnostics unchecked. Use a fresh page after a diagnostic run: wrapping hot methods can affect optimization even after restoring them. Keep the tab visible and let MathJax finish loading before starting.
- `animation` changes `t` at the normal elapsed-time speed; `point` also moves a control point; `slider` sweeps `t` deterministically; `weight` also changes a rational weight. These scripted inputs exercise the same React/board path but do not measure touch-event delivery.
- Each run warms up for 60 frames and records 240 frame intervals and update-completion durations. The latter measures scripted input through synchronous board/React completion, **not input-to-paint latency**. `framesAbove25ms` is a diagnostic threshold for the observed 60 Hz desktop; interpret it against the actual phone's refresh rate.
- The graph's inherited controls remain rendered to retain their cost, but the subtree is inert to prevent independent animation, edits, and preset changes. Use the ordinary app separately for manual touch/keyboard and visible-response review.
- The separate hot-method diagnostic counts and times evaluation calls, cache misses (`pointEvaluations`), full construction recurrences (`constructionTables`), complete construction schemes (`constructionSchemes`), and calls to `board.update`. Update calls can occur while the board is suspended; their count is not the number of rendered frames. Diagnostic counts include warm-up. Timings are nested: `evalMilliseconds` includes `pointEvaluationMilliseconds`, and `constructionSchemeMilliseconds` includes `constructionTableMilliseconds`. Hot-method wrappers add overhead, so do not use these diagnostics as headline frame or input-latency results.
- Download results to retain raw timings and scene/browser metadata. Evaluate repeated-run variability and median/p95 behavior before claiming an end-to-end gain. An isolated evaluator gain is not proof that phone lag is resolved.

The four explicit fixtures are in `scenes.json`: the default polynomial and rational scenes, and degree-7 stress scenes.

## Remaining phone lag: board-phase probes

Build `current` and open `current/?scene=polynomial-default&profile=1` to time
element updates, curve sampling, text sizing, and SVG renderer work. Text sizing
and curve sampling are subsets of element-update time, so do not add them together.
These coarse wrappers avoid timing every evaluation callback. They still add
overhead and do not measure painting or touch-event delivery.

The optional ordinary-update experiment temporarily replaces the board's full
update with its regular update for the diagnostic run. It retains the existing
sampling settings, but omits full-update text sizing and can skip updates of
objects marked `needsRegularUpdate=false`. It does not isolate label sizing alone. It restores
the original method after the run or page disposal. This is a benchmark-only
hypothesis probe, not an accepted application change. Keep the original before
and after bundles for comparison; build the new probes under `current`.

The construction-visibility probe skips repeated show calls when the construction
is already visible with the same point count. Parameter callbacks and full board
updates remain unchanged. This is also diagnostic-only, restored after each run.
The `current` bundle may include unrelated workspace changes; compare probes
within that bundle, rather than treating it as identical to frozen before/after.

`Compare curve sampling` automatically runs the original sampling path and then
a probe that skips curves whose own visibility predicate is false. It enables
coarse phase timings and disables the other probes. Keep the page visible until
`Comparison complete`, then download one JSON file containing both runs.
This is confined to the controlled harness: hidden curves can supply dependent
gliders in other demonstrations, so the result does not authorize a universal
skip-hidden-curves policy. The ordinary app is unchanged.

Captured uninstrumented results can be replayed against an explicit median-frame
budget: `node scripts/bezier-benchmark/check-frames.cjs results.json 33.34`.
This exits unsuccessfully when the median exceeds the budget. The 33.34 ms
example is a provisional 30 fps investigation target, not owner acceptance.

For a supplementary Node evaluation benchmark:

```powershell
node scripts/bezier-benchmark/evaluate.cjs evaluation-results.json
node scripts/bezier-benchmark/evaluate.cjs evaluation-before.json 22072a15314bb395ae19a38f5fcd964f4d4f9f2f
```

This transpiles the actual evaluator sources using the installed TypeScript compiler. It evaluates 501 samples with separate X/Y requests, changes a control point, invalidates the cache on each redraw, warms up for 100 redraws, and reports seven runs of 200 redraws. Its p95 is the percentile of seven **run averages**, not a browser frame percentile. It complements the production browser measurement.

For math-only scratch-row and full-table probes using the same scenes, pass the
pre-change evaluator revision as the optional second argument:

```powershell
node scripts/bezier-benchmark/probe-math.cjs docs/bezier-math-probe.json 3d0db2674e64f5df858f5aed948d41329faec5e7
```

The probe compares the selected evaluator source with the benchmark-only
scratch-row candidate and separately times full construction-table creation.
The application reuses scratch rows for curves with five or more control
points; both paths retain the existing recurrence and cache behavior.
