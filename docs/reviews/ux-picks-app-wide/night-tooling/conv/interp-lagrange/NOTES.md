# interp-lagrange (InterpolationGraph.tsx, InterpolationScene.ts, interpolationGuidedLessons.ts)
Status: done.
- Readout ids: groups `lagrange` (rows lagrange-t, lagrange-interval, lagrange-weights, lagrange-point[legend lagrange]) and `bezier` (only when shown: bezier-t, bezier-weights, bezier-point[legend bezier]). Same formatter (4 digits), point separator "; " in sl.
- Legend (drawn only): lagrange, bezier (showBezier), hull (showHull), points. Lagrange/bezier are linked by the point rows.
- Note: negative weights. readoutHelp: interp_slider_help. Puck: interp.t (Slider paramKey) help interp_slider_help.
- Removed under pick: board text in InterpolationScene (visible && !pickOn), inspector readout lines (live region kept).
- Frames (frame(id,kind,ux?) helper added; readouts() helper): hull-reveal expl open readouts+legend, highlight lagrange-weights, lagrange-point; obs open legend. bezier expl highlight bezier-weights, bezier-point, lagrange-point; obs highlight bezier-point. basis expl/obs open readouts only (prediction of the negative weight).
- Inline Slovenian: row names (parameter, interval, uteži, točka), group titles, legend labels, negative-weights note. No catalog key existed.
- Sections: none (graph has no inspector-group; commands are plain divs). PointCollection is not a Slider/CountSetter, so no count puck.
- Contract gaps: no puck for the point count (PointCollection); no way to declare a row for the readout "t_n" interval except plain row.
- Checks: tsc clean; just unit interpolation dir + lesson test passed; shots picks1440/1024/none; card values equal none board text; walk 15 frames, no page errors.
