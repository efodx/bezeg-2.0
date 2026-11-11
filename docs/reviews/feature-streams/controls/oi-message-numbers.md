# Decision 70: numbers in a Message render late (worker note)

## Done
- src/localization/index.ts: `MessageNumber {kind:'number', value, maxDecimals?}`, `MessageParameter`, `messageNumber()`, `isMessageNumber()`, `isMessage()`; `renderMessage` formats via `formatNumber(..., language)`. No import cycle (analysis/format.ts has no imports).
- src/inputs/RefusalChannel.tsx `sameRefusal`: number params compare by value and maxDecimals.
- Converted to `messageNumber`: complex, accumulation, bisection, conicFocal, convexity, darboux, euler (x/y range), extrema, fixedPoint, fourierSeries, functionInverse, functionSetter (numberRange/integerRange), functionTransformation, geometricSeries, meanValue, polynomialZeros, quadrature, rationalFunction, rootFinding, sequence, taylor, uniformConvergence, zeroList `*Messages.ts`; DerivativeGraph.tsx derivative_h_rejected.
- guard.ts holds no formatting (DomainError renders lazily), so nothing to convert there.
- Tests: src/localization/messageNumber.test.ts, src/graphs/functions/messageNumbers.test.ts (setters, zero list, rational, fourier, euler, taylor, bisection), DerivativeGraph.test.ts (end). Seven existing `toEqual` reason assertions in *Graph.test.ts now expect `messageNumber(...)`; two preset-collection tests use `isMessage`.
- Failure observed before the change by making renderMessage format with 'sl' (equivalent to the old frozen text): 7 of 7 new tests failed (log oi-msgnum-fail.log).

## Remaining (still `formatNumber(..., currentLanguage())`)
- eulerMessages.ts:34 (list of steps joined into one string param)
- leastSquaresMessages.ts:47,52 (formatSignificant / 3 decimals, helper returning text)
- rungeInterpolationMessages.ts:37 (`rungeNumber`, formatSignificant; no MessageNumber variant for it)
- DerivativeGraph.tsx:91,125,169 (readouts, not Messages)
- All `*Graph.tsx` / overlay / scene readouts (not Message builders)
- Not covered by a language-switch test: convexity, darboux, extrema, meanValue, quadrature, rootFinding, fixedPoint, functionInverse, functionTransformation, geometricSeries, sequence, uniformConvergence, conicFocal, complex, accumulation (same conversion, covered by shared renderMessage test and existing exact-text tests).

## Checks
`just typecheck`, `just lint` (localization, graphs/functions, graphs/complex, inputs) passed. `just unit` on localization, functions, inputs, curves, base passed. Logs: .command-logs/oi-msgnum-*.log.

## Second pass
- Euler: `MessageNumberList {kind:'numbers', values, maxDecimals?}` + `messageNumberList()` + `isMessageNumberList()` in src/localization/index.ts; `renderMessage` joins the formatted values with ", " (the old separator). A separate kind was the smaller honest change than a joined string or one param per step (the step count varies and the template has one placeholder). `isMessageNumber` now checks `kind === 'number'`. `sameRefusal` (RefusalChannel.tsx) compares lists element-wise. eulerMessages.ts:34 converted; `currentLanguage` import dropped.
- Test: messageNumbers.test.ts "euler step refusal ..." (sl "0,25, 0,5" -> en "0.25, 0.5"). Observed failing with the site reverted (`expected ... to contain '0.1, 0.5'`, log oi-msgnum2-fail.log), restored, passes.
- NOT converted, deliberately: leastSquaresMessages.ts:47,52 (`leastSquaresNumber`/`leastSquaresCoefficient`) and rungeInterpolationMessages.ts:37 (`rungeNumber`). They are not Message builders: they return text used only in LeastSquaresGraph/RungeInterpolationGraph readouts and board captions (`text: () => t(...)`, re-evaluated per draw/render), never stored in a Message or refusal. No significant-digits MessageNumber was added (it would have no caller). Whether those captions redraw on a language switch is a graph-redraw question, not decision 70.
- `currentLanguage()` inside `*Messages.ts` after this pass: leastSquaresMessages.ts:47,52 and rungeInterpolationMessages.ts:37 only (the helpers above).
