# 01 Kinematics kernel (F1, Batch 0)

Spec: [kinematics kernel](../../specs/kinematics-lessons.md#kinematics-kernel-owned-by-this-spec) items 1–5; the kernel parts of KN1–KN5 acceptance; Testing Decisions; Correctness Notes. Decisions: ADR 0050 §2–3.

Scope: new `src/kinematics/motion.ts`, `decompose.ts` and `arrowScale.ts`, and their test files. Reuse `DerivativeSource` and `curvatureAt` (`src/bezeg/impl/curve/curvature.ts`), the parametric sources and `arcLength` as they are. Edit no existing file.

Acceptance:

1. `projectileSource(v0, alphaDeg, g)` and `circularSource(R, omega)` match their closed forms. A central finite difference of the position with step \(10^{-5}\) agrees with \(r'\) and \(r''\). `G` is exported once as \(9{,}81\). `reparametrize(source, phi)` follows the chain rule, leaves the path unchanged, and matches the spec's closed-form circle values. A \(b\) near 1, \(\alpha\) or \(R,\omega\) outside their ranges, and non-finite input are rejected.
2. `decompose(d1, d2)` returns \(v\), \(a_T\), the signed \(a_N\) on the left normal, and \(\kappa=a_N/v^2\). It satisfies \(a_T^2+a_N^2=|r''|^2\) and agrees with `curvatureAt`. At zero speed, such as the cycloid cusp, it returns no components.
3. `projectileSummary` gives the flight time \(2v_y/g\), range, maximum height and apex time. It matches bisection on \(y(t)=0\) and the KN3 numbers.
4. The \(a_T\) status is exact by motion id for circular motion (constant speed) and for the projectile. For other sources it uses the threshold \(10^{-9}|r''|\) and reads "approximately stationary" at KN5 \(t=\pi\) and KN2 \(t=0\). It never says "exactly 0" for a computed value.
5. `arrowScale` returns the step from the \(1,2,5\times10^k\) ladder and its label. Velocity and acceleration get separate scales. Ladder boundaries are tested.
6. The KN1–KN5 checked numbers match, and the arc lengths are \(2\pi\) and the cycloid arch \(8\).

Checks: `just unit src/kinematics`, then `npx tsc --noEmit --pretty false` and `just lint src/kinematics`. Report an observed failure of each assertion group against a deliberate mutation. The required mutations are: \(\varphi''\) dropped from `reparametrize`, the sign of \(a_N\) flipped, and the ladder rounding the wrong way at a boundary.
