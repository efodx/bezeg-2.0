# Bézier patch renderer investigation

Status: partial investigation; no accepted renderer ADR. Task 02 remains open. Production routes and dependencies are unchanged by the prototypes. The initial comparison sources and functional evidence are preserved at prototype commit `3e1bbc1`; later repairs require fresh checks against their own source hashes.

Latest: [renderer repair verification](renderer-repair-verification.md) records independent three.js failures, pointer/lifecycle repairs, fresh browser rechecks, and bounded three-sample timing-runner probes on both pinned runtimes. Isolated touch z works; a combined XY→z target sequence remains unresolved. Full measurements, export depth fidelity, JSX browser confirmation and the ADR remain open. The new [measurement guide](measurement-harness.md) replaces the old JSX-only harness instructions below; the old timings remain historical evidence.

## Functional evidence

The [JSXGraph functional report](prototype-functional.md) records Chromium 156.0.8078.4 with actual JSXGraph 1.14.1, source hashes, screenshots, geometry checks and exports. Mouse editing/orbit, inset movement, presentation/resize and board deregistration passed the selected checks. PNG export fails with a tainted canvas; touch z drag also changes XY; main-board listeners accumulate across remounts. Live triangular mesh-face movement remains inconclusive because the original path probe did not observe polygon geometry. Depth ordering has screenshots but no accepted visual verdict. These findings warrant the task's same-scene fallback comparison; they do not select a renderer.

The isolated [three.js prototype](three-prototype.md) is implemented with pinned r180 modules and actual teapot data. Its initial checks cover syntax and inline mathematics only. Browser, export, depth, lifecycle and performance acceptance remain open.

## Initial timing attempt

An idle headless desktop Chromium run on 2026-10-26 completed three tensor drags and three orbits at iso 8 / tiling 8, 1440×1000. The runtime asserted JSXGraph 1.14.1. Each gesture used 40 paced pointer movements. [Raw partial timings](renderer-functional/interrupted-timing.json) retain frame intervals, input-to-next-rAF proxies, board update durations and environment information. The [exact harness source](renderer-functional/interrupted-timing-source.mjs) is retained as evidence; copy it back to the original prototype directory before running, so its relative dependency lookup resolves correctly.

Drag frame medians were about 16.7 ms, with p95 about 150 ms. Orbit frame medians were about 16.7 ms with p95 16.8–33.3 ms; median instrumented board update durations were 23.3–24.4 ms. These metrics have different sample populations: frames include waiting frames; update calls include no-op/suspended calls, making the zero drag update median uninformative. Input-to-next-rAF is not a direct display/compositor latency measurement.

The first programmatic parameter-sweep run did not complete before the handler stopped the process at about 19:17:38 UTC. Its timing and cause remain unaccepted; no sweep, triangle, 16-density, narrow-viewport or teapot result is inferred from this interrupted run. The current harness writes per-operation sweep progress and supports smaller bounded samples. The prototype's parameter API rebuilds construction objects without batching; this is a source observation to investigate, not a measured causal attribution or an accepted renderer budget.

## Remaining decision evidence

The independent [mathematical review](renderer-math-review.md) found control-net endpoint, triangular iso-family and mismatched stress-scene defects. [Source corrections](renderer-fidelity-fix.md) pass focused pure checks; affected browser workflows and measurements remain unverified. The [engineering/UI review](renderer-engineering-review.md) found additional lifecycle, depth/export-fidelity and keyboard-parameter gaps; those remain open. [Independent smoke](renderer-smoke.md) confirms selected original-source desktop observations but stopped at a JSX-only registry reference in its three.js lifecycle recorder, leaving required coverage skipped. Neither the partial smoke nor syntax checks close the remaining findings.

Complete independent browser checks, investigate real functional failures, measure both patch kinds and actual 32-patch teapot at the required densities and representative browser viewports, then choose a renderer and defaults in the next free ADR. Physical-phone evidence remains optional under guardrails and must not be represented by responsive browser results. Prototype revision hashes and final source hashes must accompany accepted measurements. Only after the ADR should dependent task files be created.
