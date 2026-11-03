# Handoff: Fourier 05 F2a-1 (partial)

## State
Implementation written; `npx tsc --noEmit --pretty false` printed nothing (log `C:/Users/1337Hacker/.claude/jobs/026cb3cf/tmp/fourier-f2a1/tsc.log` is empty). Nothing else was run: no eslint, no `just unit`, no tests written, no mutations.

## Files
New: `src/analysis/fourierCoefficientsModel.ts` (model, check/parse, edits, shape/slots, projection, product polygons), `src/graphs/functions/fourierCoefficientsMessages.ts`, `src/graphs/functions/FourierCoefficientsGraph.tsx`, `src/graphs/functions/FourierSpectrumBars.tsx` + `.css` (SVG bars with a details/table text alternative; pattern copied from `src/graphs/curves/interpolation/BasisPlot.tsx`).
Edited: `src/graphs/functions/functionPresetCollections.ts` (key `fourier-coefficients`), `src/learning/model.ts` (parameters `fourier-handle-0..4`, `fourier-order`, `fourier-harmonic`; visibility `fourier-partial-sum`; choices `fourier-view`, `fourier-layout`, `fourier-term`), `sl.ts`/`en.ts` (50 keys each: `fourier_coef_*`, `invalid_fourier_coefficients_data`, inserted after `fourier_board_key`).

## Decisions
- `values` is a flat array in slot order (abs 2, jump 4, free 5); handles addressed by slot index, not breakpoint/side. `jump` and `free` layouts have a seam jump; `abs` shares the seam value (second handle mirrored at +pi).
- Choosing a layout resets values to defaults.
- K below the selected harmonic is rejected (`k-below-selected`), not moved silently. Lesson order: set harmonic before switching to `b` from k=0.
- Strict parse: all fields required (decay fields too).
- Decay view is stored and lesson-selectable but not drawn; no inspector UI for decay fields or view.
- Shift+arrow 0.5 step via a capture wrapper around each NumberInput; board drag snaps to 0.05.
- Terms chosen: "spekter koeficientov", "Parsevalova vsota", "povprečje kvadrata" (avoids uncertain "srednji kvadrat"). No source research was done; `docs/localization.md` terms table NOT yet updated.
- Edit and file messages share one text set; file messages wrap it in `invalid_fourier_coefficients_data`.

## Remaining
1. eslint on touched files; `just unit src/analysis src/graphs/functions src/localization src/learning` (check `functionPresetCollections.test.ts`, lesson-model name tests).
2. Model tests (`fourierCoefficientsModel.test.ts`): defaults, every rejection, round trip, exact values (abs a1=-1.27324, a3=-0.141471, a5=-0.05093; jump b1=0.9805869033, b2=-0.4507735384, b5=0.1634409457 to 1e-9), seam midpoint, b0 rejected, duplicate selection rejected, product `area` = pi*coefficient.
3. Host test `FourierCoefficientsGraph.host.test.tsx` copied from the FourierSeries one (drag/keyboard, overlay, preset round trip, malformed preset, language switch, multi-action lesson sequence). The graph is not mounted yet: JSXGraph fill curves, the `visible` function attributes, handle dragging and `memoView` with array fields are unverified.
4. At least three mutations (drop seam midpoint, accept b0, round instead of reject).
5. Add terms to `docs/localization.md`.
6. Not done: route, catalog entry, decay drawing.

## Open questions
Whether a_0 (not a_0/2) should be plotted in the spectrum (currently a_0, which dwarfs the other bars for |x|); whether the strict-parse and K-reject rules suit the lesson slice.
