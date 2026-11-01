# PH singularity cards: offset distance check (D10)

Script: `scripts/ph-offset-singularity.cjs` (CLI prints the numbers below); tests: `scripts/ph-offset-singularity.test.cjs` (7 pass).

## Sources

- Fixtures: `docs/reviews/illustrated-chapter-examples/capture-inventory.json:616-640` (start `[-2,-1]`; cubic generators `[2,0],[2,1]`; quintic `[2,0],[2,1],[1,1]`; curve parameter `t` in `[0,1]`).
- Offset formula: `src/bezeg/impl/curve/ph-math.ts:76-98` (`phOffsetRational`, edge normals `(dy,-dx)`, the right normal, weighted by the speed coefficients). So `O(t) = r(t) + d (r'_y, -r'_x)/|r'|` and `O' = sigma (1 + d kappa) T`: a cusp sits at `d = -1/kappa`; a bend with kappa > 0 needs d < 0.
- Slider: `src/graphs/curves/object/JXGPHBezierCurve.ts:32-33` (range -3 to 3), `src/graphs/base/controls/PhBezierCurveControls.tsx:70-75` (step 0.01). Offset count 1 means the offset is at `d` itself (`ph-bezier-curve.ts:131`, factor `len + 1`).
- Curvature `kappa = 2 Im(conj(w) w') / |w|^4`; agrees with finite differences of the integrated curve (tolerance 1e-4, three parameters per fixture) and with the analytic case `w = 1 + i t` (`kappa = 2/(1+t^2)^2`).

## Numbers

| | cubic | quintic |
|---|---|---|
| rho_min | 4.000 at t = 0 (endpoint) | 1.000 at t = 1 (endpoint) |
| 1.5 rho_min, signed | d = -6.00, outside the slider | d = -1.50, in range |
| self-intersection at that d | no | no, and none at +1.50 |
| control 0.5 rho_min | none (d = -2.00) | none (d = -0.50) |
| sweep of the whole slider (step 0.05) | no self-intersection anywhere | only d in about [-2.65, -2.4] (a 0.01 sweep puts the upper end at -2.38) |

Quintic at d = -2.5 (2000 segments): proper crossing at t = 0.128 and 0.718, point about (-2.09, 1.49), inside the card view `[-3, 2.2, 2.5, -2.6]`. At d = +2.5 none.

## Finding

No robust d at 1.5 rho_min for either card. In both, the minimum radius is at an endpoint, so the cusp region at the tightest bend is a short reversal that does not cross the rest of the offset. For the cubic, the slider cannot reach a cusp at all (it would need d = -4). The audit assumption that a 1.5 rho_min offset shows a visible self-intersection does not hold.

## Recommendation

Use start + offset at the default distance for both cards (the owner's accepted fallback). Optional for the quintic only: set-control offset distance `-2.5`, check "offset has a self-intersection near t = 0.13 and 0.72", but that is 2.5 rho_min and not at the tightest bend (kappa is positive everywhere: 0.50, 0.40, 0.38, 0.49, 1.00 at t = 0, 0.25, 0.5, 0.75, 1; the offset at d < 0 reverses where kappa > 1/|d|, which happens near both ends, and the reversed arcs cross while 1/|d| lies between kappa_min = 0.38 and about 0.42, so the lower end is -1/kappa_min = -2.63), so the caption must not claim the tightest bend.
