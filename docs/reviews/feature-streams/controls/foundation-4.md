# Foundation slice 4 evidence (formats, C28)

Changes: `src/analysis/format.ts` gains `formatDegrees` (wraps `formatNumber`, 2 decimals) and `formatScientific` (one shared superscript table with `formatSignificant`, which now calls it). Callers: Delaunay and Triangulation controls (`useLanguage`), NURBS `errorText`, Blossom symmetry, Bisection `formatPrecise` (4 digits), `hullRobustnessReadout.formatDoubleValue`, De Casteljau `t` (`withDecimalSeparator(toFixed(2))`).

Left: `simsonLineText.areaRatioText` (keeps one mantissa decimal, "5,0·10⁻⁴", so `formatScientific` would change output), `BezierClippingControls.powerOfTenText` (bare power).

Tests: `src/analysis/format.test.ts`, new `src/graphs/compgeo/formatReadouts.test.tsx` (Delaunay, Triangulation, De Casteljau, sl and en). Old pins updated: DelaunayGraph.host (`40,6`, `90`), BisectionGraph, BSplineNurbsGraph, BSplineBlossomGraph, bsplineNurbsGuidedLessons (`e-n` to `·10⁻ⁿ`).

Mutations (`.command-logs/4-mut-*.log`, FAIL counts): degrees untrimmed 3, minus sign 2, scientific without comma 2, without superscript 3, De Casteljau without separator 1, Delaunay `toFixed` 1; all observed failing, files restored.

Checks: typecheck passed; lint passed on touched files; `just unit` on src/analysis, compgeo, bspline, functions, bezier, learning/content failed once on 6 old text pins (log 4-unit-b), fixed, rerun of those files passed (4-unit-c); smoke-lesson (delaunay, point-set-triangulation, monotone-triangulation, bspline-nurbs, bspline-blossom, bisection, decasteljau, hull-robustness) passed on port 4327 (4-smoke.log); `just check-changed` log 4-check-changed.log.

Not done: eyeballing each readout in a browser on its route (no browser tool); the unit rerun after the pin fixes covered only the failing files, not the whole directory set again.

## Handler acceptance (2026-11-08)

- The worker's `just check-changed` never wrote its log. Its single-file run exposed `src/graphs/base/ControlsFollowGraph.test.tsx:140` pinning `t = 0.50`; the handler changed it to `t = 0,50`.
- Handler reran `src/analysis/format.test.ts`, `formatReadouts.test.tsx`, `ControlsFollowGraph.test.tsx`, `src/graphs/compgeo`, `src/graphs/curves/bspline` and the Bisection tests (passed, `.command-logs/4-handler-unit.log`), then a fresh `just build` and `just smoke-lesson delaunay point-set-triangulation monotone-triangulation bspline-nurbs bspline-blossom bisection decasteljau hull-robustness` on that build (passed, `.command-logs/4-handler-smoke.log`). `check-changed` runs inside the runtime publish gate.
