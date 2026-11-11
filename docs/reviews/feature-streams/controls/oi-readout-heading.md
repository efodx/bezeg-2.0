# Readout heading CSS and empty FunctionReadout

- `.inspector-reveals-title` moved verbatim from functions/FunctionReadout.css to base/controls/ReadoutParts.css:2 (imported by ReadoutParts.tsx). Selector text unchanged (0,1,0), so the cascade against `.workspace-inspector .tools .btn` (0,3,0) and `.demonstration-workspace button` (0,1,1) is unchanged.
- ReadoutHeading importers: trig/UnitCircleGraph, trig/TriangleSolverGraph, functions/FunctionReadout, compgeo/{EarClippingControls,EulerLinePanel,InscribedAnglePanel,NotablePointsPanel,PointSetControls,SimsonLinePanel,VoronoiControls}. All reach the rule through ReadoutParts.tsx.
- functions/BaseFunctionGraph.tsx:466 uses the class on a raw h3 and imports no CSS itself; it now depends on ReadoutParts.css being in the bundle (FunctionReadout imports it). Not changed (outside edit scope).
- FunctionReadout.tsx:23 renders ReadoutList only when rows exist. New FunctionReadout.test.tsx. Not run against the old code (old code rendered a ul unconditionally).
- Checks: `just unit src/graphs/functions src/graphs/base` passed; tsc produced empty output.
