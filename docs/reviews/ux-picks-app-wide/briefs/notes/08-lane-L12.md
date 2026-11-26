# Lane L12 (fourier-series), round 5: PARTIAL handoff (budget signal at 135k input)

## Done (observed)
- Parity recorded BEFORE conversion: sample `fourier-series` in `src/graphs/base/declare/parity.test.tsx` (8 states, each sets example, N, x, epsilon), `src/graphs/functions/__parity__/fourier-series.json`. Not re-recorded.
- `src/graphs/functions/FourierSeriesGraph.tsx` converted: `FourierSeriesIds`, `drawn` map captured in `createScene` (sum, target piece 0, jump ring, band piece 0, error, peak, window), `parameterBindings` (fourier-n), `declaration()` (N count puck on the board; 7 legend entries), `functionPanel()` (14 rows, note, 4 statuses, plotted = f and S_N), `drawnObject`, `renderLegend` null, `renderReadout` = declared readout + FunctionStatus with `data-fourier-status`, `PuckOwned` around the N CountSetter. Mathematics untouched. The "terms" row is a catalog passthrough message `fourier_series_terms_value` ("{value0}") because a formatted value may not contain words.
- Fragment `src/localization/fragments/fourier-series.ts` registered in `fragments/index.ts` (bare name "Harmoniki"+N, help, passthrough, 7 legend labels).
- Frames: `src/learning/content/fourierSeriesGuidedLessons.ts` FOCUS table (fourier-third, -more, -gibbs-peak, -gibbs-narrow, -gibbs-fixed), no predicted values highlighted.
- Host test `FourierSeriesGraph.host.test.tsx` updated: N writes through `graph.parameters.write('fourier-n', v, 'learner')`; view writes in `runAs('learner')`; `openTools()` after reset; the two Fit assertions removed (host Fit of a declared graph is the director's); Reset view check relaxed to "contains default x-range" (director adds room for cards); N puck test added. 8/8 pass.
- Declaration test `FourierSeriesGraph.declaration.test.tsx`: 8 pass (7 states + arbiter). Red check: sum row value +1 failed `AssertionError: expected '1,90241' to be '0,90241'`; reverted (grep confirms).
- `npx tsc` clean after the graph edit (before fragment passthrough/test edits).

## Not done (run in this order)
1. `just graph-check fourier-series --route analysis/fourier-series` (parity may differ on the `n`/`x`/`epsilon` rows or the terms row text; golden differences only report).
2. `BEZEG_PARITY_GOLDEN_CHECK=1 BEZEG_PARITY_GOLDEN_ID=fourier-series just unit src/graphs/base/declare/parityGolden.test.tsx`.
3. `just unit src/graphs/functions src/learning/content src/localization src/graphs/base/declare` (check `fourierSeriesGuidedLessons.test.ts`, lessonMathNotation, declarationContract; a lesson `uses`/`highlight` mismatch would show here).
4. `npx tsc --noEmit --pretty false`; `just lint` on: FourierSeriesGraph.tsx, .host.test.tsx, .declaration.test.tsx, fourierSeriesGuidedLessons.ts, fragments/fourier-series.ts, fragments/index.ts, parity.test.tsx (likely unused imports: `fireEvent` or `enterNumber` still used; `CONTROL_ROW_FILL` etc. unchanged).
5. `just build`; `just smoke-lesson fourier-series --port 4391 --workers=1` (tests/guided-lessons.smoke.spec.cjs row ~2476: check locators for the N field, which is now a puck).
6. `*FirstTask.test.tsx`: grep found no fourier-series case; nothing to change.
7. Delete scratch: `.command-logs/l12-*` (py, txt, logs).

## Placement judgements
- N (count): puck; flipped constantly while the sum, the error and the peak are watched.
- Example (2 options): Orodja undeclared; it resets the view and the whole function, so it is setup.
- x: Orodja undeclared; it is already dragged on the board by its axis point.
- epsilon: Orodja undeclared; band tolerance is set once per question.
- Legend: bottom-right default kept (not checked against the curve visually).
- Marks: f and S_N both plotted.
- No UntaggedWriteError in shared tests seen yet; the own host test needed `runAs` for view writes.

## For the handler
- Host Fit of this graph is now the view director's; the old exact "Fit = example view" assertion was dropped from the own host test.
- Old legend keys (`fourier_legend_*`) are now unused in the graph (still in sl/en).

## Round 5 continuation (observed)
tsc, lint (7 files), golden check, graph-check (contract/parity/golden/declaration pass), unit (functions, learning/content, localization, declare), build, smoke-lesson fourier-series: all passed. No source edits; smoke row has no hooks (no N-field locator). Common misses walked: bare names, puck label "Harmoniki"/"Harmonics", legend null, Orodja keeps x/epsilon/example. Logs: .command-logs/l12-*.log.
