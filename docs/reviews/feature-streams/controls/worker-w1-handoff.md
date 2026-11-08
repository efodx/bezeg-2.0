# Worker W1 handoff (partial, budget signal at 135k)

No commit made. Logs in `.command-logs/w1-*.log`. Nothing was run after the last edits (item 8/9 code): run `just typecheck` and `just unit src/inputs src/graphs/compgeo src/graphs/base/CurveWorkspacePoints.test.tsx` first.

## Done and verified (tests failed before, pass after)

1. `PointCollection.onAdd` returns `string | undefined | void` (a string is the refusal): typed fields clear only on acceptance, refusal shown in `[data-point-collection-reason]` (also for plain Add / stepper plus). `src/inputs/PointCollection.tsx` (`add()` helper). Tests in `src/inputs/PointListInput.props.test.tsx` (3 new; failed before). Interpolation and Hermite `onAdd` return `renderMessage(refusal)`. PointSet and curve workspace callers return void (accepted); PointSet refusals still show only through its own notice, so a refused PointSet typed add clears the fields (gap).
2. Pressed reason follows min/max: reasons read through `latestReasons`/`latest` refs. Test "the shown reason follows a changed min" (failed: 'Najmanj 1.').
3. `HermiteGraph.editPoint` frames `arrowTips(index)`. Test in `src/graphs/curves/interpolation/SharedPointDecisions.test.tsx` (failed before).
4. Decision 30 code: `placeNewPoint(..., {distinct: true})` in `src/graphs/base/points/placement.ts` (next free whole position along the last point's row: right within limit, then left; a full row keeps the plain default). Used by Interpolation, Hermite and PointSet. Tests: `placement.test.ts`, `SharedPointDecisions.test.tsx` (limit add gives 998), `PointSet.sharedControls.test.tsx` (decision 30; failed before: 19 vs 18). Refusal wiring test uses a spy on `addPoint` because no default add can be refused by the model (the model accepts non-adjacent repeats). NOT DONE: spec text "decision 30" in `docs/specs/shared-graph-controls.md` "Decided in task 2" (rule above; rejected alternative: leave the plain left-of-last default and rely on the model refusal, which never fires since non-adjacent repeats are valid).
5. `BaseCurveGraph.restoreTransientState` clears `pointRefusals` (Reset/Preset/lesson restore share it; only Reset tested). `BasePhBezierCurveGraph.afterTypedHodographEdit` refits the hodograph board. Tests in `src/graphs/base/CurveWorkspacePoints.test.tsx` (both failed before). Added `refusal` and `hodographBoard` to `curveGraphTestAccess.ts`.
6. (replaced item) `sharedControls.graphs.test.tsx`: dropped bezier and curve-curvature full runs; added thin wiring checks for bezier and ph-cubic (pass, 32.5 s wall vs 46.3 s before for that file). Mount-once-per-group (b) NOT done (needs a change in `sharedControlBehaviour.tsx` mount handling).

## Edited, NOT yet tested

8. Focus after row remove: `PointListInput.tsx` (`focusAfterRemove` ref + effect, `root` ref on the fieldset). Still to do: add the focus-landing assertion to `pointListBehaviour` "commit: a remove above the fewest rows applies at once" in `src/inputs/sharedControlBehaviour.tsx:435` (assert `document.activeElement` is a remove button after clicking the last row's remove), show it failing first (stash the effect), and make sure rows whose list lacks a collection still pass.
9. Accessible names: `SelectablePointButton` got `accessibleName` and defaults to `aria-label` from new key `point_controls_select_named` (sl "Izberi: {value0}", en "Select {value0}"); PointSetControls segment/interval rows pass the existing `pointset_select_segment`/`pointset_select_interval`. Still to do: one test (e.g. in `PointListInput.props.test.tsx`: `getByRole('button', {name: 'Izberi: T1'})`), fix any existing tests that look the buttons up by bare label ("A", "s1"), run typecheck and `just build`.

## Not done

- 6(c): deleting per-graph duplicate mechanics cases (Interpolation, Hermite, PointSet incl. `PointSetSegments.host.test.tsx:149,200`, curve workspace) with covering shared case list.
- 6(d) report is only for `sharedControls.graphs.test.tsx` (above).
- Item 7: listener-disposal tests carried over from the deleted `PointCoordinateEditor` test (`git show 97d22db4 --stat`).
- Evidence note `points-w1.md`, `just lint`, `just check-changed`, `just build`.
