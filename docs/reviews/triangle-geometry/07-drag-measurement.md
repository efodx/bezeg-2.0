# Simson line graph: drag measurement (task 07 F2a)

## Method

jsdom host-test timing of a scripted drag (the last test in `src/graphs/compgeo/SimsonLineGraph.host.test.tsx`, 120 runs each). There is no bench harness. Raw numbers: written to the file named by `SIMSON_DRAG_OUT`.

Setup: default triangle, every overlay on. The glider run moves P around the circumcircle and fires the point's `drag` handler; the exact run drags P' over snapped grid targets; the vertex run drags C over a path of snapped targets. "step" is one full drag move (state write, scene sync, overlay rebuild, board update). "update" is the plain `board.update`.

## Numbers

| Drag | Board objects | step p50 / p95 (ms) | board.update p50 / p95 (ms) |
|---|---|---|---|
| P (glider) | 75 | 36.0 / 52.7 | 0.72 / 1.36 |
| P' (exact) | 79 | 37.9 / 50.7 | 0.74 / 1.52 |
| Vertex C | 75 | 30.8 / 55.3 | 0.69 / 1.92 |

The inscribed-angle run (04b: 64 objects, 160 ms step p50) is not comparable: another day, another machine load and another overlay set. Treat all figures as relative cost only.

## Findings

- 75 to 79 objects with every overlay on, above the spec's "fewer than 50" expectation. As in 04b, JSXGraph adds helper points for circles, segments and curves built from coordinates or functions, and `PointSetGraph` rebuilds overlays on every change. The graph records every object a build added, so a rebuild or mode switch leaks none (host test: object count unchanged across a mode switch and degenerate round trips).
- A glider drag changes `state.t`, which gives a new analysis object, so the shown overlays are redrawn on every step, as in 04b. The step time is dominated by that rebuild; `board.update` itself is under 2 ms.
- No optimisation was made. jsdom is not a browser; a real-browser measurement is due when a route exists (task 05).
