# f1 isometry 01 (kernel) worker note

Files: src/isometry/isometry2.ts, isometry2.test.ts. Checks observed: `just unit src/isometry/isometry2` 22 passed; `npx tsc --noEmit --pretty false` clean; `just lint src/isometry` passed.

Mutations (each restored; `diff` against the saved original is empty):
- vertical-axis branch removed: 3 fail (vertical axes test, 1e-6 glide test, 600-case property test).
- glide test `t.w = 0` replaced by `|t.w| < 1e-3`: 1 fails (the glide with vector (1e-6,0), t.w = 2e-6; only the dedicated test catches it, since grid glides have large t.w).
- compose arguments swapped: 5 fail (Mat2 oracle, order/inverse, L1 parallel mirrors, L1 composite, L3 composition).

Decisions: inverse of a singular map throws RangeError (invalid input); constructors take GridPoint, apply takes RationalPoint; axes are `Line` from `lineThrough` (not normalised, so x=0 has a=2); `similarity` also returns exact `lambda` (rational square root or undefined), `detIMinusA`.
Spec issue: `classifyEigen` throws RangeError on entries off the quarter grid (e.g. 3/5), so the L2 acceptance "classifyEigen on the double linear part" cannot be called directly for rotations; the test uses classifyEigen on quarter-grid maps and the same computed discriminant otherwise (isometries-lessons.md:72).

## Test-strength repair
Property test now checks m∘m = translation 2g, axis point maps to axis+g on the axis, cosθ vs trace/2, centre fixed, identity vs translation against t, orientation -1 for odd mirrors. Added tests: dilation∘reflection orientation -1, lambda for 169/64, 9/2 (undefined), 1; k=-1/2 fixes centre, side 15/2 (225/4), L1 angles to 0.01°. Mutations: glide vector halved: 4 fail; orientation constant 1: 2 fail. Restored. 24 tests pass.
