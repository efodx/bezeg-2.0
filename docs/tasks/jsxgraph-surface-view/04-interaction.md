# 04 — Interaction

Status: proposed. Source: [criterion 4](../../specs/jsxgraph-surface-view.md#acceptance-criteria).

Pointer, touch and keyboard handling on the host, without JSXGraph's own 3D point drag. Nearest visible owned point picking with mesh occlusion. Selection retained through pointerup/cancel. XY drag on the horizontal plane and z-mode (Shift or toggle) via `surfaceMath`, emitting start/move/end edits. Orbit, zoom, keyboard camera keys and fit with the same steps and clamps as now. Port the existing `TensorPatchEditing` and `TriangularPatchEditing` behaviors and the touch XY/z checks that failed in the prototype.
