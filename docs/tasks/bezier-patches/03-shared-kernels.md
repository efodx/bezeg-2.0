# 03 — Extract shared curve kernels

Status: done 2026-10-26; evidence in [shared-kernels.md](../../reviews/bezier-patches/shared-kernels.md). Source: [spec P3 and the shared geometry contract](../../specs/bezier-patches.md#shared-geometry-contract). Dependencies: none (parallel with 01/02). Role: geometry refactor owner.

Turn the curve algorithms into pure, dimension-generic functions that patches will compose. This is a behaviour-preserving refactor: no 3D points, no patch code, no UI change.

Coordination: [architecture-deepening backlog task 06](../architecture-deepening-backlog/06-curve-gesture-mathematics.md) also touches degree elevation (`polynomial-bezier-curve.ts:14-25` vs `AbstractJXGBezierCurve.ts`) and `abstract-point-controlled-curve.ts`. Do not run the two at once. Whichever runs second rebases onto the other's result. If 06 has merged, its elevation consolidation becomes the input to the kernel.

1. Start at `src/bezeg/impl/curve/polynomial-bezier-curve.ts:84` (`runDeCasteljau`, which is already dimension-generic with a 2D fast path). Also read `decasteljauScheme`, `subdivide`, `extrapolate` and `elevate`, and `rational-bezier-curve.ts` (weighted recurrence, homogeneous subdivision/extrapolation, weighted elevation). Note the spline and PH callers that reach these methods.
2. Create a kernel module (for example `src/bezeg/impl/kernels/bezier-kernels.ts`). It provides the following on `number[][]` rows, where each row is one control point's coordinates of any length:
   - de Casteljau in place, with optional weights and optional scheme capture;
   - the full scheme;
   - subdivision (left/right nets);
   - extrapolation;
   - polynomial degree elevation;
   - rational degree elevation (coordinates and weights).

   It must not import `Point`, `PointImpl`, JSXGraph or React. Keep the `length === 2` fast path and the scratch-row reuse in `eval`.
3. Make `PolynomialBezierCurve` and `RationalBezierCurve` delegate to the kernels. The `Point` ↔ row conversion stays in the curve classes. Public behaviour, caching and version stamps are unchanged.
4. Add `bezier-kernels.test.ts` with dimension-parametrised cases (1D, 2D, 3D, 4D):
   - de Casteljau equals the Bernstein sum;
   - subdivision halves re-evaluate to the original;
   - extrapolation reproduces the original on its interval;
   - elevation preserves samples;
   - the rational results equal projected homogeneous evaluation;
   - the 2D kernel results equal the pre-refactor curve outputs on the existing fixtures.

   Prove the tests bite: mutate one kernel line (for example swap `left`/`right`) and record that tests fail.

Completion:
- the existing `de-casteljau-unified`, `bezier-evaluation`, `geometry*`, spline and PH golden tests pass **without changed expectations or snapshots**;
- the new kernel tests and mutation evidence are recorded;
- `just check` passes;
- the drag measurement from [performance-plan.md](../../performance-plan.md) on the Bézier and De Casteljau routes shows no regression beyond noise, recorded in `docs/reviews/bezier-patches/shared-kernels.md`;
- `docs/current-architecture.md` (mathematical implementation section) names the kernel module.

No smoke test is needed (behaviour-preserving, covered by unit tests). One commit, `refactor: extract dimension-generic Bézier kernels`.
