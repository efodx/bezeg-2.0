# t09b2 mathematical review: patch-derivatives route

Scope: TensorDerivativesScene.ts (+test), TensorDerivativesPanels.tsx, `patch_derivatives_*` keys, `derivativesStartingPatches`. Reference: tensorDerivatives.ts. No source edited. Numeric checks done with throwaway node scripts in /tmp.

## Confirmed correct
- Scene passes tensorDifferentials/drawDifferentials output straight through (TensorDerivativesScene.ts:34-46): shafts start at S(u,v), su/sv/twist share one scale, normal drawn at L; test checks start point, direction sign and scale (Scene.test.ts:34-62).
- Tangent quad (a, b = su, sv scaled by L/2/max(|su|,|sv|)) is point +- a +- b: coplanar with S, S_u, S_v, centred at S, size ~L. Plane and normal omitted exactly when `normal.kind === "degenerate"` (drawDifferentials only pushes both then); tested for parallel and zero-sv.
- Reason texts match the classifier (parallel / zero-su / zero-sv / both-zero); REASON_KEYS is exhaustive (`satisfies Record<NormalDegeneracy,...>`). sl/en in lockstep; terminology (tangentna ravnina, normala, mešani odvod (zasuk)) and "; " separator with decimal commas are right.
- Collapsed-edge patch (u=0 row at one point): S_v(0,v)=0, S_u(0,0)=3(P10-P00)=(3,-4.5,1.2); limit normal direction S_u x S_uv is nonzero along the whole edge (min sin angle 0.59 over v in [0,1]). The claim holds.

## Findings

1. MEDIUM, patchPresetCollections.ts:135-137 and `parallelCornerNet` (tensorDerivatives.ts doc) / sl.ts:1292, en.ts:1293 "limit normal may still exist": for the parallel-corner patch at (0,0) the limit normal does NOT exist. Computed unit S_u x S_v as (u,v)->(0,0): along u-axis (0,0,1), along v-axis (0,0.6,-0.8), along the diagonal (0,0.832,-0.555). It depends on the direction of approach. The text is hedged ("may"), so not false, but the prompt `prompt_patch_derivatives_normal` ("why is the limit normal still defined") plus a preset that shows the opposite will mislead a student who expects one. Remedy: say in the preset comment/lesson that this preset is the counter-example (limit depends on direction), or soften the prompt to "does a limit normal exist, and does it depend on the direction of approach?". Optionally add a test pinning the direction dependence.

2. LOW, Scene.ts:30 `isPoint` is an exact-zero test while the classifier uses tol*D. A vector with 0 < |S_v| <= 1e-9 D is classified "zero-sv" yet its arrow is still drawn (as a speck with a label). Remedy: skip arrows when the vector is degenerate per the same tolerance (or when its drawn length is < ~1e-6 L).

3. LOW, tensorDerivatives.ts drawDifferentials quad: sized by max(|S_u|,|S_v|), so a defined but nearly-parallel/very unequal pair gives a sliver quad. Acceptable; only noting.

4. LOW, sl/en legend: the normal arrow is drawn at the display length L (not unit length in world units) while the label says "Enotska normala"; the legend says it has "always the same length", which is accurate. No change needed.

5. TEST GAPS (non-vacuity): (a) the tangent-plane test (Scene.test.ts:78-81) only checks corners are coplanar with the point; a quad collapsed to the point, or one spanned by wrong vectors, passes. Add: centroid equals S(u,v), edges parallel to S_u and S_v (cross of corner differences matches S_u x S_v direction), nonzero area. (b) no test of readout identities S_u(0,0)=m(P10-P00), S_v(0,0)=n(P01-P00), S_uv(0,0)=mn(P11-P10-P01+P00) in the scene/panel tests (may live in tensorDerivatives.test.ts; not checked). (c) no test that the starting patches' limit-normal claims hold (collapsed: normal defined at u=0.05; parallel corner: nothing). (d) the tests use only the dome, whose nonzero twist is asserted only by comment, so a twist arrow that equals zero would hit the 12-polyline count and fail, which is fine.
