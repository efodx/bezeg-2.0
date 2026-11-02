# 08 F2a slice 1: inversion model, worker brief (handoff-v12)

One worker (`bezeg-worker`, Sonnet 5.5 `medium`). Worktree `.claude/worktrees/stream-maps`, branch `worktree-stream-maps`. Do not commit or push.

## Goal

Task `docs/tasks/triangle-geometry/08-batch-d.md` F2a, **model only**: a pure TypeScript module `src/compgeo/inversionModel.ts` with its tests. It has no JSXGraph, graph, Presets, locale or route; slice 2 (graph) builds on it. Spec `docs/specs/triangle-geometry-lessons.md` section "### T5. Power of a point and inversion" (default example, graph needs, acceptance 1–3) and "Correctness Notes". Pattern: `src/compgeo/eulerLineModel.ts` and `src/compgeo/simsonLineModel.ts` (typed results, no NaN or infinity leaves the file, `toBoard`/`BOARD_COORDINATE_CAP` from `notablePointsModel.ts` for drawable coordinates).

Kernels, already done; do not change them, and report a defect if you find one:
- `src/compgeo/circle.ts`: `Circle {centre: RationalPoint, r2}`, `powerOfPoint`, `invertExact` (throws RangeError at the centre), `intersectLineCircle`, `intersectCircles`, `angleBetween`.
- `src/analysis/complexMobius.ts` (complex maps E2): `circleInversion(z, centre, radius)` returns `point | pole`; `circleFromCentreRadius`, `lineThroughPoints`, `inversionImage(source, centre, radius)` returns a canonical `GeneralizedCircle` `{A, B, C}` with `shape`, `throughPole` and `exact` (integer form for grid data); `describeGeneralizedCircle` gives the drawable centre and radius, or a point and direction.
- **Hard rule (spec acceptance 1 and the dependency table):** every *drawn* image (point or generalized circle) comes from `circleInversion` / `inversionImage`. Never re-implement double inversion. Exact readouts come from `invertExact` / `powerOfPoint` or exactly from the integer form, as `Rational`.

## Settled design (handler)

- **Inputs on the integer grid.** The inversion centre C, the point X, the power point P and the source circle centres are integer grid points in [−10, 10]. Radii are integers 1..8: `INVERSION_RADIUS_MAX = 8` for the inversion circle, and the same range for source circles. A source line is given by two distinct grid points. Validate inputs (exported `isInversionRadius`, etc.) so slice 2's Presets can reuse them.
- **`analysePoint(inversion, X)`**:
  - At X = C: `{kind: 'centre'}` (the "point at the centre has no image" case).
  - Otherwise: `{kind: 'image', exact: RationalPoint (invertExact), drawn: XY (circleInversion), board: BoardXY | undefined, position: 'inside' | 'on' | 'outside'}`. Position is decided exactly by the power sign.
  - Near the centre the image may lie beyond the cap. Then `board` is undefined and `direction` (a unit vector from C) lets the graph draw an edge marker. Never non-finite.
- **`analyseSource(inversion, source)`** for a circle or line:
  - Result `{kind: 'image', shape: 'circle' | 'line', throughCentre: boolean, drawn: GeneralizedCircleShape, exact: {kind: 'circle', centre: RationalPoint, r2: Rational} | {kind: 'line', a, b, c: Rational}}`.
  - Compute `exact` from the integer form (`exact === true`) with `Rational`. The form is in real coordinates: A|z|² + 2 Re(conj(B) z) + C = 0. Read the docs in `complexMobius.ts:306-330`.
  - A drawn circle image whose centre or radius exceeds the cap is reported with `board: undefined`, as for points.
  - Invalid inputs give `{kind: 'invalid'}`.
  - A line through C maps to itself; a circle through C gives a line.
- **`analysePower(P, circle, thetaDeg)`**:
  - `power: Rational` (`powerOfPoint`, exact), and `position` from its sign.
  - The secant through P at direction θ (degrees, a double, normalised to [0, 360)) gives `{kind: 'two', A, B: XY, product}` or `{kind: 'tangent'}` or `{kind: 'miss'}`. `product` is the *signed* product of the directed distances PA·PB along the direction (equals the power: positive outside, negative inside).
  - The tangent from an outside P: `{length: number (√power), points: [XY, XY]}`. Inside, or on the circle: `undefined`, or length 0 on the circle.
  - The secant intersections are doubles (square roots); label them inexact in the doc comment.
- **`analyseAngle(inversion, first, second, which: 0 | 1)`** for two source circles:
  - Their intersection points come from `intersectCircles` (doubles).
  - `before`: the angle at the chosen intersection point Q between the two tangent lines.
  - `after`: the same at the image point Q′ (`circleInversion`), between the tangent lines of the two images (`inversionImage`); an image may be a line.
  - Angle convention, document it: the **signed angle between undirected tangent lines**, from the first curve to the second, in (−90°, 90°] (counter-clockwise positive), and `unsigned = |signed|`.
  - Non-generic cases give typed results: `no-intersection`, `tangent`, `point-at-centre` (Q = C), `coincident`.
- **Examples** (exported `INVERSION_EXAMPLES` with ids; slice 2 and the lesson use them). The inversion centre is (0,0) unless stated. Ids:
  - `point`: r = 2, X = (3,1);
  - `through-centre`: r = 2, source circle centre (1,0) radius 1;
  - `not-through-centre`: r = 2, source circle centre (3,0) radius 1;
  - `power`: P = (0,0), circle centre (5,0) radius 3, θ = 0;
  - `orthogonal`: r = 4 with the same circle (5,0) radius 3;
  - `angle`: r = 2, circles (3,0) radius 1 and (3,1) radius 1, which = 0 (Q ≈ (2.134, 0.5));
  - `line-through-centre`: r = 2, the line through (−3,−3) and (3,3).

## Tests (`src/compgeo/inversionModel.test.ts`)

For every assertion group, report a failure observed under a deliberate mutation.

1. Spec default numbers, exactly:
   - (1,1)→(2,2), (1,−1)→(2,−2) and (2,0)→(2,0) under r = 2;
   - the circle (1,0) radius 1 gives the line x = 2;
   - the circle (3,0) radius 1 gives the circle with centre (3/2, 0) and r² = 1/4, and the images of (2,0), (4,0), (3,1) are (2,0), (1,0), (6/5, 2/5);
   - power 16, secant points (2,0) and (8,0) at θ = 0 with product 16 (to 1e-12), tangent length 4;
   - with r = 4 the circle (5,0) radius 3 maps to itself exactly, (2,0)↔(8,0) and (5,3)→(40/17, 24/17).
2. Angle: before = 60° (unsigned), after = 60° unsigned with the signed angle negated (`after.signed === -before.signed`), to 1e-9. The same holds for both intersection points and for 200 seeded random grid pairs of intersecting circles not through C. The orientation reversal is checked every time.
3. Drawn vs exact: for every grid X ≠ C in [−6, 6]² with r ∈ {1, 2, 3}, `drawn` equals `exact` to 1e-12 (relative for large images). For 100 seeded source circles and lines, the drawn image passes through the drawn images of three source points (to 1e-9 relative), and `shape === 'line'` exactly when the source passes through C (decided exactly).
4. Signed secant product equals the exact power to 1e-9 for 200 seeded (P, circle, θ) with P inside, on and outside. Tangent length² equals power for P outside.
5. Edge cases, all typed with no NaN, Infinity or throw:
   - X = C;
   - X a distance 1 from C with r = 8 (image at 64, beyond the cap: `board` undefined, `direction` set);
   - a source circle passing within 1 of C but not through it (huge image circle);
   - P on the circle;
   - secant missing the circle, and tangent secant;
   - concentric source circles, tangent source circles, and an intersection point at C;
   - invalid radius 0 or 9, and non-integer input.
   Assert recursively that every numeric field of every result is finite.

Checks: `just unit src/compgeo/inversionModel`, `npx tsc --noEmit --pretty false`, and `just lint` on your files. Run the unit file after your first `describe` block, not only at the end.

## Rules

Read the Engineering practices section of `AGENTS.md`. Run tests only through `just` (start with `just --list`; see `docs/commands.md`). Locate code with `grep -l`/`-c` before `grep -n`, and read at most 150 lines per call. Send full test output to log files under `C:\Users\NonFriedMotherBoard\.claude\jobs\95220feb\tmp`. Preserve unrelated changes.

## Return

At most 350 words: files changed, observed check results, mutation evidence per test group, decisions (angle convention, cap handling) and risks, and unverified cases, with `file:line` flags. On `HANDOFF` from the handler, or past about 30 turns before acceptance, stop at a consistent point, write `docs/reviews/triangle-geometry/08-f2a-model-handoff.md`, and return partial.
