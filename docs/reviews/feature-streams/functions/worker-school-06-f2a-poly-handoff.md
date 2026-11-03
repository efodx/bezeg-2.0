# Handoff: school 06 F2a-1 (polynomial zeros), partial

## State
Implementation written, NOT yet type-checked, linted or tested. `npx tsc --noEmit` was started in the background (log `C:/Users/1337Hacker/.claude/jobs/dae24822/tmp/s06/tsc.log`, empty when I stopped, so its result is unknown). No tests written, no mutation evidence.

## Touched files
New: `src/analysis/zeroListModel.ts` (shared), `src/analysis/polynomialZerosModel.ts`, `src/graphs/functions/zeroListMessages.ts`, `polynomialZerosMessages.ts`, `ZeroListEditor.tsx` (shared controls, notice store, live text), `PolynomialZerosGraph.tsx`.
Edited: `functionPresetCollections.ts` (collection `polynomial-zeros`, own `checkGraphState` for the `zeros` array), `PresetCatalog.test.tsx` (`PENDING_ROUTE_KEYS = ["polynomial-zeros"]`), `src/learning/model.ts` (parameter names `poly-zero-1..5`, visibility `polynomial-derivative`, choice `polynomial-example`; `k` reused), `sl.ts`/`en.ts` (33 keys each, prefixes `zero_list_*` and `polynomial_zeros_*`, inserted after `function_transformation_board_point_undefined` by `tmp/s06/locale_insert.py`).

## Decisions
- Grid 0.1 (`snapZero`, 1 decimal, no -0); off-grid stored zeros are rejected, typed or dragged values are snapped.
- Degree-five example: k = 0.2, zeros -3 (m1), -1 (m2), 2 (m2); default view [-6, 8, 6, -8].
- Zero list is an array in model order (glider slots); merge keeps the other zero's slot; after a merge the rest of that drag is ignored (`dragMerged`).
- New terms: "obnašanje v neskončnosti", "enojna/dvojna/trojna ničla", "presečišče z osjo y" (existing usage "seka os y"); not yet added to `docs/localization.md` table.

## Shared interface (for the S4 worker)
`zeroListModel.ts`: `ZERO_GRID_STEP`, `snapZero(x)`, `checkZeroList(data, maxDegree)`, `moveZero(zeros, i, x)` (merge + event), `setZeroMultiplicity`, `addZero(zeros, maxDegree)`, `removeZero`, `zeroListSpec(k, zeros)`, `isZeroListIssue`. `ZeroListEditor.tsx`: `<ZeroListEditor scope zeros maxDegree onMove onMultiplicity onAdd onRemove/>`, `ZeroListNoticeStore` + `<ZeroListNoticeView store/>`, `noticeOfEvent`. Messages: `zeroListIssueMessage`, `zeroListFileMessage`.

## Remaining
1. Read the tsc log (rerun via `npx tsc --noEmit --pretty false`); fix errors (suspects: `Message` param typing in `ZeroListEditor`, `caption` line fields, `ReturnType<typeof useT>`).
2. `npx eslint` on touched files; check `src/learning` tests that enumerate names (model.ts edits).
3. Tests: `zeroListModel.test.ts`, `polynomialZerosModel.test.ts` (p(0)=2, p(1)=0, p'(1)=0, p''(1)=6, sign changes, merge, degree 6 refused, `===` positions), `PolynomialZerosGraph.host.test.tsx` (pattern: `FunctionTransformationGraph.host.test.tsx`), preset tests in `functionPresetCollections.test.ts`.
4. `just unit src/analysis src/graphs/functions src/graphs/base/presets src/localization` to logs; four mutation checks.
5. Add the terms to `docs/localization.md`.
