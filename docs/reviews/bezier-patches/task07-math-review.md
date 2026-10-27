# Task 07 mathematical review (read-only)

Range 90367a9..HEAD (d7dcffd). Independent numeric script: `.command-logs/task07-math-check.mjs` (own Bernstein/de Casteljau, no repo imports). `npx vitest run src/graphs/patches`: 9 files, 133 tests pass (`.command-logs/task07-math-vitest.log`).

## Findings

### F1 (High) Lowering one degree also changes the other direction
`src/graphs/patches/TensorPatchGraph.tsx:153-157`. Lowering u to m' builds `b'_ij = S(i/m', j/n)`, with the *unchanged* direction also sampled at `j/n`. For j this replaces control points by surface points, which is not the identity for n >= 2 (`S(.,j/n) != b_.j`). The v-direction shape is therefore altered by a u-only change.
Counterexample: m=n=2, `b_ij = (j, i, z)` with z = (0,2,0) along j, constant in i. The surface is ruled in u, so an exact u-lowering to m'=1 exists. The code gives row z = (0,1,0), so S(.5,.5).z drops from 1 to 0.5 (max z error 0.5, a 50% loss of height). Lowering only along u (`b'_ij = sum_k B_k^m(i/m') b_kj`) gives row z = (0,2,0) and error 2e-16.
Fix: lower each direction on its own. Evaluate the Bernstein sum over the lowered index only and keep the other index (j) untouched. The UI text then becomes true ("the other direction stays").

### F2 (Medium) Lowering is not exact where exact is possible, so elevate then lower is not the identity
Same lines. Lowering to `b'_i = C(i/m')` is only a coarse approximation. Test: z = (0,3,0) quadratic in u, elevated to degree 3, then lowered back to 2 gives z = (0,1.5,0), not (0,3,0). The UI strings (`en.ts:1204`, `sl.ts:1203`) do disclose "approximates" and "evenly spaced parameters", so the wording is honest. For m' >= 2, though, a student cannot undo an elevation, and a surface that is already exactly lower degree is still distorted. Suggest least-squares or Bernstein-projection reduction, which is exact when the surface already has the lower degree. Alternatively state the roundtrip loss in the help text.

### F3 (Low-Med) Surface-point label occluded by the faceted mesh
`threeSurfaceView.ts:179-183, 470-475`, `OCCLUSION_EPS = 1e-3`. The label "S(u,v)" is anchored at the exact surface point, but the occluder is the density 8 or 16 triangle mesh. The chord error is up to 0.086 (density 8) and 0.023 (density 16) in z for a bicubic bump (net 3 high). Wherever the mesh lies on the camera side of the true surface (concave regions), the label is falsely hidden. Fix: skip the surface mesh for surface-anchored labels, or use a tolerance tied to the mesh chord error.

### F4 (Low) zModeDrag scale ignores FOV and elevation
`surfaceMath.ts:94-95`. dz = dy*distance/height. The true world height per pixel at the target is 2*d*tan(19 deg)/H = 0.689 d/H, so z moves 1.45x the cursor even at el=0. Screen-vertical maps to z by cos(el): the factor is 6.6x at el=1.35, 47x at el=1.54 (the top preset). Z-mode is therefore jumpy in top-like views. Fix: dz = dy * 2 tan(fov/2) * d / (H * max(cos(el), eps)), with the camera el passed in. This is approximate for points off the target depth.

### F5 (Low) Top preset exceeds the orbit clamp
`surfaceMath.ts:10` has el=1.54, but `MAX_ELEVATION = 1.35`. The first orbit drag snaps the view from 1.54 to 1.35.

### F6 (Info) Notation inconsistency
Scene label `P_{ij}` (`patchSceneBuilder.ts:31`), panel text `b(i, j)` (`en.ts` patch_bernstein_weight), spec `b_ij`. Pick one.

## Checked, no finding
- Scene builder (`patchSceneBuilder.ts`): the iso-u-k curve uses `eval(t, s)` (u fixed) and iso-v uses `eval(s, t)`. Boundaries u0/u1/v0/v1 are correct. Net-row-i is `net[i][*]`, i.e. a j-sweep at fixed i. Net-col-j runs over i, for j <= n. Highlight row/col match the selected (i,j). Selection outside the net is dropped. The mesh index layout (u-major, stride v+1) and faces are consistent. The S(u,v) marker is `eval(u,v)`.
- i is the u index and j the v index in the scene, DTO (`patchDto.ts:41,71`), selection (`TensorPatchGraph.tsx:246-251`), inset (u horizontal, v vertical, bbox correct) and scene input comments.
- patchBernstein: sum over i,j = 1 within 3.3e-16 for m,n in 1..4 and u,v including 0 and 1. B(2,0,0)=1, B(2,2,1)=1, B(2,1,0)=0, and `0**0 = 1` handles the edges. The help text "add up to 1" is correct.
- Elevation (exact, via the kernel) was verified: error 0.
- cameraPosition: Z-up, az=0/el=0 gives the camera at -y looking +y, matching the comment. The orbit signs are the usual grab-the-scene convention. Camera `up=(0,0,1)`. Clamps are sane.
- fitDistance: the bounding-sphere formula `r/sin(min(vHalf,hHalf))*1.08` is correct, with hHalf = atan(tan(vHalf)*aspect). Fitting the net covers the surface by the convex-hull property.
- Projection (`Vector3.project`, NDC to pixels, y flipped) and `data-surface-framing` are consistent. The ray/plane intersection requires t>0.
- Localization numbers (degree 1 to 4, density 8 or 16, net length (m+1)(n+1) with the right arg order) are correct.
