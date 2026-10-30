# 06 — Lifecycle

Status: proposed. Source: [criterion 6](../../specs/jsxgraph-surface-view.md#acceptance-criteria).

Idempotent `dispose()` frees the board, listeners, observer and frames; dispose during a pending `attach` leaves nothing behind. Add an instrumented test over three remounts asserting that board, listener (host, window, document) and observer counts return to baseline. This is the prototype's failure.

## Result

- `src/graphs/patches/jsxSurfaceLifecycle.test.tsx` counts boards (`JXG.boards`), listeners on the host, window, document and other connected nodes, ResizeObservers, matchMedia subscriptions, timers longer than 20 ms and animation frames (spies in `surface-view/jsxLifecycleProbe.test-helper.ts`) over three mounts of the real tensor route, and checks dispose before the first frame and after dispose.
- Found and fixed: a direct `flush()` left the queued animation frame behind, so a frame outlived `dispose()`.
- The "50 MB retained per disposed view" is JSXGraph's zero-delay text-size timers (`text.js` `updateSize`), which `freeBoard` cannot cancel and whose closures hold the disposed board until they fire. A test loop that never yields to the timer queue accumulates every board; `letBoardTimersFire()` (used by the framing and depth helpers) fixes that, and `jsxSurfaceHeap.test.tsx` bounds the heap growth.
