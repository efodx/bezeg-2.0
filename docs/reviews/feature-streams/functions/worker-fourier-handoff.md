# Worker handoff: Fourier series 03 F2a (partial)

Status: implementation written, NOTHING verified. No test has been written or run. `just typecheck` was started in the background (log `C:/Users/NonFriedMotherBoard/.claude/jobs/a3e21171/tmp/fourier-tsc1.log`, output may be incomplete); its result was not read.

## Files touched
- NEW `src/analysis/fourierSeriesModel.ts`: model `{example: square|sawtooth, n, x, epsilon}`, check/parse, edit functions (`changeFourierN` rejects non-integers, no rounding), structured `FourierSeriesIssue`, math (`fourierPartialSum`, `fourierTarget`, `fourierJump`, `fourierGibbsPeak`, `fourierZoomWindow`, `fourierPieces`, `fourierSamples` with 10 samples per period and the closed-form peak abscissas inserted).
- NEW `src/graphs/functions/fourierSeriesMessages.ts` (file and edit messages).
- NEW `src/graphs/functions/FourierSeriesGraph.tsx` (board, inspector, readouts, statuses, zoom window follows the peak when the view is the window).
- EDIT `src/graphs/functions/functionPresetCollections.ts`: import, `diagnoseFourierSeries`, key `"fourier-series"` after `"uniform-convergence"`.
- EDIT `src/localization/sl.ts`, `en.ts`: 53 `fourier_*` / `invalid_fourier_series_*` keys after `uniform_legend_not_attained` (generator script `.../tmp/fourier-keys.py`, already applied; do not rerun, it would duplicate keys).

## Decisions
- N in 1..1001 (spec checks values up to 1001); x grid 0.01 in [-6.28, 6.28]; epsilon grid 0.01 in [0.01, 1]; default `{square, 11, 0.5, 0.1}`.
- Sawtooth peak at pi - pi/(N+1) (same maximiser), overshoot shown as a dash when the peak does not exceed the upper limit (small N).
- Terms: "Število harmonikov N" for N (not in the README term table: add to docs).
- No lesson actions (action names are closed in `src/learning/model.ts`, off limits).

## Remaining
1. Read the typecheck log; fix errors (`just typecheck`, `npx tsc --noEmit --pretty false`).
2. Write `src/analysis/fourierSeriesModel.test.ts`: N rejection without rounding, boundaries; kernel agreement (`partialSum(realCoefficients(shape))`); spec values (S_N(pi/2), peak values 1.27324/1.20042/1.18130/1.17901); sawtooth peak scan; sample density >= 8/period; drawn max equals `gibbsPeakValue`; pieces.
3. Add cases to `functionPresetCollections.test.ts` (valid, each malformed field with actionable message in SL/EN, wrong type keeps generic message). Do not edit `PresetCatalog.test.tsx`.
4. Write `FourierSeriesGraph.host.test.tsx` (pattern `UniformConvergenceGraph.host.test.tsx`): control values and board objects after Reset, Preset restore (`saveCurrentPreset`/`selectPreset`, `importPreset`), language switch; curve `dataX/dataY` max vs closed-form peak; check Reset restores the square default view after choosing the sawtooth.
5. Add terms to `docs/localization.md` (pattern of commit d02c957b): Fourier series, partial sum, Gibbs phenomenon (gloss), square/sawtooth wave, number of harmonics.
6. Run `just unit src/analysis/fourierSeriesModel.test.ts src/graphs/functions src/graphs/base/presets`, `just lint` on touched paths, `just build` (env `BEZEG_MEMORY_FLOOR_GB=0.5`); deliberate mutations for the four regression assertions; measure drawing cost at N=1001 (about 20k points x 500 sin per redraw, unmeasured).

## Risks
- Sawtooth `fourierPartialSum` is O(N) per point; N=1001 unmeasured.
- Zoom detection compares the board box to the window (tolerance 1e-6); untested.
- F1 "term list as text" not implemented.
