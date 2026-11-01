# Inscribed angle graph: drag measurement (task 04b)

## Method

jsdom host-test timing of a scripted drag (`measureDrag` in `src/graphs/compgeo/InscribedAngleGraph.host.test.tsx`, 120 runs each). There is no bench harness. Raw numbers: written to the file named by `INSCRIBED_DRAG_OUT`.

Setup: default example, every overlay on (grid, radii, angle marks). The glider run moves P around a circle of radius 4 about O in 3 degree steps and fires the point's `drag` handler; the vertex run drags C over a path of snapped targets. "step" is one full drag move (state write, scene sync, overlay rebuild, board update). "update" is the plain `board.update`.

## Numbers

| Drag | Board objects | step p50 / p95 (ms) | board.update p50 / p95 (ms) |
|---|---|---|---|
| P (glider) | 64 | 160 / 215 | 11.8 / 16.4 |
| Vertex C | 64 | 162 / 252 | 11.6 / 18.1 |

The notable-points graph measured 89 objects and 67 ms step p50 in 04a; these figures are not comparable with that run (another day, the grid overlay is on here, and the circle, chord and centre are function-valued). The step time is higher than 04a's. Cause (engineering review, 2026-11-01): `overlayInputs()` returns the analysis, which is a new object on every `t` change, so `PointSetGraph.redrawOverlays` removes and redraws every shown overlay on each P step: the grid and the radii, which do not depend on `t`, and all of the angle marks, of which only the P parts change. P, the circle, the chord, O and the chip are function-valued and are not rebuilt. No optimization was made; task 05's real-browser measurement decides whether a P step should redraw only the P-dependent overlay.

## Findings

- 64 objects with every overlay on exceed the spec's "fewer than 50" expectation. The cause is the helper points JSXGraph adds for circles, segments and curves built from coordinates or functions, plus `PointSetGraph` rebuilding all overlays on every change (the Geometry stream owns that). The graph owns these helpers explicitly (`createScene` records every object a build added) so a rebuild leaks none: the host test cycles degenerate and valid vertices three times and the object count is unchanged.
- A glider drag changes `state.t`, which changes the memoised analysis object and therefore redraws the angle and radius overlays on every step. P itself, the circle, the chord and O are not rebuilt: their coordinates are functions, and P is moved by `moveTo`.
- No optimization was made. jsdom is not a browser; the numbers show relative cost only. A real-browser drag measurement is due at task 05, when a route exists.
