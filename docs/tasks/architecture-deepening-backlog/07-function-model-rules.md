# 7. One owner for function-model rules

Status: planned. Lane: Functions. Source: [specification §7](../../specs/architecture-deepening-backlog.md#7-one-owner-for-function-model-rules).

## Scope and entry points

- `src/analysis/*Model.ts`: the 11 model parsers.
- `src/graphs/functions/functionPresetCollections.ts:54-170`: the `diagnoseX` functions.
- The `DomainError` throws in the 20 function graph setters, for example `ConvexityGraph.tsx:147-171`.
- ADR 0016.

## Implementation and acceptance

- Start with one model, such as convexity, as a pilot. Show that the parser, the collection diagnosis and the setter consume one answer. Then extend to the other ten.
- Each analysis model module owns:
  - validity;
  - normalization;
  - a structured diagnosis that callers localize.
- No English text is thrown to learners. Collection files no longer restate ranges.
- Add direct model tests: valid, boundary and invalid values per field. Keep the existing collection tests passing unchanged.
- Preset compatibility holds: every currently valid stored Preset and file still loads.

## Verification

Run the analysis, preset collection and function graph tests, typecheck and build. Do a focused browser check of invalid input and Preset import on two function routes in both languages.
