# 03 — Recognize exact Secant roots before recurrence

Status: planned, 2026-11-18. Source: [specification](../../specs/master-review-followups-2026-11.md#secant-termination--m1), RF1–RF3. Finding M1. Dependencies: none; precedes custom-formula Newton/Secant integration.

## Outcome and scope

A new exact root is reported as root-found even when it equals an earlier iterate. Keep this a bounded correction in analysis/rootFinding.ts, its model/graph consumers and regression tests.

## Work

1. Record the failing public-model case: x³ − x, Secant starts 0 and 2, step 1, history [0,2,0], residual 0 and incorrect repeated-iterate.
2. Fix termination precedence without changing the accepted starts, iteration formula, step accounting or existing approximate-convergence policy.
3. Check consumers use the corrected history consistently for status, construction and playback stopping. Preserve real non-root cycles and all existing failure reasons.

## Verification and completion

Cover RF1–RF3 in rootFinding.test.ts, rootFindingModel.test.ts and the real RootFinding graph. Include reversed starts, a root coinciding with an earlier iterate, genuine recurrence, equal function values, non-finite values and step cap. Compare the tangent/secant and current iterate with independent calculations.

Run focused `just unit`, then `just check-changed`; use mathematical review and `$smoke-tester` on Root finding free exploration and its affected guided flow. Exercise step/play, Reset, Preset reopen and lesson restoration. Record the pre-fix failing assertion and accepted revision. Broader custom-function contracts belong to the formula tasks.
