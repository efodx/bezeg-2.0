# F1 recursion task 01: kernel (worker note)

Status: implemented, not committed. New files only, in `src/recursion/`: `iteration`, `affine`, `logistic`, `interest`, `sequences` (`.ts` and `.test.ts`).

Checks observed: `just unit src/recursion` 5 files, 29 tests pass. tsc and lint: see the report.

Mutations (each run, failure observed, code restored):
- `abs <= 20` for attracting: 3 affine tests fail (grid, boundary, RG2 examples).
- M=0 folded into staircase (`M >= 0`): the M=0 degenerate test fails (and the grid test).
- logistic `max: 30`: "rejects R >= 30" fails.
- Extra: eApprox cap 1e7; geometric sum without `- 1n`; steps indexed from 0; R=10 slope-one kind moved: each fails a test.

Repair (handler): logistic R range now 5..29 (4 and 30 rejected; mutation min 4 fails the boundary test); fixed point reduced by gcd (R=20 gives 1/2); RG2 example is M=-24, C=100, x0=4,6 (iterates 4,6; 4,48; 4,624; 4,4512) and C=110 stays rejected.

Decisions:
- Fixed point is returned as `{num, den}` numbers.
- Sequences cap n at 200; terms indexed from 1; `partialSum(kind, a1, r, n)` with bigint (exact) or number overloads; `geometricLimit` added for the closed-form limit 6.
- `rational(num, den)` lives in `affine.ts` (BigInt, reduced, den > 0).
- No label comes from iterate values; the long-loop R<=10 test is marked illustration.

Not verified: browser use (none needed); nothing outside `src/recursion`.
