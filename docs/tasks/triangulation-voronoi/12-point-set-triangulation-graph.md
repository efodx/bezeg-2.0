# 12 — Point-set triangulation graph (T2, F2a)

Status: open (task file written 2026-11-02, geometry handler 25). Source: spec [B2](../../specs/triangulation-voronoi-lessons.md#b2-triangulating-a-set-of-points) (example, capabilities, acceptance 1, 3–7), common criteria C1–C6 ([concept contracts](../../specs/triangulation-voronoi-lessons.md#concept-contracts-and-acceptance-criteria)), [implementation decisions](../../specs/triangulation-voronoi-lessons.md#implementation-decisions) (Preset contents and validation). Kind: F2a (no route, no registration), engineering plus UI/accessibility review. Depends on 11 (`insertPoint`, `boundaryCount`) and the point-set graph (convexity 05). Template: `EarClippingGraph` (07) for structure and tests.

`TriangulationGraph extends PointSetGraph` in `src/graphs/compgeo/`, points mode only. Its scene is the points plus a current triangulation (a triangle index list). 13 extends it for B3, so keep the drawing of triangles and edges, the edge selection and the readouts in overridable pieces.

## Decisions (handler 25, 2026-11-02)

- **Edits and the stored triangulation.** Adding a point uses `insertPoint` on the current triangulation (the panel names the case: inside a triangle, on an edge, outside). Moving a point keeps the triangulation when `createTriangulation(newPoints, triangles)` still accepts it; otherwise the triangulation is rebuilt by `incrementalTriangulation` and the panel says "rebuilt from the starting rule". Removing a point always rebuilds. The points themselves are never moved or refused for this reason (C6 refers to points breaking a precondition: duplicates and an all-collinear or under-three set are refused with the point-set graph's messages and no triangulation). Alternative: refuse every move that invalidates a triangle; rejected because it would block most drags.
- **Flip** acts on a selected interior edge: click the edge on the board, or choose it from a keyboard-reachable edge list (C5). A refused flip (`hull-edge`, `not-convex`) shows the localized reason, for `not-convex` "the two triangles do not form a convex quadrilateral", and changes nothing (acceptance 3).
- **Angle comparison.** The readout shows the smallest angle of the current triangulation and of the one before the last flip (acceptance 6), two decimals from `angleVector`; display only.

## Acceptance

1. **Board:** points, triangle edges (hull edges distinct from interior edges without relying on colour, e.g. weight or dash), the selected edge highlighted, and its quadrilateral shaded.
2. **Readouts:** \(n\), \(k\) with the collinear count and note when non-zero, triangles and edges (interior and hull) with the formulas \(2n-2-k\) and \(3n-3-k\) evaluated, smallest angle now and before the last flip; a live region announces flip results and insertion cases.
3. **Overlays** (base overlay switch; the names join `POINT_SET_OVERLAY_NAMES`, only this graph and 13 own them): `edges` labels (edge index list), `angles` min-angle marker. Reuse an existing name where its meaning matches.
4. **Presets:** collection with the B2 example in T0 (the spec's triangle list), the same points in their Delaunay triangulation (B3 example 2's list) and the nine hull-lesson points (\(k=6\)). Stored data: points in grid units plus the triangle list; import validates counts, integer range, mode and that the triangle list is a valid counter-clockwise triangulation of the stored points (`createTriangulation`), with an actionable localized error otherwise.
5. **Localization:** one key block after the ear-clipping keys at the same position in `sl.ts` and `en.ts`; terms from the spec's table (*triangulacija množice točk*, *zamenjava roba*).
6. **Tests** (host tests in the style of `EarClippingGraph.host.test.tsx`): T0 readout 7 triangles, 13 edges, 8 interior; a legal flip keeps the counts and changes the minimum angle in the readout; a flip of a non-convex quadrilateral and of a hull edge each show their reason and leave the triangle list unchanged; an added point inside a triangle gives \(+2\) and outside the hull matches the formula; the nine-point preset shows \(k=6\) with one collinear; a move that keeps validity keeps the triangle list, one that breaks it rebuilds with the note; edge selection and flip by keyboard alone; Preset round trip and each import refusal (including an invalid stored triangulation); Reset; a live language switch re-renders panel and board text; disposal leaves no board objects or listeners. Observe each new assertion fail against a deliberate mutation.

Not in scope: route, registration, lessons; the Lawson trace (13).

Performance: at most 40 points and \(2\cdot40-2-3=75\) triangles; redraw on drag as the ear-clipping graph does. Measure a drag at 40 points before choosing another approach ([performance plan](../../performance-plan.md)).

Checks: `just unit src/graphs/compgeo --maxWorkers=2`, `just lint` on touched files, `npx tsc --noEmit --pretty false`, `just build`.
