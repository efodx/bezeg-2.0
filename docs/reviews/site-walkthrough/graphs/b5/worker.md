# B5 part A worker report
Changes: CurvatureOverlay.ts centre (l.121: size 3, emphasis), circle (l.136-140: emphasis, width 2.5, dash 0, fill emphasis, fillOpacity 0.08), line (l.143: emphasis, still dashed). Test: CurvatureBezierCurveGraph.test.ts "osculating circle style (B5...)".
Routes: /curve-geometry/curvature and /curve-geometry/evolute (CurveEvoluteGraph extends CurvatureOverlayGraph). EvoluteOverlay.ts:174 normal stays constructionAccent (untouched).
Pre-change failure: AssertionError expected {fixed:true, highlight:false,...} to match {strokeColor:'#a8503c',...}; 1 failed, 24 passed.
Checks: just unit src/graphs/curves/bezier passed; just typecheck passed; full just lint passed. Existing 1/kappa test: "centre sits at distance 1/kappa along N and the residual is third order" passes.
Pointer: circle keeps fixed:true, highlight:false; JSXGraph circle hasPoint ignores interior unless hasinnerpoints (default false); not verified in a real renderer.
Copy: nothing changed. Searched dashed/črtkan/ochre/oker/oranž/rumen/rjav/rdeč in curveGeometry*, guidedExamplePreviewCopy, localization curvature/evolute keys; the evolute/curvature preview alt text has no colour/dash words; graph has no legend. Handler need not rebuild for copy.

## Part B

Recipes/text: recipes.cjs `captureText` gains curve-curvature `{keep:[/^[TN]$/]}`, curve-evolute `{keep:[/^[TNE]$/]}`, curve-comb/offset/parametric `{keep:[],strip:[]}`; text test id list extended. Manifest textKept: curvature T,N; evolute T,N,E (plain text, patterns matched as given). Readouts hidden.
curve-curvature: window `[-2.2, 1.65, 2.2, -1.05]` (capture pads it 14% a side; a first try with a wide window shrank the subject); clip path 0.5 -> 0.65 -> 0.5 (circle top 1.56; 0.7 reaches the padded edge); row comment updated (curve-geometry.cjs:26-27). Other windows unchanged. curve-offset shows the parabola (not PH). No check edits needed.
Clip bytes: curvature 158884, evolute 268219, comb 221172, offset 107871, parametric 213217. Manifest: only these five ids changed; src clean.
R1-R8 (posters): curvature: R1 circle/curve fine, R2 rust vs moss ok, R4 disc ok, R5 NOT met (subject about 36% wide x 58% tall; the padding and a tall control net limit it), R7 ok. evolute: all met (R5 as before). comb, offset, parametric: R7 ok, R5 marginal (offset about 40% x 80%, parametric about 78% x 41%), others met.
Drag: /curve-geometry/curvature, t = 0.8 (circle centre (-0.864,1.58), r 1.906), p0 inside the disc: (-1, 1) -> (-0.327, 0.327) after a 40 px drag. The disc does not swallow pointer events.
Live: b5/live/ (sl 1440, en 1440, sl 390, PH offset, exports; SVG contains #a8503c). 390 readout overlaps the graph (pre-existing).
Page b5/index.html published, 200.
Checks: just tooling-test passed (238.8s); just lint passed.
