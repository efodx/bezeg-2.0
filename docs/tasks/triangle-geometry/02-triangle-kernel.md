# 02 Triangle kernel (F1, Batch 0, `G-CG`)

Spec: "Triangle and circle kernel" (input, classification, centres, radii), T1 acceptance 1–4, T3 acceptance 1–3, Testing Decisions, Correctness Notes. Decisions: ADR 0030 §1, ADR 0021. Uses task 01's `Rational` and `orient`/`orientValue` from `src/compgeo/predicates.ts`.

Scope: `src/compgeo/triangle.ts` and its test file. Pure TypeScript. Worker effort `high`.

Acceptance:

1. `classifyTriangle(A,B,C)` returns `degenerate` (orient \(0\), including coincident vertices) or `proper` with `acute | right | obtuse`, decided by the signs of the three integer dot products. Spec examples: \((0,0),(7,0),(2,5)\) acute; \((0,0),(7,0),(1,1)\) obtuse; \((0,0),(4,0),(0,3)\) right; \((0,0),(1,1),(3,3)\) degenerate.
2. Exact `centroid`, `circumcentre` (denominator \(2\cdot\)orient), `orthocentre` \(=A+B+C-2O\), `circumradiusSquared` and `ninePointCircle` (centre \((O+H)/2\), squared radius \(R^2/4\)). Each returns a typed `degenerate` result where undefined, never `NaN` or an infinity. Each centre reports `inside | on | outside` exactly by `orient` against the edge lines.
3. Doubles labelled inexact: `incentre`, `inradius` (\(S/s\)), `circumradius`. \(R=abc/(4S)\) agrees with \(\sqrt{R^2}\) to \(10^{-12}\) relative.
4. The T1 default, obtuse and right examples match the spec (exact fractions for \(G,O,H\); doubles to 5 decimals). Circumcentre status is `on` only for right triangles.
5. `eulerLine` returns `undefined` when \(H=O\); otherwise `orient(O,G,H)=0` and \(HG^2=4\,GO^2\) in rationals. The T3 values match, including \(N=(11/4,7/4)\) and the near-equilateral \(H=(4,16/7)\), \(O=(4,33/14)\).
6. `ninePoints` returns the nine named points; the distinct count is \(9, 5, 8, 8\) for the T3 examples; each point satisfies \(|X-N|^2=R^2/4\) exactly.
7. Dense-grid identities over at least \(10^4\) triangles in a small window: circumcentre equidistance, \((H-A)\cdot(B-C)=0\) and its two siblings, Euler collinearity and ratio, nine points on the circle. The incentre is checked against equal distance to the three side lines to \(10^{-12}\), never with `===`.
8. Out-of-range or non-integer vertices throw as ADR 0021 requires.

Checks: `just unit src/compgeo/triangle`, `npx tsc --noEmit --pretty false`, `just lint` on the two files, full unit suite once. Report an observed failure of each assertion group against a deliberate mutation. Review: mathematical (Sonnet).
