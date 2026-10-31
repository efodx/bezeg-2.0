# AB-1a evidence: degree-reduction kernel

Files (new): `src/bezeg/impl/kernels/degree-reduction.ts`, `src/bezeg/impl/kernels/degree-reduction.test.ts`. `elevate` is imported from `bezier-kernels.ts`.

## Results (observed)

- `just unit src/bezeg/impl/kernels/degree-reduction --maxWorkers=2`: 1 file, 10 tests passed (final run, mutations reverted). `npx tsc --noEmit --pretty false`: exit 0.
- Both spec examples match to 6 decimals: fixed q1, free Q, max errors (sqrt3/18 = 0.096225 included), L2 by Gram formula and independently by composite Simpson (2000 intervals), Forrest's q1 to 1e-12, control-point bounds (to 4 decimals: 1/3, 0.3, 2.0276, 1.8248). No contradiction with the spec numbers.
- Round trip (0,0),(2,4),(4,0) recovered to 1e-12 in both modes; third difference below 1e-12; P, P2 and a 1e-3 perturbation are not reducible.
- Perturbation: for P, P2 and a seeded random cubic, in each mode 200 random perturbations (up to 0.1 per coordinate) of the free control points and +-1e-3 axis steps never beat the optimum. Bound >= sampled max on 100 seeded cubics x 2 modes. Free beats fixed in L2 on P, P2. 3D smoke. RangeError on wrong count, NaN, Infinity, mixed dimension, empty.

## API

`reduce(cubic, "fixed"|"free")`, `thirdDifference`, `isExactlyReducible` (|third difference| <= `REDUCIBLE_TOLERANCE` = 1e-9 times the largest absolute coordinate), `maxCurveError` (`MAX_ERROR_SAMPLES` = 2000 intervals, 2001 samples; a lower bound accurate to about 1e-7), `l2Error` (exact, Bernstein Gram matrix of the elevated difference), `controlPointBound`, `elevatedQuadratic`. Generic over dimension. Both modes solve the normal equations E^T G E q = E^T G b (fixed: only q1).

## Mutations (each reverted by hand, green run confirmed)

1. Gram denominator `* 7` -> `* 8`: 2 failed (both spec examples).
2. Free solve forced `q0 = b0`: 3 failed (both examples, perturbation).
3. Bound `Math.max` -> `Math.min`: 3 failed (both examples, bound >= sampled max).
4. Reducibility tolerance replaced by 0.5: 1 failed (round trip / reducible test).

## Decisions

- Scale for the tolerance is the largest absolute coordinate (not 1-floored), so a zero net is reducible and tiny nets are scaled correctly. Spec text only says "control-point scale".
- Max error is sampled, so it can under-read the true maximum by about 1e-7; the lesson readout should show at most 4-5 decimals.
- Fixed mode equals Forrest's formula (tested), so the formula can be shown in prose.

## Lesson must state

Norm (L2 over the parameter), the constraint of each mode, that other choices (max-norm, tangent preservation) give other quadratics, that "reducible" uses the 1e-9 tolerance relative to the control-polygon extent, that the optimum is an approximation, and that the control-point bound is an upper bound, not the error.

## Mathematical review and disposition (handler 3, 2026-10-31)

Independent review (`bezeg-reviewer` Sonnet, 5 tool uses, ~23k tokens) found no formula errors.
- Checked the Gram entries C(3,i)C(3,j)/(C(6,i+j)*7), the normal equations of both modes, the L2 error, the third difference, and the control-point bound (a convex combination of P_i - Q^el_i). Fixed mode equals Forrest's q1.
- Recomputed in exact fractions: free Q = (-0.1,0),(2,4.5),(4.1,0); L2 errors 0.0377964 (free) and 0.0690066 (fixed).
- The perturbation test and the 6-decimal sampled maximum (error about 1e-8) are sound.

Findings:
1. Medium, fixed by the handler. The reducibility tolerance scaled with the largest absolute coordinate, so it depended on translation; a cubic with extent 4 at x = 1e6 had a tolerance of 1e-3. The tolerance is now `1e-9 * extent + 8 eps * max|coordinate|`, where the extent is the largest bounding-box edge. Coincident points are reducible (0 <= 0). The new test "reducibility tolerance is translation-invariant" failed against the old rule (1 failed, 10 passed), then 11/11 passed after the fix.
2. Low, fixed. The negative reducibility case did not probe the boundary. The new test asserts that a bump of 1e-8 is detected and one of 1e-10 is not, at extent 4.

