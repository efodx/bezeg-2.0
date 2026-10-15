# 7. Darboux sums

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md) — B3

**Dependencies:** Batch A released ([04](04-batch-a-release.md))

**Status:** not started

## Part A — mathematics (`src/analysis/darboux.ts`, `darbouxModel.ts`)

- Named examples: `x^2` on `[0, 2]` (default) and `sin x`, with the exact integral from an antiderivative.
- Equal partitions of `[a, b]`, `a < b`, in a documented range that contains `[0, 2 pi]`, with `n` subintervals. `n` is from `1` to a documented limit (for example `128`); **Refine** doubles `n` (bisecting every subinterval, so the partition is nested) and is unavailable at the limit.
- Exact infimum and supremum on each subinterval from the endpoint values and the critical points inside it (`0` for `x^2`, `pi/2 + k pi` for `sin`); no sampling.
- Lower sum, upper sum, exact integral, and the gap `U - L`.
- Model: `{example, a, b, n, lowerVisible, upperVisible}` (or equivalent) validated by the parser (reject, never clamp).

## Part B — graph (`src/graphs/functions/DarbouxGraph.tsx`)

- Draggable `a`, `b` with number fields; an `n` field and a **Refine** button; example select.
- Lower and upper rectangles distinguishable by pattern or outline as well as colour, totals, the exact integral, and the gap in a readout.
- Never call left/right sample sums lower/upper sums; the readout names the rectangles by infimum and supremum.

## Part C — lesson

5–7 steps: prerequisites (partition, infimum and supremum); `x^2` on `[0, 2]`, `n = 4`, predict which totals trap the integral, then `1.75 <= 8/3 <= 3.75`; refine and watch `L` increase and `U` decrease; `sin x` with a subinterval containing an interior maximum (the supremum is `1`, not an endpoint value), contrasting a left sample; handoff. `sl`/`en` content, tests, smoke row.

## Acceptance criteria

- `x^2` on `[0, 2]` with `n = 4`: `L = 1.75`, `U = 3.75`, integral `8/3`.
- For every example and valid input: `L <= integral <= U`; under refinement `L` is nondecreasing and `U` nonincreasing (tested over a sequence of refinements up to the limit).
- `sin x` on `[0, pi]` with `n = 1`: supremum `1` at `pi/2`, infimum `0`.
- Controls and lesson actions produce equivalent configurations; presets round-trip; invalid data (non-integer or out-of-range `n`, `a >= b`) is rejected with an actionable error.
