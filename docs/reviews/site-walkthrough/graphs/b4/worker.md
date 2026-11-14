# B4 part A worker note

Changed: CurveStyles.ts:28-43 new `offsetFamily(index)` (blue comparisonCurve, dash 0, width 0.6x, opacity max(0.4, 0.8^i)); JXGPHBezierCurve.ts:230 uses it (`styles.curve.comparison` untouched). GraphPalette.ts:8 parameterSample = #6175ad. Three param graphs: size pointSize*0.7, outline GraphPalette.pointOutline (Alpha:159/164, Spline:155/160, Uniform:187/191).
Tests: new src/graphs/curves/object/JXGPHBezierCurve.test.ts (real no-renderer board; distance-along-normal is covered by existing ph-math.test.ts "offset curve lies at distance d..."); marker tests added to the three parameterization test files (fake boards now keep create attrs); positions at curve.eval(ts[i]) asserted.
Pre-change failures: offsets: expected '#6f9285' to be '#6175ad' (index 1); markers: expected '#a48752' to be '#6175ad' in all three (fill is the first assertion, so size/outline were not separately observed failing).
Checks passed: just unit on curves/ph, parametrisations, offset, object, styles, learning/content/sceneContentAgainstGraphs.test.tsx; just typecheck; full just lint. lessonMathNotation not run (no copy changed).
Item 5: no copy changed; searched content+localization for rjav|brown|črtkan|dashed|modr|zelen|blue|green|barv|colour|oker|ochre near param/offset files; hits are other graphs, or CurveOffsetGraph's exact-vs-sampled dashed line (own style). guidedExampleHighlightCopy.ts:185-198 "blue offset" stays true.
scripts/graph-visual-style/*.cjs: `parameterSample` there is a sampled-parameter data field (t,x,y), not the palette token; unaffected, not edited.
CurveOffsetGraph: sets no style of its own for PH offsets; its single offset stays blue solid, opacity 1, but width falls from 0.85 to 0.6 of the base.
