# 05 — Keep B-spline samples within the exact parameter domain

Status: planned, 2026-11-18. Source: [specification](../../specs/master-review-followups-2026-11.md#b-spline-domain-safe-sampling--m3-m4), BS1–BS5. Findings M3/M4. Dependencies: none.

## Outcome and scope

Valid short spans render and the affine-parameterized unit circle retains its accuracy readout. Start at bsplineBasisModel.ts:sampleBasis, BSplineBasisScene, bsplineNurbsModel.ts:maxRadialError and the Basis/NURBS graph entry paths. Keep strict knot-domain evaluation in the pure kernel.

## Work

1. Turn both report reproductions into correct-behavior regressions: the basis vector [0,0,0,1e-10,2,2,2], and the exact circle with the full decimal knot vector in BS3. Verify Preset validity before asserting board behavior.
2. Choose one-sided samples within their actual neighboring spans, including the no-representable-interior case. Retain exact endpoints rather than reconstructing them through floating-point interpolation.
3. Inventory actual shared sampling consumers. Extract a small pure policy only where it removes duplicated knowledge; otherwise state the distinct invariants and extraction decision. Preserve discontinuity and normalized/raw-view conventions.
4. Exercise actual edits/imports and restoration; report any changed drawn approximation explicitly. Update the ownership guidance if a module is introduced.

## Verification and completion

BS1–BS3 require bounded/finite samples, nonempty drawn basis data, partition of unity where defined, repeated knots, negative/non-unit domains, adjacent representable values and radial error below 1e-12. Use independent geometry expectations, not the sampler itself as its oracle. The last circle sample must equal the stored endpoint.

BS4–BS5 require real Basis and NURBS graph hosts, Preset round trips, Reset, parameter-view switching and lesson/checkpoint restoration. Retain the strict out-of-domain kernel tests. Run affected `just unit`, `just check-changed`, engineering/mathematical review and `$smoke-tester` on both registered routes. Measure representative drag/slider cost before and after if the chosen sampling change affects those paths; no renderer migration. Record both pre-fix failures and acceptance evidence.
