# 01 — Introduce a bounded, domain-aware formula evaluator

Status: planned, 2026-11-18. Source: [shared formula support](../../specs/custom-function-entry.md#shared-formula-support), mathematical behavior and acceptance 3. Dependencies: accepted [Secant termination repair](../master-review-followups-2026-11/03-secant-termination.md) and Contracts live-model/Controls foundations; verify current owners before editing shared interfaces. Grammar/dependency investigation can start earlier, but shared kernel changes wait for the repair.

## Outcome and scope

A small pure module accepts supported source text and compiles reusable finite-real evaluation, with typed domain failures and optional differentiation. Built-ins adapt to the same consumer interface while keeping their serializable IDs. Expose only capabilities consumers need; library types and compiled representations stay internal.

## Work

1. Define the accepted grammar, precedence, real-domain behavior and limits from the source spec. Define how consumers distinguish unavailable derivative/reference information and established, absent or unknown continuity knowledge.
2. Evaluate the named library candidate against a bounded dedicated implementation. Consult current primary documentation at implementation time, review actual dependency/grammar behavior and measure raw/compressed production chunks with the required subset. Record the consequential choice and alternatives; selecting a dependency is part of this task, not already decided.
3. Implement source validation and reusable evaluation with limits before expensive work. Bound differentiation too. Preserve the original function domain even if a derivative simplifies to a wider expression; undefined/complex/non-finite results must never become a fake numeric value.
4. After the Secant repair is accepted, adapt the pure Bisection and Newton/Secant kernel entry interfaces to accept the needed evaluator capabilities while preserving legacy built-in wrappers/results. Retain the exact-root regression, including [0,2,0] with one step and reversed [2,0] with zero steps. Keep each numerical algorithm's rules local. Avoid requiring a derivative or known reference root for Secant.
5. Document the interface and cache lifetime: compile per committed/restored function, reuse across samples/steps, serialize only source/IDs. Leave editor and graph integration to 02/03.

## Verification and completion

Cover the source spec's grammar/rejection/limit matrix, precedence, accepted names, real-domain edges, derivative unavailability and simplification/domain examples. Compare built-in histories and geometry against independent existing fixtures, and rerun the accepted Secant repair through the migrated entry points. Demonstrate consumers/tests use the same small interface and no library types escape it.

Run focused `just unit`, typecheck and production bundle measurements, then appropriate integrated checks. Obtain engineering/mathematical review. If only pure internals change with behavior-preserving regression coverage, browser smoke is unnecessary here; any changed shipped rendering/interaction path requires the affected route smoke. Record the decision, measurements, preserved built-in compatibility and remaining route acceptance owned by 02/03.
