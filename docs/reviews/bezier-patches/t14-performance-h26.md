# Task 14 integrated performance — 2026-10-29

## Result and evidence boundary

Preview: `http://127.0.0.1:4396/bezeg-2.0`, served by the handler-owned production preview from `.command-logs/2026-10-29T18-23-05-717Z-44780-6e24c804.log`. Source checkout was dirty at `e917d2c`; the handler confirmed the only concurrent edits were lesson-authored camera/projection work and did not touch the surface workspace, geometry, or renderer. The measured bundle predates that lesson-only source work, so this is evidence for the served build, not a claim that the build includes every final dirty source file.

Isolated Playwright Chromium contexts used 1440×1000 and 390×844 CSS-pixel viewports at device scale factor 1. These were headless browser pointer interactions; the narrow run did not enable touch emulation or test physical devices. Host: Windows 11 build 26200, x64, AMD Ryzen 5 7600 (12 logical CPUs), Node 24.20.0, `@playwright/test` 1.64.0. Chromium build and GPU/display backend were not recorded.

Every ordinary workspace case used 40 pointer moves per drag/orbit and 35 for the parameter slider; fresh context per route/density. The raw harness labels `d8` denote the unchanged app defaults: **8 iso intervals and 16 shaded subdivisions**, confirmed independently in fresh UI contexts and the graph constants. They do not denote shading density 8. The `d16` cases explicitly selected 16 in both visible density controls. De Casteljau was enabled where offered, with tensor comparison enabled on the triangular route where offered. Each gesture ended with a SHA-256 comparison of screenshots taken from the actual WebGL canvas before and after; all comparisons changed. The page published one finite-sampled owner for tensor/triangle and all 32 finite-sampled teapot owners before and after its orbit.

## p95 results

All entries are milliseconds. `Drag / orbit / parameter` is pointer-event-to-next-rAF p95, matching the ADR's interaction proxies. `Active frame` is the maximum rAF-to-rAF p95 observed during that scenario's active gesture window. `Post-render publication` is the p95 for observed `data-surface-framing` mutations, emitted after `renderer.render()`; this is a CPU-side render/publication proxy, not GPU presentation latency.

| Workspace | Iso / shading density | Viewport | Drag / orbit / parameter next-rAF p95 | Active frame p95 | Post-render publication p95, drag / orbit / parameter |
|---|---:|---:|---:|---:|---:|
| Tensor | 8 / 16 (default) | 1440×1000 | 5.2 / 2.2 / 4.8 | 16.8 | 5.9 / 2.6 / 4.9 |
| Triangular | 8 / 16 (default) | 1440×1000 | 8.0 / 2.1 / 7.5 | 16.8 | 8.9 / 2.5 / 8.7 |
| Tensor | 8 / 16 (default) | 390×844 | 5.1 / 2.2 / 4.7 | 16.8 | 5.9 / 2.5 / 4.9 |
| Triangular | 8 / 16 (default) | 390×844 | 9.8 / 2.2 / 7.5 | 16.8 | 10.1 / 2.5 / 8.7 |
| Tensor | 16 / 16 | 1440×1000 | 6.0 / 1.9 / 4.9 | 16.8 | 6.4 / 2.1 / 5.0 |
| Triangular | 16 / 16 | 1440×1000 | 10.6 / 1.8 / 9.5 | 16.8 | 11.6 / 2.3 / 10.4 |
| Tensor | 16 / 16 | 390×844 | 5.4 / 2.2 / 5.3 | 16.8 | 6.1 / 2.3 / 5.5 |
| Triangular | 16 / 16 | 390×844 | 11.1 / 2.4 / 8.4 | 16.8 | 12.0 / 2.5 / 9.8 |
| Teapot, 32 owners | — / 8 | 1440×1000 | — / 2.4 / — | 16.8 | — / 2.7 / — |
| Teapot, 32 owners | — / 8 | 390×844 | — / 2.0 / — | 16.7 | — / 2.4 / — |

Shading density 8 was not separately timed; the two measured ordinary-workspace configurations were the delivered defaults and the higher iso-density option. The measured drag/orbit proxies are under ADR 0018's 60 ms / 16.7 ms limits, and every active-frame p95 is under its 50 ms limit. The largest orbit next-rAF p95 was 2.4 ms; the largest active-frame p95 was 16.8 ms. Parameter slider interaction was exercised in all eight tensor/triangle cases, but ADR 0018 does not assign it the drag/orbit proxy thresholds.

## Settled state and remaining limits

Every gesture's before/after WebGL-canvas screenshot hash differed. Orbit changed the camera framing, preserved sampled owner geometry exactly, and retained all 32 teapot owners in both viewports. Parameter sliders reached new values (tensor 0.50→0.76/0.77; triangle 0.33→0.51) while owner samples remained unchanged. Drag updated the selected point editor; in the added density-16 narrow run, tensor coordinates changed `[-1.5,-0.5,0]` to `[-1.419245609856354,-1.131143184599928,0]`, and triangular coordinates changed `[-1.5,-1.3,0]` to `[-1.4299964232745666,-1.8340451912291842,0]`. Sampled triangular owner geometry changed on each drag. The three owner samples are only first/middle/last drawable triangle vertices; for tensor drags they remained unchanged in several cases despite the coordinate and canvas changes, so they are not an adequate independent geometry oracle.

True input-to-visible presentation latency remains unmeasured: browser screenshots only establish the settled before/after visible result, while the recorded post-render attribute and WebGL draw-call times are CPU-side proxies. This run also did not independently evaluate the settled mesh samples against Bernstein formulas. The handler should close that exact-mathematics check on the final built source and retain the presentation-timing gap unless a calibrated presentation sampler is available. Renderer/GPU identification was not captured.

Raw per-gesture results and the isolated harness are in `.claude/scratch/patch-perf-h26/results-run2.jsonl`, `results-narrow.jsonl`, `results.json`, `results-narrow.json`, `perf.cjs`, and `perf-narrow.cjs`. No application source was edited; both harness runs exited successfully and closed their own browser contexts.

Handler closure: the independent settled-math gap was closed by t14-settled-geometry-h26.md. Separate browser compositor timing is now in t14-compositor-latency-h26.md (58 correlated samples, p9532.1ms). Its narrow scope and physical-display limitations remain explicit; these CPU/next-rAF measurements are not relabeled.
