# 03 — Rendering and depth

Status: proposed. Source: [criteria 2–3](../../specs/jsxgraph-surface-view.md#acceptance-criteria).

Render every `PolylineRole`, `MarkerRole`, plane, mesh, mesh owner and selection state, with colours, dashes and weights taken from the 2D graph visual tokens; this is the consistency the change exists for. Implement painter's ordering of triangles, planes, split line segments, markers and points, reusing elements across frames. A camera-only reconcile reprojects and reorders without rebuilding. Mesh owner evidence (`meshOwners`) stays inspectable for the preview validator. Check depth automatically and by screenshot at four presets on tensor, triangular, joins and teapot, and check vertex coordinates against the scene.

From the gate (option A, [ADR 0019](../../adr/0019-jsxgraph-surface-view.md)): draw camera-only changes synchronously instead of deferring to the next animation frame, and orbit the teapot at reduced detail with a full-detail redraw once the camera settles. Fix the joins top-preset failure where the surface cuts the right patch's `net-2`. Re-run the app-route harness (`measure-app.mjs`, visible-update proxy included) and record the orbit latency and teapot frame rate against the gate numbers.
