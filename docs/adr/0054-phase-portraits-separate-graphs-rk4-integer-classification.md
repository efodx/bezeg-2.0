# Phase portraits: separate graphs, measured trajectory drawing, an independent logistic graph, integer grids

Accepted on 2026-11-10 (F0 of the [phase-portraits spec](../specs/phase-portraits-lessons.md), stream `families-prep`). It records the spec's four ADR decisions. §2 is accepted conditionally: the measurement chooses the drawing before F2a.

## 1. Two new graphs

`PhasePortraitGraph` serves PP1–PP3. It reuses the `src/linear` kernel (`Mat2`, `classifyEigen`, `discriminantSign`), but it is not a mode of `LinearMapGraph`, which the #11 amendment is extending. `LogisticMapGraph` serves PP4–PP5.

Alternatives:

- A mode of `LinearMapGraph`. This collides with #11's extension of the same graph and its Presets.
- One graph for all five lessons. This mixes a planar matrix state with a one-parameter map.

## 2. Trajectories drawn as one polyline-array curve, measured

All trajectories are drawn as one NaN-separated polyline curve, as in [ADR 0037](0037-direction-field-drawing.md). Before F2a, measure per the [performance plan](../performance-plan.md) 12, 24 and 48 trajectories of 500 steps in two interactions: dragging a matrix handle, which recomputes everything, and dragging a seed, which recomputes one trajectory. Record the frame times here.

Alternatives:

- A JSXGraph curve per trajectory. This means up to 48 elements, each updated on every drag.
- An overlay canvas. This would be a second renderer, not justified before a measurement.

### Measurement results (F2a, 2026-11-11; JSDOM PLACEHOLDER / compute-only)

No route exists yet, so this measures the pure RK4 cost and the JSXGraph curve update in a jsdom SVG board (node v24.20.0, no paint, no browser). These are not frame times. **Browser rendering numbers on a desktop and a phone are owed at F2b**, when the graph has a route; the threshold stays 16 ms per frame ([performance plan](../performance-plan.md)).

Method: `src/dynamics/phaseDrawing.perf.test.ts` (opt-in, `BEZEG_PERF=1 just unit src/dynamics/phaseDrawing.perf`). Seeds on a ring of radius 1,5, view \([-4,4]^2\), 500 RK4 steps of \(h=0.02\) each, 60 updates per cell. Matrix-handle drag: the damping entry changes, every trajectory is recomputed and the NaN-separated polyline rebuilt. Seed drag: one trajectory recomputed, the polyline rebuilt from cached orbits. The curve update is `updateDataArray` plus `board.update()` for one NaN-separated curve and for one curve per trajectory.

| Trajectories | Matrix drag, compute (median / p95) | Seed drag, compute (median / p95) | JSXGraph update, one curve (median / p95) | JSXGraph update, one curve per trajectory (median / p95) |
| --- | --- | --- | --- | --- |
| 12 | 0,70 / 5,35 ms | 0,11 / 0,44 ms | 11,5 / 16,7 ms | 9,0 / 17,9 ms |
| 24 | 1,63 / 7,09 ms | 0,22 / 1,05 ms | 20,9 / 36,4 ms | 19,8 / 37,1 ms |
| 48 | 3,87 / 13,85 ms | 1,13 / 2,81 ms | 40,3 / 56,1 ms | 39,4 / 51,0 ms |

Reading: compute alone is inside 16 ms at every size, including the p95 at 48 trajectories (13,9 ms, with little margin on a slower machine). The jsdom curve update is larger than compute and grows with the number of points, not with the number of curves: one curve and one curve per trajectory cost the same within noise, so the choice of §2 (one NaN-separated curve) loses nothing and creates one element instead of up to 48. jsdom SVG path work is not representative of a browser; if the browser measurement at F2b exceeds the budget, the options are fewer default trajectories (12 to 24), drawing only moved trajectories, or fewer plotted points per trajectory. No decision to change §2 is taken here.

Logistic graph (same date, same JSDOM PLACEHOLDER limits): `src/graphs/dynamics/LogisticMapGraph.perf.test.tsx` (opt-in, `BEZEG_PERF=1 just unit src/graphs/dynamics/LogisticMapGraph.perf`). The bifurcation diagram is a 400 × 200 raster (not the spec's 800 × 400), drawn as one NaN-separated curve of 9111 points that is built once per page and not redrawn when r changes. Cold build of the raster and polyline: 4,9 ms. Mount of the whole graph with the diagram built: 202 ms. An r change (cursor, map, markers, captions, readouts) in jsdom: median / p95 3,9 / 6,7 ms for the first visit of each R (the 200000-step period detector runs) and 3,1 / 3,5 ms for a visited R (period cached); a step change 2,8 / 3,3 ms (n = 60 each). All of this is inside 16 ms in jsdom; the browser numbers are owed at F2b together with the phase-plane ones.

Browser measurement (F2b, 2026-11-12): in Chromium at 60 Hz ([results](../bezier-performance-results.md#f2b-solids-level-sets-and-phase-portrait-browser-timings--2026-11-12)), desktop meets the criteria (median at most 16,7 ms, p95 at most 33,3 ms) in all cases. On the 4× throttled phone profile the matrix handle drag (all trajectories) and the logistic r slider (first visit and revisit) and step meet them (p95 16,8 ms); the seed drag (p95 33,3–33,4 ms, 10–45 frames over 25 ms) is at the limit. Seeds are capped at 6, so 12, 24 and 48 were not reachable and no seed-count fallback was tested. No already listed fallback is triggered by a miss; no decision changes here.

## 3. Its own `LogisticMapGraph`

`LogisticMapGraph` shares only pure iteration code with #9. If `src/recursion/logistic.ts` exists, this kernel imports its map and leaves it unrestricted. No sibling graph is edited.

Alternatives:

- Extending #9's `RecursionCobwebGraph` to \(r\le4\). This couples two families' release order and Presets.
- Extending `FixedPointGraph`. Its example table is closed, and its route and lessons would change.

## 4. Exactness grids

Matrix entries are snapped to \(1/4\) on \([-4,4]\), as in [ADR 0025](0025-linear-map-graph-and-snapped-matrices.md). The trace–determinant type is then an integer test with no tolerance, checked over all \(33^4\) matrices.

The logistic parameter is \(r=R/100\), with integer \(R\in[250,400]\):

- the fixed point attracts iff \(100<R<300\);
- the 2-cycle attracts iff \(300<R\le344\).

Higher periods are computed with a tolerance of \(10^{-9}\) from \(x_0=0{,}2\) and labelled computed.

Hyperbolicity is decided exactly, and only at the catalogue's listed equilibria, where the Jacobians are integer matrices.

Alternatives:

- Continuous parameters with tolerances. The centre/spiral boundary and the period-2 boundary would then depend on \(\varepsilon\).

## Consequences

- Additive only. `LinearMapGraph`, `FixedPointGraph`, `odeEuler.ts` and their routes and Presets are unchanged.
- The pure kernel lives in `src/dynamics/`, using RK4 with the fixed step \(h=0{,}02\) and reported stops.
- F2a waits on Controls step 5. Batch A also waits on linear-maps Batch B. Batch C waits on recursion RG4, or on this ADR's §3, which already removes that dependency.
