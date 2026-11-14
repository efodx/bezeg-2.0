# Held rows (2026-11-07, handler 4)

Handler 8 restored `interp-runge` and `rational-function` (named off-camera points), then `interp-hermite`, `bspline-extraction`, `epicycles` and `fourier-coefficients` (a field or slider instead of the blocked control, see the spec); handler 9 restored `geometric-series` (segments in the response signature, a new quote) and captured `inversion` and `point-in-polygon` (discrete `number-field` rows on the inversion radius and on q's y), `bspline-nurbs` (a sweep of weight 3), `bspline-insertion` (`button-count`) and `bezier-clipping` (`trace-step`); their table rows are gone, and their row text below is history.

Rows a worker wrote that failed their capture. Each is kept here verbatim so a later batch can fix and restore it to its family file. Reasons come from the capture failure message.

| id | Capture failure | Likely fix |
| --- | --- | --- |
| bspline-nurbs | `the scene starts at 0.063, but the row path starts at 0.0625`: the slider rounds the poster's 1/16 | Compare the full-precision slider value, or move the recipe's t to a 0.001 multiple Handler 8: the loop check compares the first and last frames, and the slider can only return 0.063, so a path starting at 0.063 fails the loop instead. Waits for a finer slider step (spec decision, handler 8) |
| root-finding | loop does not close: changing x0 resets the step to 0 (`src/analysis/rootFindingModel.ts:116`), and the poster is at step 1 | Captured by handler 10 as a `trace-step` row (Naslednji korak from the poster); the x0 sweep stays held |
| linear-map | capture (handler 6): the colour check now finds a still patch (a fixed point marker, radius 5), but no CRF up to 34 fits 300 KiB: the mapped grid moves over the whole board in every frame. At CRF 34 the RGB encode is 446 KiB for the path 2 → 4 → −1,5 → 2 and still over budget for 2 → 4 → 0 → 2; a shorter path falls below the 16 grid values a coarse sweep needs | Captured by handler 10 at CRF 46 (257 559 B) after the row ladder was widened |
| projective-pascal | preflight (handler 5): state check, 0.149 from the schedule on a drag of B along the ellipse | The drag snaps to a table of line directions; the steppers need a selected point and show no value. Needs a driver path that follows the snapped table, or a held decision. Handler 8: the drag fails the pointer-under-point check between table entries; `PascalGraph` is not a `PointSetGraph`; a discrete row fails for lack of a value input (`_driver.cjs:179`). Needs a table-index readout in `PascalControls.tsx` (Controls stream), then a discrete row on "Točka D: naslednji položaj" |
| ear-clipping | preflight (handler 6): the poster already shows step 12 of 12, and the trace has no back button, so there is no forward step to show | Poster only (spec decision, handler 7); row text in `.command-logs/rows-pending/compgeo-traces-held.cjs` |

Not written: `bspline-insertion` (only the Vstavi vozel button changes the picture), `inversion` (integer controls only; handler 8: C's drag moves the r handle, and S and r round to integers at `InversionGraph.tsx:474`, outside the fine-grid hook), `voronoi` and `voronoi-degenerate` (no step trace; their lessons ask to drag the query point, so they need ordinary drag rows), `hull-robustness` (no motion prompt; handler 10 wrote it as a `trace-step` row), `point-in-polygon` (the q field snaps to whole numbers, and the graph binds its own drags).

## Row text

`interp-hermite`:

```js
    {
        id: 'interp-hermite',
        motion: 'pointer-drag',
        control: {kind: 'point', name: 'P1'},
        // Board coordinates. The poster scene is the Catmull-Rom mode with the default points; P1 (1,2) goes up 1.5 and back, so the tangent arrows at P0, P1 and P2 turn with it.
        path: [[1, 2], [1, 3.5], [1, 2]],
        lessonQuote: 'Povleci \\(P_1\\) in opazuj, kako se obe sosednji tangenti prilagodita.',
        discreteReason: null,
    },
```

`interp-runge`:

```js
    {
        id: 'interp-runge',
        motion: 'discrete-exact-steps',
        control: {kind: 'stepper', label: 'Povečaj stopnjo n za 1', step: 1},
        // Cumulative presses from the poster degree n=10 (the graph default): up to n=16 and back.
        path: [0, 2, 4, 6, 4, 2, 0],
        lessonQuote: 'Višaj stopnjo za nekaj korakov in opazuj, kako se spreminja polinom ob krajiščih.',
        discreteReason: 'The degree n is an integer changed only by the Povečaj and Zmanjšaj buttons; the page has no slider or draggable node, so no smooth control exists.',
    },
```

`rational-function`:

```js
    {
        id: 'rational-function',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'Števec: Ničla 2: položaj x', step: 0.1},
        // The poster scene is (x^2-1)/(x-2) with numerator zeros -1 and 1. Numerator zero 2 (at 1) goes past the pole 2 to 4 and back, so the hole appears at the pole and disappears; it never meets zero 1 (-1), so nothing merges.
        path: [1, 4, 1],
        lessonQuote: 'Povleci ničle števca in imenovalca, jih vpiši kot števila in vsakič preveri: ničla okrajšanega števca je ničla funkcije, ničla okrajšanega imenovalca je pol, skupna ničla je luknja, stopnji pa določita asimptoto.',
        discreteReason: null,
    },
```

`geometric-series`:

```js
    {
        id: 'geometric-series',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Količnik q', step: 0.05},
        // The poster scene is a=1, q=0.5, one term. q goes to -0.8 and back, so the limit line a/(1-q) moves from 2 to 0.56 and back inside the camera. The lesson never says to move q; the quote is the step that uses negative q.
        path: [0.5, -0.8, 0.5],
        lessonQuote: 'Poišči, katere delne vsote so nad limito in katere pod njo.',
        discreteReason: null,
    },
```

`conic-focal`:

```js
    {
        id: 'conic-focal',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Numerična ekscentričnost ε', step: 0.05},
        // The poster scene is the ellipse with eps=0.8, l=1.8. eps goes across 1 to 1.6 (hyperbola) and back, then down to 0.2 and back.
        path: [0.8, 1.6, 0.8, 0.2, 0.8],
        lessonQuote: 'Z drsnikom pelji \\(\\varepsilon\\) čez \\(1\\) in opazuj, kaj se zgodi z drugim goriščem in z vejami krivulje.',
        discreteReason: null,
    },
```

`bspline-extraction`:

```js
    {
        id: 'bspline-extraction',
        motion: 'pointer-drag',
        control: {kind: 'point', name: '$$p_{2}$$'},
        // Board coordinates. The recipe scene is the default quadratic curve, whose p2 is (3, 2) (route-probe draggablePoints). The lesson's own move is P2 on a cubic and upward; here p2 moves down 1 unit because the camera stops at y = 2.55.
        path: [[3, 2], [3, 1.5], [3, 1], [3, 1.5], [3, 2]],
        lessonQuote: 'Točko \\(P_2=(2;3)\\) premaknemo v \\((2;4)\\).',
        discreteReason: null,
    },
```

`bspline-nurbs`:

```js
    {
        id: 'bspline-nurbs',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Parameter t', step: 0.001},
        // Start t = 1/16 (NURBS_DEFAULT_T in BSplineNurbsGraph.tsx:37); the slider shows it as 0.063 (step 0.001), so the capture's start check may report 0.063.
        path: [0.0625, 0.2, 0.35, 0.2, 0.0625],
        lessonQuote: 'Preberi točko in kot v inšpektorju pri \\(t=\\tfrac1{16}\\).',
        discreteReason: null,
    },
```

`root-finding`:

```js
    {
        id: 'root-finding',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'Začetni približek x₀', step: 0.01},
        // Start x0 = 1 (route-probe draggablePoints; the recipe only presses "Naslednji korak" once). The drag of x0 snaps to 0.05 (RootFindingGraph.tsx:31), so the number field follows a smooth schedule; x0 = 0 is avoided (horizontal tangent).
        path: [1, 2, 3, 2, 1],
        lessonQuote: 'Povleci \\(x_0\\) in opazuj.',
        discreteReason: null,
    },
```

`epicycles`:

```js
    {
        id: 'epicycles',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'Krajišče 1, x', step: 0.01},
        // Start vertex 1 = (1, 0): the rhombus example shares the circle's four vertices (route-probe; the recipe adds N = 4 steps only). Drags snap to a grid (EpicycleGraph.tsx:376), so the vertex's number field is swept; the camera is +-3.2, so 1 -> 2.3 stays in view.
        path: [1, 1.65, 2.3, 1.65, 1],
        lessonQuote: 'Povleci točko in poglej, kateri krogi se spremenijo ter kdaj napaka postane vidna.',
        discreteReason: null,
    },
```

`linear-map`:

```js
    {
        id: 'linear-map',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'a₁: x', step: 0.25},
        // The recipe selects example A ("basis-default"): the column handles start at a1 = (2, 1) and a2 = (-1, 1) (recipe check). Entries are multiples of 1/4 between -4 and 4; with a1 = (x, 1) the determinant is x + 1 and the handle stays inside the recipe camera (x from -1.6) for x from -1.5 to 4. A pointer drag on the handle fails the state check (it snaps to the 1/4 grid).
        path: [2, 4, -1.5, 2],
        lessonQuote: 'Povleci \\(a_1\\) drugam in preberi nov \\(A(1,1)\\).',
        discreteReason: null,
    },
```

`projective-pascal`:

```js
    {
        id: 'projective-pascal',
        motion: 'pointer-drag',
        control: {kind: 'point', name: 'B'},
        // The poster keeps the default ellipse x^2/25 + y^2/9 = 1 with B = (3, 2.4). A drag snaps B to the nearest direction from the base point (-5, 0), so the waypoints follow the ellipse: the point with chord slope m from (-5, 0) has x = (45 - 125 m^2)/(9 + 25 m^2), for m from 0.30 to 0.55.
        path: [[3, 2.4], [2.4611, 2.6114], [1.9231, 2.7692], [1.4, 2.88], [0.9016, 2.9508], [0.434, 2.9887], [0.9016, 2.9508], [1.4, 2.88], [1.9231, 2.7692], [2.4611, 2.6114], [3, 2.4]],
        lessonQuote: 'Premakni točko po stožnici in preveri, ali ostanejo kolinearna',
        discreteReason: null,
    },
```
