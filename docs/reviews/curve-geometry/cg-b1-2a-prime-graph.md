# CG-B1-2a' curvature graph (worker note)

Files: `src/graphs/curves/bezier/CurvatureOverlay.ts` (overlay and `curvatureFrame`), `CurvatureBezierCurveGraph.tsx`, `CurvatureBezierCurveGraph.test.ts`; one line in `src/graphs/curves/curvePresetCollections.ts` (`curvature: bezier("curve-curvature")`); five keys each in `sl.ts` and `en.ts` (`curvature_*`).

Ownership: `CurvatureOverlay` creates every element (3 invisible anchor/tip points, centre point, 2 line-end points, 2 arrow segments, T/N text tags, circle, tangent line, readout text) and lists them. Elements read the curve lazily through function attributes, so no drag listener exists. The only subscription is `onLanguageChange` (board text redraw), released in `dispose()`. `dispose()` removes owned elements, latest first, and is idempotent. The graph disposes it in `disposeFigureSceneResources` (preset/figure/lesson import), in `unmount()` before the session, and recreates it in `initialize()` and `importPresetData()`.

Deviations: the graph extends `BaseBezierCurveGraph<CurvatureGraphStates>`, not `BezierCurveGraph`, because `BezierCurveGraph` fixes its state type and cannot carry `curvatureT` without editing it. `workspaceUsesStructuredEditing` is duplicated. `curvatureT` is scene state (like `alpha`), not stored in the Preset DTO: a Preset restores control points only; reset restores 0.5. Added the `curvature` preset collection in `curvePresetCollections.ts` (needed for Presets; not in the forbidden list). No tangent-angle readout was added (spec step 2); T and N are tagged and the normal is dashed.

Mutation checks (each reverted by hand, file diff clean): radius*1.1 -> 8 tests red; line branch disabled -> 3 red; `removeObject` removed -> 3 red; language unsubscribe removed -> 1 red (needed a subscription counter, since the callback is also guarded).
Checks: unit (new test, curvePresetCollections, localization) green; `tsc` clean; `npm run build` exit 0. Not verified: browser rendering (JSXGraph attribute functions such as `visible`, arrow attributes) and SL/EN live switch; tests use a fake board.

## Round 1 repair
- Tangent direction angle readout: `tangentAngleDegrees` (atan2 of the kernel tangent, degrees, no negative zero) is a third readout line in circle and line status, absent when singular. Keys `curvature_angle_value` in `sl.ts`/`en.ts`. Test on the cubic: 0 at t=0, 63.4349 at t=1 (63,4349 in SL). Observed red with atan2 arguments swapped, green after revert.
- `CurvatureBezierCurveGraphReal.test.tsx`: real GraphHost and JSXGraph board (jsdom). Overlay elements exist after initialize; a preset import removes the old ones and leaves the same number of owned objects (no duplicates); none remain on the board after unmount. Green. Not mutation-checked.

## Handler review and disposition (handler 4, 2026-10-31)

Reviewed in the main chat (about 560 lines across three new files plus five localization keys).
- Accepted: the graph extends `BaseBezierCurveGraph<CurvatureGraphStates>`, not `BezierCurveGraph`. `BezierCurveGraph` is a 15-line subclass that fixes its state type; no shared class is edited, so ADR 0022's intent holds. The parameter t is scene state, as in the alpha graph.
- Accepted: overlay ownership. Every element is created and listed by `CurvatureOverlay`, the elements read the curve lazily so there is no drag listener, the language subscription is released in an idempotent `dispose()`, and the graph disposes it on scene import and unmount.
- Checked: the parabola control points (-1,1), (0,-1), (1,1) give y = (2t - 1)^2 = x^2.
- Repair round 1 (worker): the tangent direction angle readout (spec L2 step 2) and a real-board test with `GraphHost`.
- Handler mutation: removing `removeOverlay()` from `unmount` and `disposeFigureSceneResources` made the real-board test fail (1 failed); restored.
- Checks (revision c3e3774 plus this diff): `just unit src/graphs/curves/bezier/Curvature src/graphs/curves/curvePresetCollections src/localization --maxWorkers=2` passed; `npx tsc --noEmit --pretty false` exit 0; `npm run build` exit 0.
- Deferred to CG-B1-2b: a browser check of the drawing, the live SL/EN switch and dragging. The graph has no route before `G-REG`. The preview should also check the readout's placement against the curve at projection sizes.

