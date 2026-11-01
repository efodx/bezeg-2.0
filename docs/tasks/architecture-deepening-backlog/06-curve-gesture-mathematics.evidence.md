# 6. Curve editing gesture mathematics: evidence

Source task: [06-curve-gesture-mathematics.md](06-curve-gesture-mathematics.md). Recorded 2026-11-01 (platform stream, handlers 7 and 8) against base `51e2e54b`. Inventory: [a6-inventory.md](../../reviews/feature-streams/platform/a6-inventory.md).

## What changed

| Commit | Change |
|---|---|
| `a467c526` | New `src/bezeg/impl/curve/gesture-transforms.ts` (rotation angle, scale factors) with direct tests. `AbstractJXGPointControlledCurve` keeps pointer state and handle drawing and calls the module. |
| `4b908534` | Adapter tests assert the rotation direction and that a refused resize leaves the curve unchanged. |
| `2d5b0a80` | `abstract-point-controlled-curve.test.ts` pins `moveFor`, `scale`, `rotate` and `flip` on polynomial, rational and spline curves against hand-computed affine maps. `elevatedControlPoints` delegates to the kernel `elevate`, so there is one elevation implementation. `interpolationExamples.test.ts` keeps its hand-formula comparison. |

## Defects reproduced and fixed

- **Vertical pointer step over the centre:** rotation used `atan` of a slope difference and divided by `xCenter - x`. A pointer step exactly above or below the centre produced NaN, and every control point became non-finite. It now uses `atan2(cross, dot)`. Reproduced in the browser with `PERF_ROTATE_JITTER=0`: before, rational rotate made every control point non-finite; after, all three rotate cases pass.
- **Rotation across ±90°:** the slope form was off by π past 90°. Covered by the module tests.
- **Degenerate box resize:** resize divided by the box extent. A zero-width or zero-height box now keeps scale 1 on that axis, and non-finite or zero factors are refused. Mirroring past the box centre is unchanged.

User impact: rotating a curve no longer breaks it when the pointer passes vertically over the centre, and resizing a flat curve no longer produces non-finite points. Routes and stored Presets are unchanged.

## Measurement

`scripts/curve-gesture-perf.cjs`: production builds of `51e2e54b` (before) and `d1162c43` (after), Chromium via Playwright, mouse input, 3 runs per case. Results are in [the performance results](../../bezier-performance-results.md#curve-gestures-and-function-slider-drags--2026-11-01). At desktop size every case is vsync-locked at 16.7 ms, before and after. At 390×844 with 4× CPU, the drag p95 for bezier, rational and c2spline does not regress.

## Verification

- Unit: `just unit src/bezeg/impl/curve src/graphs/curves`, ElevationGraph and interpolationExamples (S2 worker); mutation checks listed in the commits.
- `just typecheck`, `just lint`, `just build` on `d1162c43`; full `just check` passed (typecheck, lint, 7348 unit tests in 407 files with 1 skipped, build) on `648d676f` plus the lint fix `b129305b`.
- Browser smoke on the `648d676f` production build (Haiku smoke worker, Chromium, 0 page or console errors): select, body drag, corner resize and ring rotate passed with the mouse at 1440×900 on `/bezier/curve`, `/rational/base` and `/spline/c2spline`. This includes a rotate whose pointer step is exactly vertical above the centroid; every control point moved and stayed finite. Touch at 390×844 (`hasTouch`, CDP touch events) also passed: tap to select, body drag and control-point drag on all three routes. Limits: headless emulation, not a real device; one gesture per check.

Review: Sonnet engineering review of `a467c526` found no blocking issue. Its adapter test gap was fixed in `4b908534`. The handler reviewed `2d5b0a80`.
