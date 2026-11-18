# 06 — Show unavailable Monte Carlo results before sampling

Status: planned, 2026-11-18. Source: [specification](../../specs/master-review-followups-2026-11.md#empty-monte-carlo-readouts--m5), MC1–MC3. Finding M5. Dependencies: none.

## Outcome and scope

Zero observations produce an honest empty statistical readout. Own the area-mode paths in `src/graphs/random/SimulationGraph.tsx`: `readoutRows`, `statusText`, Replay/reset and live announcements, plus affected shared-readout usage and bilingual strings. Reuse the controls catalogue's existing unavailable/readout conventions. Other simulation experiments and the standard-error formula stay outside this repair.

## Work

1. Reproduce the actual area-experiment Replay flow. Record a failing correct-behavior assertion for unavailable sample share, estimate, error and standard error at shown count zero. Include the visible status and live announcement, which also currently substitute a zero estimate.
2. Represent unavailable results distinctly from numerical zero across all those surfaces. Keep counts at zero and estimate markers absent; do not format an unavailable result as a number or as a zero-width uncertainty interval.
3. Verify the transitions in the source specification's sample-count table, using deterministic first points inside and outside the disc. A measured zero estimate is still numerical and has nonzero signed error and theoretical standard error. Return to the unavailable state through Replay and applicable experiment/seed changes/restoration. Align announcements and both languages without changing seeded results.

## Verification and completion

Use SimulationGraph.test.tsx and real control/readout assertions for MC1–MC3. Require all four readout rows and status elements to exist. Check the source sample-count table against independently calculated values, allowing only display rounding; inspect the live announcement as well as visible text. For zero samples require no estimate marker, and for a positive sample count require its measured position even when the estimate is zero. Cover playback, Replay, language switching and scene restoration. Preserve deterministic seeded results.

Run focused `just unit`, `just check-changed`, localization typecheck/production build when strings change, mathematical review and `$smoke-tester` for Simulation free exploration and affected lessons. Check keyboard Replay and the readout at a 310 px inspector width. Close with pre-fix failure and verified revision.
