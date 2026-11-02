# Handoff: numerical 06 F2a (quadrature graph), partial

## State
Implementation is complete and compiles. Tests are written. One test assertion was still failing at handoff. No mutation evidence was collected.

## Files (all uncommitted)
- New: `src/analysis/quadratureModel.ts` and `.test.ts` (passed alone; the N4 numbers match to the stated digits).
- New: `src/graphs/functions/QuadratureGraph.tsx`, `quadratureMessages.ts`, `QuadratureGraph.test.ts`, `QuadratureGraph.host.test.tsx`.
- Edited: `functionPresetCollections.ts` (`quadrature` collection plus diagnosis), `PresetCatalog.test.tsx` (`PENDING_ROUTE_KEYS = ["quadrature"]`), `sl.ts` and `en.ts` (46 `quadrature_*` and `invalid_quadrature_*` keys after `invalid_root_finding_step`).
- Presets register automatically through the spread of `functionPresetCollections` in `PresetImport.ts`. No route, factory or Demonstration entry was added (F2b).

## Checks
- `npx tsc --noEmit` and eslint: clean for my files (log `tmp/n06/tsc.log`).
- `just unit` run, log `C:/Users/1337Hacker/.claude/jobs/122d72dc/tmp/n06/unit2.log`: the only failure seen is in `QuadratureGraph.test.ts`. The range-error regex expects `-7`, but the message uses the true minus `−7`. Fix: change the regex to `/−7/`.
- The other tests in that run (host test, `DefiniteIntegralGraph`, `PresetCatalog`, `functionPresetCollections`, localization) were not confirmed. Check `unit2.log` for further FAIL lines.
- A host-test ratio expectation may be off: trapezoid n=4 on sin over [0, π] has ratio 2/0.10388 = 19.25, displayed `19,3` or `19,2`.

## Remaining
1. Fix the regex, rerun `just unit src/graphs/functions src/analysis src/localization src/graphs/base/presets`.
2. Collect mutation evidence for at least 4 assertions: ratio denominator, odd n accepted for Simpson, parabola pair off by one, invalid Preset accepted, language switch.
3. Add the new terms to `docs/localization.md`. No genuinely new terms: trapezno pravilo and Simpsonovo pravilo are from the README table.

## Decisions
- Switching to Simpson with odd n raises n by 1 and shows a status `adjusted` (graph field `adjustment`, cleared by the next edit, Preset or Reset).
- A typed odd n for Simpson is rejected.
- Bounds need a < b and lie in the range [−7, 7]; the Demonstration default is sin on [0, π].
- The catalogue has no cubic, so the cubic exactness test uses a local cubic.
