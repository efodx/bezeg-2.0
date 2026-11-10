# 02 Revolve and volume kernel (F1, Batch 0)

Spec: [solids kernel](../../specs/solids-volumes-lessons.md#solids-kernel-owned-by-this-spec) items 3–5 (revolve, analytic volumes, `discVolume`, `sliceAreaAt`) and the `cone` builder; SV3–SV5 checked numbers; Testing Decisions (builders, revolve); Correctness Notes. Decisions: ADR 0051 §3.

Scope: new `src/solids/revolve.ts`, the analytic volumes added to `src/solids/volume.ts` (task 01 owns the file and this task extends it), the `cone` builder in `solid.ts`, and tests. Reuse the midpoint rule from `src/analysis/riemann.ts` as it is. Edit no other existing file.

Acceptance:

1. `revolve(profile, k, axis)` returns a closed mesh. Axis points are not duplicated, and a profile point on the axis gives an apex. Its `meshVolume` equals the frustum sum times \(\tfrac{k}{2\pi}\sin\tfrac{2\pi}{k}\), which is \(0{,}99715\) for \(k=48\).
2. `prismVolume`, `pyramidVolume`, `coneVolume` and `sphereVolume` match their formulas. The cube, prism, pyramid and cone meshes match their formulas through `meshVolume`, the cone with the \(k\)-gon factor.
3. `discVolume(f, a, b, n, rule)` reproduces the Correctness Notes values: the sphere with 6 discs gives \(114{,}668\) against \(113{,}097\), and \(x^2\) on \([0,1]\) with 5 discs gives \(0{,}6075\). The direction of each error is asserted.
4. `sliceAreaAt(solid, height)` gives equal slice areas for the SV3 straight and oblique stacks at every tested height, together with equal volumes.
5. The SV4 and SV5 checked numbers match.

Checks: `just unit src/solids`, then `npx tsc --noEmit --pretty false` and `just lint src/solids`. Report an observed failure of each assertion group against a deliberate mutation. The required mutations are: a duplicated axis vertex (breaks `isClosed`), a \(k\)-gon factor using \(\cos\) instead of \(\sin\), and the disc radius not squared.
