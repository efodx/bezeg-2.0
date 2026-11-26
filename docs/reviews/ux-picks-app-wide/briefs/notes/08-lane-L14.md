# Lane L14 (line-geometry), round 6: PARTIAL handoff (budget signal at 135k)

## Done (observed)
- Parity recorded BEFORE converting: marker `data-readout-note` on `<p data-line-status>`; SAMPLES entry `line-geometry` (20 states, all five modes, each starting from the default points) in `src/graphs/base/declare/parity.test.tsx`; `src/graphs/lines/__parity__/line-geometry.json`. Never re-record.
- `LineGeometryGraph.tsx`: `LineGeometryIds`; `statusMessage()` (Message), `declaredRows()`, `readoutRows()` (legacy panel text), `statusText()` derived; `declaration()` (rows, status note, marks, and the `lines-target` choice puck in intersect mode only); `parameterBindings()` for `lines-target`; Orodja target select wrapped in `PuckOwned`; readout group has `data-declared-panel`. No legend (graph draws none), no actions.
- Fragment `src/localization/fragments/line-geometry.ts` (registered): `lines_equation`, `lines_status_with_note`, `lines_target_name` ("Presek z"), `lines_target_lines_short`, `lines_target_circle_short`, `lines_target_rejected`.
- `LineGeometryGraph.declaration.test.tsx`: 9 tests (8 states + target puck write); passed before the target puck was added. RED CHECK observed: changing the `d²` row to `normSquared` -> `AssertionError: expected '5' to be '121/5'`; reverted.
- Frames: `declare` added to the observation frames of all 25 steps in `analyticLinesGuidedLessons.ts` and `analyticLinesIntersectGuidedLessons.ts` (highlights of rows the text reads, `open: ['readouts']` on predict/free steps, `uses: ['lines-target']` on l5-line-circle).
- graph-check before the target puck: contract, parity, declaration pass; golden FAIL, differences verbatim: only `notes` of 12 states, `golden []` vs now the status sentence (default, l1-vertical, l1-origin, l2-predict, l2-vertical-horizontal, l2-free, l3-predict, l3-swap, l4-predict, l4-on-line, l5-meeting, l5-tangent); rows identical. This is the marker added to the old panel; not re-recorded.

## Placement (one line each)
- Intersect target (2 options): puck in intersect mode, the lesson l5-line-circle asks the learner to switch it and watch the status.
- Mode (5 options): Orodja (over 4). Point lists: Orodja (setup; points are board handles and rows). Pucks per mode: forms 0, normal 0, angle 0, distance 0, intersect 1.

## Not done / next
1. Run `npx tsc --noEmit --pretty false` (last edit: `entry.kind === 'choice'` in the declaration test).
2. The target puck broke 7 own tests (last run `.command-logs/2026-11-26T14-49-46-171Z-29652-fd260c95.log`): `LineGeometryGraph.test.tsx` (5: circle intersect test, coincident points, point fields, point rows groups, mount/unmount) and `LineGeometryLabels.test.tsx` (circle tick numbers), `LineGeometryLessonActions.host.test.tsx` (set-target: finds the combobox "Presečišče premice z", now a puck). Cause: tests change the target through the select or `setState` outside a write source: `UntaggedWriteError: "lines-target" changed outside any write source` (in `ObservedLineGeometryGraph` and `Probe`, i.e. shared tests `graphTeardownContract`/transient-state contract call `setState({target})` or similar: find test:line with `grep -an UntaggedWriteError` in that log). If a shared test cannot be satisfied, leave `lines-target` undeclared (drop the parameter, `parameterBindings`, `PuckOwned`, `uses` in l5-line-circle, put `highlight` back) and report test:line and setter; the whole conversion otherwise stands (rows, note, marks).
   Own tests: write through `graph.parameters.write('lines-target', v, 'learner')` or `runAs('learner', ...)`; the host test finds the puck instead of the select.
3. Re-run: `just graph-check line-geometry --route line-geometry`; `BEZEG_PARITY_GOLDEN_CHECK=1 BEZEG_PARITY_GOLDEN_ID=line-geometry just unit src/graphs/base/declare/parityGolden.test.tsx`; `just unit src/graphs/lines src/learning/content src/localization src/graphs/base/declare` (206 s; earlier run only failed on declarationContract frames, fixed by the `uses` change, not re-verified); `*FirstTask.test.tsx` case for line-geometry if any (grep); tsc; `just lint` on the changed files; `just build`; `just smoke-lesson line-geometry --port 4391 --workers=1` (row id `line-geometry`).
4. Lesson prose: "polja" in the intersect lessons names the coordinate point rows (still in Orodja), unchanged.
5. Scratch to delete: `.command-logs/l14-*` (including `l14-status.txt`, `l14-splice.py`, `l14-frames.py`).

## Round 6b (continuation)
- Own tests fixed (runAs learner / puck): LineGeometryGraph.test.tsx set(), Labels test, host set-target, analyticLinesIntersectGuidedLessons.test.ts (puck). lines-target stays declared; no shared test wrote untagged. All checks pass; golden differs only in notes.
