# Linear map grid drawing benchmark

Standalone diagnostic page for [linear maps task 04](../../docs/tasks/linear-maps/04-grid-drawing-measurement.md). It adds no app route and changes nothing under `src/`; it imports `gridImage` and the `Mat2` helpers from `src/linear/` read-only.

The page draws one JSXGraph board: JSXGraph's source grid and axes, the 26 image grid lines from `gridImage(m, 6, 1)`, the unit square image, two draggable handles (images of e1 and e2, which define the matrix), a 4-point Bezier fixture with its image, and optionally a 101-point ellipse (image of the unit circle). Query parameters: `?variant=lines|poly&ellipse=0|1`.

- `lines`: 26 per-line JSXGraph `segment` elements with function coordinates.
- `poly`: one `curve` whose `dataX`/`dataY` hold all 26 segments separated by NaN breaks (78 entries).

`gridImage` is evaluated once per board update in both variants, however many elements read it.

## Run

```powershell
node scripts/linear-map-benchmark/build.cjs
node scripts/linear-map-benchmark/run.cjs 5 results.json   # or: just linear-map-bench
```

`run.cjs` starts its own static server on port 4316 (`serve.cjs`, also usable alone), launches Playwright Chromium, and for each of the four configurations does `repeats` fresh-page drags plus the singular-matrix checks. It uses no test slot: it is one headless browser, a few minutes in total, and does not run the app build or Playwright test runner. Close other heavy runs first and keep the machine idle.

## Method

- The drag uses real mouse events: press on e1, then 60 warm-up and 240 recorded moves around a fixed 70 px-radius circle. After each move the driver waits one `requestAnimationFrame`, so each move is a separate frame.
- `update` times wrap `board.update` (synchronous model plus SVG renderer work for each drag move). **Browser paint/compositing and input-to-photon latency are not included.**
- `frame` is the interval between `requestAnimationFrame` callbacks during the recording. Headless Chromium on this setup is vsync-quantized (about 16.7 ms), so frame median/p95 saturate at the refresh interval and only show dropped frames; the update time is the discriminating figure.
- Update counts are `board.update` calls while recording (expected 240 = one per move); `gridCalls` counts `gridImage` evaluations (expected 240 + warm-up/spare).
- Not covered: touch events, a real classroom device, MathJax or app chrome, React.

## Singular and far-out matrices

`gridImage` returns segment endpoints `from`/`to` for the window [-6, 6]; it never clips and never divides. Both variants draw those finite segments (not infinite lines), so a far-out image is a long finite segment that the SVG viewport clips. For each configuration `run.cjs` places the handles at: e2 on e1, e2 = 2*e1, the zero matrix, e1 = 0, e1 of magnitude 1e6 and 1e12, and finally drags e2 onto e1 with the mouse. After each case it counts non-finite values in the handles, the `gridImage` endpoints, curve data arrays (NaN is allowed only as the intended `poly` separator, counted separately) and every path/line attribute in the board SVG (searched for `NaN`, `Infinity`, `null`, `undefined`).

## Type check

`npx tsc --noEmit --pretty false -p scripts/linear-map-benchmark/tsconfig.json`
