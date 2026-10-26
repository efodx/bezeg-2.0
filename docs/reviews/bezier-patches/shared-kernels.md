# Shared curve kernels (task 03) — evidence

Task: [03 Extract shared curve kernels](../../tasks/bezier-patches/03-shared-kernels.md). Base revision `a5bb2d0`. Date 2026-10-26.

Coordination: architecture-deepening task 06 had no commits, branches or uncommitted edits to its files at start, so the kernel takes the existing two elevation implementations as input. `AbstractJXGBezierCurve`'s elevation is untouched and remains task 06's consolidation.

## Change

- New [`src/bezeg/impl/kernels/bezier-kernels.ts`](../../../src/bezeg/impl/kernels/bezier-kernels.ts): `deCasteljauInPlace` (optional weights and scheme capture, `length === 2` fast path), `deCasteljauScheme`, `subdivide`, `extrapolate`, `elevate`, `elevateRational`, and homogeneous `subdivideRational`/`extrapolateRational`. No `Point`, JSXGraph or React imports.
- `PolynomialBezierCurve` and `RationalBezierCurve` convert points to rows and delegate. Caching, version stamps, scratch-row reuse in `eval`, the public `decasteljau`/`decasteljauScheme` methods, the reuse of the original endpoint `Point` objects in elevation, and rational subdivision/extrapolation using the stored (not reactive) weights are unchanged.
- The kernel arithmetic is the same expression order as before, so 2D results are bit-identical, not only close.
- `eslint-suppressions.json`: the two curve files' `prefer-const`/`no-unused-vars` suppressions were pruned because the code they covered is gone.

## Tests

[`bezier-kernels.test.ts`](../../../src/bezeg/impl/kernels/bezier-kernels.test.ts), 60 tests:
- 1D–4D: de Casteljau equals the Bernstein sum (including t outside [0, 1]); the scheme starts with the net, ends with the point and leaves its input unchanged; subdivision halves re-evaluate to the original; extrapolation (t = −0.4, 0.6, 1.5) reproduces the original on its interval; elevation preserves samples.
- 1D–4D rational: the weighted recurrence, subdivision, extrapolation and elevation equal projected homogeneous Bernstein evaluation.
- Exact equality (`toEqual`) with [`pre-refactor-curves.json`](../../../src/bezeg/impl/kernels/pre-refactor-curves.json), generated from the unmodified curve classes at `a5bb2d0` before any source change: eval, full scheme (including the stale tail rows of each level), subdivide, extrapolate and elevate for cubic, circle-arc quadratic, quintic (scratch-row path) and linear nets, polynomial and rational. Checked both on the kernels and on the delegating curve classes, plus endpoint object identity after elevation, unchanged kernel inputs, and a characterization that rational subdivision/extrapolation use the stored weights while elevation uses the reactive ones (a mutation to reactive weights fails 4 tests).

Existing `de-casteljau-unified`, `bezier-evaluation`, `geometry*`, spline and PH golden tests pass with no changed expectations or snapshots (no test or snapshot file outside `src/bezeg/impl/kernels/` is modified).

### Deliberate mutations

Each mutation applied alone to `bezier-kernels.ts`, then `vitest run src/bezeg/impl/kernels src/bezeg/impl/curve` (169 tests); the file was restored afterwards.

| Mutation | Result |
| --- | --- |
| Swap `left`/`right` blend coefficients in `deCasteljauInPlace` | 87 failed, 8 of 11 files |
| Read the right subdivision net from the left diagonal (`level[0]`) | 24 failed, 4 of 11 files |
| Swap previous/current rows in polynomial `elevate` | 11 failed, 2 of 11 files |

## Checks

- `npx tsc --noEmit`: pass.
- `just check` (two runs at the final source): typecheck, lint and 3708 of 3709 unit tests pass; `just check` stops before its build step, and a separate `vite build` of the same source (the drag measurement's B bundle) succeeded. The one failure in both runs was a 120 s timeout in the real-graph test `lessonRestoration.part4.test.tsx` › circle › "closing the lesson restores…" under full parallel load. Alone, the file passes (22/22). Three alternating isolated runs of that test took 33.9, 29.6 and 41.4 s at `a5bb2d0` versus 29.3, 25.8 and 32.0 s with this change, so the refactor does not slow it; the timeout is load-induced.
- Review subagent (mathematical correctness and engineering constraints): no behavioural differences. Its test-gap notes on unmutated inputs and stored/reactive weights were addressed. Remaining known limits: the JSON fixture cannot represent `-0`, NaN or Infinity, and the non-2D branch is covered by property tests with tolerance rather than recorded values.

## Drag measurement

Method as in [per-curve geometry versions](../../bezier-performance-results.md#per-curve-geometry-versions--2026-10-12): headless Chromium 156.0.8078.4 (Playwright), Windows 11, viewport 1600×1000, production builds served under `/bezeg-2.0/`. A = `a5bb2d0` (before), B = this change. Each run opens a fresh page, presses on the second free control point, and makes 2 warm-up and 6 measured repetitions of 90 pointer moves around a 120×80 px ellipse, with a double-rAF wait per move. Metric: synchronous handler time from a capture-phase `pointermove` to the next task (MessageChannel). Builds alternate A/B/A/B/A/B; three runs per side are pooled (1620 events per scene per side). Final visible point coordinates (3 decimals) were identical across all runs of both builds in every scene. De Casteljau construction was in its default state.

| Scene | Median A → B (ms) | p95 A → B (ms) | Per-run medians A / B (ms) |
| --- | --- | --- | --- |
| Bézier (`/bezier/curve`), drag control point | 5.4 → 5.3 | 9.3 → 9.1 | 5.9, 4.8, 5.7 / 4.8, 5.2, 5.9 |
| De Casteljau (`/bezier/decasteljau`), drag control point | 6.1 → 5.8 | 10.8 → 10.8 | 5.7, 7.1, 5.6 / 6.9, 6.1, 5.1 |
| Rational De Casteljau (`/rational/rational-decasteljau`), drag control point | 4.3 → 4.6 | 6.4 → 7.8 | 4.3, 4.4, 4.3 / 5.0, 4.6, 4.3 |

The two required scenes (Bézier, De Casteljau) show no regression; their per-run medians overlap. The extra rational scene differs by 0.3 ms median, within the 1–2 ms run-to-run noise recorded for this method, with the slowest B run first and the last pair equal. No speed-up is claimed. Phone and CPU-throttled runs were not made. The harness was kept outside the repository.
