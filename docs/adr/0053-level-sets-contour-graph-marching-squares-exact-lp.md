# Level sets and optimization: contour graph plus LP graph, measured contour drawing, integer-grid exactness

Accepted on 2026-11-10 (F0 of the [level-sets spec](../specs/level-sets-optimization-lessons.md), stream `families-prep`). It records the spec's four ADR decisions. §2 and §3 are accepted conditionally: the measurement confirms them before F2a builds on them.

## 1. Two graphs

`ContourMapGraph` serves LS1–LS4. It has modes and one shared function state: function id, level, probe, start, \(H\), and the constraint and its point. `LinearProgramGraph` serves LS5, whose objects are half-planes, not a function.

Alternatives:

- A graph per lesson. LS1–LS4 share the function, contour and probe code.
- Folding LP into the contour graph. This would mix an integer half-plane state with a function state.

## 2. Contours as one polyline-array curve per level

Contours come from marching squares on an \(N\times N\) cell grid. Each level is drawn as one NaN-separated polyline curve, following the precedent of [ADR 0037](0037-direction-field-drawing.md). Until the measurement, \(N=60\). Measure per the [performance plan](../performance-plan.md) for \(N\in\{40,80,120\}\) and 1, 5 and 9 levels, while dragging the level slider and the probe point. Record the frame times and the threshold used here. This evidence alone does not justify replacing JSXGraph.

The kernel's degenerate-value policy:

- a node with \(f=c\) counts as positive, and a segment of zero length is dropped;
- the level is never perturbed;
- saddle cells are resolved by the asymptotic decider in the division-free form \(G\cdot D\ge0\).

Alternatives:

- One JSXGraph element per segment. This means thousands of elements.
- An overlay canvas. This would be a second renderer, not justified before a measurement.

### Measurement results (F2a, 2026-11-11; JSDOM PLACEHOLDER / compute-only)

No route exists yet, so this measures the pure marching-squares cost, the JSXGraph curve update in a jsdom SVG board and the \(N=40\) surface mesh (node v24.20.0, no paint, no browser). These are not frame times. **Browser rendering numbers on a desktop and a phone are owed at F2b**, when the graph has a route; the threshold stays 16 ms per frame ([performance plan](../performance-plan.md)).

Method: `src/levelsets/contourDrawing.perf.test.ts` (opt-in, `BEZEG_PERF=1 just unit src/levelsets/contourDrawing.perf`). The function is `hills` on \([-4,4]^2\), the one catalogue function with several closed and open contours; 60 updates per cell. Level drag: the level moves on the 1/8 grid and all contours (1, 5 or 9, spaced about \(1{,}6/	ext{count}\) apart) are rebuilt by `marchingSquares` and `levelCurve` into one NaN-separated polyline. Probe drag: the level follows \(c=f(p)\), so only the contour through the probe is rebuilt and the others stay cached. The JSXGraph column is `updateDataArray` plus `board.update()` for the one NaN-separated curve of all levels.

| N | levels | level drag, compute (median / p95 ms) | probe drag, compute (median / p95 ms) | JSXGraph update (median / p95 ms) | segments |
| --- | --- | --- | --- | --- | --- |
| 40 | 1 | 0,17 / 4,00 | 0,14 / 1,37 | 0,23 / 2,00 | 655 points, 219 breaks |
| 40 | 5 | 0,46 / 2,15 | 0,08 / 0,34 | 0,90 / 3,80 | 2261 points, 757 breaks |
| 40 | 9 | 0,77 / 1,68 | 0,08 / 1,24 | 1,51 / 3,82 | 4113 points, 1377 breaks |
| 80 | 1 | 0,31 / 1,96 | 0,28 / 1,56 | 0,49 / 3,08 | 1291 points, 431 breaks |
| 80 | 5 | 1,48 / 3,63 | 0,27 / 0,46 | 1,70 / 4,27 | 4505 points, 1505 breaks |
| 80 | 9 | 3,07 / 7,26 | 0,27 / 2,27 | 3,22 / 5,45 | 8193 points, 2737 breaks |
| 120 | 1 | 0,63 / 1,89 | 0,61 / 1,80 | 0,71 / 1,55 | 1939 points, 647 breaks |
| 120 | 5 | 3,18 / 6,84 | 0,60 / 1,26 | 2,66 / 5,46 | 6749 points, 2253 breaks |
| 120 | 9 | 6,97 / 11,34 | 0,59 / 2,22 | 4,92 / 7,96 | 12309 points, 4109 breaks |

Surface (\(N=40\), `hills`, 1681 vertices, 3200 triangles; mesh build from the function, painter's order by centroid depth, `JsxSurfaceView.reconcile` plus `flush` in jsdom with a `function` owner):

| mesh build | painter order | JsxSurfaceView reconcile + flush (jsdom) | sum |
| --- | --- | --- | --- |
| 0,09 / 0,67 | 0,34 / 1,51 | 23,19 / 48,85 | 24,03 / 49,24 |

Reading: compute alone is inside 16 ms at every size, including the worst cell (\(N=120\), 9 levels, level drag, p95 11,3 ms, little margin on a slower machine). The probe drag rebuilds one contour and stays under 3 ms at every \(N\). The jsdom curve update stays under 8 ms p95. The surface mesh build (p95 0,7 ms) and painter's order (p95 1,5 ms) are cheap; the jsdom `JsxSurfaceView` update is the large term (median 23,2 ms, p95 48,9 ms), as the solids measurement of [ADR 0051](0051-solids-mesh-in-surface-view-integer-clipping-and-kgon-revolve.md) also found for jsdom, and it is not representative of a browser. No default of the spec was exceeded by compute, so no decision changes: \(N=60\) stays the default, and §3 is not reversed. The surface is planned to be rebuilt only when the function changes, not when the level or the probe moves, so the surface update is not on the drag path; if the browser measurement at F2b shows the surface update above the budget on a phone, the fallback of §3 (inset or 2D only) applies. If the browser contour update exceeds the budget at \(N=120\), keep \(N=60\) (about half the \(N=80\) cost) and cache the unchanged levels.

Browser measurement (F2b, 2026-11-12): in Chromium at 60 Hz with \(N=60\) ([results](../bezier-performance-results.md#f2b-solids-level-sets-and-phase-portrait-browser-timings--2026-11-12)), desktop meets the criteria (median at most 16,7 ms, p95 at most 33,3 ms; the level slider shows 6 frames of 33 ms and long tasks up to 79 ms). On the 4× throttled phone profile the level slider (p95 67–117 ms) and the probe drag (p95 83–133 ms) miss at 1, 5 and 9 levels; one level is not cheaper. The linear program handle is at the limit (p95 33,3 ms). Not reachable: \(N\) is fixed at 60, so 40, 80 and 120 were not measured. The surface board is updated on level drags (66 updates) and probe drags (56), contrary to the plan above. Of the already listed fallbacks, keeping \(N=60\) and caching unchanged levels, and the surface fallback (inset or 2D only), would apply. No decision changes here; the cause is to be profiled before a fix is chosen.

## 3. The surface in the existing 3D view

The LS1 surface reuses `JsxSurfaceView` through a function-surface `SceneMeshOwner` kind. The mesh has \((N+1)^2\) vertices and \(2N^2\) triangles, which is 1681 and 3200 at \(N=40\). Two things come first: measuring the mesh, and the Controls stream's step 5 changes to the shared 3D view. If the measurement fails, the surface becomes an inset or is omitted, and the 2D contour map carries the lessons.

Alternatives:

- 2D only. This loses the surface-to-map link that LS1 teaches. It is the fallback.
- A new renderer. The owner rule rejects this before a measurement.

## 4. Integer grids make the LS3–LS5 decisions exact

- **LS3:** the step is \(h=H/100\) with integer \(H\in[1,30]\), and starts are on the \(1/4\) grid. For `valley`, convergence is "\(H\le9\) or \(y_0=0\)", an exact integer test. For other functions there is no convergence claim, only the path, capped at 200 steps.
- **LS4:** the constraints are integer lines with the point on a rational grid. Tangency \(\det(\nabla f,\nabla g)=0\) is decided exactly with `Rational`. For circle constraints, tangency uses a named tolerance \(|\sin\angle|<0{,}01\) and is labelled "approximately".
- **LS5:** the integer constraints always include \(x,y\ge0\). Vertices are enumerated in `Rational` by Cramer's rule, with exact feasibility and deduplication. Unboundedness is tested on the candidate ray directions.

Alternatives:

- Continuous parameters with tolerances. Convergence, tangency and the optimum would then depend on \(\varepsilon\).

## Consequences

- Additive apart from one `SceneMeshOwner` union member, which lands with F2a after Controls step 5.
- The pure kernels live in `src/levelsets/` and `src/optimization/`.
- Every F2a graph waits on Controls step 5, including LS5, as the stream boundary requires.
