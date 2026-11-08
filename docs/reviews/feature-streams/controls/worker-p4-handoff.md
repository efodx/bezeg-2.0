# Worker P4 handoff (partial, budget signal)

Implementation and tests are written. Last full-compgeo run (before the final test tweaks) had 29 failures, all fixed since; the final full compgeo run, lint and build were started in the background and not read.

## Done
- `PointSetControls.tsx`: `PointCollection` (points/polygon mode, not fixed), `PointListInput` with selection, `NumberInput` (integer, bounds) in segment/interval rows, `SelectablePointButton`, `BooleanField` checkboxes; `IntegerField` and raw inputs gone. Segments/intervals modes keep their own plain buttons and count lines (PointCollection's count line says "points"). `PointSetControls.tsx` removed from `controlExemptions`.
- `PointSetGraph.tsx`: `onKeyDown` via `pointKeyCommand` (step 1, Shift = 10, intervals `axes: 'x'`, Escape cancels pending else deselects, Delete not when count fixed); `dragPoint` clamps with `constrainPoint`; `nudgeSelected` uses `stepPoint` then `movePoint`; Add without coordinates uses `placeNewPoint`; `refitFor` (via `refitWhenOutside` and `fitView`, same inputs as the host Fit) after `addPointAt` and `movePointTo`.
- l10n (sl/en in lockstep): added `pointset_collection_label`; removed `pointset_select_point`, `pointset_point_x/y`, `pointset_new_x/y`, `pointset_remove`.
- New tests: `src/graphs/compgeo/PointSet.sharedControls.test.tsx`, `src/compgeo/pointSetModel.clamp.test.ts`.
- Updated tests (DOM/notice changes only): BezierHulls, CurvePair, DegenerateSites, EarClipping, EulerLine, Fortune, InscribedAngle, NotablePoints, PointSetGraph, PointSetIntervals, PointSetSegments, SimsonLine, Voronoi host tests.

## Observed
- typecheck passed; `just unit src/graphs/compgeo/PointSet` + clamp test passed (87 passed, 1 skipped); mutation (no drag clamp, raw nudge, refit disabled, default add at origin) failed exactly decisions 1, 3, 6, 7.

## Not read
- `.command-logs/p4-unit3.log`, `p4-lint.log`, `p4-build.log` (full compgeo, lint on own paths, build).
- No evidence note `points-p4.md` written.
