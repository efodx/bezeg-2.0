# 02 Conic kernel, pencil parameter and Pascal (F1, Batch A)

Spec: K2, K3, [implementation decisions](../../specs/projective-conics-lessons.md#implementation-decisions) and [correctness notes](../../specs/projective-conics-lessons.md#correctness-notes). Decisions: [ADR 0033](../../adr/0033-projective-conics-exact-kernel-and-family.md) §1–2. Depends on 01.

Scope: `src/projective/conic.ts` (without the five-point solver, which is task 04), `src/projective/conicPencil.ts`, `src/projective/pascal.ts`, and their tests. Pure TypeScript.

Acceptance:

1. A conic is the symmetric BigInt matrix of \(Ax^2+Bxy+Cy^2+Dxw+Eyw+Fw^2\). `classify` returns `ellipse | circle | parabola | hyperbola | line-pair | parallel-lines | double-line | point | empty`, decided from exact determinants and the sign of \(B^2-4AC\). Unit tests cover each type, and the K5 family at \(c=2,1,0\) (determinant \(-1\)).
2. The kernel provides:
   - `onConic`, and `side(conic, p)`: inside, on or outside, decided exactly from the sign of the form at \(p\);
   - `polar` and `pole`;
   - `intersectLine`: exact when the intersections are rational, otherwise a typed `irrational` result with double approximations and a stated tolerance;
   - `tangentPoints`;
   - `pointsAtInfinity`: 0, 1 or 2 ideal points, never complex points.
3. K3 checks on \(9x^2+25y^2=225\):
   - The tangents at \(T_1=(4,\tfrac95)\) and \(T_2=(-3,\tfrac{12}5)\) meet at \(P=(1,\tfrac{21}5)\).
   - The polar of \(P\) is \(\tfrac x{25}+\tfrac{7y}{15}=1\) and contains \(T_1\) and \(T_2\) exactly.
   - \(P\) is outside.
   - The polar of \((1,0,0)\) is \(x=0\), and the pole of the line at infinity is the centre.
   - For a parabola, the pole of the line at infinity is the ideal point of its axis.
4. Pencil parameter (ADR 0033 §2): for a base point \(Q_0\) on the conic and an integer direction \((p,q)\), the second intersection is exact and rational. It is ideal when the direction is asymptotic, and it is \(Q_0\) when the direction is tangent. A fixed direction table exports its size as a constant. Check: on \(9x^2+25y^2=225\) with \(Q_0=(5,0)\) and direction \((1,m)\), the point lies at \(s=-90/(9+25m^2)\).
5. `pascal.ts` gives the three Pascal points of an ordered hexagon and their exact determinant. A side through two coincident points is a typed status. K2 checks:
   - The ellipse hexagon gives \((-15,24)\), \((12,\tfrac35)\), \((\tfrac{15}2,\tfrac92)\) and determinant 0.
   - Pappus gives \((\tfrac85,\tfrac65)\), \((\tfrac{22}5,\tfrac95)\) and \((3,\tfrac32)\).
   - The parallel case gives the ideal point \((-9,-9,0)\).
   - A fixed-seed property test checks determinant 0 over random table positions, on all four conic types and on reordered hexagons.

Checks: `just unit src/projective`, then the full suite once, and `just typecheck`. Report mutation evidence.
