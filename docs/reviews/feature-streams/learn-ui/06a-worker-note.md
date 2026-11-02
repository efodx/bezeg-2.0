# 06a worker note (patch highlight recipes)

Design: patch recipes author `checks: {surfaceStep: '<lesson step id>'}` in guidedExampleHighlights.ts (keys `bezier-patches.<section>`).
`resolvePatchRecipe` (generate-guided-example-inventory.cjs) requires it to equal the step containing the frame the lesson ends on and
writes `checks: {surface}` = that step's expected surface from patch-guided-example-expectations.cjs (fixture math, not board).
Runner: captureSurfaceExample applies goto-frame/frame-action via applyHighlightRecipe (explore/select-tab/set-control rejected),
re-reads published evidence, requires stability for 250 ms, then verifySurfaceHighlight (guided-example-surface-evidence.cjs):
validateSurfaceEvidence against recipe.checks.surface plus expectChange via surfaceSignature (camera, owner ids/kinds/samples, point ids).
validateSurfaceCaptureRecord validates a highlight capture's scene against recipe.checks.surface.

Recipes (all steps [], expectChange false, step = surfaceStep):
curve-to-patch curve-to-patch-explain/curve-to-patch-scene; bilinear-patch bilinear-calculation/bilinear-patch-scene;
control-net control-net-calculate/control-net-scene; boundary-iso-curves boundary-compute/boundary-iso-curves-scene;
tensor-decasteljau order-rows/order-independence; properties hull/hull-affine; tensor-derivatives partials/saddle-derivatives;
tensor-subdivision elevation-calculate/elevate-saddle; tensor-joins join-c0-calculate/join-c0 (2 owners);
triangular-patches triangle-calculate/triangular-centroid; square-vs-triangular compare-calculate/compare-domains.

Not reachable: no patch lesson frame has an `action`; rows/columns switch is not a learner control (order-columns frame shows the same
scene), so tensor-decasteljau uses its first frame. Elevation is applied by the step scene itself, so tensor-subdivision's first frame is
already elevated. properties uses the hull frame of step hull-affine (affine-image step not chosen).
Mutations: logs/06a-mut.log (7 of 7 detected).
