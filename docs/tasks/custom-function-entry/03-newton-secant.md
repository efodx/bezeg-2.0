# 03 — Reuse formulas in Newton and Secant

Status: planned, 2026-11-18. Source: [custom formulas specification](../../specs/custom-function-entry.md), acceptance 2, Newton/Secant portions of 3, and 4. Dependencies: accepted [Bisection pilot](02-bisection-pilot.md) and [Secant exact-root repair](../master-review-followups-2026-11/03-secant-termination.md).

## Outcome and scope

The existing Root finding route reuses the evaluator/editor for both methods. Newton can request a derivative; Secant needs only function values. Unknown reference roots produce no fabricated marker/error. Keep method-specific iteration and construction in their present mathematical owners.

## Work

1. Integrate the shared committed-source/editor contract with the root-finding model and collection, preserving built-in IDs, method switching and current starting-guess behavior.
2. Request and cache differentiation only when needed. Handle unavailable/undefined derivative, zero slope and invalid iterates explicitly while keeping the last valid construction. Enforce the original function's domain.
3. Keep Secant usable when differentiation is unavailable; preserve exact-root precedence and flat-denominator handling. Manual stepping and playback use the same transition.
4. Omit unknown reference-root markers/errors for custom functions and expose correctly labelled residual/step observables. Preserve existing built-in reference readouts.
5. Complete the source spec's persistence, draft, reset and lesson-restoration matrix; finalize route bundle measurements and architecture/capability documentation.

## Verification and completion

Independently calculate Newton from 1 and Secant from 0/1 for cos(x) − x, including displayed tangent/secant and later iterates. Cover sqrt(x)+1 at 0, derivative unavailability, nonzero residual with zero slope, equal Secant values, a domain-leaving iterate and simplification that would widen the original domain.

Test invalid Apply while playing, method and built-in/custom switching, both Reset actions, paused Preset reopen, file reimport, atomic invalid-import refusal and lesson early-exit/return/completion. Inspect controls and actual board objects. Retain the exact-root regression through both the built-in adapter and the equivalent custom `x^3 - x` evaluator, including the distinct histories and step counts for the two starting orders.

Run focused `just unit`, `just check-changed`, localization typecheck/build and engineering/mathematical/UI review. Use `$smoke-tester` for both methods and guided flows, both languages, keyboard/touch, 310 px inspector/narrow layouts and free-exploration Presentation mode. Close acceptance 2 and all remaining route-specific 3/4 items; record gaps explicitly.
