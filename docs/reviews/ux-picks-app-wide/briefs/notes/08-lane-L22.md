# Lane L22 (unit-circle), round 9: PARTIAL handoff (budget signal at 135k)

## Done (observed)
- Parity recorded BEFORE converting: `data-readout-note` added to `<p data-unit-circle-status>` and the approx-note `<p>` (text unchanged); SAMPLES entry `unit-circle` (9 states, `run(patch)` = `runAs('learner', setState({...fresh, ...patch}))`) in `src/graphs/base/declare/parity.test.tsx`; `src/graphs/trig/__parity__/unit-circle.json` recorded (passed, 55 rows, notes present). Never re-record. Golden has no notes: expect notes-only golden difference (report verbatim).
- `UnitCircleGraph.tsx` converted, `npx tsc --noEmit --pretty false` clean: `UnitCircleIds` (params `unit-angle`, `unit-second-angle`; 10 rows; notes `status`, `approx`; legend 4; actions `cosine`, `symmetries`, `addition`), `declaration()`, `parameterBindings()` (degrees, half-degree grid, DomainError `unitcircle_angle_refused`), `performAction` (runAs learner, `super` for unknown), `drawnObject` via `legendObjects`, `viewMarks()` (one box: circle plus traces and their names), rows as Messages (`readoutRows()` public, `listRows()` for panel), `statusMessage()`, Orodja controls wrapped in `PuckOwned` (old keys kept; pi field and rounding note stay in Orodja), `FunctionLegend` removed from `workspaceEdit` (`data-declared-panel`).
- Fragment `src/localization/fragments/unit-circle.ts` (8 keys, `unitcircle_*`) registered in `fragments/index.ts`.
- `UnitCircleGraph.declaration.test.tsx` written (7 states, bindings, actions): 10 tests pass. Red check NOT yet done.

## Placement (one line each)
- Angle theta and (with addition) second angle beta: range pucks in degrees (the learner moves them while watching; the point is also draggable). Behaviour change: typed degrees out of 0..359.5 are refused by the puck (old Orodja slider wrapped 400 to 40).
- Cosine, symmetries, addition: switch pucks (flipping one is the observation); labels "Kosinus", "Simetrične točke", "Seštevanje kotov" (<= 16).
- Multiple-of-pi field and the rounding note stay in Orodja (alternate typed entry, not a watched control).
- Legend: default place not changed (not yet judged against the board).

## Not done / next
1. `just unit src/graphs/trig src/learning/content/trigUnitCircleGuidedLessons.test.ts` (log `.command-logs/l22-unit1.log`): 33 failed in 3 files: `UnitCircleGraph.test.tsx` (angle fields, switches and legend panel moved to pucks: use `graph.parameters.write('unit-angle', v, 'learner')` or `typePuck`/`waitForPucks`, remove `[data-legend]` panel asserts, wrap `setState` in `runAs('learner')`/`asLearner`), `UnitCircleLessonActions.host.test.tsx` (switch checkboxes moved to pucks), and probably `trigUnitCircleGuidedLessons.test.ts`. Check which with the log.
2. Lessons: `trigUnitCircleGuidedLessons.ts` frames: add `frameDeclarer<UnitCircleIds>()` and `declare` (via the `frame()` helper, as `trigSolveGuidedLessons.ts`); `uses: ['addition']`/`['symmetries']`/`['cosine']` where a step asks the learner to switch them; highlight only given rows. Only reword at line ~359 ("Vklopljeni sta obe stikali" -> e.g. "Vklopljena sta oba prikaza"; quote in report) and pin in the test.
3. `trigPresetCollection.test.tsx`: untagged `setState` may be wrapped in `runAs('learner', ...)`; check by running it.
4. Red check: change one row value in `readoutRows()` (e.g. cos row uses `derived.point[1]`), run the declaration test, quote the failure, restore.
5. Checks: `just graph-check unit-circle --route unit-circle` (golden notes-only difference expected); `BEZEG_PARITY_GOLDEN_CHECK=1 BEZEG_PARITY_GOLDEN_ID=unit-circle just unit src/graphs/base/declare/parityGolden.test.tsx`; `just unit src/graphs/trig src/learning/content src/localization src/graphs/base/declare`; `just unit src/learning/content/declarationContract`; `npx tsc --noEmit --pretty false`; `just lint` on changed files; `just build`; `just smoke-lesson unit-circle --port 4391 --workers=1`; view-box tests if any pin the old view; screenshot of the puck strip/legend.
6. Time not recorded.

## Files touched
`src/graphs/trig/UnitCircleGraph.tsx`, `src/graphs/trig/UnitCircleGraph.declaration.test.tsx` (new), `src/graphs/trig/__parity__/unit-circle.json` (new), `src/graphs/base/declare/parity.test.tsx`, `src/localization/fragments/unit-circle.ts` (new), `src/localization/fragments/index.ts` (line endings became CRLF in the working copy; git normalises to LF). Scratch `.command-logs/l22-*` can be deleted.

## Round 9 continuation (observed)
- Binding `unit-angle`/`unit-second-angle` now uses the model's `editAngle` (wrap modulo 360, snap to half degree, note kept); the RangePuck itself refuses typed values outside 0..359,5 with its range hint BEFORE the binding (so 400 typed on the puck stays refused; 400 written through the binding gives 80 half-degrees = 40 deg). Tests: binding 400/360/-30/10,3 -> 80/0/660/21; puck refusal of 400/360/-30.
- Drag handler tagged `runAs('learner')` in `wireDrag` (was untagged: UntaggedWriteError).
- Keyboard step changed: arrow 0,5 deg, Shift/Page 5 deg (puck grid); the old slider was 1 / 10 deg.
- Tests migrated (no assertions deleted): UnitCircleGraph.test.tsx, UnitCircleLessonActions.host.test.tsx, trigUnitCircleGuidedLessons.test.ts (new pin test), trigPresetCollection.test.tsx line 34 wrapped in runAs('learner').
- Lesson sentence tr2-explore: sl "Vklopljeni sta obe stikali:" -> "Vklopljena sta prikaza Simetrične točke in Seštevanje kotov:"; en "Both switches are on:" -> "Both Symmetric points and Angle addition are on:". No step asks the learner to flip a switch, so no `uses`/frame declarations.
- Red check: cos row `derived.point[0]` -> `[1]`: declaration test "default" failed: expected '1/2 ≈ 0,5' received '1/2 ≈ 0,8660254'; restored.
- Checks: unit (trig, content, localization, declare) passed; tsc clean; lint passed; build passed (5.3 s, may have reused output); smoke-lesson unit-circle passed (9.6 s, reused build). graph-check golden: 11 states differ, notes only (golden `notes: []`, now status sentence + approx note, e.g. default: ["Točka pri kotu 60° (π/3 rad): cos θ = 1/2 ≈ 0,5, sin θ = √3/2 ≈ 0,8660254, v prvem kvadrantu.","Vrednosti z znakom ≈ so zaokroženi računi; ..."]). Shared failure fixed (runAs). Not re-run after fix: graph-check as a whole (the unit run covers trigPresetCollection).
