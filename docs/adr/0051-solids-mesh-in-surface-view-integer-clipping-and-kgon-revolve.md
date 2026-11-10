# Solids: meshes in the surface view, integer plane clipping, 48-gon revolve

Accepted on 2026-11-10 (F0 of the [solids spec](../specs/solids-volumes-lessons.md), stream `families-prep`). It records the spec's three ADR decisions. §1 is accepted conditionally: the Batch 0 measurement confirms it before F2a builds on it.

## 1. Solids drawn as opaque meshes in the existing surface view

A solid is an opaque `SceneMesh`, flat shaded per face, in the existing JSXGraph surface view (`src/graphs/patches/surface-view/`). A cut keeps one side of the plane and adds the cap polygon. The existing translucent `ScenePlane` shows the plane itself. Keeping only one side avoids interpenetrating triangles, which the painter's order (`orderBackToFront`, whole triangles) cannot draw correctly. The view never shows two solids that cross, and the SV3 slabs are disjoint.

The one edit to existing code is the `SceneMeshOwner` kind `solid` in `surfaceScene.ts`, which the spec assigns to this family. It lands with F2a.

Before F2a, the [performance plan](../performance-plan.md) measurement must show acceptable frame times on desktop and a phone for three cases: dragging the plane offset on a cube, a 48-segment revolve (about 770 triangles), and a 200-triangle slab stack. If it fails, the slab stack is merged into one mesh, or this decision is reopened.

Alternatives:

- A new canvas or WebGL renderer. The owner rule rejects this before a measurement.
- Wireframe polylines only. These are cheap but give no hidden-part cue, which section lessons rely on.

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
