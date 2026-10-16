# 10. Sequence convergence

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md), C1

**Dependencies:** Batch B released ([09](09-batch-b-release.md)); iterative playback ([00](00-family-and-playback.md), ADR 0012, ADR 0013)

**Status:** not started

## Part A: mathematics (`src/analysis/sequence.ts`, `sequenceModel.ts`)

- Named examples for integer `n >= 1`: `reciprocal` `1/n` (default, limit `0`), `alternating-reciprocal` `(-1)^n/n` (limit `0`), `alternating-sign` `(-1)^n` (no limit), `natural` `n` (diverges to infinity).
- The term `a_n` and the distance `|a_n - L|` to a candidate limit `L`.
- Certificate for a chosen `epsilon > 0`, candidate `L` and threshold `N`. It is formula-backed and never derived from a finite window of terms:
  - For a convergent example with `L` equal to its limit: `|a_n - 0| = 1/n <= 1/N` for every `n >= N`, so `N` works exactly when `N epsilon > 1`. The least working threshold is `N_min = floor(1/epsilon) + 1`. Compare without the rounding of `1/epsilon` (for example, check `N_min * epsilon > 1 >= (N_min - 1) * epsilon` in a test across the epsilon grid).
  - If `N` does not work, report the first failing index `n = N` (`|a_N - L| >= epsilon`).
  - For `L` different from the limit of a convergent example, give no certificate and say `L` is not the limit.
  - For `alternating-sign`, give no certificate. For every `L`, consecutive terms `1` and `-1` are `2` apart, so for `epsilon <= 1` at least one of them is at distance `>= 1 >= epsilon` from `L`, at indices beyond every `N`. For `epsilon > 1`, a band can contain every term; say that this single epsilon is satisfied but convergence requires every `epsilon > 0`.
  - For `natural`, give no certificate. `a_n > L + epsilon` for every `n > L + epsilon`, so the terms leave every band for good.
- Bounded domains (document the constants): `epsilon` in `[0.01, 2]` on a `0.01` grid, `L` in `[-2, 2]`, `N` an integer `1..1000`, and revealed terms `terms` an integer `1..SEQUENCE_MAX_TERMS` (for example, `40`).
- A threshold beyond the revealed or visible index range is reported as such ("N = 101 is beyond the shown terms n <= 40; the bound holds for all n >= N by the formula"). It is never truncated to the window.
- Model: `{example, epsilon, limit, threshold, terms, certificateVisible}`, validated by the parser. Reject invalid values; never clamp them.

## Part B: graph (`src/graphs/functions/SequenceGraph.tsx`)

- Points `(n, a_n)` for `n = 1..terms`, the band `L +- epsilon` as a shaded strip with dashed edges, the line `y = L`, and a vertical marker at `n = N`. Terms inside and outside the band differ by shape, not by colour alone.
- Controls: example select; native number fields for `epsilon`, `L`, `N`; Next step (reveal one more term), Play/Pause and Reset (back to one term) through `IterationController`; a Show certificate button.
- Edits to the example, `epsilon`, `L` or `N` pause playback. Changing the example loads its default model with `terms = 1` and the certificate hidden.
- Playback stops at `SEQUENCE_MAX_TERMS`.

## Part C: lesson

5–7 steps:
1. Prerequisites and the definition with its quantifiers, using `1/n` with the band.
2. Learner picks `N` for `epsilon = 0.1`, then the certificate reveal (`N_min = 11`).
3. A smaller `epsilon` whose `N_min` lies beyond the shown terms.
4. `(-1)^n/n`.
5. `(-1)^n`: a band that contains a finite window of terms is no certificate.
6. `n`.
7. Handoff.

Add `sl`/`en` content, tests and a smoke row.

## Vocabulary (closed names)

- Parameters: `sequence-epsilon`, `sequence-limit`, `sequence-threshold`.
- Visibility target: `sequence-certificate`.
- Choice: `sequence-example` with the four ids above.
- Animation id `sequence` (commands `play`, `pause`, `replay`, `next-step`, `reset`) and scene action `run-sequence-command` (`next-step` | `reset`), following ADR 0013.
- Preset collection `sequence`, route `/bezeg-2.0/analysis/sequence`, demonstration id `sequence`.

## Acceptance criteria

- For `1/n` and `(-1)^n/n` and every `epsilon` on the grid, `N = floor(1/epsilon) + 1` satisfies `|a_n - 0| < epsilon` for every `n >= N` (proved by the `1/N` bound and checked at `n = N` and beyond), and `N - 1` fails at `n = N - 1` when `N > 1`.
- `alternating-sign` and `natural` never receive a certificate, whatever the window, `epsilon` or `L`.
- A threshold beyond the visible range is reported honestly. `epsilon <= 0` is rejected.
- Next step applied k times and k played steps give the same model. Playback stops at the limit, pauses on edits, scene changes and capture, and never starts on preset load.
- Controls and lesson actions give equivalent configurations. Presets round-trip, and invalid data gets an actionable error.
