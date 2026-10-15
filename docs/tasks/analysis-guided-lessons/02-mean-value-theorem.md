# 2. Mean value theorem

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md) — A2

**Dependencies:** [00](00-family-and-playback.md) (family only)

**Status:** not started

## Part A — mathematics (`src/analysis/meanValue.ts`, `meanValueModel.ts`)

- Named examples: `x^2` on `[0, 2]` (default), `x^3` on `[-1, 1]`, `|x|` on `[-1, 1]`. Each provides value, derivative (or `undefined` where it does not exist), and the exact set of interior matching points for given `a < b`, computed analytically rather than by sampling.
- Secant slope for `a < b`; tangent at `a < c < b`; slope difference. An undefined derivative is returned as `undefined`, never `Infinity` or `NaN`.
- Model: `{example, a, b, c}` with `a < c < b`, validated by the parser.

## Part B — graph (`src/graphs/functions/MeanValueGraph.tsx`)

- Independent controls for `a`, `b`, and `c` (drag and numeric inputs); changing `c` never moves the secant endpoints.
- Show the secant, the tangent at `c` (hidden with an explanatory status at a corner), both slopes, and their difference; a displayed match tolerance is labelled as a numerical comparison.
- A **Show matching point** action reveals all interior matches (two for `x^3`, none for `|x|` on `[-1, 1]`).

## Part C — lesson

5–7 steps: prerequisites, the default example with a prediction before the reveal of `c = 1`, multiple matches for `x^3`, the `|x|` counterexample and the differentiability hypothesis, then a handoff. `sl`/`en` content, tests, smoke row.

## Acceptance criteria

- `x^2` on `[0, 2]` matches at `c = 1`; `x^3` on `[-1, 1]` matches at `c = ±1/√3`; `|x|` on `[-1, 1]` has secant slope `0`, no interior point with derivative `0`, and an undefined derivative at `0`.
- Setting `c` through a control and through a lesson action yields equivalent configurations; secant endpoints are unchanged.
- Presets round-trip; invalid orderings (`c` outside `(a, b)`, `a ≥ b`) are rejected with an actionable error.
