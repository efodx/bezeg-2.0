# Notable points graph: drag measurement (task 04a)

## Method

jsdom host-test timing of a drag on the notable points graph (`measureDrag` in `src/graphs/compgeo/NotablePointsGraph.host.test.tsx`, 120 runs). There is no bench harness. Raw numbers: `.command-logs/04a-drag-timing.json`.

"step" is one full drag move (state write, scene sync, overlay rebuild, board update). "update" is the plain `board.update`.

## Numbers

| Setup | Board objects | step p50 / p95 (ms) | board.update p50 / p95 (ms) |
|---|---|---|---|
| All overlays on | 89 | 66.8 / 85.0 | 1.85 / 3.96 |
| All overlays off | 31 | 9.0 / 15.3 | 0.30 / 0.56 |

## Findings

- 89 objects exceed the spec's "fewer than 50" expectation (Implementation Decisions in the task). The cause is the helper points JSXGraph adds for lines and circles built from coordinate arrays, plus PointSetGraph's design of rebuilding all overlays on every change, which the Geometry stream owns.
- No optimization was made.
- jsdom is not a browser. The numbers show relative cost only. A real-browser drag measurement is due at task 05, when a route exists.

## For task 05 and the lessons

- The default view hides the orthocentre H = (1, 6) of the obtuse example. The view was not changed. The chip and the inspector say "outside the view", and "Show all" brings H into view.
