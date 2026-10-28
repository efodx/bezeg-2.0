# 10T-M orbit measurement

Measured the integrated build from checkout `b43fdb6` (dirty teapot integration) in handler-owned preview `http://127.0.0.1:4391/bezeg-2.0`. `just build` passed; the handler confirmed the preview returned HTTP 200. Browser work ran on Windows 10 build `10.0.26200`, x64, headless Chromium `156.0.8078.4`, with ANGLE/Vulkan SwiftShader (`Google Inc. (Google)`). The bounded runner is [`t10t-orbit-smoke.cjs`](../../../scripts/bezier-benchmark/t10t-orbit-smoke.cjs); machine results and canvas captures are under [the run artifact folder](../../../.claude/scratch/t10t-orbit-2026-10-28T23-13-35-534Z/).

The runner measured one 36-move mouse orbit for the `patch-joins` default pair and the named `join-teapot` scene at each viewport. All four samples changed both camera sliders and the rendered canvas. Azimuth/elevation changed from `−52° / 28.7645°` to `−30° / 22.7645°`. `pointermove → next rAF` is a scheduling proxy, not presentation latency. Active-frame values are rAF timestamp intervals sampled only while a pointer move was recent (under 50 ms); they are not CPU render time.

| Scene | Viewport | Pointer → next rAF, n / p50 / p95 / max (ms) | Active rAF interval, n / p50 / p95 / max (ms) |
|---|---:|---:|---:|
| Default pair | 1440×1000 | 36 / 3.4 / 4.5 / 6.0 | 75 / 16.7 / 16.8 / 16.8 |
| `join-teapot` | 1440×1000 | 36 / 2.2 / 3.8 / 6.4 | 69 / 16.7 / 16.7 / 16.8 |
| Default pair | 390×844 | 36 / 3.4 / 6.4 / 7.0 | 70 / 16.7 / 16.7 / 16.7 |
| `join-teapot` | 390×844 | 36 / 2.4 / 3.5 / 7.3 | 67 / 16.7 / 16.7 / 16.8 |

All pointer-to-next-rAF p95 values are below ADR 0018's 16.7 ms target; active intervals are well below its 50 ms target. No measurement or owner checks failed. The visible capstone panel identifies the Utah teapot as 32 bicubic patches, and its canvas screenshots contain 13,052 foreground pixels at desktop and 2,739 at the narrow viewport: [desktop capture](../../../.claude/scratch/t10t-orbit-2026-10-28T23-13-35-534Z/teapot-owner-1440x1000.png), [narrow capture](../../../.claude/scratch/t10t-orbit-2026-10-28T23-13-35-534Z/teapot-owner-390x844.png). This visual evidence is paired with the unit scene-owner test: [TensorTeapotScene.test.ts](../../../src/graphs/patches/TensorTeapotScene.test.ts#L103) checks all 32 owners, 2,592 retained vertices at density 8, and 4,032 nondegenerate triangles (12,096 face indices). The source fixes density at 8 in [TensorTeapotScene.ts](../../../src/graphs/patches/TensorTeapotScene.ts#L8), consistent with [ADR 0018](../../../docs/adr/0018-three-surface-view-adapter.md#defaults-budgets-and-capstone).

This is after-only evidence. A baseline would require a second scratch build with the previous `BaseSurfaceGraph.tsx`; that was outside this bounded browser run. Export/import, keyboard and touch paths, and a broader smoke checklist were not run. The Playwright browser/context closed cleanly; the preview remains owned by the handler.

## Before/after orbit comparison

This section supersedes the after-only limitation above. The baseline scratch build copied the integrated dirty checkout at `b43fdb6b09d694b1b778a6d7a29f3a542096e81e` and replaced only `src/graphs/patches/BaseSurfaceGraph.tsx` with the exact `b0a9cd2` blob (`1fefed359e98ef7c2959f30d1155de32efd3e9cb`), which predates the retained orbit-scene cache. The handler confirmed the measured after source is identical to the later `4064ae8` commit. The scratch Vite build passed, and `http://127.0.0.1:4393/bezeg-2.0/` returned HTTP 200. Both runs used Windows 10 build `10.0.26200`, x64, Chromium `156.0.8078.4`, and ANGLE/Vulkan SwiftShader.

Values below are `n / p50 / p95 / max` in milliseconds. Pointer sample `n` is 36 in every case; active-rAF `n` varies with the gesture.

| Scene | Viewport | Pointer → next rAF, baseline | Pointer → next rAF, after | Active rAF interval, baseline | Active rAF interval, after |
|---|---:|---:|---:|---:|---:|
| Default pair | 1440×1000 | 36 / 7.8 / 10.5 / 11.8 | 36 / 3.4 / 4.5 / 6.0 | 85 / 16.7 / 16.7 / 16.8 | 75 / 16.7 / 16.8 / 16.8 |
| `join-teapot` | 1440×1000 | 36 / 13.4 / 19.9 / 23.1 | 36 / 2.2 / 3.8 / 6.4 | 97 / 16.7 / 16.7 / 16.8 | 69 / 16.7 / 16.7 / 16.8 |
| Default pair | 390×844 | 36 / 7.7 / 10.5 / 10.6 | 36 / 3.4 / 6.4 / 7.0 | 78 / 16.7 / 16.8 / 16.8 | 70 / 16.7 / 16.7 / 16.7 |
| `join-teapot` | 390×844 | 36 / 14.4 / 18.7 / 18.9 | 36 / 2.4 / 3.5 / 7.3 | 90 / 16.7 / 16.8 / 16.8 | 67 / 16.7 / 16.7 / 16.8 |

All four baseline cases delivered 36 pointer moves, changed both camera sliders from `−52° / 28.7645°` to `−30° / 22.7645°`, and changed the canvas. The runner exited with status 1 because the baseline `join-teapot` pointer-to-next-rAF p95 was 19.9 ms at desktop and 18.7 ms at the narrow viewport, both above its 16.7 ms threshold; its other recorded checks passed. The after run's corresponding p95 values were 3.8 ms and 3.5 ms. Active-rAF intervals were 16.7–16.8 ms in both runs, well below the separate 50 ms active-interval target.

Each case is one 36-move gesture, not a repeated trial. These are observed sample differences only; they do not establish statistical significance or a causal speedup. The raw baseline result is [t10t-results.json](../../../.claude/scratch/t10t-baseline/results/t10t-results.json), with [desktop teapot capture](../../../.claude/scratch/t10t-baseline/results/teapot-owner-1440x1000.png) and [narrow teapot capture](../../../.claude/scratch/t10t-baseline/results/teapot-owner-390x844.png). The runner's static `cacheComparison` label in that raw JSON still says `after-only`; this section records the actual baseline and after runs.
