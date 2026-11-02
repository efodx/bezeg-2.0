# Inversion graph: drag measurement (task 08 F2a slice 2)

## Method

jsdom host-test timing of a scripted drag (the last test in `src/graphs/compgeo/InversionGraph.host.test.tsx`, 120 runs each, every overlay on). There is no bench harness. Raw numbers: written to the file named by `INVERSION_DRAG_OUT`. "step" is one full drag move (handle `moveTo`, `drag` handler, state write, scene sync, overlay rebuild, board update); "update" is the plain `board.update`. Same method as `07-drag-measurement.md`; treat figures as relative cost only.

## Object counts (all overlays on, whole board, including axes, grid and tick labels)

| Focus | Objects |
|---|---|
| point | 41 |
| source (circle) | 41 |
| source (line) | 44 |
| power | 53 |
| angle | 65 |

## Drag timings

| Drag | Board objects | step p50 / p95 (ms) | board.update p50 / p95 (ms) |
|---|---|---|---|
| C (point focus) | 41 | 17.5 / 27.4 | 0.64 / 1.02 |
| X | 41 | 17.1 / 26.9 | 0.65 / 1.28 |
| source centre S | 40 | 16.2 / 28.5 | 0.57 / 1.26 |
| theta handle (power focus) | 53 | 25.8 / 42.7 | 0.87 / 1.82 |

## Findings

- Every drag changes the scene state, so the derived view and the shown overlays are rebuilt per step (as in 04b and 07). The step cost is that rebuild; `board.update` stays under 2 ms.
- The angle focus is the heaviest (65 objects); it was not dragged here.
- No optimisation was made. jsdom is not a browser; a real-browser measurement is due when a route exists (F2b).
