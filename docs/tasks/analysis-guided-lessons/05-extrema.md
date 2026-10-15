# 5. Extrema

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md) — B1

**Dependencies:** Batch A released ([04](04-batch-a-release.md))

**Status:** not started

## Part A — mathematics (`src/analysis/extrema.ts`, `extremaModel.ts`)

- Named examples: `x^2` (default), `x^3`, `|x|`, `sin x`. Each provides value, derivative (`undefined` where it does not exist), and analytic stationary points and corners in an interval; no sampling.
- For a closed interval `[a, b]`, `a < b`, both in a documented bounded range (for example `[-4, 4]`, which holds the extrema `+-pi/2` of `sin`): the candidate list is the endpoints, the interior stationary points (`f' = 0`) and the interior corners (`f'` undefined), ascending and without duplicates.
- Derivative sign on each open piece between consecutive candidates (positive, negative, or zero for a constant piece) from the analytic derivative at an interior point of the piece.
- Classification of every candidate, **relative to the selected interval** (one-sided neighbourhoods at the endpoints; the module and the UI state this convention): local minimum, local maximum, or neither; global minimum and global maximum with ties (all candidates attaining the extreme value, compared with a documented tolerance that is far below the display precision).
- Model: `{example, a, b, revealed}` with `a < b`, validated by the parser (reject, never clamp).

## Part B — graph (`src/graphs/functions/ExtremaGraph.tsx`)

- Draggable `a`, `b` on the x-axis with native labelled number fields; an example select.
- Show endpoint values, stationary points, corners (marked as "derivative does not exist"), and derivative signs per piece (text such as `+`/`−` marks and a readout, not colour only).
- **Show classification** (`revealed`) reveals local/global labels after exploration; before the reveal, candidates are marked but not classified.

## Part C — lesson

5–7 steps: prerequisites and the convention (local relative to the interval); `x^2` on an interval with an endpoint maximum, prediction before reveal; `x^3` at `0` (stationary, not an extremum); `|x|` at `0` (minimum without a derivative); `sin x` with several extrema and a tie (for example `[0, pi]`, where both endpoints share the global minimum `0`); handoff. `sl`/`en` content, tests, smoke row.

## Acceptance criteria

- `x^2` on `[-1, 2]`: candidates `-1, 0, 2`; global minimum `0` at `x = 0`, global maximum `4` at `x = 2`, `x = -1` a local maximum relative to the interval.
- `x^3` on `[-1, 1]`: `0` is stationary and neither a local minimum nor maximum.
- `|x|` on `[-1, 1]`: `0` is a corner with undefined derivative and the global minimum; `-1` and `1` tie as global maximum.
- `sin x` on `[-4, 4]`: stationary points `+-pi/2`; the global maximum `1` at `pi/2` and minimum `-1` at `-pi/2`; endpoint values are included in the comparison.
- Setting `a`, `b`, the example, and the reveal through controls and through lesson actions yields equivalent configurations; presets round-trip and invalid data (`a >= b`, out of range) is rejected with an actionable error.
