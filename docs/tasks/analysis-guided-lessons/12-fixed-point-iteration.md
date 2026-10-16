# 12. Fixed-point iteration

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md), C3

**Dependencies:** Batch B released ([09](09-batch-b-release.md)); iterative playback ([00](00-family-and-playback.md), ADR 0012, ADR 0013)

**Status:** not started

## Part A: mathematics (`src/analysis/fixedPoint.ts`, `fixedPointModel.ts`)

- Named examples on a closed interval `[a, b]`:
  - `affine`: `T(x) = (x + 1)/2` on `[0, 2]` (default). Fixed point `1`; contraction factor `q = 1/2`, because `|T'| = 1/2`.
  - `cosine`: `T(x) = cos x` on `[0, 1]`. `cos` maps `[0, 1]` into `[cos 1, 1]`, a subset of `[0, 1]`; `|T'(x)| = sin x <= sin 1 = q < 1`. Fixed point about `0.7390851332`; give an independent reference value in the tests, not one computed by the module.
  - `reflection`: `T(x) = 1 - x` on `[0, 1]`. Self-map with `|T'| = 1`, so it is not a contraction. Fixed point `1/2`; every other start forms the two-cycle `x0, 1 - x0`.
- State the hypotheses per example as data: a closed (complete) interval, the self-map condition with its reason, and the contraction factor `q` with its reason (mean value theorem bound on `|T'|`) or "no `q < 1`".
- A deterministic history `x_0, ..., x_k` from validated inputs, never from imported arrays. The step `k` is an integer `0..FIXED_POINT_MAX_STEPS` (for example, `60`).
- Error bounds, only where `q < 1`:
  - a priori `|x_k - x*| <= q^k/(1 - q) |x_1 - x_0|`;
  - a posteriori `|x_k - x*| <= q/(1 - q) |x_k - x_{k-1}|`.
  Name their prerequisites. For `reflection`, show no bound and say why.
- Tolerance `10^-d` with `d` an integer `1..8`. Termination:
  - the iteration limit;
  - the requested threshold (a posteriori bound `< 10^-d`, contractions only);
  - numeric stagnation (`x_k == x_{k-1}` in floating point), reported as stagnation and never as an exact fixed point.
  - The two-cycle of `reflection` is detected and reported; account for floating-point drift of `1 - (1 - x0)`, for example by exact arithmetic on the `0.01` grid of `x0`.
  - Only a start that equals an analytically known fixed point (`1`, `1/2`) exactly may be called the fixed point.
- `x0` lies in the example's interval on a `0.01` grid.
- Model: `{example, x0, step, digits, boundVisible}`. Reject invalid values; never clamp them.

## Part B: graph (`src/graphs/functions/FixedPointGraph.tsx`)

- `y = T(x)` and `y = x` on the interval, the interval box, and cobweb segments: a vertical segment from `(x_k, x_k)` to `(x_k, T(x_k))`, then a horizontal one to `(x_{k+1}, x_{k+1})`.
- Show the current value `x_k` on the x-axis and the step count.
- After Show error bound, show the bound value with its formula and hypotheses.
- Controls: example select; native number fields for `x0` and the tolerance digits; Next step, Play/Pause and Reset through `IterationController`; a Show error bound button.
- Editing `x0`, the example or the tolerance pauses playback and resets the step to `0`. Playback stops at the limit, the threshold, stagnation or (for `reflection`) the iteration limit, with a textual reason.

## Part C: lesson

5–7 steps:
1. Prerequisites (composition, sequence convergence), the cobweb for `affine` from `x0 = 0`.
2. Prediction of the next iterate, then Next step.
3. Contraction `q = 1/2`, the bound, and the threshold.
4. `cos x` on `[0, 1]`: self-map, `q = sin 1`, a posteriori bound.
5. Stagnation is not an exact root.
6. `1 - x`: a two-cycle; failure of the hypothesis does not prove divergence.
7. Handoff.

Add `sl`/`en` content, tests and a smoke row.

## Vocabulary (closed names)

- Parameters: `fixed-point-x0`, `fixed-point-digits`.
- Visibility target: `fixed-point-bound`.
- Choice: `fixed-point-example` (`affine`, `cosine`, `reflection`).
- Animation id `fixed-point` and scene action `run-fixed-point-command` (`next-step` | `reset`), following ADR 0013.
- Preset collection `fixed-point`, route `/bezeg-2.0/analysis/fixed-point`, demonstration id `fixed-point`.

## Acceptance criteria

- `affine` has fixed point `1` and `q = 1/2`. From `x0 = 0`: `x_k = 1 - 2^-k`.
- `cosine` has `q = sin 1 < 1` and its bounds contain the true error, measured against an independent reference fixed point, at every step shown.
- `reflection` shows a two-cycle from `x0 != 1/2`, no bound, and no claim of divergence.
- Playback stops at the iteration limit, the requested threshold or stagnation, with the reason stated. No exact root is declared from rounded equality.
- Next step k times and k played steps give the same model. Playback pauses on edits, scene changes and capture, and never starts on preset load.
- Controls and lesson actions give equivalent configurations. Presets round-trip, and invalid data gets an actionable error.
