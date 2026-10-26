# Utah teapot fixture extraction and checks

Research date: 2026-10-26. This fixture supports the task 02 renderer prototype; it is not a production dependency or a renderer-feasibility result.

## Provenance

The data literals are copied from three.js `examples/jsm/geometries/TeapotGeometry.js` at commit `0af9729d0c143a86a1d725d6e2c3ad83301f3f34` (release r180). The source header attributes the dataset to Martin Newell's Utah teapot database and says the implementation is based on SPD software. The MIT notice, including the three.js authors' 2010–2025 copyright, is retained in [`teapot-data.js`](../../prototypes/bezier-patches/teapot-data.js).

Fetched source and license are saved in `.command-logs/patches-teapot/` for reproducibility. SHA-256:

| File | SHA-256 |
| --- | --- |
| `TeapotGeometry.js` | `31ce94a5efe7ff4dbda886b258bcab5a16e2d0e329c9f041eddf3007d2783401` |
| `LICENSE` | `bfe119ea4fd413f5f7ca3fcd63adb0c4a073ed39daa2fe7d3e6b769e21272601` |

## Fixture contract

`BezierTeapotData` is installed on the browser global and also exports through CommonJS for Node verification. It contains 512 patch indices and 870 coordinate scalars (290 points). `resolvePatch(patchIndex)` returns 16 control points in source row-major order, each as raw `(x,y,z)` with z up. The defaults are `fitLid: false`, `blinn: true`, and `displaySpace: false`; the raw controls therefore remain unchanged. `fitLid` expands x/y by 1.077 only for patches 20–27. `blinn: false` multiplies z by 1.3. `displaySpace: true` then applies the source's centered, y-up transform, using the requested `size` (default 2).

For evaluation, `(u,v)` addresses the source grid as row then column. Thus `(0,0)`, `(1,0)`, `(0,1)`, `(1,1)` interpolate `P[0][0]`, `P[3][0]`, `P[0][3]`, and `P[3][3]`. This convention follows from the upstream evaluator's `g[c*4+r]` Matrix4 fill: its power-basis result is `B(u)^T P B(v)` despite the internal transpose.

## Verification

Run `node docs/prototypes/bezier-patches/verify-teapot.mjs`. The check confirms 32 distinct patches, finite point data, index range 0–289, coordinate extents x `[-3, 3.525]`, y `[-2, 2]`, z `[0, 3.15]`, point resolution, and explicit transform behavior. For every patch it compares an independent reproduction of the upstream cubic power-basis matrix evaluator with a Bernstein sum at all four corners and at three interior parameter pairs. It also deliberately removes the source control-grid transpose and asserts that the same corner/orientation checks reject the mutation.

Result: passed. The source table includes the expected collapsed lid and bottom boundary rows; patches are retained as bicubic patches for the renderer to handle.

## Source correction

The earlier [data research note](teapot-data.md) says vertex 289 is `(2.8, 0.15, 2.4)`. The pinned source's final literal, index 289, is `(1.5, -0.84, 0.075)`; the fixture verifier checks the source value. Treat the research note's final-vertex example as a typo.
