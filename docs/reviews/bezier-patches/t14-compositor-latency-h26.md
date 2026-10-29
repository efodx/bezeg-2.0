# Task 14 browser compositor latency — 2026-10-29

## Measurement

Measured the handler's fresh production preview at `http://127.0.0.1:4396/bezeg-2.0/patches/tensor` after its final `just` check and production build passed at 18:49 UTC. The page used Chromium headless, a 1440×1000 CSS-pixel viewport and device scale factor 1. CDP `Page.startScreencast` supplied PNG compositor frames. For each frame, the harness decoded the PNG and cropped the actual WebGL canvas rectangle (x=55, y=323.98, 1002×660 CSS pixels). It compared that crop with the settled frame immediately before each gesture and counted a changed pixel when its summed RGB delta was at least 24.

Input timestamps came from captured browser `pointermove` event timestamps mapped to Unix epoch with `performance.timeOrigin`; compositor timestamps came from CDP `metadata.timestamp`. For each gesture the result is the interval from its final pointermove to the first subsequent compositor frame with changed pixels in the graph canvas. This is browser compositor-frame evidence; it does not measure physical display scanout or photon response.

The run sampled 20 orbit, 20 control-point drag, and 20 parameter-slider pointer gestures. Each was a small 1–4 CSS-pixel orbit/point move or 1.5% slider-width move, followed by state verification. All 60 gestures changed the expected app state, and the workspace retained one rendered owner with nonempty finite mesh samples. There were no page errors. Fifty-eight gestures had a correlated changed-pixel frame; two slider gestures did not produce a correlated graph-pixel frame and are excluded from latency percentiles.

| Gesture | Correlated samples | p50 | p95 | Range |
|---|---:|---:|---:|---:|
| Orbit | 20/20 | 21.4 ms | 32.0 ms | 16.7–32.1 ms |
| Control-point drag | 20/20 | 20.8 ms | 31.8 ms | 14.6–32.3 ms |
| Parameter slider | 18/20 | 20.5 ms | 32.9 ms | 16.3–32.9 ms |
| Combined | 58/60 | 21.4 ms | 32.1 ms | 14.6–32.9 ms |

The mean interval between each compositor frame timestamp and Node's frame-event receipt was 19.2 ms. PNG decode plus canvas crop averaged 26.3 ms per frame. Those are host-side evidence-collection costs, separate from the compositor timestamp interval; pixel-difference evaluation time was not separately timed. All 90 received frames were acknowledged, with zero outstanding acknowledgements. This small headless run is a compositor-frame measurement, not a calibrated display-latency benchmark.

## Evidence and limits

The isolated harness is `.claude/scratch/patch-compositor-h26/measure.cjs`; its bounded summary is `.claude/scratch/patch-compositor-h26/results.txt`. The run opened and closed its own browser/context and did not edit app source, package dependencies, or Git state outside its assigned scratch and this note. The measurement covers only the tensor default workspace at desktop size, with small pointer gestures. It does not establish narrow-viewport, higher-density, teapot, touch, sustained-drag, or physical-display latency. The two uncorrelated slider trials and the host receive/decode costs remain visible evidence limits.
