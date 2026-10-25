# 8. Function graph shared drawing and analysis

Status: planned. Lane: Functions; after task 7. Source: [specification §8](../../specs/architecture-deepening-backlog.md#8-function-graph-shared-drawing-and-analysis).

## Scope and entry points

- `src/graphs/functions/BaseFunctionGraph.tsx`.
- The 20 function graphs.
- Mathematics in graph files:
  - signed fill in `AccumulationGraph.tsx:69`;
  - piecewise sampling in `BisectionGraph.tsx:53-78`;
  - grid snapping in `BaseFunctionGraph.tsx:72`, `analysis/uniformConvergence.ts:39` and `analysis/complex.ts:70`;
  - `alphaParameterization` in `AlphaParamBezierCurveGraph.tsx:23`.

## Implementation and acceptance

- Move mathematics into `src/analysis` (or `src/bezeg` for the parameterization), with direct tests. Each computation keeps one implementation.
- Share drawing behavior only where at least two graphs have real common behavior: signed positive/negative fill setup, and model-keyed data caches that the base invalidates on scene removal. Reject helpers that only rename one line.
- Remove the local redeclarations of `BoundingBox`, `FillCurve` and stroke widths in favor of the base.
- Correct the stale asynchronous-`setState` comment at `BaseFunctionGraph.tsx:17-19`.
- Drawing comparisons stay unchanged. Coordinate with test-consolidation task 5, which repairs the excluded drawing comparisons, before changing cache invalidation.

## Verification

Run the function graph and analysis tests, the real-graph contract tests, typecheck and build. In the browser, check the integral, area, accumulation, Darboux and bisection routes with slider drags, measured before and after.
