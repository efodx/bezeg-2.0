# Wave 3 repair 3 evidence

Items: 1 Apply/Reset weight reason (BezierCurveControls.tsx OperationTool, RationalBezierCurveControls.tsx); 2 coarse 44px (new BezierCurveControls.css, class `operation-apply`); 3 nine compgeo Controls pass `settled = true`; 4 PointCollection count not live.
Observed failures (revert, run, restore): blocked-press reason test, Reset weight reason/rounding test, CSS rule test, PointCollection role test, caller-settled source test, hook fake-timer test (settled false) all failed on revert and pass restored.
Tests updated for the settle delay: DegenerateSites, Delaunay, Voronoi host tests (await a 600 ms quiet period before reading live text), PointSetGraph (count line via class, the sr-only announcement duplicates the text).
Unit: src/graphs/base, src/inputs, compgeo: only failure is NumberInput.test.tsx "note" role (R1b ReadoutParts, not mine). `just typecheck` passed.
Logs: .command-logs/w3-repair3-*.log

## Handler follow-up (2026-11-09)

`check-changed fc9680af` at `441a42a2` failed 8 lesson-restoration contracts (point-set-triangulation, delaunay, orientation, polygon-area, voronoi-degenerate, hull-robustness, monotone-partition, ear-clipping): the count announcement followed every count change, so a graph that reached a scene through lesson actions kept `status:Točk: 4 od največ 40` while a twin that reached it otherwise did not. Fix: only a count change caused by this panel's Add, Remove, Clear or Add at coordinates is announced; any other change clears the announcement; a blocked press drops the pending flag. New test "a count change from elsewhere ... is not announced": observed failing with the announcement made unconditional (`.command-logs/h-pc-mut.log`), passing after restore; `lessonRestoration.part2` passes.
