# Audit slices B, C, D

Done. `tab?: ToolsTab` on parameter and action declarations (graphDeclaration.ts); BoardCards picks `control.tab ?? section`; clipping and B-spline insertion declare `tab: 'edit'`; clipping frames repeat/tangent use `play`, offset uses `reset`, all open tools; BoardCards commits each operation onto a fresh `loadBoardLayout()` and refreshes on `storage` events.
Checks: tsc, lint, unit (workspace, compgeo, bspline, declare, clipping content), graph-check, build, smoke-lesson all passed.
`useToolsSectionsWithContent` untouched; could go once every control names its `tab`.
