# subdivision (SubdivisionGraph1.tsx; route is bezier/subdivision-2; lesson in constructionGuidedLessons.ts)
Status: done.
- Class: SubdivisionGraph1 (SubdivisionGraph.tsx is repeated-subdivision, untouched).
- Readouts: group `cut`: t (only before the cut; name = catalog subdivision_parameter_t), cut-point B(t) (after a cut: shared point), pieces. Note: both parts are Bezier curves of the same degree (inline). Legend: left [0,t] (comparisonCurve), right [t,1] (constructionAccent), scheme points (when scheme shown).
- Puck: subdivision.t. Shared change: optional `paramKey` prop on OperationToolProps in src/graphs/base/controls/BezierCurveControls.tsx, passed to the subdivision and extrapolation Sliders.
- No board text to remove. Sections: none (the "Konstrukcija" group is in the graph's workspaceGraphDisplay but I left it plain: it held no help paragraph).
- Frames: whole-curve expl open legend; choose-t expl/obs open readouts+legend highlight t (slider input); read-rows expl legend; split-half/uneven expl readouts+legend, obs readouts. No highlight of cut-point (observations ask to find it).
- Inline Slovenian: row names except t, titles, legend labels, note, puck help.
- Contract gaps: legend roles of pieces beyond the first two (applyCurveVisualRole) not declared; legend swatch for scheme points approximated by accent orange (scheme has two hues).
- Checks: tsc clean; unit: SubdivisionGraph.test.ts (repeated-subdivision, not mine) fails with `this.rawSetBox is not a function` in BaseGraph.setIntentBox (another worker's in-progress edit); everything else passed. Shots + walk (11 frames) no page errors.
