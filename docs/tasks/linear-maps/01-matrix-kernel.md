# 01 Matrix kernel (F1, Batch 0)

Spec: [shared 2×2 kernel](../../specs/linear-maps-lessons.md#shared-22-kernel-owned-by-this-spec) items 1, 2, 5, 6; L1 acceptance 1–4 and L2 acceptance 1, 2, 5 (kernel parts); Testing Decisions; Correctness Notes. Decisions: ADR 0025 §2.

Scope: `src/linear/matrix2.ts`, `src/linear/gridImage.ts` and their test files. No React, JSXGraph or localization.

Acceptance:

1. `Mat2` as in the spec (columns are the images of \(e_1,e_2\)). `apply`, `multiply(B, A)` = \(BA\) (first \(A\)), `det`, `trace`, `inverse` (`undefined` when \(\det=0\), never divides), `transpose`, `symmetricPart`, `orientationSign`, `unitSquareImage`.
2. Snapping policy: `MATRIX_ENTRY_STEP = 1/4`, range \([-4,4]\); `snapMatrixEntry` and `isSnappedMatrix`; non-finite input is rejected, not snapped.
3. Closed example list `LINEAR_MAP_EXAMPLES` with ids for identity, \(A,B,C,E,R,S,S_y,N,F\) and \(2I\) from the spec, each snapped.
4. L1 and L2 default numbers match (exact where the spec says exact): \(A(1,1)=(1,2)\); the fixture image control points \((2,1),(1,5),(6,6),(11,4)\); \(A\,B(\tfrac12)=B_A(\tfrac12)=(\tfrac{17}4,\tfrac{19}4)\) to \(10^{-12}\) using an independent de Casteljau or Bernstein evaluation in the test; unit-square images, signed shoelace areas \(3,-3,0\); \(C(2,-1)=(0,0)\); \(\det(AE)=30\).
5. Shoelace area of `unitSquareImage` equals \(|\det|\) over the whole quarter grid sample; a property test over \(10^5\) random quarter-grid matrices compares `det`, `trace` and \(\operatorname{tr}^2-4\det\) with integer arithmetic scaled by 16. The unsnapped counter-example \(\det\begin{pmatrix}0.1&0.3\\0.3&0.9\end{pmatrix}\ne0\) in doubles is kept as a test.
6. `gridImage(A, range, step)` returns image line endpoints; window \([-6,6]^2\), step 1 gives 26 lines; each image line of \(x=k\) has direction \(a_2\) and passes through \(k\,a_1\) (and symmetrically). A singular matrix collapses the lines onto a line or the origin with no division and no non-finite endpoints. Clipping to the view box is not done here (ADR 4 decides).

Checks: `just unit src/linear`, then the full unit suite once. Report an observed failure of each new assertion group against a deliberate mutation.
