# CP3 step-cost results (raw)

Measured by `just collision-step-bench` ([README](../../../scripts/collision-step-benchmark/README.md)); the handler chooses the limits from these numbers.

- Commit: 8b93633c (worktree `stream-collision`; `src/` had uncommitted changes from other workers in `src/Routes.tsx`, localization and the playground UI, none in the measured modules under `src/compgeo/collisions/`).
- Browser: Chromium 156.0.8078.4 (Playwright 1.64.0, headless), minified Vite production bundle.
- CPU: AMD Ryzen 5 7600 6-Core Processor (12 logical), 63 GB, Windows_NT 10.0.26200.
- Method: seed 1, 30 warm-up and 120 measured steps per cell; time is `performance.now()` around `stepWorld`; counters are medians over the 120 steps. The page is cross-origin isolated (fine timer resolution).
- Entry: a real module Worker whose entry calls `stepWorld` directly, not `createWorkerLoop`, whose count clamp (naive 2000) would block the larger naive cells. No naive cell exceeded 2000 ms, so none was skipped.

## Throttling caveat

Chromium rejects `Emulation.setCPUThrottlingRate` on a worker target ("Operation is only supported for pages, not workers"), and page-level throttling does not slow a worker: with the page throttled 4x, a fixed 30M-iteration loop in the worker ran at 1.04x the unthrottled time. The 4x profile therefore runs the same `stepWorld` code on the page's main thread, where CDP throttling applies. The same fixed loop took 4.47x as long as on the unthrottled main thread, so the throttle is effective (the loop is only an approximate proxy). The unthrottled worker and the unthrottled main thread agree (calibration ratio 1.08, table cells below), so the main thread is a fair stand-in for the worker.

The `desktop-main` profile is that unthrottled control.

### Desktop 1440x900 (worker, CPU throttle 1x, fixed-loop calibration 363/366/348 ms, ratio to desktop-main 1.08)
| method | n | median ms | p90 ms | max ms | boxTests | candidates | narrowTests | touchingPairs |
|---|---|---|---|---|---|---|---|---|
| naive | 100 | 0.035 | 0.050 | 0.260 | 4950 | 3 | 3 | 2 |
| naive | 250 | 0.200 | 0.265 | 1.910 | 31125 | 6 | 6 | 5 |
| naive | 500 | 0.455 | 0.535 | 0.760 | 124750 | 12 | 12 | 9 |
| naive | 1000 | 2.400 | 4.695 | 9.650 | 499500 | 28 | 28 | 22 |
| naive | 2000 | 8.790 | 9.390 | 18.605 | 1999000 | 62 | 62 | 49 |
| naive | 3000 | 20.510 | 23.530 | 30.340 | 4498500 | 94 | 94 | 74 |
| naive | 5000 | 57.960 | 61.510 | 77.835 | 12497500 | 161 | 161 | 125 |
| sweep | 100 | 0.005 | 0.005 | 0.025 | 87 | 3 | 3 | 2 |
| sweep | 250 | 0.010 | 0.015 | 0.070 | 396 | 6 | 6 | 5 |
| sweep | 500 | 0.025 | 0.030 | 0.165 | 1113 | 12 | 12 | 9 |
| sweep | 1000 | 0.060 | 0.065 | 0.075 | 3156 | 28 | 28 | 22 |
| sweep | 2000 | 0.170 | 0.175 | 0.190 | 8927 | 62 | 62 | 49 |
| sweep | 3000 | 0.275 | 0.300 | 0.460 | 16373 | 94 | 94 | 74 |
| sweep | 5000 | 0.585 | 0.630 | 1.015 | 35223 | 161 | 161 | 125 |

### Desktop 1440x900 control (main, CPU throttle 1x, fixed-loop calibration 353/337/334 ms, ratio to desktop-main 1.00)
| method | n | median ms | p90 ms | max ms | boxTests | candidates | narrowTests | touchingPairs |
|---|---|---|---|---|---|---|---|---|
| naive | 100 | 0.045 | 0.055 | 0.080 | 4950 | 3 | 3 | 2 |
| naive | 250 | 0.255 | 0.285 | 0.385 | 31125 | 6 | 6 | 5 |
| naive | 500 | 0.400 | 0.510 | 0.585 | 124750 | 12 | 12 | 9 |
| naive | 1000 | 2.080 | 4.230 | 4.825 | 499500 | 28 | 28 | 22 |
| naive | 2000 | 7.280 | 8.260 | 9.070 | 1999000 | 62 | 62 | 49 |
| naive | 3000 | 17.920 | 19.710 | 22.275 | 4498500 | 94 | 94 | 74 |
| naive | 5000 | 52.555 | 56.760 | 61.840 | 12497500 | 161 | 161 | 125 |
| sweep | 100 | 0.005 | 0.010 | 0.120 | 87 | 3 | 3 | 2 |
| sweep | 250 | 0.015 | 0.020 | 0.080 | 396 | 6 | 6 | 5 |
| sweep | 500 | 0.025 | 0.030 | 0.075 | 1113 | 12 | 12 | 9 |
| sweep | 1000 | 0.060 | 0.070 | 0.085 | 3156 | 28 | 28 | 22 |
| sweep | 2000 | 0.160 | 0.180 | 0.595 | 8927 | 62 | 62 | 49 |
| sweep | 3000 | 0.250 | 0.295 | 0.430 | 16373 | 94 | 94 | 74 |
| sweep | 5000 | 0.585 | 0.605 | 0.920 | 35223 | 161 | 161 | 125 |

### Mobile 390x844 (main, CPU throttle 4x, fixed-loop calibration 1495/1506/1544 ms, ratio to desktop-main 4.47)
| method | n | median ms | p90 ms | max ms | boxTests | candidates | narrowTests | touchingPairs |
|---|---|---|---|---|---|---|---|---|
| naive | 100 | 0.030 | 0.195 | 1.640 | 4950 | 3 | 3 | 2 |
| naive | 250 | 1.210 | 1.605 | 8.075 | 31125 | 6 | 6 | 5 |
| naive | 500 | 2.415 | 2.885 | 5.255 | 124750 | 12 | 12 | 9 |
| naive | 1000 | 9.565 | 11.315 | 22.270 | 499500 | 28 | 28 | 22 |
| naive | 2000 | 40.235 | 44.395 | 59.900 | 1999000 | 62 | 62 | 49 |
| naive | 3000 | 106.205 | 133.695 | 173.760 | 4498500 | 94 | 94 | 74 |
| naive | 5000 | 317.440 | 369.945 | 578.570 | 12497500 | 161 | 161 | 125 |
| sweep | 100 | 0.005 | 0.010 | 0.195 | 87 | 3 | 3 | 2 |
| sweep | 250 | 0.015 | 0.175 | 1.185 | 396 | 6 | 6 | 5 |
| sweep | 500 | 0.180 | 0.200 | 1.365 | 1113 | 12 | 12 | 9 |
| sweep | 1000 | 0.375 | 0.645 | 2.075 | 3156 | 28 | 28 | 22 |
| sweep | 2000 | 0.800 | 1.620 | 4.950 | 8927 | 62 | 62 | 49 |
| sweep | 3000 | 1.270 | 2.025 | 3.580 | 16373 | 94 | 94 | 74 |
| sweep | 5000 | 2.835 | 4.075 | 6.365 | 35223 | 161 | 161 | 125 |
