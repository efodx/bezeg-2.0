# 01 — Feasibility gate

Status: proposed. Source: [criterion 1](../../specs/jsxgraph-surface-view.md#acceptance-criteria).

Build the smallest `JsxSurfaceView` that renders the mesh, control net, points and iso lines from a real `SurfaceScene`, orbits from `SurfaceCamera`, and drags a point with JSXGraph's built-in 3D point drag. Wire it through `viewFactory` on `/patches/tensor`, `/patches/triangular` and the teapot scene of `/patches/joins`. No labels, export or full styling yet.

Measure two drawing strategies: `view3d` with central projection versus a 2D board drawn from the adapter's own projection, both with painter-sorted, reused elements. Use the production build and the ADR 0018 harness (`docs/prototypes/bezier-patches/measure.mjs`, adapted for app routes), at both viewports and densities 8 and 16, with two fresh-context repetitions. Record drag event → next rAF, orbit event → next rAF, and active frame p95, and inspect depth at the four camera presets.

Completion: `docs/reviews/jsxgraph-surface-view/gate.md` with raw records and the chosen strategy. If the orbit budget passes (drag latency is reported only), ADR 0019 is accepted and supersedes 0018. Otherwise the owner chooses a path from criterion 1 and the decision is recorded. Gate code that passes becomes the base for 02; failed gate code is not merged.
