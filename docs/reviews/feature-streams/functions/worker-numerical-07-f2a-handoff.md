# Handoff: numerical 07 F2a (partial)

## Done (uncommitted, in worktree)
- `src/analysis/eulerModel.ts`: EulerModel (example, x0, y0, step, xEnd, showExact, revealed|null), check/parse, edits, eulerView (end value, exact, displayed error, error at 2h, ratio), exactAt/exactReaches.
- `src/analysis/eulerField.ts`: fieldGrid (cols <= 40, rows from aspect <= 40), fieldMarks (NaN-separated, fixed 20 px marks).
- `src/graphs/functions/EulerGraph.tsx`: field = one curve cached by example/bbox/size (`fieldBuilds` counter), exact functiongraph, polyline curve, node-cross curve, draggable P0, caption, controls (example, x0, y0, step slider over STEP_SIZES, end x, exact toggle, Next step / Show all), readouts, statuses.
- `src/graphs/functions/eulerMessages.ts`; `euler` collection + `diagnoseEuler` in `functionPresetCollections.ts`; `PENDING_ROUTE_KEYS = ["euler"]` in `PresetCatalog.test.tsx` (route is F2b).
- Locale: 50 keys each in `sl.ts`/`en.ts` after `invalid_quadrature_count_even`. Prefix is `euler_ode_*` / `invalid_euler_ode_*` because `euler_*` already belongs to the Euler line (deviation from brief).
- Tests: `src/analysis/eulerModel.test.ts`, `src/analysis/eulerField.test.ts`.

## Checks run
- `npx tsc --noEmit` clean (before the tests were written); log `C:/Users/1337Hacker/.claude/jobs/4cd4c05f/tmp/n07/tsc.log`.
- First `just unit` run of the two analysis tests: 3 failures, all wrong test expectations, then fixed (h=0.5 double error is 0.7183 from h=1; relaxation h=0.125 error is 0.0485; blow-up needs xEnd 3 to leave the window). The re-run was started in the background and NOT observed; log `.../n07/unit1.log`.

## Remaining
1. Re-run `just unit src/analysis/eulerModel.test.ts src/analysis/eulerField.test.ts`; confirm green.
2. Write `EulerGraph.host.test.tsx` (copy `QuadratureGraph.host.test.tsx`; subclass exposing board/model; stub `getBoundingBox` as in `RationalFunctionGraph.host.test.tsx`): exactly one field curve (strokeColor referenceCurve), unmount leaves none; step change by slider; x0/y0 numeric and drag; example switch; exact toggle; reveal; blow-up status (`data-euler-status`); language switch; Preset import + Reset; StrictMode; view change regenerates field while a drag does not (`fieldBuilds`).
3. Preset import test (copy `QuadratureGraph.test.ts` pattern, key `preset-euler`).
4. Run `npx tsc --noEmit --pretty false`, `npx eslint` on touched files, `just unit src/graphs/functions src/analysis src/localization src/graphs/base/presets`.
5. Four mutation checks (error ratio denominator, field slope transposed, extra field objects, polyline past last finite point, invalid Preset accepted).
6. Unverified: no lesson actions (quadrature F2a had none), no route/catalog.

## Numbers observed
y'=y: 2.25, 2.4414, 2.5658; errors 0.468, 0.277, 0.152 (4-sig display 0.4683, 0.2769, 0.1525); ratios 1.69, 1.82. y'=x-y: 0.5, 0.6328, 0.6872; errors 0.2358, 0.1029, 0.0485.

## New terms
None beyond README terms (polje smeri, Eulerjeva metoda, približek); used "korak", "lomljenka", "začetna točka", "natančna rešitev".
