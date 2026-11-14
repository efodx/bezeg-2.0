# Worker style notes (subdivision, correlation)

Changes: SubdivisionScene.ts (vertex pool, limit overlay, draggable points), CorrelationGraph.tsx (residuals, line labels).
Tests added: SubdivisionCurveGraphReal.test.tsx (stage vertices vs stage/limit/handles), CorrelationGraph.host.test.tsx (residual solid and thinner; residualCurves() now matches dash 0).
Observed pre-change: correlation new test "expected 2 to be +0" (dash); subdivision new test "expected true to be false" at the first assertion (vertex shares colour with stage), later assertions not reached.
Checks: both unit runs, typecheck, lint passed. No screenshots (no build).
Open: the legend entry for the residual (CorrelationGraph.tsx ~line 439) still has kind "dashed-line" and now misdescribes the solid residual; it is inside renderControls, left untouched.
