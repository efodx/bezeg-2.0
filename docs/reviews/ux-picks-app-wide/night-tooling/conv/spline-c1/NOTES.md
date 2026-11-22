# spline-c1 (C1SplineGraph.tsx, splineGuidedLessons.ts C1 lesson)
Status: done (small: the graph has no readouts, params or own sections).
- Declared: readout group `spline` rows pieces (4), free-points (6, legend free-points), joints (3, legend joints); counts from getUnderlyingCurves / getNonFreePoints, checked on the default spline against the board (4 pieces, 6 free, 3 joints). Note: joints rule. Legend (drawn only): curve, polygon (isShowingControlPolygon), free-points (isShowingJxgPoints), joints (not hideFixed).
- No board text, no pucks (no slider), no sections: the point-visibility group lives in shared BaseSplineCurveGraph (off limits).
- Frames: c1-pieces obs open legend only (counting prompt); c1-midpoint expl/obs and c1-tangent-step expl/obs open legend (polygon); c1-local expl open readouts highlight pieces, free-points; obs open readouts.
- Inline Slovenian: all row names, titles, legend labels, note (no keys).
- Contract gaps: groups in shared base classes cannot become ToolSections without editing the base; no declaration for per-piece/joint coordinates as rows.
- Checks: tsc clean; just unit spline dir + lesson test passed; walk 14 frames, no page errors (first picks shot was blank page, transient; after touch it rendered).
