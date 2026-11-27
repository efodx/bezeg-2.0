# 08 view binding fix

Change: `BaseGraph.bindParameters` (BaseGraph.tsx:329) returns early only when there are no bindings AND the graph has no declaration. A declared graph now gets the arbiter, `view` bound, and the LessonMorph, released by the same path.

Red (before): `viewBindingNoParameters.test.tsx` "declared graph with no bindings binds view": `AssertionError: expected undefined to be defined` (graph.parameters). Green after.

Consequences fixed in tests (all were untagged programmatic view writes, or assumptions that no arbiter exists):
- Untagged board/graph view writes wrapped in `runAs('learner', ...)`: CurveWorkspacePoints (setBox), CompGeoFirstTask, HullRobustnessLessonActions, NotablePoints (fit), PointInPolygon (loadFigure), pointSetExtensionPersistence (Robust.put), FortuneGraph (setBoundingBox).
- `parameters.keys()` expected empty now filters `view`: PolygonArea, TriangleCentres, BezierClipping, FivePoint, CrossRatio, ThreeViews declaration tests.
- Fit now belongs to the view director (needs layout geometry, absent in jsdom): VoronoiGraph.host and FortuneGraph.host Fit tests call `graph.setViewDirector(undefined)` first to test the graph's own fit; CurveWorkspacePoints decision 6 skips the outside-view refit assertions when a director exists (Bezier now has one).
- sceneReplacementContract bezier: reads the view intent, not the shown (director-fitted) box.
- FortuneGraph ownership count ignores axis tick labels (their number follows the shown box).

Browser: screenshots in `.command-logs/view-fix/`. Morph: not exercised; the sampled steps of monotone-partition do not change the view scale.

## Follow-up: test tightening
- Bezier is a declared graph (BaseCurveGraph common declaration, marks) but binds no parameters; before cb59a901f `bindParameters` returned early, so `view` was never bound and no director existed. Reverting the line gives "expected undefined to be defined" on `viewDirector`.
- CurveWorkspacePoints decision 6 now asserts the director exists, that declared `marks.must` follow a typed add/edit (700,-700; p0 y 800) and that the typed entry does not move the box. Broken (marks cache never invalidated) it fails: "expected false to be true" at line 67.
- FortuneGraph ownership test filters only `_ticks_` labels, so scene labels count.
