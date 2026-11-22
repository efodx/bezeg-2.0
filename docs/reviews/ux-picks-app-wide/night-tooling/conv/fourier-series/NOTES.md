# fourier-series (done)
Files: src/graphs/functions/FourierSeriesGraph.tsx, src/learning/content/fourierSeriesGuidedLessons.ts.
- Readout groups: setup (n, order, x, epsilon[legend band]), values (sum, target, error), jump (jump-left, jump-right), peak (peak-x, peak-value, overshoot, overshoot-limit). Names all existing catalog keys.
- Formula: sgn x / x on (-pi,pi), per example. Notes: series terms list (was a row, too long), then the statuses.
- Legend (drawn only): sum, target, jump, band, error (only error>0), peak, window.
- Pucks: fourier.n (catalog help), fourier.x, fourier.epsilon (inline Slovenian help).
- ToolSections: fourier-example, fourier-n, fourier-points (pickTitle "Točka in toleranca" inline); zoom help moved to revealsHelp().
- Removed under pick: 5 board caption lines, renderReadout (incl. status lines -> notes), renderLegend.
- Frames with ux: steps 1-12 (explanation+observation); step 13 none. Predict frames (1 obs, 4 obs, 7) highlight nothing/inputs only.
- Inline strings: pucks x/epsilon help, group titles, pickTitle above.
- Contract gaps: none. Terms list has no row shape (long text) -> note.
- Checks: tsc clean; just unit FourierSeriesGraph + fourierSeriesGuidedLessons pass; walk 28 frames no page errors; card values equal none shot (0,90241 / 1 / 0,097589).
- Known: at 1440x900 the readout card is taller than the board and scrolls.
