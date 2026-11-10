# F1 solids task 02 handoff (worker)

Status: complete. New: src/solids/revolve.ts, revolve.test.ts, volumeKernel.test.ts. Additions: volume.ts (prismVolume,
pyramidVolume, coneVolume, sphereVolume, discVolume, sliceAreaAt), solid.ts (cone builder + import of revolve).
Checks: just unit src/solids passes (66 tests); just lint src/solids passes; tsc see report.

Design:
- revolve(profile [t, r][], k = 48, axis = "z"): Float64Array mesh, t strictly increasing, r >= 0, r = 0 only at the ends
  (one apex vertex), 2..64 points, caps at ring ends. Seam welded by index modulo k. Also exports kgonFactor, frustumSum.
- discVolume calls riemannSum unchanged with {...FUNCTION_CATALOG.square, value: f^2} (typed spread, no cast).
- sliceAreaAt: Green's theorem on oriented cut segments of fan triangles; vertex at the height counts as above; independent of
  sectionConvex; valid for non-convex meshes; use heights strictly inside the solid.
- cone(r, h, k = 48): base disc at z = 0, apex at z = h (revolve of [[0, r], [h, 0]]).
- Sheared SV3 prism uses base x in -4..4 grid so the shear of 6 stays inside the grid limit 12.

Mutations (restored, files byte-identical to backups):
- duplicated axis vertex: 5 fail (weld, cone closed, frustum sum, axes, ring-only/apex).
- k-gon factor cos: 7 fail (factor value, Pappus, cone, frustum, slanted stack).
- disc radius not squared: 5 fail (cone SV4, sphere, x^2, sqrt x, constant radius).
- sliceAreaAt not halved: 3 fail (sheared prism, slanted cylinders, pyramid/cube).
- seam not wrapped: 7 fail (closed, weld, volumes).

Spec numbers: all reproduced (0.99715, 24.8629, 114.668, 113.113, 0.6075, 37.110/37.605/37.698); no spec issue found.

Review repairs: 64-point profile accepted (fails under >= 64 mutation, 1 test); sliceAreaAt throws RangeError outside the open vertex height range (test added), interior-vertex-counts-as-above documented. 67 tests pass, lint passes.
