# 11. Uniform convergence

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md), C2

**Dependencies:** Batch B released ([09](09-batch-b-release.md))

**Status:** not started

## Part A: mathematics (`src/analysis/uniformConvergence.ts`, `uniformConvergenceModel.ts`)

- Named examples on the domain `[0, r]`:
  - `power`: `f_n(x) = x^n` (default `r = 0.8`). The limit is `0` for `x < 1` and `1` at `x = 1`.
  - `scaled`: `f_n(x) = x/n` (default `r = 1`). The limit is `0`.
- `r` lies in `[0.1, 1]` (grid `0.05`). `r = 1` for `power` is the non-uniform case.
- `n` is an integer `1..UNIFORM_MAX_N` (for example, `50`). The chosen point `x` lies in `[0, r]`, and `epsilon` lies in `[0.01, 1]`.
- Pointwise limit `f(x)`, pointwise error `|f_n(x) - f(x)|` and the pointwise threshold `N(x, epsilon)`, the least `n` with error `< epsilon`:
  - For `power` with `0 < x < 1`, the threshold grows without bound as `x -> 1`. Compute it exactly and cap it with an honest "beyond" report instead of a loop to infinity.
  - At `x = 0` and `x = 1`, the error is `0` for every `n`.
- Analytic supremum error over the whole domain. Never compute it by sampling:
  - `power` on `[0, r]` with `r < 1`: `r^n`, attained at `x = r`.
  - `power` on `[0, 1]`: `1`, for every `n`, and not attained, because `x^n < 1` for `x < 1` and the error is `0` at `x = 1`.
  - `scaled`: `r/n`, attained at `x = r`.
- Uniform threshold, the least `n` with supremum error `< epsilon`:
  - `power`, `r < 1`: the least `n` with `r^n < epsilon`.
  - `power`, `r = 1`: none for every `epsilon <= 1`.
  - `scaled`: `floor(r/epsilon) + 1`, with exact comparison as in task 10.
- Model: `{example, r, n, x, epsilon, supremumVisible}`. Changing `r` keeps `x` only if it stays in the domain; otherwise the setter rejects the change (never clamp), and the inspector explains why. Changing the example loads its default model.

## Part B: graph (`src/graphs/functions/UniformConvergenceGraph.tsx`)

- `f_n` on `[0, r]`, the limit drawn without joining its jump (for `power` with `r = 1`: the segment `y = 0` on `[0, 1)` with an open circle at `(1, 0)` and a filled point at `(1, 1)`), and the band `f +- epsilon` over the domain.
- Show the chosen point `x` with its pointwise error and `N(x)`. After Show supremum, show the supremum error, whether it is attained (and where), and the shared `N` or "no shared N".
- Controls: example select, native number fields for `r`, `n`, `x`, `epsilon`, `-`/`+` buttons for `n`, and a Show supremum button. The board's `n` is a parameter, not an iteration (the spec does not require playback here).

## Part C: lesson

5–7 steps:
1. Prerequisites, pointwise convergence of `x^n` on `[0, 0.8]` at a chosen point.
2. Supremum `0.8^n` and one shared `N`, with a prediction before the reveal.
3. The same functions on `[0, 1]`: `N(x)` grows as `x -> 1`.
4. Supremum `1` for every `n`, not attained; the limit has a jump.
5. A domain change is a new comparison, not convergence on the original domain.
6. `x/n` on `[0, 1]`: a uniform comparison with `N = floor(1/epsilon) + 1`.
7. Handoff.

Add `sl`/`en` content, tests and a smoke row.

## Vocabulary (closed names)

- Parameters: `uniform-r`, `uniform-n`, `uniform-x`, `uniform-epsilon`.
- Visibility target: `uniform-supremum`.
- Choice: `uniform-example` (`power`, `scaled`).
- Preset collection `uniform-convergence`, route `/bezeg-2.0/analysis/uniform-convergence`, demonstration id `uniform-convergence`.

## Implementation notes

- **Part A.** `src/analysis/uniformConvergence.ts` and `uniformConvergenceModel.ts`. `x` and `epsilon` lie on a `0.01` grid (the draft fixed no grid), so every threshold is computed exactly with integer (BigInt) arithmetic; a logarithm only proposes a starting candidate. On these grids the pointwise threshold never exceeds `459` (`x = 0.99`, `epsilon = 0.01`), below the cap `1000`. The shared `N` can exceed `UNIFORM_MAX_N = 50` (up to `90` for `power`, `101` for `scaled`); the graph reports that rather than truncating it. `uniformLimitPieces` describes the limit as a half-open segment plus an isolated point, so the graph cannot join the jump. `changeUniformR` rejects an `r` below the current `x` with the reason `x-outside-domain`.

## Acceptance criteria

- On `[0, r]`, `r < 1`, the supremum error of `x^n` is `r^n` (checked against independent values such as `0.8^5 = 0.32768`).
- On `[0, 1]` the pointwise limit is `0` for `x < 1` and `1` at `x = 1`. The supremum error is `1` for every finite `n` and is labelled "not attained".
- `x/n` has supremum `r/n` and the threshold `floor(r/epsilon) + 1`.
- The limit graph is never joined across its jump. Uniform convergence is never inferred from sampled errors.
- Controls and lesson actions give equivalent configurations. Presets round-trip, and invalid data (for example, `x > r` or `epsilon <= 0`) gets an actionable error.
