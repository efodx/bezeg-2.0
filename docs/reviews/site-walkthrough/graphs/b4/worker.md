# B4 part A worker note

Changed: CurveStyles.ts:28-43 new `offsetFamily(index)` (blue comparisonCurve, dash 0, width 0.6x, opacity max(0.4, 0.8^i)); JXGPHBezierCurve.ts:230 uses it (`styles.curve.comparison` untouched). GraphPalette.ts:8 parameterSample = #6175ad. Three param graphs: size pointSize*0.7, outline GraphPalette.pointOutline (Alpha:159/164, Spline:155/160, Uniform:187/191).
Tests: new src/graphs/curves/object/JXGPHBezierCurve.test.ts (real no-renderer board; distance-along-normal is covered by existing ph-math.test.ts "offset curve lies at distance d..."); marker tests added to the three parameterization test files (fake boards now keep create attrs); positions at curve.eval(ts[i]) asserted.
Pre-change failures: offsets: expected '#6f9285' to be '#6175ad' (index 1); markers: expected '#a48752' to be '#6175ad' in all three (fill is the first assertion, so size/outline were not separately observed failing).
Checks passed: just unit on curves/ph, parametrisations, offset, object, styles, learning/content/sceneContentAgainstGraphs.test.tsx; just typecheck; full just lint. lessonMathNotation not run (no copy changed).
Item 5: no copy changed; searched content+localization for rjav|brown|črtkan|dashed|modr|zelen|blue|green|barv|colour|oker|ochre near param/offset files; hits are other graphs, or CurveOffsetGraph's exact-vs-sampled dashed line (own style). guidedExampleHighlightCopy.ts:185-198 "blue offset" stays true.
scripts/graph-visual-style/*.cjs: `parameterSample` there is a sampled-parameter data field (t,x,y), not the palette token; unaffected, not edited.
CurveOffsetGraph: sets no style of its own for PH offsets; its single offset stays blue solid, opacity 1, but width falls from 0.85 to 0.6 of the base.

## Part B

Recipes and text: `scripts/demonstration-preview-recipes.cjs` gains `captureText` entries `{keep: [], strip: []}` for ph-cubic, ph-quintic, uniform-parameterization, arc-length-param (the id list in `demonstration-preview-text.test.cjs:23` extended). `bezier` window `[-5, 3.4, 4, -4.4]` kept (legacy drag check passed). No other window or action changed; no stale labels.
Check edit: `scripts/demonstration-preview-curve-motion.cjs:161` the sample-marker filter read the old fill `#a48752` / `rgb(164, 135, 82)`; now `#6175ad` / `rgb(97, 117, 173)` (the new `parameterSample`). Nothing loosened.
Recapture: all seven in one run against :4333, passed. Manifest compared by id: only these seven captures changed (plus the run-level revision, fingerprint, servedBuild fields). `src/` clean.
Clip bytes: ph-cubic 197752, ph-quintic 230823, uniform-parameterization 27292, weighted-parameterization 166668, spline-parameterization 266010, arc-length-param 74243, bezier 278564.
R1-R8 (viewed each after poster): all met, no property failing. Framing R5: uniform is tall and narrow (about 34% wide by 70% tall) but nothing is cut; no window added.
Live (`b4/live/`, script `.command-logs/b4/live.cjs`): offsets on /ph/cubic read as one thin blue family under the moss curve; markers on the three param routes are clearly distinct from the curve and the ochre points. Inspector layout unchanged. Exports `export-ph-cubic.svg/png` made with three offsets.
Page: `b4/index.html`, published to build/walkthrough-graphs/b4.html, 200 and images load.
Checks: `just tooling-test` passed; `just lint` passed.
