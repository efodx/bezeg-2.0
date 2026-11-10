# f1-levelsets-02 (worker note)

Files (new): src/levelsets/descent.ts, constrained.ts, descent.test.ts, constrained.test.ts. No existing file edited.

API: descend(id, start, H) -> {path, stop: 'cap'|'escaped'}; classifyValley(start, H) -> converges|oscillates|diverges; iterationsUntil. constrained.ts: linePoint (x or, for b=0, y on the 1/4 grid, Rational), lineTangency (exact det, lambda), lineTangencyPoints (exact solve, affine det; 'point'|'none'|'everywhere'), circlePoint, circleTangency (status 'approximately-tangent'|'not-tangent'|'stationary', TANGENCY_SIN_TOLERANCE 0.01).

Checks (observed): just unit src/levelsets pass; just lint src/levelsets pass; tsc --noEmit 0 errors; no trailing whitespace.

Mutations (each failed, then restored, files cmp-identical):
- classification `H <= 10`: classification test over H in [1,30] failed.
- y0=0 exception dropped: same test failed.
- tolerance 1e-9 in lineTangency: "determinant 5e-12 is not tangent" failed.

Oracles: closed-form (1-lambda h)^k iterates; by-hand Lagrange points (1,2), (3/2,1/2), (10,1); brute-force line minimisation; |sin| = |cos 2theta| for xy on x^2+y^2=2; simulated H rule with its own criterion.

Spec issues: LS3 "(1,10274)" is a 5-digit rounding of 2*0.82^3 = 1.102736; test uses 5 decimals. "f about 1,2e25 after 152 steps" at H=11 is unreachable under the |p|>10^6 stop; the path ends earlier (test checks escape and factor -1,2).
Decisions: exact line tangency only for polynomial functions (hills throws RangeError); stopped-at point is not in the path; lineTangencyPoints solves off-grid (the zero need not be on the 1/4 grid).
Not done: no graph/UI, no performance work.
Hardening: H=11 test asserts escape at step 76, last accepted step 75, f = 10*1,2^150 = 7,54e12 (the brief said about 1,1e13; computed 7,54e12). Mutated threshold 1e7: test failed, restored.
