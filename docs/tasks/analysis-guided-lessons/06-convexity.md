# 6. Convexity and concavity

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md) — B2

**Dependencies:** Batch A released ([04](04-batch-a-release.md))

**Status:** not started

## Part A — mathematics (`src/analysis/convexity.ts`, `convexityModel.ts`)

- Named examples: `x^2` (default), `-x^2`, `x^3`, `x^4`, each with value, first and second derivative.
- Chord endpoints `a < b` and an independent tangent point `t`, all in a documented range (for example `[-2, 2]`).
- Second-derivative sign on an interval, computed analytically: `nonnegative`, `nonpositive`, or `changes` (`x^3` across `0`). `x^4` has `f''(0) = 0` and `f'' >= 0` everywhere, so it is convex with no inflection.
- Inflection points: points where `f''` changes sign (`x^3` at `0`; none for `x^4`).
- Comparisons on `[a, b]`: whether the graph lies below/above the chord, and whether it lies above/below the tangent at `t`. Claims are derived from the second-derivative hypothesis on the interval, not from sampling; when the sign changes on the interval, no claim is made.
- Model: `{example, a, b, t, secondDerivativeVisible}` validated by the parser (reject, never clamp).

## Part B — graph (`src/graphs/functions/ConvexityGraph.tsx`)

- Draggable chord endpoints and tangent point with native number fields; example select.
- Chord, tangent line, and a textual verdict for the interval `[a, b]` (convex, concave, or no claim with the reason). The tangent comparison is stated on `[a, b]` only when `t` lies in `[a, b]` and the hypothesis holds there.
- A **Show second derivative** reveal (visibility target) shows the sign of `f''` on the view (for example a sign strip or the `f''` graph) and the inflection point, if any.

## Part C — lesson

5–7 steps: prerequisites and the second derivative; `x^2` chord prediction then the inequality; tangent comparison; `-x^2` reverses both; `x^3` sign change and inflection at `0` (claims restricted to `[0, 2]` or `[-2, 0]`); `x^4` with `f''(0) = 0` and no inflection; handoff. `sl`/`en` content, tests, smoke row.

## Acceptance criteria

- Convex examples on an interval: graph below each chord, above each tangent with `t` in the interval; concave examples reverse both. Verified with an independent check (for example exact polynomial identities such as `f(x) - chord(x) = (x - a)(x - b)` for `x^2`).
- `x^3` on an interval containing `0` in its interior: the verdict is "no claim" with the sign change named; on `[0, 2]` it is convex.
- `x^4` on `[-1, 1]`: convex, `f''(0) = 0`, no inflection point.
- Controls and lesson actions produce equivalent configurations; presets round-trip; invalid data is rejected with an actionable error.
