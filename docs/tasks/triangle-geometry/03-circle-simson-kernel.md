# 03 Circle, Simson and exact inversion kernel (F1, Batch 0, `G-CG`)

Spec: "Triangle and circle kernel" (circle, Simson, inversion helper), T2 acceptance 1–2, T4 acceptance 1–2 and 4, T5 acceptance 1–3, Correctness Notes. Decisions: ADR 0030 §1–2. Uses task 01's `Rational` and task 02's `circumcentre` (run after 02, or agree the shared helper with 02's owner first).

Scope: `src/compgeo/circle.ts`, `src/compgeo/simson.ts` and their test files. Pure TypeScript. Worker effort `high`. Drawn inversion images belong to complex maps task 01 (`src/analysis/complexMobius.ts`); do not re-implement them here.

Acceptance:

1. `Circle = {centre: RationalPoint, r2: Rational}`, `Line`, and `GeneralizedCircle = Circle | Line`. `powerOfPoint` is exact; for the T1 triangle, `power · orient` is an integer on every point of a \(41\times41\) window (T4 acceptance 1).
2. Line–circle and circle–circle intersections return `none | tangent | two`, decided exactly; intersection points are doubles labelled inexact. T5 secant example: \(P=(0,0)\), centre \((5,0)\), radius \(3\) gives power \(16\) and points \((2,0)\), \((8,0)\).
3. `feet(P,A,B,C)` (to the side lines, not segments) and `pedalOrient` are exact. The eight lattice points of the T1 circumcircle all give orient \(0\); T4's two listed feet triples match. A vertex \(P\) reports coinciding feet.
4. `SIMSON_GLIDER_TOLERANCE = 1e-9` (relative to the triangle's area), with a glider-mode test over 2000 seeded positions showing the observed maximum is at least \(10^6\) times smaller. The nonzero offsets \(\varepsilon\in\{\pm0.001,\pm0.01,\pm0.05,\pm0.2\}\) give a nonzero area.
5. Thales: every lattice point on the circle with diameter \((0,0),(8,6)\) has exact dot product \(0\). Over 100 glider positions the inscribed angle is half the central angle to \(10^{-12}\). The T2 angles match to \(10^{-4}\) degrees.
6. `invertExact(P, c, r2)` is exact for grid input and throws on \(P=c\); the T5 images match. Once complex maps task 01 is on `master`, a test compares `invertExact` with its `circleInversion` to \(10^{-12}\); otherwise task 08 adds it.

Checks: `just unit src/compgeo/circle src/compgeo/simson`, `npx tsc --noEmit --pretty false`, `just lint` on the four files, full unit suite once. Report an observed failure of each assertion group against a deliberate mutation. Review: mathematical (Sonnet).
