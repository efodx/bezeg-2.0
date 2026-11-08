# 1. Rendered appearance contracts

Status: accepted 2026-11-08 by the Controls handler (test-only; no defects found); evidence in [01-appearance-contracts.evidence.md](01-appearance-contracts.evidence.md). In [Controls](../feature-streams/controls.md) step 3a. Source: [rendered graph style contracts](../../specs/rendered-graph-style-contracts.md), acceptance criteria 1–9 (canonical there; not repeated here).

## Scope and entry points

Start from the existing real-renderer control-point regression test (search for the JSXGraph SVG fixture that asserts rendered marker `fill`/`stroke`), the rational weight selection tests, the figure-capture and SVG math-label tests, and the production browser suites in `tests/`. Test-only: the contracts observe current intended behaviour. A production-code change is in scope only when a contract exposes a real appearance defect; record it with its failing evidence.

## Work and completion

1. Unit, real renderer: one table-driven check over the editable, fixed/derived, construction, result and spline-join marker roles, plus a PH auxiliary-board representative (criteria 1, 2, 4, 8). Record the colour-alias mutation result (criterion 2).
2. Production browser: hover and rational selection transitions (criterion 3), size and visibility controls (criterion 7), and real SVG and PNG downloads through the Save controls from one settled scene (criteria 5, 6). Wire them into an existing smoke spec or recipe; add no screenshot framework.
3. Evidence beside this file (`01-appearance-contracts.evidence.md`): role table, mutation result, export checks with tolerances, skipped coverage.

## Verification

`just typecheck`, `just lint`, `just check-changed`, `just build`, and the affected production browser specs through `just smoke-built`. Browser export coverage is the smoke for this task.
