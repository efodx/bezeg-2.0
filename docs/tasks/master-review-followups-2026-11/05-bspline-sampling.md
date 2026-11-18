# 05 — Keep B-spline samples within the exact parameter domain

Status: planned, 2026-11-18. Source: [specification](../../specs/master-review-followups-2026-11.md#b-spline-domain-safe-sampling--m3-m4), BS1–BS5. Findings M3/M4. Dependencies: none.

## Outcome and scope

Valid short spans render and the affine-parameterized unit circle retains its accuracy readout. Start at bsplineBasisModel.ts:sampleBasis, BSplineBasisScene, bsplineNurbsModel.ts:maxRadialError and the Basis/NURBS graph entry paths. Keep strict knot-domain evaluation in the pure kernel.

## Work

1. Turn both report reproductions into correct-behavior regressions: the basis vector [0,0,0,1e-10,2,2,2], and the exact circle with the full decimal knot vector in BS3. Verify Preset validity before asserting board behavior.
2. Follow BS2's representability rule: an extra sample lies strictly between the previous distinct in-domain knot and the current knot. For adjacent doubles with no interior value, retain exact boundary samples and record the drawing limitation; do not label a rounded endpoint as a left limit. Retain exact stored endpoints rather than reconstructing them through floating-point interpolation. This is sample construction, not catching kernel errors and dropping invalid results.
3. Inventory actual shared sampling consumers. Extract a small pure policy only where it removes duplicated knowledge; otherwise state the distinct invariants and extraction decision. Preserve discontinuity and normalized/raw-view conventions.
4. Exercise actual edits/imports and restoration; report any changed drawn approximation explicitly. Update the ownership guidance if a module is introduced.

## Verification and completion

BS1–BS3 require ordered in-domain samples, nonempty finite basis columns with matching lengths, partition of unity where defined and radial error below 1e-12. For BS1, require an actual sample strictly between 0 and 1e-10 so dropping the short span cannot pass. Also cover repeated knots, negative/non-unit domains and previous/current knots 1 and 1 + Number.EPSILON: no strict interior sample exists there, so assert exact boundaries and the documented fallback. Use independent geometry expectations, not the sampler itself as its oracle. The last circle sample must equal the stored endpoint, and the graph's radial readout must be finite rather than an error placeholder.

BS4–BS5 require real Basis and NURBS graph hosts, Preset round trips, Reset, parameter-view switching and lesson/checkpoint restoration. Retain the strict out-of-domain kernel tests. Run affected `just unit`, `just check-changed`, engineering/mathematical review and `$smoke-tester` on both registered routes. Measure representative drag/slider cost before and after if the chosen sampling change affects those paths; no renderer migration. Record both pre-fix failures and acceptance evidence.
