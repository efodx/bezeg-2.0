# 06 — Show unavailable Monte Carlo results before sampling

Status: planned, 2026-11-18. Source: [specification](../../specs/master-review-followups-2026-11.md#empty-monte-carlo-readouts--m5), MC1–MC3. Finding M5. Dependencies: none.

## Outcome and scope

Zero observations produce an honest empty statistical readout. Own SimulationGraph.tsx:readoutRows/resetRun, affected shared-readout usage and bilingual strings. Reuse the controls catalogue's existing unavailable/readout conventions.

## Work

1. Reproduce the actual area-experiment Replay flow. Assert shown count zero and the existing numerical-zero estimate/error/standard-error defect.
2. Represent unavailable results distinctly from numerical zero. Keep count zero and absent estimate markers; avoid fabricating an estimate or uncertainty.
3. Verify the transition to the first sample and back through Replay, experiment/seed changes and restored scenes. Align accessible announcements and both languages.

## Verification and completion

Use SimulationGraph.test.tsx and real control/readout assertions for MC1–MC3. Require readout elements to exist; verify zero-sample text, valid first-sample values, a genuinely measured zero, playback and scene restoration. Preserve deterministic seeded results.

Run focused `just unit`, `just check-changed`, localization typecheck/production build when strings change, mathematical review and `$smoke-tester` for Simulation free exploration and affected lessons. Check keyboard Replay and the readout at a 310 px inspector width. Close with pre-fix failure and verified revision.
