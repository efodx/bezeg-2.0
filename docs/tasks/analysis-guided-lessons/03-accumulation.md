# 3. Accumulated integral and FTC

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md) — A3

**Dependencies:** [00](00-family-and-playback.md) (family only)

**Status:** not started

## Part A — mathematics (`src/analysis/accumulation.ts`, `accumulationModel.ts`)

- Reuse the exact antiderivatives in `src/analysis/functions.ts` (`sin`, `square`, `exp`). `A(x) = F(x) - F(a)` evaluated exactly, so the orientation for `x < a` follows from the formula rather than from shading logic.
- Tangent to `A` at `x` with slope `f(x)`.
- Model: `{fn, a, x, accumulationVisible}`; the accumulation curve starts hidden so the lesson can ask for an area prediction first.

## Part B — graph (`src/graphs/functions/AccumulationGraph.tsx`)

- Plot `f` and `A` with distinct labels and legend text, not colour alone. Decide in review whether one board or coordinated views keep both readable at projection and narrow widths; record the choice in the task notes.
- Shade signed area between `a` and `x` with positive and negative parts distinguishable, and show the tangent to `A` at `x` with its slope.
- Controls for `fn`, `a`, `x`, and the accumulation reveal; lesson actions for the same.

## Part C — lesson

5–7 steps: prerequisites, an area prediction before revealing `A`, the default `sin` values, negative integrand decreasing `A`, `x < a` orientation, `A'(x) = f(x)` with continuity as the sufficient hypothesis, and a handoff. `sl`/`en` content, tests, smoke row.

## Acceptance criteria

- Default `sin`, `a = 0`: `A(0) = 0`, `A(π) = 2`, `A(2π) = 0`; the tangent slope at `x` equals `f(x)` for each example.
- `x < a` gives `A(x) = -∫_x^a f`; regions with `f < 0` decrease `A`; the readout never reports unsigned geometric area as the integral.
- Presets round-trip with the reveal state; out-of-domain values are rejected with an actionable error.
