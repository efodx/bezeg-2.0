# Refusal language audit (oi-patches-low item 3 follow-up)

`renderMessage` (src/localization/index.ts:56) does `String(param)`: a raw number param is NOT locale-formatted, so only
params pre-formatted with formatNumber/shown matter for the decimal separator.

| Caller | Pre-formats | Action |
|---|---|---|
| BSplineBasisGraph.tsx:178 | inner reason pre-rendered with renderMessage (integers only; text stale after switch) | FIXED: thunk, test "notice for an invalid knot vector follows a language switch" (failed before: stayed Slovenian) |
| BSplineBasisGraph.tsx:237 | no (Message, integer params) | leave |
| BSplineInsertionGraph.tsx:199 | done in 19e0d701 | - |
| SubdivisionCurveGraph:278,292; Interpolation:180; Hermite:164,257; BaseCurveGraph:105,207,252 | no (keys or integers) | leave |
| TriangulationControls:88, PointSetControls:193-194, PolygonAreaGraph:85, TensorSubdivisionPanels:54, ConicFocalGraph:278, PolynomialZerosGraph:300, RationalFunctionGraph:483, DrawingPlayground:134, LookUnderneath:134 | strings made in render; effect deps include the text, so a switch re-refuses | leave (no integers-vs-separator issue found) |
| guard.ts:14, BaseFunctionGraph:590, FourierCoefficientsGraph:381, PolynomialZerosGraph:78, RationalFunctionGraph:105, EpicycleGraph:300 | YES, transitively: `error.reason` is a Message built at throw time with `formatNumber(..., currentLanguage())` | REMAINING (see below) |

## Remaining
The pass-through callers cannot be fixed by a thunk at the call site: the Message handed to `DomainError` already holds strings.
The source is ~78 `formatNumber(..., currentLanguage())` uses in `*Messages.ts` builders, most visibly
functionSetterMessages.ts:17,22 (`numberRangeRejected`, `integerRangeRejected`) and DerivativeGraph.tsx:63
(`derivative_h_rejected`). Suggested design (handler decision): let a Message param be a lazy number (e.g. `{number, maxDecimals}`
rendered by renderMessage with `currentLanguage()`), or let `DomainError` take `() => Message` and guard pass `error.reasonOf()`.

## Checks
`just unit src/graphs/curves/bspline` passed; `just typecheck` passed. Logs: .command-logs/oi-refusal-*.log.
