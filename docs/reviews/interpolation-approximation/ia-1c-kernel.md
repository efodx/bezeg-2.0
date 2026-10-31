# IA-1c evidence: subdivision kernel

Files (new): `src/analysis/subdivision.ts`, `src/analysis/subdivision.test.ts`. Chaikin and the uniform quadratic segment are imported from `src/bezeg/impl/curve/bspline`, not reimplemented.

## Results (observed)

- `just unit src/analysis/subdivision --maxWorkers=2`: 1 file, 13 tests passed (final run, mutations reverted). `npx tsc --noEmit --pretty false`: exit 0.
- Spec numbers: four-point inserts (2, 2.8125); Chaikin edge p1p2 gives (1.5, 2.25), (2.5, 2.75); straddling-midpoint identity (1.125, 1.875) equals `uniformQuadraticSegment(P0,P1,P2,1/2)`; x^3 at -3,-1,1,3 inserts 0.
- Also tested: old vertices preserved for 6 rounds (open and closed); counts closed 4*2^k, open 2n-1; w=1/16 reproduces a general cubic on uniform samples, degree 4 not reproduced; w=0 is midpoint insertion; offset of inserted points from edge midpoints shrinks by under 0.6 per round; open Chaikin keeps both ends; closed Chaikin after 6 rounds within 0.05 of B-spline knot and midpoint samples (error shrinks > 4x from round 3 to 6; observed 6-round error 0.03125); invalid input.

## Mutations (each reverted)

1. Old vertex shifted by 1e-3: 2 failed (old vertices preserved, exact counts/equality).
2. `(1/2 + w)` -> `(1/2 - w)`: 4 failed (default 2.8125, end rule, cubic, convergence).
3. Open end rule bound `i+2 <= n-1` -> `i+2 <= n`: 1 failed (end rule).
4. Default w 1/16 -> 1/8: 3 failed (default, end rule, cubic).
5. Chaikin kernel mutation (0.25 -> 0.35 in uniform.ts): applied then reverted by `git checkout` without a measured run; NOT observed.

## Decisions

- Open end rule (spec line 109 default): the two end edges, and a lone edge, get the edge midpoint; ends stay fixed; open result has 2n-1 points. Closed needs n >= 3, open n >= 2.
- `subdivisionRounds(polygon, closed, rule, rounds, w)` returns every stage (index 0 = input), cap `MAX_SUBDIVISION_ROUNDS = 6`.
- Lesson must state: open Chaikin keeps its end points; open four-point uses midpoints on end edges (so near the ends it is only linear).

## Mathematical review and disposition (handler 2, 2026-10-31)

Independent review (Sonnet, read-only, 7 tool uses): no formula errors.
- Checked: the insertion rule, closed wraparound (including n=3), the open end rule and point counts, and the round cap.
- Recomputed: four-point (2, 2.8125); Chaikin (1.5, 2.25) and (2.5, 2.75); the straddling identity (1.125, 1.875) on the spec's polygon (0,0), (1,2), (3,3). BS-1a's (1.125, 1.75) uses a different polygon. The 6-round Chaikin error is exactly 1/32, so the 0.05 bound is non-vacuous.
- Chaikin is imported, not reimplemented, and the handler confirmed `uniform.ts` unchanged after the worker's `git checkout`.

The unobserved Chaikin mutation is accepted: literal assertions and BS-1a's own review cover the kernel. I5 lesson text must say that open Chaikin keeps its end points and that open four-point is linear at the ends.
