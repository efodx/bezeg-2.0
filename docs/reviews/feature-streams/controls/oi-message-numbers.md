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
