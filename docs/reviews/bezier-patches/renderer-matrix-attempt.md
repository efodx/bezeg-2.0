# Renderer matrix attempt — 2026-10-26

Status: completed attempt, partial acceptance. No renderer or budgets are selected.

The exclusive bounded runner attempted 192 cases: JSXGraph 1.14.1 and Three r180; tensor and triangular patches; iso8/16 × tiling8/16; desktop1440×1000 and narrow390×844; drag, orbit and parameter sweep; two repetitions with eight inputs each. Triangular JSX used the mesh path. Chromium156.0.8078.4 ran on the recorded desktop host; narrow is browser emulation, not physical-device evidence. The run finished within its600-second deadline,20:14:18–20:22:52UTC, with exit1 because56 cases failed verification.

[Raw data](matrix-attempt-2026-10-26/measure.json) retains timings, successful rendered-geometry checks, failed assertions, runtime/source/asset hashes and dirty-state provenance. [Summary](matrix-attempt-2026-10-26/summary.json) groups outcomes. The base recorded in the run is fcd3ed0 with the pending Three depth repair; the exact tested prototype source is now committed in d684284. Production dependencies and routes are unchanged.

| Population | Complete | Failed |
| --- | ---: | ---: |
| JSX tensor |48|0|
| JSX triangular mesh |48|0|
| Three tensor |40|8|
| Three triangular |0|48|

The8 failed tensor cases are all narrow-screen drags: the expected point did not move while the camera stayed fixed. The48 triangular failures all report zero patch-interior pixels/sampled pixels;47 had changed interaction state, while one also did not move the expected point. These are unresolved non-vacuity failures. They do not establish that the renderer drew no patch, and failed-run timings are not accepted comparisons. The harness currently targets labels and samples around the parameter label; label visibility changed in the depth repair. Diagnose actual target/projection/rendered-owner evidence before altering source or assertions.

The handler initially observed only incremental completed counts and described progress before inspecting the final failure list. All192 attempts have records; “completed attempt” does not mean192 passes. No hard-deadline failure occurred. Browser contexts closed at runner completion, and the preview was stopped for handoff.

Next: diagnose the failed Three measurement paths with tiny exclusive probes, preserve these failed records, then rerun affected cells with actual rendered-owner targeting. The successful JSX populations remain useful raw data, subject to the stated measurement caveats. Existing rAF and dispatch-to-next-rAF proxies include host/evidence-write gaps and are not compositor latency. Named parameter APIs do different inset/readout work. Materials and camera conventions also differ. Do not infer a cross-renderer speed ratio or pick budgets from the incomplete comparison. Actual32-patch teapot measurements and remaining JSX browser confirmation still precede the renderer ADR and dependent task creation.
