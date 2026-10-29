# 03 — Rendering and depth

Status: proposed. Source: [criteria 2–3](../../specs/jsxgraph-surface-view.md#acceptance-criteria).

Render every `PolylineRole`, `MarkerRole`, plane, mesh, mesh owner and selection state, with colours, dashes and weights taken from the 2D graph visual tokens; this is the consistency the change exists for. Implement painter's ordering of triangles, planes, split line segments, markers and points, reusing elements across frames. A camera-only reconcile reprojects and reorders without rebuilding. Mesh owner evidence (`meshOwners`) stays inspectable for the preview validator. Check depth automatically and by screenshot at four presets on tensor, triangular, joins and teapot, and check vertex coordinates against the scene.
