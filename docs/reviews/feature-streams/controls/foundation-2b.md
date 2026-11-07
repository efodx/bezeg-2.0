# Foundation slice 2b: evidence

Base HEAD 98426280 plus the working-tree changes below (uncommitted).

## Changes
- `BaseFunctionGraph.tsx`: protected `refusals` channel (re-render callback), one `RefusalNotice` after the readout, before the legend; `axisPoint.write` catches `DomainError`, `refuse(reason ?? message)` without announce, resyncs the scene, returns false; accepted write clears. `ignoreOutOfDomain` unchanged.
- `CorrelationGraph.tsx`: own channel and own `RefusalNotice` removed; uses the base's (one `[data-refusal-notice]`).
- `bsplineBasisModel.ts`: `dragKnotEdit` returns `{knots}`, `{rejection}` (via `knotRejectionMessage`, the same messages as `editedKnots`) or `undefined` (clamp-no-change, bad index, non-finite); `draggedKnots` is now a wrapper (signature kept). No new localization keys.
- `BSplineBasisGraph.tsx`: own channel and `RefusalNotice` (before the knot editor); `dragKnot` refuses with the reason, clears on an accepted drag; `editKnot` clears on an accepted typed edit; boolean return kept.
- Tests: `QuadratureGraph.axisRefusal.test.tsx` (new), `CorrelationGraph.refusal.test.tsx` (new, E-d plus single-notice), additions to `BSplineBasisGraph.test.tsx` and `bsplineBasisModel.test.ts`.

## Decisions beyond E-a..E-d
- No `axisPoint` graph can be refused by its own model through a drag (the clamp already keeps values inside the model's rules), so the axis-point test overrides `setBound` in a `QuadratureGraph` subclass to throw a `DomainError` for one value. The base path under test is real (real board, real drag event).
- B-spline: a no-change drag leaves a previous refusal showing (it neither refuses nor clears).

## Mutations (each observed failing; logs `.command-logs/2b-mut-*.log`)
base-norefuse, base-noclear, base-announce (repeat frames re-announced), corr-dupnotice (second notice), lesson-message (lesson text differs from inspector text), bs-norefuse, bs-nodragclear, bs-notypedclear, bs-clamp-noisy (first version survived because the test had no no-change drag; test extended, then failed), model-noreason (2 failing). Not mutated: the base-side "clamp shows nothing" assertion (the clamp lives in `slidingPoint`, which no refusal path touches).

## Checks
- `just unit` on `src/graphs/curves/bspline`, `CorrelationGraph`, `QuadratureGraph`, `LookUnderneath.test.tsx`: passed (`2b-unit-final.log`). LookUnderneath passes; the base notice does not reach it.
- `just check-changed` (`2b-check-changed.log`): FAILED, 2 tests of 4646: `DarbouxGraph.test.ts` "Edit order: the reveal area ... " and `DefiniteIntegralGraph.test.ts` "Edit order: controls, then the readout, then the legend ...". Both pin the children of `workspaceEdit()` and now see an extra `RefusalNotice` between `FunctionReadout` and `FunctionLegend`. Not edited (outside owned paths). Fix: add `"RefusalNotice"` after `"FunctionReadout"` in the expected list.
- `just build`: passed (`2b-build.log`).
- Smoke (built): `curve-ownership` 6 passed (port 4327, `2b-smoke-ownership.log`); `smoke-lesson quadrature bspline-basis prob-correlation` 6 passed (port 4328, `2b-smoke-lessons.log`).
- Screenshots `.command-logs/2b-shots/bspline-{light,presenting,forced}.png`, by a Playwright script on a preview at 4329 (stopped): a real mouse drag of the knot at 1 onto the knot at 2 shows "vozel se sme ponoviti največ 3-krat; zmanjšaj večkratnost vozla" in the notice (light and forced colours visible). Forced colours is Playwright `forcedColors: 'active'` emulation.

## Gaps
- Item 1 (axis-point notice) has no screenshot: no shipped graph reaches a refused axis-point drag. Same `RefusalNotice` component as the B-spline shot.
- Presenting shot shows the graph only: the inspector (and so the notice) is not visible in presenting mode; recorded as observed (`notice visible: false`). The drag in that run also did not refuse (script flake; an earlier run of the same script did show the text).
- No `Look underneath`/other smoke rows beyond those listed; full smoke checklist not run. No unit run of the whole `src/graphs/functions` directory beyond what check-changed selected (it passed everything but the two tests above).

## Handler acceptance

- `DarbouxGraph.test.ts` and `DefiniteIntegralGraph.test.ts` edit-order tests now expect `RefusalNotice` between the readout and the legend (the worker's two `check-changed` failures; contract change, not a defect).
- `BaseFunctionGraph.importPresetData` clears the channel, so Reset, a Preset or a lesson checkpoint does not keep a stale refusal. New test in `QuadratureGraph.axisRefusal.test.tsx`, observed failing without the clear (`2b-mut-import-clear.log`).
- Reviewed in the main chat (about 100 lines in four source files).
