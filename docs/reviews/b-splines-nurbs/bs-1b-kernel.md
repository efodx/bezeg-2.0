# BS-1b evidence: insertion, extraction, derivative source and rational kernel

Files (new, `src/bezeg/impl/curve/bspline/`): `insertion.ts`, `extraction.ts`, `derivative.ts`, `rational.ts`, `bspline-kernel-b.test.ts`; `index.ts` gets additive exports only. `derivative.ts` is not in the spec's file list (`knot-vector, basis, deboor, insertion, extraction, rational`); it is a separate file so `extraction.ts` stays free of the curvature kernel's types.

## Exported signatures

- `checkKnotInsertion(u,k,n,x) -> {ok:true}|{ok:false, reason:'not_finite'|'outside_domain'|'multiplicity_too_high'}`; `insertKnot(u,k,P,x) -> {knots, points}`; `insertToMultiplicity(u,k,P,x,target) -> {knots, points}` (target 1..k+1; no-op copy when already reached).
- `bezierPieces(u,k,P) -> {knots, points, pieces:[{start,end,points,firstIndex}], operator}`; `operator[i][j]` is the weight of old point j in refined point i.
- `derivativeSource(u,k,P) -> DerivativeSource` (whole curve, right-continuous at interior knots); `spanSources(u,k,P) -> [{start,end,source}]` (one polynomial per non-empty span); `knotJoins(u,k,P) -> [{t,left:JoinSide,right:JoinSide}]` ready for `combAtJoin`.
- `validateWeights(w,count) -> {ok:true}|{ok:false, reason:'wrong_count'|'not_finite'|'nonpositive', index?}`; `liftToHomogeneous(P,w)`, `projectHomogeneous(row)`, `evaluateRational(u,k,P,w,t)` (throw `RangeError` naming the reason).

## Results (observed)

- `just unit src/bezeg/impl/curve/bspline --maxWorkers=2`: 2 files, 47 tests passed (26 from BS-1a, 21 new). `npx tsc --noEmit --pretty false`: exit 0, no errors. Logs: `.command-logs/bs1b-unit.log`, `.command-logs/bs1b-tsc.log`.
- Insertion leaves 1001 samples unchanged (max difference < 1e-12) in every one of more than 200 insertions into 80 random clamped/unclamped vectors, k = 1..5 all seen, 2D and 3D, at an existing knot, a fresh value and both domain ends; `insertToMultiplicity` to every target 1..k+1 (more than 300 cases, 201 samples each); multiplicity and domain preserved, result passes `validateKnotVector`.
- Golden: L3 insert 1 and 0.5 into the L2 example (points and knot vectors), curve point (1, 1.5) at t=0.5; L4 quadratic pieces and `b_2 = ½P_1 + ½P_2`; L3/L4 cubic pieces; kappa = -1.4311 on both sides of the simple knot u=1, 8/3 to 16/3 (jump 8/3) at the double knot u=2, tangent (1.5, 0) both sides; L5 point (0.92979, 0.36809) at 21.598 degrees, (sqrt2/2, sqrt2/2) at 45 degrees; circle radial error < 1e-12 over 1001 samples, > 1e-2 with unit weights.
- Extraction: 120 random cases, pieces equal the original on their intervals under an independent de Casteljau and an independent Bernstein oracle (tolerance 1e-11); piece count = distinct interior knots + 1; every distinct domain knot reaches multiplicity >= k; operator rows non-negative, sum to 1, and operator x P equals the refined points (operator and points are computed by separate runs, the first on the identity matrix); an existing break (multiplicity k+1) and degree 0 are handled.
- Derivative: per-span r, r', r'' against central differences, against sum P_i N_i' with N_i' by central differences of the table-form `basisAll`, and against the Bezier-piece source `splineSpanSource` of the curvature kernel (an independent route that does not use the Q_i formula); a C1 quadratic's one-sided kappa matches the Bezier end-curvature formula and shows a jump while the tangent agrees.
- Rational: equals sum(w P N)/sum(w N) via `basisAll` on 60 random cases, invariant under a positive scaling of the weights, weights 0, negative, NaN, Infinity and a wrong count are rejected with a code.

## Mutations (each reverted; final run green)

All eight ran with `--maxWorkers=2` on the new test file, from `.command-logs/mutate.py` (log `.command-logs/bs1b-mutations.log`).

1. Insertion alpha denominator `u[i+k]` to `u[i+k+1]`: 7 failed (1000-sample insertion, multiplicity, L3 golden, cubic pieces, extraction vs oracles, derivative group).
2. Insertion blend range `l-s` to `l-s-1`: 8 failed (same groups plus the L4 quadratic golden).
3. Extraction inserts only to multiplicity k-1: 5 failed (L3/L4 goldens, pieces vs de Casteljau/Bernstein, derivative groups).
4. Operator built from a perturbed identity (0.001 off the diagonal): 2 failed (L4 golden, operator x P and affine rows).
5. Hodograph factor p to p-1: 5 failed (central differences/basis derivative, `splineSpanSource` agreement, degree 1, L3 golden curvature, C1 quadratic).
6. `knotJoins` right side uses the left span: 2 failed (L3 golden curvature, C1 quadratic jump).
7. Lift omits the weight factor: 4 failed (circle, L5 golden, rational basis sum, lift).
8. Zero weight accepted: 1 failed (weight rejection).

A first attempt to run the mutation script at default workers was killed on the coordinator's instruction while it was mid-mutation on `rational.ts`; the file was restored by hand and re-checked by search before the clean rerun.

## Decisions and notes

- **Insertion at the domain ends is allowed** (including `x = u_{n+1}` of an unclamped vector). The Boehm formulas hold with l the last index with `u_l <= x`, which is at least n+1 at the right end; the domain is unchanged and this is tested. It is needed to extract Bezier pieces from unclamped vectors. A knot already of multiplicity k+1 is refused (`multiplicity_too_high`), so clamped ends are refused, as spec L3 acceptance 4 asks.
- **Extraction target is multiplicity k at every distinct domain knot, ends included.** A span is a Bezier piece when both its end knots have multiplicity >= k (not k+1); for a clamped vector the ends need nothing. An unclamped vector therefore gets extra points at both ends. Existing breaks (k+1) are left alone and the pieces on either side are disconnected (they do not share a point).
- At a break, the B-spline evaluator is right-continuous, so the left end of a piece cannot be compared with `evaluate` at `piece.end`; the test compares at 1-1e-9 there and exactly only at the domain end.
- **Curvature at knots.** `derivativeSource` is one function of t, so it cannot be one-sided: it returns the right-hand span at interior knots (the last non-empty span at the right end). One-sided values come from `spanSources`/`knotJoins`. Each span source is that span's own polynomial (extended by its formula outside the span), so `at(end)` of the left span is the left limit. Reuse: `combAtJoin` and the `DerivativeSource`/`JoinSide` types are imported from `curvature.ts`; `splineSpanSource` is used in the test as an independent oracle rather than in the implementation, so the spec's Q_i formula is what the implementation tests.
- Zero-length intervals in Q_i give a zero row; such a Q_i has empty support and is never active in a non-empty span.
- Planar only for the derivative source (rows `[x,y]` or `[x,y,0]`), as `curvature.ts`; insertion, extraction and rational accept any equal row width.
- Spec L5 does not ask for curvature of the NURBS, so no rational derivative source was written; it would follow from the lift and the quotient rule of `rationalBezierSource` if a later slice needs it.
- Insertion and extraction for rational curves are not provided (spec lists only lift, evaluate, project). A caller can lift, insert/extract on the homogeneous rows and project.
- The spec's `bezierPieces` description ("every interior knot to multiplicity k") is extended to the domain end knots, see above.

## Not verified

No browser or UI use; no performance measurement; no review by a second model. Timing: the full `bspline` folder took 26-37 s on a loaded machine; the two heavy sampling tests carry a 60 s timeout.
