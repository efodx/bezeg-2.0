# Task 07 slice 1: fit core (src/workspace/view)

Files: hull.ts, viewFit.ts, fitIntent.ts, layoutRects.ts, viewMarks.ts, viewPort.ts (+ tests, 31 pass; eslint 0; tsc clean).

Contract gaps: ViewMarks has no `reach` tier, no zoom limits, no equalAxisUnits (the graph or director supplies them); no curve/region kinds (polyline covers sampled ones).
Differences from prototype: fitIntent takes `free` (layout rect) instead of obstacles, drops largestFreeRect (layout owns it), insets margin only on card-bordering sides; fitView fill takes optional `free` and centres there; viewPort.ts is the interface only (no Board, container, registry, autofit, localStorage); timing test bound 10 -> 30 ms (flaked at 10.1 under load).
