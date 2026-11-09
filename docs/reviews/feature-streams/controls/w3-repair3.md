# Wave 3 repair 3 evidence

Items: 1 Apply/Reset weight reason (BezierCurveControls.tsx OperationTool, RationalBezierCurveControls.tsx); 2 coarse 44px (new BezierCurveControls.css, class `operation-apply`); 3 nine compgeo Controls pass `settled = true`; 4 PointCollection count not live.
Observed failures (revert, run, restore): blocked-press reason test, Reset weight reason/rounding test, CSS rule test, PointCollection role test, caller-settled source test, hook fake-timer test (settled false) all failed on revert and pass restored.
Tests updated for the settle delay: DegenerateSites, Delaunay, Voronoi host tests (await a 600 ms quiet period before reading live text), PointSetGraph (count line via class, the sr-only announcement duplicates the text).
Unit: src/graphs/base, src/inputs, compgeo: only failure is NumberInput.test.tsx "note" role (R1b ReadoutParts, not mine). `just typecheck` passed.
Logs: .command-logs/w3-repair3-*.log
