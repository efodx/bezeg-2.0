# 04 — Interaction

Status: proposed. Source: [criterion 4](../../specs/jsxgraph-surface-view.md#acceptance-criteria).

Use JSXGraph's built-in 3D point drag, picking and touch handling as they are (owner decision, 2026-10-29). Turn their drag events into `point` start/move/end edits so the scene store stays authoritative. Map the z-mode toggle onto JSXGraph's vertical drag if it has one; otherwise remove the toggle and record the UI change. Keep the numeric x/y/z editor and index selection. Orbit, zoom, keyboard camera keys and fit keep their current steps and clamps. Rewrite `TensorPatchEditing` and `TriangularPatchEditing` against the built-in behaviour, and document that behaviour, including touch, in the review.
