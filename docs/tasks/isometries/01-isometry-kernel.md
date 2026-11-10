# 01 Isometry and similarity kernel (F1, Batch 0)

Spec: [isometry kernel](../../specs/isometries-lessons.md#isometry-kernel-owned-by-this-spec) items 1–4 and 7; the kernel parts of L1–L3 acceptance; Testing Decisions; Correctness Notes. Decisions: ADR 0047 §2.

Scope: new `src/isometry/isometry2.ts` and its test file. Reuse `src/compgeo/rational.ts`, `grid.ts` and `circle.ts` (`lineThrough`) as they are. Use `src/linear/matrix2.ts` and `eigen2.ts` only in tests, as oracles. Edit no existing file.

Acceptance:

1. `AffineMap2` of `Rational` with `compose(B, A)` (first \(A\)), `apply` and `inverse`. `inverse` rejects \(ad-bc=0\). Composition agrees with double `Mat2` multiplication to \(10^{-12}\) over random grid input.
2. Constructors `reflection(p, q)` (rejects \(p=q\)), `translation`, `rotationAbout(centre, cos, sin)` (rejects a pair with \(\cos^2+\sin^2\ne1\)), and `dilation(centre, k)` (rejects \(k=0\)). The L1 numbers match: the composite of the mirrors through \((0,0),(1,0)\) and \((0,0),(2,1)\) is \(\tfrac15\begin{pmatrix}3&-4\\4&3\end{pmatrix}\), the motif images match, and parallel mirrors \(x=0\), \(x=3\) give the translation \((6,0)\). \(\cos2\varphi=(d^2-c^2)/(d^2+c^2)\) matches the matrix entry exactly. `rotationAbout` and the classifier agree in a round trip.
3. `classifyIsometry` returns `notIsometry`, or `identity`, `translation` (vector), `rotation` (exact centre, angle as a double), `reflection` (exact axis) or `glide` (exact axis and glide vector), by the spec's exact rules, including the vertical-axis branch \(a=-1\), \(c=0\). The L2 numbers match: the rotation by \(90^\circ\) with \(t=(3,1)\) has centre \((1,2)\); \((y+2,x+2)\) is a glide with vector \((2,2)\); \((y+1,x-1)\) is the reflection in \(y=x-1\). A property test shows that every composition of 1–3 random grid mirrors satisfies \(A^TA=I\) exactly and is one of the four classes, with orientation \((-1)^{\text{mirrors}}\). The test compares `classifyEigen` of the double linear part per the L2 acceptance, with the half-turn special-cased.
4. `similarity(M)` returns `notSimilarity` or the exact \(\lambda^2\), the orientation and the fixed point (`none` when \(\det(I-A)=0\)). The L3 numbers match: the dilation images for \(k=\tfrac32\) and \(k=-\tfrac12\), the matrix \(\begin{pmatrix}9/10&-6/5\\6/5&9/10\end{pmatrix}\) with \(\det(I-A)=\tfrac{29}{20}\) and fixed point \((-\tfrac{46}{29},\tfrac{28}{29})\). The area ratio equals \(\det\) by an independent shoelace computation. \(k=1\) classifies as `identity` and \(k=-1\) as a half-turn.
5. No \(\varepsilon\) appears in any discrete decision. Off-grid points are rejected.

Checks: `just unit src/isometry/isometry2`, then `npx tsc --noEmit --pretty false` and `just lint src/isometry`. Report an observed failure of each assertion group against a deliberate mutation. The required mutations are: the vertical-axis branch removed, the glide test \(t\cdot w=0\) replaced by a tolerance, and `compose` with its arguments swapped.
