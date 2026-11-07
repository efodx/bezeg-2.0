# Web Worker and canvas for the collision playground

Status: accepted, 2026-11-07 (handler, recording the owner's requirement). Source: [collision playground](../specs/collision-playground.md).

The collision playground computes its simulation in a dedicated Web Worker and draws it with a 2D `<canvas>` on the main thread. This is the app's first worker. The decision covers this playground only.

## Context

The playground deliberately runs a slow algorithm, testing every pair, at sizes where it becomes visibly slow. The owner required that "the lag doesn't lag the whole site, but the animation only": a reader's page and machine must stay usable while the naive method struggles. The [performance plan](../performance-plan.md) admits workers only with a reason. Here the reason is the requirement itself: the expensive work exists *on purpose*, so it cannot be optimized away and must be isolated. Up to 5 000 moving bodies also rule out a DOM node per body.

## Decision

- The pure model (`src/compgeo/collisions/`) runs inside a module worker created with `new Worker(new URL('./collisionWorker.ts', import.meta.url), {type: 'module'})`, which Vite bundles without a dependency.
- The simulation advances a fixed simulated \(\Delta t\) per step with no catch-up, so slow steps show as slow motion.
- Maximum object counts per method are measured.
- The worker pauses when the tab is hidden, the canvas is off-screen or the reader has been idle for 120 s, and it is terminated on unmount.
- The main thread draws the newest snapshot on a 2D canvas once per animation frame.
- There is no main-thread fallback: without a worker the playground shows a static explanation.

## Alternatives

- **Main thread with time slicing** (`scheduler.yield` or a `setTimeout` per chunk of pair tests). No worker, but the naive work still shares the main thread with scrolling, React and MathJax. Responsiveness then depends on chunk size, and every chunk boundary costs latency. It does not meet the requirement reliably on slow devices.
- **Simulated slowness**: compute only the counts and slow the animation by a model of their cost. Cheap and safe, but dishonest: the point is that the reader's own machine really cannot keep up. The playground also shows measured step times.
- **OffscreenCanvas drawing inside the worker.** It removes drawing from the main thread too, but a naive step blocks the worker's own drawing, which is exactly the visible slow motion we want. Still, it splits drawing code from the site's theme tokens and accessibility layer. Main-thread drawing is linear in \(n\) and measured (spec criterion 4). Revisit if it misses.
- **SVG or JSXGraph.** One element per body: at thousands of bodies the DOM, not the collision test, becomes the bottleneck, and that hides the lesson.

## Consequences

- A worker module enters the build. Tests exercise the pure model directly, and the worker host stays thin and is covered by browser checks.
- The playground's work uses one extra CPU core while it plays, so fans may spin. The measured limits and automatic pauses bound this, but cannot make it zero.
- A second canvas-based drawing surface joins the SVG playground ([ADR 0020](0020-svg-drawing-playground.md)). It follows the graph style tokens and has no figure export.
