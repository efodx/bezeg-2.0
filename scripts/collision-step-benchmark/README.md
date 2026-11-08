# Collision step benchmark

Step-cost measurement for [collision playground task CP3](../../docs/tasks/collision-playground/03-measured-limits.md). It adds no app route and changes nothing under `src/`; it imports `createWorld`, `createScratch` and `stepWorld` from `src/compgeo/collisions/` read-only.

The bench page (`browser.ts`) starts a real module Worker (`benchWorker.ts`), bundled by Vite into a minified production build. The worker calls `stepWorld` directly rather than `createWorkerLoop`, because the CP2 worker clamps the count to `MAX_COUNT`, which would block naive cells above the provisional limit. The step time is `performance.now()` around `stepWorld`, measured inside the worker, which is the same quantity as the loop's `stepMs`. The server sends COOP/COEP headers so the timer has fine resolution.

Cells: shape `circle` and `polygon` (CP9; the polygon rows also report hull tests, hull passes and piece tests), method `naive` and `sweep`, n in 100, 250, 500, 1000, 2000, 3000, 5000, seed 1, 30 warm-up and 120 measured steps. Profiles: desktop 1440x900 unthrottled, and 390x844 with CPU throttling rate 4. Naive cells are skipped after one exceeds 2000 ms median. Median, p90, max and the median step counters are reported.

## Throttling the worker

CDP throttling is per target, and the page session does not reach the dedicated worker. `run.cjs` therefore opens a raw browser-level CDP WebSocket (`--remote-debugging-port=9340`), attaches to the worker target with a flattened session and sends `Emulation.setCPUThrottlingRate` on it, as well as on the page. Each profile also runs a fixed in-worker CPU loop three times; the reported `ratio to desktop` shows whether the worker is really throttled (about 4 for the mobile profile).

## Run

```powershell
just collision-step-bench [results.json]
```

It builds into `.benchmark-output/collision-step`, starts a static server on port 4317 (`COLLISION_STEP_BENCH_PORT` overrides it) and prints the environment and both tables. It uses no test slot: one headless browser, a few minutes. Keep the machine idle.
