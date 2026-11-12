# Solids: meshes in the surface view, integer plane clipping, 48-gon revolve

Accepted on 2026-11-10 (F0 of the [solids spec](../specs/solids-volumes-lessons.md), stream `families-prep`). It records the spec's three ADR decisions. §1 is accepted conditionally: the Batch 0 measurement confirms it before F2a builds on it.

## 1. Solids drawn as opaque meshes in the existing surface view

A solid is an opaque `SceneMesh`, flat shaded per face, in the existing JSXGraph surface view (`src/graphs/patches/surface-view/`). A cut keeps one side of the plane and adds the cap polygon. The existing translucent `ScenePlane` shows the plane itself. Keeping only one side avoids interpenetrating triangles, which the painter's order (`orderBackToFront`, whole triangles) cannot draw correctly. The view never shows two solids that cross, and the SV3 slabs are disjoint.

The one edit to existing code is the `SceneMeshOwner` kind `solid` in `surfaceScene.ts`, which the spec assigns to this family. It lands with F2a.

Before F2a, the [performance plan](../performance-plan.md) measurement must show acceptable frame times on desktop and a phone for three cases: dragging the plane offset on a cube, a 48-segment revolve (about 770 triangles), and a 200-triangle slab stack. If it fails, the slab stack is merged into one mesh, or this decision is reopened.

Alternatives:

- A new canvas or WebGL renderer. The owner rule rejects this before a measurement.
- Wireframe polylines only. These are cheap but give no hidden-part cue, which section lessons rely on.

### Measurement results (F2a, 2026-11-11; JSDOM PLACEHOLDER / compute-only)

No route exists yet, so this measures the pure kernel and mesh cost plus a `JsxSurfaceView.reconcile` and `flush` in a jsdom SVG board (node v24.20.0, no paint, no browser). These are not frame times. **Browser frame times on a desktop and a phone are owed at F2b**, when the graph has a route; the budget stays 16 ms per frame ([performance plan](../performance-plan.md)). This section confirms the compute side of the conditional acceptance; it does not close the phone condition.

Method: `src/solids/solidsDrawing.perf.test.ts` (opt-in, `BEZEG_PERF=1 just unit src/solids/solidsDrawing.perf`), 60 updates per case after 5 warm-ups. Cube: `clipSolid` below the plane \(x+y+z=d/4\) with \(d\) cycling through 1 to 12 (12 triangles including the cap). Revolve: the 9-point profile revolved about the \(x\)-axis with \(k=48\), one profile radius changing per update (766 triangles). Slab stack: 17 disjoint slabs of 12 triangles (204 triangles) rebuilt for a changing shear. Per update: build (clip, revolve or stack), mesh build (`toTriangles` and the scene), painter's order (centroid depths and `orderBackToFront`), and the jsdom surface-view update, all with one translucent `ScenePlane`.

| Case | Triangles | Build (median / p95) | Mesh build (median / p95) | Painter order (median / p95) | View update, jsdom (median / p95) | Sum (median / p95) |
| --- | --- | --- | --- | --- | --- | --- |
| Cube, plane-offset drag | 12 | 0,06 / 0,10 ms | 0,02 / 0,04 ms | 0,01 / 0,03 ms | 4,0 / 9,6 ms | 4,2 / 9,8 ms |
| 48-segment revolve | 766 | 0,10 / 0,13 ms | 0,18 / 0,23 ms | 0,07 / 0,11 ms | 5,8 / 7,1 ms | 6,1 / 7,6 ms |
| 17-slab stack | 204 | 0,10 / 0,14 ms | 0,07 / 0,10 ms | 0,02 / 0,02 ms | 3,4 / 5,5 ms | 3,6 / 6,9 ms |

Reading: kernel compute, mesh build and painter's order together stay under 0,5 ms at p95 in every case; the jsdom view update dominates and keeps every sum under 10 ms at p95 (one 32 ms outlier at the revolve's maximum, a single spike, not diagnosed). The slab stack needs no merging at this size. jsdom SVG work is not representative of a browser, and the phone is unmeasured, so §1 stays conditional on F2b. If the browser measurement exceeds the budget, the options are merging the slab stack into one mesh, fewer revolve segments, or reopening this decision. No decision to change §1 is taken here.

Browser measurement (F2b, 2026-11-12): in Chromium at 60 Hz ([results](../bezier-performance-results.md#f2b-solids-level-sets-and-phase-portrait-browser-timings--2026-11-12)), the cube plane offset slider and the revolve discs slider (48 segments) meet the criteria (median at most 16,7 ms, p95 at most 33,3 ms) on desktop except revolve p95 up to 33,3 ms, and miss on the 4× throttled phone profile: cube offset has 2–3 long tasks of 842–966 ms per sweep, revolve discs p95 217–233 ms. The slab stack at 17 and 60 slabs is at the limit on the phone (p95 33,3–33,4 ms, the same for both, so slab count is not the driver). The listed fallbacks (merging the slab stack, fewer revolve segments, reopening this decision) would apply to the revolve miss; none addresses the cube, whose mesh is 12 triangles, and the cube hitch (also 74–110 ms long tasks on desktop, mid-sweep) is unexplained and owed for profiling. No decision changes here.

## 2. Integer plane clipping

Solid vertices lie on an integer grid in units of \(1/4\), with coordinates \(-12\ldots12\). The plane is \(n\cdot x=d\), with integer \(n\) (components \(-4\ldots4\)) and integer \(d\) in the same units. Each vertex gets the exact integer sign of \(n\cdot v-d\). An edge is cut only when its endpoint signs are strictly opposite. Vertices with sign 0 are kept once, by index and never by coordinate comparison. All discrete outcomes are exact integer tests: which edges are cut, the vertex count, a plane through a vertex, and a coplanar face. Only the cut-point coordinates are doubles, labelled computed. The section loop is built by chaining the cut segments of the faces through shared edges, never by sorting angles. Sections are offered for convex solids only.

Alternatives:

- Doubles with an epsilon. The side count would depend on the tolerance.
- Exact `BigInt` rationals for the coordinates too. This costs more and gains nothing, because the coordinates only display.

## 3. Revolve as an inscribed 48-gon mesh

A revolved profile becomes an inscribed \(k\)-gon mesh with \(k=48\). Every volume shown for it is labelled "mesh" and placed next to the exact formula. The \(k\)-gon factor \(\tfrac{k}{2\pi}\sin\tfrac{2\pi}{k}=0{,}99715\) is checked in tests, not shown in lessons.

Alternatives:

- A higher \(k\) hidden from the learner. This costs frame time and still is not exact.
- Analytic smooth surfaces. The surface view draws triangle meshes only.

## Consequences

- Additive apart from one union member. New routes and Presets.
- The pure kernel lives in `src/solids/`. The `riemann.ts` midpoint rule is reused for disc sums.
- F2a waits on Controls step 5 and on the measurement above.
