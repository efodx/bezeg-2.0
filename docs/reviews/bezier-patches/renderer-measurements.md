# Completed renderer measurement populations

The corrected Three run completed 96 tensor/triangular cases and 16 actual 32-patch teapot orbit cases with zero failures. The separate JSXGraph teapot run completed 16 orbit cases with zero failures. Each run explicitly skipped 32 inapplicable teapot drag/UV cases. Together with the unchanged 96 successful JSX patch records in the original matrix, all planned renderer/kind/density/viewport/gesture cells now have successful evidence. The original failed records remain historical evidence, not accepted timings.

Evidence:

- [Original matrix](matrix-attempt-2026-10-26/measure.json): use only its 96 complete JSX records; JSX source SHA-256 is unchanged.
- [Corrected Three raw records](matrix-owner-2026-10-26/measure.json), [outcomes](matrix-owner-2026-10-26/summary.json), [combined timing summary](matrix-owner-2026-10-26/timing-summary.json).
- [JSX teapot raw records](teapot-jsx-2026-10-26/measure.json), [outcomes](teapot-jsx-2026-10-26/summary.json).
- [Diagnosis](matrix-probe-2026-10-26/matrix-probe.md), [probe mutation and independent centroid check](probe-nonvacuity-2026-10-26/report.json), [corrected JSX triangle/teapot confirmation](jsx-final.md).

Windows 10.0.26200 x64, AMD Ryzen 5 3600, Chromium156.0.8078.4; JSXGraph1.14.1, Three r180. Desktop1440×1000 and narrow390×844. Iso8/16 × tiling8/16, two fresh-context repetitions, eight inputs per gesture. Triangular JSX uses its mesh path. Teapot means exactly32 bicubic patches:4096/16384 actual Three triangles at tiling8/16 and32 substantive rendered JSX surface owners. Teapot has no iso families; repeating iso settings repeats the same teapot workload rather than testing another iso density.

The corrected run records base Git HEAD `e044790` plus dirty prototype/harness changes, served/local hashes for all active assets, and Three source SHA-256 `0d5354cfd0c81c1f230a4bb3c09a0875b17ade62faea4ea6518554b48befba1f`. JSX source SHA-256 is `9038ca9671a2d90a36069714fd8fb187c657ba10aad5766dc988bf9e443e6f07`. The commit containing these sources is discoverable from this report's Git history. Production dependencies and routes did not change.

At iso8/tiling8, median / p95 milliseconds (16 pointermove events or API operations per row):

| Renderer / kind / viewport | Drag event → next rAF | Orbit event → next rAF | Parameter API cost |
| --- | ---: | ---: | ---: |
| JSX tensor desktop |149.0 /170.6|39.8 /51.9|82.3 /94.3|
| JSX tensor narrow |173.4 /243.1|32.2 /53.3|86.2 /121.9|
| JSX triangular desktop |110.5 /123.4|33.5 /41.6|55.5 /60.3|
| JSX triangular narrow |106.3 /130.2|36.2 /42.9|56.3 /62.4|
| Three tensor desktop |40.9 /46.7|2.4 /4.1|10.9 /13.2|
| Three tensor narrow |38.8 /43.3|2.1 /2.8|9.9 /11.7|
| Three triangular desktop |34.4 /38.4|2.1 /2.7|5.4 /8.7|
| Three triangular narrow |33.8 /35.6|1.7 /2.4|5.5 /6.3|

At iso16/tiling16 Three drag p95 spans39.8–51.2ms and parameter cost p95 spans8.7–17.7ms. The higher density remains an explicit option, not the default.

Actual teapot orbit at tiling8: JSX event-to-next-rAF median/p95 is18.3/34.0ms desktop and16.9/23.2ms narrow; Three is1.0/1.9ms desktop and0.9/1.7ms narrow. Three continuous orbit frame median/p95 is33.3/33.4ms desktop and16.7/16.8ms narrow. At tiling16, Three's desktop continuous frame p95 reaches50.1ms in the iso16 repetition. The capstone is feasible at tiling8 on this host/emulated viewport; these are not physical-phone results.

Interpretation limits remain material. Event-to-next-rAF is an input-processing proxy, not compositor presentation or pixel-visible latency. Continuous rAF includes host dispatch, incremental JSON writes and retry gaps: the corrected Three run recovered41 Windows file-write errors. Its drag/UV frame tails cannot establish active-render budgets. Two earlier attempts aborted on file output and are excluded. Parameter APIs do different readout/inset work. Camera/material conventions differ. Narrow Three tensor drags select visible index1 because index0 projects outside the viewport, while JSX uses index0. No cross-renderer speed ratio is accepted. Small samples and headless GPU behavior limit extrapolation; production frame/visible-update acceptance remains with the adapter tasks.

The probe requires actual visible control-ray ownership and exactly one expected point edit with fixed camera. Geometry requires nonempty owners and pixels changed by hiding the actual surface meshes, with an interior surface ray hit. Disabling the diagnostic hide operation yields zero pixel differences and fails the assertion; an independent fixture calculation verifies the teapot probe's centroid within Float32 tolerance. The handler also reran export/depth, lifecycle, fidelity and teapot regressions successfully. No app build or full app smoke is claimed for this prototype-only repair.

Independent closeout review found a low-severity coordinate-trace issue: `samples[].state` still records point0 for drag, even when the selected Three target is point1. These raw files are preserved unchanged. Their `rawInputToNextRaf[].state.net` retains every point, and final expected-index/changed-index/camera checks use the selected target correctly. Timings and their summary calculations do not use the misleading convenience field. The harness now logs `started.expectedPointIndex`; no timing rerun is claimed for this logging-only correction.
