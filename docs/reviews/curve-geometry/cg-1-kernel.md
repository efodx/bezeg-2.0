# CG-1 curvature kernel: evidence record

Files: `src/bezeg/impl/curve/curvature.ts`, `parametric-sources.ts`, `curvature.test.ts` (all new).

## Tests (30, all pass)
- conventions (2): offset normal constant/function, left normal and sign.
- contract (8): line; rational quarter arc R=1 and 2.5 (circle, centre); near-circle cubic; reversal sign flip; endpoint formula n=2..5 random (20 each, both ends); dphi/ds central difference vs independent polyline length; singular cases (no NaN); planar guard.
- spec numbers (6): cubic 2/3, 0.235702, 0.059628; parabola kappa/circle; evolute closed form 1e-9; evolutePoint undefined; cardioid; cycloid; rose/spiral/polar helper.
- offsets (6): speed factor; parabola d=-1 cusps/points; d=-1/2; no cusps; cycloid cusp search with singular endpoints; offset distance = |d| (foot point by orthogonality bisection, 1e-9); PH cubic+quintic equals `phOffsetRational` (1e-9).
- comb (6): tooth normality/length/direction; count clamp; singular omitted (cycloid); C2 cubic join jump <1e-9 (10 random) and C1 quadratic jump 40/20^1.5; span parameter mapping; singular join sides.

## Mutation evidence
1. Flip sign of kappa numerator: 17 of 30 curvature tests failed (conventions, rational arc, near-circle, endpoint formula, dphi/ds, cubic/parabola/cardioid/cycloid/rose numbers, evolute, all cusp tests, comb teeth, C2/C1 join). Reverted.
2. `OFFSET_NORMAL_SIGN = 1` (left normal for offset): 4 failed (convention test, d=-1, d=-1/2, PH cross-check). Reverted.

## Commands
- `just unit src/bezeg/impl/curve/curvature`: 30 passed.
- `just unit src/bezeg/impl/curve`: 193 passed, 6 failed, all in the untracked `src/bezeg/impl/curve/bspline/bspline-kernel.test.ts` (another worker's in-progress files, not mine). No curvature failure.
- `npx tsc --noEmit --pretty false`: empty output (log `.command-logs/cg1-tsc.log`).

## Notes
- Signature deviations from the spec sketch: `DerivativeSource = {at(t) -> {point,d1,d2}, scale}`; `combAtJoin({source,t},{source,t})`; `cuspParameters(source, ts, d)`.
- d=-1/2 cusp at x=0 is a double root of 1+d*kappa (no sign change); it is found only if a sample hits x=0 exactly, and then to ~1e-8 only (test tolerance 1e-6).
- Near-circle cubic (k=0.5523) has kappa 0.9938 at t=1/2: test tolerance 1e-2, not exact.

## Mathematical review and disposition (handler, 2026-10-31)

Independent review (Sonnet, read-only): no formula errors in kappa, normals, centre, offset factor, evolute, comb direction, polynomial/rational hodographs, span chain rule, polar and analytic sources; tolerances relative; no NaN/Infinity paths.

- **Comb gain/tooth not clamped (low)** — fixed: `sampleComb` takes `maxLength` (default `COMB_MAX_TOOTH_FACTOR * scale`), flags `clipped` teeth, keeps `kappa` unclamped, rejects non-finite gain. New test "clips teeth to the visible maximum…" fails on the pre-fix code (no `clipped` field, tooth length 2).
- **Loose quarter-circle tolerance (low)** — fixed: exact endpoint-formula oracle added at 1e-12.
- **Tangential cusps missed by `cuspParameters` (medium)** — deferred to the L5 offset slice (CG-B3-2a): add tangential-zero detection (local minima of |1+dκ| below a relative tolerance) or a near-singular readout; the parabola d=-1/2 cusp at x=0 is a double root. Until then L5 must sample x=0.
- **Rational source at w≈0 returns point (0,0) with singular derivatives (low)** — accepted: result is singular, nothing is drawn.

Checks after fixes: `just unit src/bezeg/impl/curve` passed at e8509f8 + working tree; `npx tsc --noEmit --pretty false` exit 0.
