# Consistent movable-point cursor

Analysis handles currently omit the hover cursor handlers installed by the Bézier control-point adapter. Share this interaction behavior without sharing mathematical movement constraints.

## Acceptance

- Movable points created by `BaseFunctionGraph.slidingPoint` show a pointer on hover and restore the default cursor on exit, matching Bézier control points.
- Both point creation paths use one shared cursor binding; fixed points do not advertise dragging.
- Dragging, snapping, mathematical state, routes and stored presets retain their behavior.
- Listeners belong to their JSXGraph points and disappear when those points are removed.

## Verification

Run focused regression checks, typecheck, lint and production build. Browser checks cover real hover/exit and dragging on representative analysis and Bézier graphs, fixed points, and lesson scene replacement. Scope smoke to those interactions; the app shell and lesson runtime are unchanged.

Verified 2026-10-25: 11 tests across BaseFunctionGraph and the real MeanValueGraph host passed; the cursor regression failed without the function-path binding. Typecheck, focused ESLint and production build passed. Chromium desktop smoke passed mean-value a/b/c hover/exit, fixed-marker cursor, constrained drag/readout, Bézier control-point hover/drag/curve response, and mean-value lesson observation/exit restoration. No runtime errors. Browser coverage is limited to those desktop workflows. Full-tree ESLint encountered an unrelated local `.benchmark-output/check-localization-assets.cjs` scratch-file violation; changed-file lint passed. Existing Sass deprecation warnings remain.
