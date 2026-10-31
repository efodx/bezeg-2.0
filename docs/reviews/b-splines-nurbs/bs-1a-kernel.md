# BS-1a evidence: knot-vector, basis, de Boor and uniform-limit kernel

Files (all new, `src/bezeg/impl/curve/bspline/`): `knot-vector.ts`, `basis.ts`, `deboor.ts`, `uniform.ts`, `index.ts`, `bspline-kernel.test.ts`.

## Results (observed)

- `just unit src/bezeg/impl/curve/bspline`: 1 file, 26 tests passed.
- `npx tsc --noEmit --pretty false`: exit 0, no errors.
- Golden numbers reproduce to 1e-12 without change: basis at t=0.5, 1, 1.5 on (0,0,0,1,2,2,2); uniform cubic 1/6, 4/6, 1/6; de Boor triangles at 0.5, 1.5, 1; right end t=2 gives P_n; Chaikin identity (1.125, 1.75).
- Bernstein equality for k=1..5 (21 samples each), partition of unity and non-negativity on 200 random clamped/unclamped vectors with interior multiplicities (more than 2000 samples), local support (zero outside [u_i, u_{i+k+1}), positive strictly inside), de Boor vs basis sum on 150 random 2D/3D cases, convex hull on 60 cases, local control, uniformQuadraticSegment vs kernel on knots 0,1,2,... (21 samples).
- All five validation codes are triggered; the throw cases (bad degree, n < k, outside domain, non-finite t, malformed point rows) are tested.

## Mutations (each reverted; final run green)

1. Closed right end of N_{i,0} (`t <= u[i+1]`) in `basisAll`: 7 failed (golden L1 numbers, uniform cubic, repeated knots, local support, partition of unity, degree 0, de Boor vs basis sum).
2. Drop the 0/0 rule in `basisAll`: 6 failed (Bernstein, repeated knots, local support, partition of unity, L1 golden, de Boor vs basis sum).
3. `findSpan` right end no longer skips empty trailing spans: 4 failed (partition of unity, de Boor vs basis sum, convex hull, findSpan test).
4. de Boor alpha denominator uses `u[j+k-r]` instead of `u[j+k+1-r]`: 6 failed (basis sum, local control, golden triangle, right end, convex hull, uniform cross-check).

## Decisions and notes

- `basisAll` is the literal table-form Cox-de Boor recursion (with the 0/0 rule) and is independent of `basisValues` (stable left/right scheme), so each is an oracle for the other; a test checks `basisValues` is the non-zero window of `basisAll`.
- Degree 0 is accepted (L1 plots degrees 0-3); `n < k` or a non-integer degree throws a `RangeError` (not a reason code, the spec's five codes do not cover too few points).
- `basisValues`/`basisAll`/`deBoorTriangle` derive `n = u.length - k - 2` and validate the vector on every call; a wrong-length vector therefore throws instead of returning the code.
- `chaikinStep` open polygons keep the first and last point; closed wraps and returns 2n points. Each edge yields 3/4 P_i + 1/4 P_{i+1}, then 1/4 P_i + 3/4 P_{i+1}.
- Level-0 entries of the triangle carry `alpha: null, knots: null`.

## Not verified

No browser or UI use (none in this slice); no performance measurement; insertion, extraction, rational and derivativeSource are BS-1b.
