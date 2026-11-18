# 03 — Recognize exact Secant roots before recurrence

Status: done, 2026-11-19, commit 63fcb48d; mathematical review, verified by focused unit tests, `just check-changed` at bdb27583 and browser smoke. Source: [specification](../../specs/master-review-followups-2026-11.md#secant-termination--m1), RF1–RF3. Finding M1. Dependencies: none; precedes the [formula evaluator's kernel adapters](../custom-function-entry/01-formula-evaluator.md) as well as Newton/Secant graph integration.

## Outcome and scope

A new exact root is reported as root-found even when it equals an earlier iterate. Keep this a bounded correction in analysis/rootFinding.ts, its model/graph consumers and regression tests.

## Work

1. Record a failing correct-behavior assertion for x³ − x, Secant starts 0 and 2, step budget 1: history [0,2,0], residual 0, one step taken and root-found. The current defect returns repeated-iterate. Reversed starts 2 and 0 already have a current root: require [2,0], zero steps taken and root-found, rather than forcing another step.
2. Fix termination precedence without changing the accepted starts, iteration formula, step accounting or existing approximate-convergence policy.
3. Check consumers use the corrected history consistently for status, construction and playback stopping. Preserve real non-root cycles and all existing failure reasons.

## Verification and completion

Cover RF1–RF3 in rootFinding.test.ts, rootFindingModel.test.ts and the real RootFinding graph. Assert histories, steps taken and termination together for both starting orders. Include a root coinciding with an earlier iterate, genuine non-root recurrence, equal nonzero function values, non-finite values and step cap. Preserve the existing approximate-convergence cases. Compare the tangent/secant and current iterate with independent calculations. Hand the accepted regression to the formula evaluator task before it changes this kernel interface.

Run focused `just unit`, then `just check-changed`; use mathematical review and `$smoke-tester` on Root finding free exploration and its affected guided flow. Exercise step/play, Reset, Preset reopen and lesson restoration. Record the pre-fix failing assertion and accepted revision. Broader custom-function contracts belong to the formula tasks.
