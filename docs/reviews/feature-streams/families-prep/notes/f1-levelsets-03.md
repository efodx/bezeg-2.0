# f1 level-sets 03: exact LP (worker note)

Files: src/optimization/lp2.ts (new), src/optimization/lp2.test.ts (new). No existing file edited.

API: `solveLinearProgram(constraints, {p,q})` -> region (infeasible|point|segment|polygon), vertices
(ccw when bounded polygon), bounded, rays, unbounded, optimum {value, vertices (all ties)}, walk, optimalEdge.
`doubledRationalArea` exported. x,y>=0 rows appended unless present; a=b=0 or non-integer input throws RangeError.

Checks: just unit src/optimization passed (15 tests); just lint src/optimization passed;
tsc: no error outside src/dynamics and src/mechanics; no trailing whitespace.

Mutations (each restored, diff against saved copy empty):
- dedupe removed: 3 tests fail (degenerate (3,1), point, segment). Random brute-force group does not catch it.
- feasibility `<` for `<=`: 13 tests fail.
- unbounded ignoring objective sign: 2 fail (unbounded-region test, random unbounded test).

Spec numbers all reproduce (LS5 vertices, 12 at (2,3), walk, optimal edge value 8, degenerate 11).
Spec issue: none. Note the walk is also implemented (spec Kernels item 5), not listed in the task acceptance.
Next step for handler: none for this slice.

Repairs after math review: region 'unbounded' for any feasible region with a ray (failed before fix);
rays reduced by gcd and deduplicated (failed before fix); random test asserts walk strictly increasing,
adjacent in ccw order, ends on an optimum vertex (fails under tie-break mutation `at = cn >= 0 ? next : prev`).
Rerun: unit and lint pass.
