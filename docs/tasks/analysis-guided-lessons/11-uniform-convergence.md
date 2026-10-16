# 11. Uniform convergence

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md), C2

**Dependencies:** Batch B released ([09](09-batch-b-release.md))

**Status:** implemented (Batch C release pending)

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
- Uniform threshold, the least `n` such that the error is `< epsilon` at every `x` for all `m >= n` (the same as supremum `< epsilon` when the supremum is attained, and supremum `<= epsilon` when it is not):
  - `power`, `r < 1`: the least `n` with `r^n < epsilon`.
  - `power`, `r = 1`: none for `epsilon < 1`; `N = 1` at `epsilon = 1` (the largest allowed), because the supremum `1` is not attained and every error `x^n` is below `1`.
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
- **Part B: graph.** `UniformConvergenceGraph` (`src/graphs/functions/`, route `/analysis/uniform-convergence`, collection `uniform-convergence`). Model `{example, r, n, x, epsilon, supremumVisible}`; `n` is a plain parameter (number field and `-`/`+` buttons, no playback). Choosing an example loads its model (supremum hidden). Setters reject, never clamp: values within 1e-9 of a grid step are snapped to the exact decimal (`gridValue`, so `0.8500000000000001` becomes `0.85`), a real off-grid value such as `0.851` throws a `DomainError`; an `r` below `x` is refused and the field's hint names the current `x` and says to move `x` first. `x` can also be dragged along the axis (grid 0.01, limited to `[0, r]`). The board is not forced to equal axis units (`equalAxisUnits` is false); view `[-0.15, 1.45, 1.2, -0.2]`.
- **Board object pool** (17 objects, the same for every example, domain and visibility, owned and removed with the scene): band fill, two dashed band edges, a vertical band stretch at an isolated limit value, the limit segment, `f_n` (drawn only on `[0, r]`), the pointwise error segment, the supremum line, the open end of the limit's segment, the isolated limit value, an attained-supremum cross, an unattained-supremum open circle, the points `f_n(x)` and `f(x)`, the domain end `r`, the draggable `x`, and one caption. The limit comes from `uniformLimitPieces` (half-open segment, open circle at (1, 0), filled point (1, 1)); no object joins the jump. Patterns: `f_n` solid, limit dashed, band edges medium-dashed, supremum dotted; shapes: cross (attained) against open circle (not attained). Caption (top-left): formula and domain, `n, x, epsilon`, pointwise error with `N(x)`, supremum (or "hidden"), shared `N` after the reveal, and a key line shown only on boards at least 520 px wide.
- **Readout ids.** `r`, `n`, `x`, `epsilon`, `term`, `limit`, `pointwise-error`, `pointwise-n`, `supremum`, `supremum-attained`, `shared-n`. The last three read "skrito" / "hidden" until revealed; `supremum-attained` says "yes, at x = ..." or "no; the error approaches it near x = ..."; `shared-n` is a number or "does not exist". A pointwise or shared `N` above 50 is shown in full with "(beyond the largest selectable n = 50)", for example `N(0.99) = 230`, never truncated. Statuses (`data-uniform-status`): `hidden` or `attained` / `not-attained`, then `shared-n` or `no-shared-n`, `shared-n-beyond`, `covered` or `not-covered` (the current `n` against the shared `N`), `jump` (the limit has a jump) and `pointwise-beyond`.
- **Controls.** Example select, number fields for `r`, `x`, `epsilon` and `n`, `-`/`+` buttons for `n` (`aria-disabled` at 1 and 50 with a described reason, so keyboard focus is not lost; a click there does nothing), and Show / Hide supremum. Presets: collection `uniform-convergence`; import validates the six fields with per-field messages in Slovenian and English (`x` above `r` says to correct `x` or `r`).
- **Part C: lesson** `uniform-convergence-guided`, 7 steps and 15 frames, all prediction steps hide the supremum and ask for the graph's own Show supremum, except step 3 (shared `N`, with the calculation frame). Steps: (1) pointwise error and `N(x)` on `[0, 0.8]` at `x = 0.5` (`n = 2`); (2) prediction of the supremum and the shared `N` (`n = 5`); (3) reveal at `n = 11`: sup `0.8^n`, attained at `x = 0.8`, shared `N = 11`; (4) `[0, 1]`, `x = 0.9`: `N(0.9) = 22`, `N(0.99) = 230`; (5) `[0, 1]`, `n = 10`: supremum 1, not attained, no shared `N`; (6) domain change to `r = 0.95`, `n = 44`: new comparison, shared `N = 45`; (7) `x/n` on `[0, 1]` (`N = 11`) with the summary and the handoff. The results of each prediction are in `expectedObservations` and recapped in the next step. Order differs from the sketch above in one respect: the reveal and calculation of the shared `N` got its own step 3, so the sketch's handoff is merged into step 7.
- **Source.** Globevnik and Brojan, Analiza I, §§6.7-6.8 (printed pp. 237-242, from the candidate report and not checked in the PDF); listed as an unresolved question in the lesson.
- **Not done.** Previews are a placeholder copy (regenerated in the Batch C release). Visual collisions on a 390 px board and on projected displays were not inspected by eye. Resolved in the review round: at `epsilon = 1` on `[0, 1]` the shared `N` is `1` (the supremum equals `epsilon` but is not attained). The status ids `shared-n-boundary` and `covered-boundary` say so without claiming "supremum below epsilon", the readout label is "Shared N(epsilon): least n with error < epsilon at every x at once" and the lesson edge case was rewritten.
- **Verification.** `npx tsc --noEmit`, the whole vitest suite, `npm run build` and `npx playwright test tests/guided-lessons.smoke.spec.cjs -g uniform-convergence` (sl and en walk, exit/re-entry, narrow viewport) pass.

## Acceptance criteria

- On `[0, r]`, `r < 1`, the supremum error of `x^n` is `r^n` (checked against independent values such as `0.8^5 = 0.32768`).
- On `[0, 1]` the pointwise limit is `0` for `x < 1` and `1` at `x = 1`. The supremum error is `1` for every finite `n` and is labelled "not attained".
- `x/n` has supremum `r/n` and the threshold `floor(r/epsilon) + 1`.
- The limit graph is never joined across its jump. Uniform convergence is never inferred from sampled errors.
- Controls and lesson actions give equivalent configurations. Presets round-trip, and invalid data (for example, `x > r` or `epsilon <= 0`) gets an actionable error.
