# 8. Taylor approximation

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md) — B4

**Dependencies:** Batch A released ([04](04-batch-a-release.md))

**Status:** not started

## Part A — mathematics (`src/analysis/taylor.ts`, `taylorModel.ts`)

- Named examples with closed-form Taylor coefficients (no symbolic engine):
  - `e^x`: `e^c / k!`;
  - `sin x`: the derivative cycle `sin, cos, -sin, -cos` at `c`, divided by `k!`;
  - `1/(1 - x)`: `1 / (1 - c)^(k + 1)`, defined for `c < 1`, series converges for `|x - c| < 1 - c`;
  - the flat function `e^(-1/x)` for `x > 0`, `0` for `x <= 0`, at the fixed center `0`: all coefficients `0`.
- Degree `n` from `0` to a documented limit (for example `10`); center and evaluation point in documented per-example domains (`1/(1 - x)` keeps both below `1`; the flat example keeps the center at `0`).
- `T_n(x)`, signed error `f(x) - T_n(x)`, absolute error.
- Lagrange remainder bound `M |x - c|^(n+1) / (n + 1)!` with `M` a justified bound of `|f^(n+1)|` between `c` and `x`: `max(e^c, e^x)` for `e^x`; `1` for `sin`; `(n + 1)! / (1 - max(c, x))^(n + 2)` for `1/(1 - x)`. No bound for the flat example (state why).
- Model: `{example, center, degree, x, boundVisible}` validated by the parser (reject, never clamp).

## Part B — graph (`src/graphs/functions/TaylorGraph.tsx`)

- `f` and `T_n` distinguishable by pattern and label; draggable center and evaluation point with number fields; degree control (field or stepper); example select.
- Readout: `T_n(x)`, `f(x)`, signed and absolute error, and (after **Show error bound**) the bound with its hypothesis; for `1/(1 - x)` the convergence interval `|x - c| < 1 - c` is indicated.
- Keep finite-polynomial approximation distinct from series convergence in the wording.

## Part C — lesson

5–7 steps: prerequisites (higher derivatives, factorials); `e^x` about `0` with `T_1(1) = 2`, `T_3(1) = 8/3`, `T_6(1) = 1957/720`, prediction before the bound reveal; `sin x` and the bound `|x - c|^(n+1) / (n + 1)!`; `1/(1 - x)` outside the convergence interval, where raising the degree makes the error larger; the flat function: all coefficients vanish but `f(x) > 0` for `x > 0`; handoff. `sl`/`en` content, tests, smoke row.

## Acceptance criteria

- `e^x` about `0`: `T_1(1) = 2`, `T_3(1) = 8/3`, `T_6(1) = 1957/720`.
- The displayed bound is at least the actual absolute error for every example where it is shown, checked against independent reference values (not the same formula).
- `1/(1 - x)` about `0` at `x = -1.5` (outside `|x| < 1`): the error grows with the degree, so higher degree does not imply improvement everywhere.
- Flat example: `T_n = 0` for every `n` and `f(1) = e^(-1) > 0`.
- Controls and lesson actions produce equivalent configurations; presets round-trip; invalid data is rejected with an actionable error.
