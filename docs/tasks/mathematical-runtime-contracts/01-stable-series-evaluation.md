# 1. Stable geometric-series evaluation

Status: accepted 2026-11-07 ([evidence](01-stable-series-evidence.md)). Source: [specification, section 1](../../specs/mathematical-runtime-contracts.md#1-stable-geometric-series-evaluation), acceptance N1–N3 and shared verification. Priority: first; independent of the other tasks. Finish before task 4 migrates its graph host.

## Scope and entry points

Start at `src/analysis/geometricSeries.ts`, `src/analysis/geometricSeriesModel.ts` and `src/graphs/functions/GeometricSeriesGraph.tsx`, with their mathematical and real-host tests. Recheck current callers before choosing the evaluation interface. Keep model validity, domains, teaching behavior and supported stored data unchanged.

## Work and completion

1. Preserve failing-before checks for both reproduced cases in the source spec. Use an independent exact or higher-precision reference for near-one sums and a directly evaluated mathematical tail for the strict tolerance threshold; a copy of the chosen implementation is not an independent oracle.
2. Put stable finite sums, prefix sums, limits and tail decisions behind one pure evaluation owner. Make graph bars/captions/readouts and the model's view/status calculations consume coherent results. Existing helper exports may delegate without forcing a caller-wide rewrite.
3. Cover the numerical boundaries in N2 and maintain N3's lesson/playback semantics. Add a real-host assertion relating the last plotted partial sum to the reported value, and exercise the tolerance status with a genuinely accepted small tolerance.
4. Complete N1–N3 and shared verification. Retain the failure evidence and explain numerical tolerances and any deliberate use of distinct stable formulas for the sum and tail.

## Verification and return

Start with `just unit src/analysis/geometricSeries.test.ts src/analysis/geometricSeriesModel.test.ts src/graphs/functions/GeometricSeriesGraph.host.test.tsx`, adapting paths only if the files have moved. Run typecheck, relevant lesson/math contracts, final unit suite, lint and production build. Delegate production smoke of the published geometric-series workflow: edits, tolerance, playback, Reset, Preset restore and language switch, observing controls and the board.

Return changed callers, before/after regressions, mathematical reference/tolerance rationale, exact revision and check results, and named gaps. Record acceptance in the queue only after all criteria are accounted for.
