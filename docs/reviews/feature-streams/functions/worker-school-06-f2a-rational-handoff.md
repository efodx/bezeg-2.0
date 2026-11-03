# Handoff: school 06 F2a-2 (rational-function graph), partial

## State
Implementation written. `npx tsc --noEmit --pretty false` finished with exit 0 and an empty log (tsc-rf.log) after all edits. NOT linted or tested.

## Touched files
New:
- `src/analysis/rationalFunctionModel.ts` (model: overall `k` on the numerator, monic denominator, `probe` in [-10,10] default 10; lists via zeroListModel, each degree <= 5; examples `oblique` (default), `hole`, `horizontal`, `double-pole` = 4x/((x+2)(x-1)^2); `rationalFacts` with poles' sign sides, `cancelled`, probe remainder term; edit functions per `RationalPart`). Doc comment of `RationalFacts.probe` mentions "quotient evaluated there": stale, fix.
- `src/graphs/functions/rationalFunctionMessages.ts` (issue messages, product/fraction/rule text, `coefficientsText`, `asymptoteEquationText`).
- `src/graphs/functions/RationalFunctionGraph.tsx` (board: pole lines+labels, asymptote line+label, curve via plotPieces, probe segment/point/label, hole open circles, numerator gliders "o"/denominator gliders "x"; inspector, readouts, legend; hole/pole live notices; lesson actions `rational-numerator-1/2`, `rational-denominator-1/2`, `rational-probe`, `k`, choice `rational-example`).
Edited:
- `ZeroListEditor.tsx`: `ZeroListNoticeStore<N>` generic, `ZeroListNoticeView` now requires a `describe` prop; `PolynomialZerosGraph.tsx` passes `zeroListNoticeText` (S3 tests must be rerun).
- `functionPresetCollections.ts` (collection `rational-function`, own `checkGraphState` for `numerator`/`denominator`), `PresetCatalog.test.tsx` (PENDING_ROUTE_KEYS), `src/learning/model.ts` (5 parameter names, `rational-example` choice values).
- `sl.ts`/`en.ts`: 51 keys each, prefix `rational_function_*`, inserted after `polynomial_zeros_board_degree` by `tmp/s06/rf_insert.py` (do not rerun: it would duplicate).

## Decisions
One overall k (numerator), denominator monic. Common-zero rule: `analyzeRational` makes a hole only when numerator multiplicity >= denominator multiplicity ((x-1)/(x-1)^2 correctly keeps a pole of multiplicity 1; report it). Probe is not rejected at a pole or hole; the readout says undefined. Default view [-11,9,11,-9] so probe x=10 is visible. Hole/pole notices come from comparing hole sets before/after an edit.

## Remaining
1. tsc is clean (no fixes needed).
2. eslint on touched files.
3. Tests: `rationalFunctionModel.test.ts` (remainder 0.375 at 10 and quotient x+2; hole (1,2); y=2 and 2.0625 at 10; no plotPieces piece spans a pole; common factor never a pole; oblique only when dp = dq+1; preset check), `RationalFunctionGraph.host.test.tsx` modelled on `PolynomialZerosGraph.host.test.tsx` (hole by drag/field/lesson, back to pole, example switch, probe, language switch, Preset import/Reset, unmount, synchronous multi-action scene), preset tests in `functionPresetCollections.test.ts`.
4. `just unit src/analysis src/graphs/functions src/graphs/base/presets src/localization` to logs; S3 tests green; 4+ mutations.
5. Measurement: Node bench under `scripts/` (check justfile precedent from ADR 0033 addendum), drag a numerator zero ~150 grid steps on each example plus one S3 drag, median/p95/max over >= 3 runs split analyzeRational vs plotPieces with vertex counts; addendum to ADR 0026; samples 300/600 only if median > 2 ms or p95 > 4 ms; list F2b browser cases.
6. Add terms (Števec, Imenovalec, ostanek, okrajšani ulomek, pol, luknja, asimptote) to `docs/localization.md`; note F2a-2 in `docs/tasks/school-function-graphs/06-batch-b.md`.
