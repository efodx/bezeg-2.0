# 05 — Labels and export

Status: done, 2026-10-30 — see [labels-export.md](../../reviews/jsxgraph-surface-view/labels-export.md); figure SVG export keeps the raster surface. Source: [criterion 5](../../specs/jsxgraph-surface-view.md#acceptance-criteria).

`onLayout` delivers projected, occlusion-tested labels only when the layout changes. `capture()` produces a PNG through the existing 2D export path, with no tainting resources. Decide whether figure SVG export embeds vector surface geometry; if so, update `SurfaceLabelOverlay.showStill` and the export tests and record the improvement. MathJax labels in both formats.
