# Renderer repair verification — 2026-10-26

Task 02 remains partial. This phase repairs the throwaway three.js pointer and lifecycle prototype and makes the measurement runner bounded. It does not select a renderer or change production routes/dependencies.

The independent [baseline smoke](three-focused-smoke.md) used `be078cd` and reproduced a void raycaster result, dead toolbar after remount, and stale setup after disposal during a pending fixture fetch. The [repair](three-lifecycle-fix.md) returns the configured raycaster, scopes async work to its mount generation, and separates toolbar from renderer listener ownership.

The handler reran the baseline browser harness against the repaired source, asserting its exact served SHA-256 (in [results](three-focused-artifacts/repair-2026-10-26-1946/results.json)). Chromium 156.0.8078.4, 1280×900 and 390×844, local isolated preview with pinned three.js r180. Eleven of twelve selected rows passed: tensor/triangle mouse editing with changed rendered pixels, touch orbit/keyboard orbit, inset pointer, preset-view capture, actual 32-patch teapot, SVG/PNG downloads with labels, Presentation/resize, repeated remount with working toolbar, and disposal during delayed setup. No runtime or console errors. Preset captures establish evidence, not a new independent depth verdict. Existing SVG line ordering and HTML label occlusion findings remain open.

The combined touch row passed XY but failed its subsequent z assertion. A separate fresh-scene [touch probe](three-focused-artifacts/repair-2026-10-26-1946/touch.json) passed z on both patch kinds: only point 0 changed, by +0.82963 in z, with exact unchanged XY and camera. This establishes isolated z editing, not the combined sequence or selection of overlapping projected points. Investigate which point the second gesture hits before attributing the combined failure to coordinate drift. Exact [browser harness](three-focused-artifacts/repair-2026-10-26-1946/verify.mjs) and [touch harness](three-focused-artifacts/repair-2026-10-26-1946/verify-touch.mjs) are preserved; run from repository root and choose a new output directory before reproducing.

Two earlier repair-harness attempts stopped on Windows `UNKNOWN` errors overwriting results JSON; unique checkpoint files allowed the final run to finish. These were evidence-writing failures, not renderer failures. Browser contexts closed at final completion; the handler-owned preview remained available until phase closeout.

## Tiny timing-runner acceptance probes

Idle, exclusive, fresh-context runs at tensor / iso 8 / tiling 8 / desktop 1440×1000 completed all three gestures in each renderer. Each has only three input samples, one repetition. These validate the runner and expose profiling leads; they do not establish renderer budgets or the required comparison matrix.

| Probe | Drag frame median / p95 | Orbit frame median / p95 | Parameter API cost median / maximum |
| --- | --- | --- | --- |
| [JSXGraph 1.14.1](timing-probes/jsx.json) | 16.7 / 166.6 ms | 16.7 / 33.4 ms | 3452.3 / 3497.7 ms |
| [three.js r180](timing-probes/three.json) | 33.3 / 100.0 ms | 33.3 / 33.4 ms | 7.7 / 8.3 ms |

Raw samples, source/asset hashes, runtime versions, host details, dirty state and base revision are retained in each JSON. Frame populations include host dispatch/evidence-write gaps; event-to-next-rAF is not compositor latency. Cameras, materials and renderer work paths also differ; no cross-renderer speed ratio is accepted. The JSXGraph parameter rebuild remains unbatched. Profile and compare a bounded batching repair before assigning the cost to JSXGraph capability.

The initial root-run JSX probe correctly rejected mismatched installed runtime hashes. The successful JSX run used the approved isolated installation; no shared dependencies were replaced. One stale-harness invocation after a mistaken relative copy was stopped immediately, then the current harness was copied by absolute path and rerun. The saved successful results are from the current bounded runner.

## Review and remaining acceptance

The [measurement review](measurement-review.md) found four issues, now addressed: explicit triangular mesh mode, owning-patch evidence, full active asset/revision provenance, and persistent failed-run state. The [lifecycle review](three-lifecycle-review.md) found verifier gaps; stronger delayed import/fetch/JSON schedules and exact control-listener counts now pass, each async guard deletion fails its matching schedule, and the old source reproduces the failures. Handler reran these checks plus teapot/fidelity verifiers, syntax and whitespace checks. No application build or broad app smoke was needed for docs-only prototypes.

Remaining: combined touch target diagnosis; JSX corrected triangle/teapot browser confirmation and existing failures; vector export/label depth disposition; keyboard parameter access disposition; exclusive full same-scene density/viewport/teapot measurements; measured ADR and dependent task creation. Physical-phone testing stays optional. No renderer selection is implied by these repairs or tiny probes.
