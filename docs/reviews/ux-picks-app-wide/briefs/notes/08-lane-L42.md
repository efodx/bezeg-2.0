# 08 lane L42 (conic-focal): HANDOFF, partial

Started 21:11. Stopped at the budget signal.

## Done (observed)
- Parity recorded before conversion: SAMPLES entry in `parity.test.tsx` (8 states), `src/graphs/functions/__parity__/conic-focal.json`. Check mode passes after conversion.
- `ConicFocalGraph.tsx`: `ConicIds`, `parameterBindings` (`conic-epsilon`, `conic-weight`), `declaration()` (eps puck; weight puck only while the arc is shown; `matched-weight` Orodja action; legend of 6 entries; marks = foci, arc control points, branches inside the start view, memo independent of P), `drawnObject`, `performAction`, `functionPanel()` (rows, definition note, statuses), `renderReadout` from the same data, legend panel renders null, drag handler under `runAs('learner')`, `PuckOwned` around eps and weight sliders. All board caption lines dropped (they repeated rows, statuses and the legend).
- Fragment `src/localization/fragments/conic-focal.ts` (`conic_epsilon_name`, `conic_epsilon_help`, `conic_weight_name`), registered (import + 3 lists, re-checked after the handler's cherry-pick). Retired `conic_board_*` (7 keys) from `sl.ts`/`en.ts` (grepped: no other users).
- `ConicFocalGraph.declaration.test.tsx` (11 tests green). Red check: `pd` segment visible always -> `AssertionError: pd: expected true to be false`; restored.
- Lesson frames in `schoolFunctionGraphsBatchCGuidedLessons.ts` (frame helper and `step` take optional `declare`; all 7 conic steps; eps used in steps 3 and 7, weight and matched-weight in step 7 with `open: ['readouts','tools']`); prose "drsnik" -> "krmilnik Ekscentričnost / Srednja utež", button name fixed to "Nastavi prilegajočo utež".
- Tests: host test helpers under `runAs('learner')`, eps slider test rewritten to arbiter writes (puck), `FunctionsFirstTask` conics case drops the eps label from Edit. `just typecheck` passed; `just unit ConicFocalGraph FunctionsFirstTask` passed; earlier full unit run (functions, base, content, localization) had only these failures, now fixed (declarationContract passed).
- `just graph-check conic-focal --route /bezeg-2.0/functions/conics`: contract, parity, declaration, shared pass; golden FAIL (expected).

## Golden diff (not re-recorded)
Only `captions` differ, in every state (default and the 5 guided steps): golden lists the board captions (sum, ratio line, title "|PF| = e |Pd|", "eps, l: kind", bridge line, circle warning), now none. All their values are readout rows or status lines.

## Not done / unverified
- eslint on changed files; `just unit FirstTask`; `BEZEG_PRESET_ROUNDTRIP=all ... -t conic-focal`; re-run of declaration + unit dirs after last edit (last edits were test-only).
- Browser: per-step shots 1440x900/1280x720, `just build`, `just smoke-lesson conic-focal --port 4391 --workers=1`, `tests/guided-lessons.smoke.spec.cjs` (and any spec naming conic-focal / /functions/conics; the handler touched that spec already).
- Puck-strip assertion for the conics case in `FunctionsFirstTask` not added.
- geometric-series untouched (not in this session).

## Judgements
- Pucks: eccentricity (step 3 asks to slide it across 1; step 7 free exploration) and middle weight (step 7). Orodja: l and phi (P is dragged on the board; no step asks for the slider), example (5 options), arc switch (every scene sets it), matched-weight button (declared tools action, frame opens Orodja).
- Default view box unchanged (top 10 units were reserved for the dropped caption; possible follow-up: shrink).
- `conic_fields_help` (sl/en, not owned) still says "slider and field for eps reach exactly 0 and 1"; slightly stale now eps is a puck.
- Scratch to delete by name: `.command-logs/l42-*` (chunk.txt, edit1.cjs, sed*.sh, logs).

# Session 2
- View: `conicFrame` + `conicFollowFrame` in `ConicFocalGraph.tsx` (`followView` = padded box around foci, Bezier control points, conic inside the window and the directrix foot; min 10 units, clipped to the window). The conic fills the free area instead of a small figure (before: ellipse about 10 units wide in a 28 x 30 window).
- `conic_fields_help` (sl/en) now names the Eccentricity control (krmilnik Ekscentričnost). FirstTask conics case asserts `conic-epsilon` on the puck strip and absent from Edit.
- Observed: eslint on changed files, `just typecheck`, `just unit src/graphs/functions src/graphs/base src/learning/content src/localization` (passed, after last source edit except none since), `just unit FirstTask`, PresetRoundTrip conic-focal (1 passed), `just build`, `just smoke-lesson conic-focal` all passed.
- Shots `.command-logs/l42-fin-<1440|1280>-s1..s7.png` walked via `l42-shots.cjs`; looked at 1440 s1 and 1280 s3 (step 3, clear of cards; lesson card clips its observation prompt at 720 px, as in L43). Other steps not individually viewed. Board size not measured (selector missed); the live-site comparison was not done.

# Session 3 (geometric-series): HANDOFF, partial

## Done (observed)
- Parity recorded first: SAMPLES entry (12 states) in `parity.test.tsx`, `src/graphs/functions/__parity__/geometric-series.json`. Check mode passes (2 passed). First attempt had extra rows a, q, tolerance (old panel had none): dropped them, so rows are the old 7.
- `GeometricSeriesGraph.tsx`: `SeriesIds`, `followBox` (indices up to next multiple of 5 above n, bars, zero, limit, band; used for default box, exampleView, refit and `followView`), `parameterBindings` (series-q, series-tolerance), `declaration()` (q and tolerance pucks, legend of 4 drawn groups, formula row, iteration actions), `drawnObject` (bar groups, limit, band), `performAction`, `functionPanel()` (7 rows, note `caveat`, statuses as Messages, warning tone when no limit, marks = bar tops), `renderReadout` from it, legend panel null, `PuckOwnedGroup`/`PuckOwned` around q and tolerance sliders. All board captions dropped. Bar width capped (14 / 20 px) because a 5-index view would make 35 px bars (drawing only).
- Fragment `src/localization/fragments/geometric-series.ts` (6 keys), registered in `fragments/index.ts`. Retired `series_board_*` (7 keys) from sl/en (grepped: no other user).
- `GeometricSeriesGraph.declaration.test.tsx` (11 tests green). Red check: limit marker `visible: () => true` -> `AssertionError: limit: expected true to be false`; restored.
- Lesson frames in `schoolFunctionGraphsBatchCGuidedLessons.ts` (`seriesFrame`, all 8 steps; step 2, 3 use next-step, step 8 uses series-q and series-tolerance, steps 7 and 8 observation open tools); step 8 prose names the controls.
- Host test: edit helpers under `runAs('learner')`, `importLearner`, q slider/field tests rewritten as arbiter writes, language test checks status and row names. `FunctionsFirstTask`: geometric-series case asserts pucks on strip, absent from Edit.
- Checks passed: `just typecheck`; `just lint` on changed files; `just unit src/graphs/functions src/graphs/base src/learning/content src/localization` (only FirstTask failed, fixed after); `just unit FirstTask`; PresetRoundTrip geometric-series; graph-check: contract, parity, declaration pass, golden FAIL (expected), shared was the FirstTask case (now fixed, not re-run via graph-check).
- Golden diff (not re-recorded): only `captions` differ in every state (default and 7 guided): golden lists 5-6 board captions (formula, "a = , q = , n = ", sum, limit/no limit, error, key); now none. Values are rows, statuses, legend, formula row. `a` is no longer shown as a value except on the Orodja slider (no puck for a).
- Board size, live site https://efodx.github.io/bezeg-2.0/ and dev server alike: selector `.workspace-board-stage`: 1330x569 at 1440x900, 1230x411 at 1280x720 (probe `.command-logs/l42-gs-probe.cjs`).
- Shots `.command-logs/l42-gs-a-<1440|1280>-s1..s8.png` via `l42-gs-shots.cjs`; the Naprej button steps frames, so s1..s8 cover only lesson steps 1 to 4. Viewed 1440 s1, s8; 1280 s6, s8: bars and limit line sit in the card-free middle, pucks under the lesson card clear, no board text. Lesson card clips its prompt at 720 px (as in L43).

## Not done / unverified
- Shots of lesson steps 5 to 8 (band, q = -1, divergent), including the tolerance band and pucks in step 8.
- `just build`, `just smoke-lesson geometric-series`, `tests/*.spec.cjs` naming geometric-series or /functions/geometric-series.
- `just graph-check` re-run after the FirstTask fix; `just unit` dirs after the last test-only edit (FirstTask ran green alone).
- A console warning in unit logs: untagged "view" write from `applyEdit` `setIntent` when `setA` is called directly (sharedControls test); tests pass.

## Judgements
- Pucks: ratio q (steps 5, 6, 8) and tolerance (step 8). Orodja: a, n (CountSetter), example (5 options), playback buttons (board actions also declared).
- Scratch to delete by name: `.command-logs/l42-*` (gs-probe.cjs, gs-shots.cjs, gs-frames.sh, edit-gs.cjs, png, logs).

# Session 4 (geometric-series)
- Untagged "view" warning: test-only. Production Orodja slider/field input rides a pointer or key tagged as learner; lesson actions run as lesson; presets are tagged. Cause: the shared harness `fireEvent.blur` bare (`src/inputs/sharedControlBehaviour.tsx:166`, now `runAs('learner', ...)`). sharedControls.graphs test: no errors.
- REAL bug found in the shots (strict dev server): a lesson morph of q writes `animation` under a lease holding only series-q; `applyEdit` refit the view there -> "Prizora ni mogoče pripraviti. Untagged parameter write ... view changed by an animation that does not lease it" at lesson step 5. Fix `GeometricSeriesGraph.tsx:193`: skip the refit when `currentWrite()?.source === "animation"` (followView carries the view). Not covered by a unit test.
- Shots `.command-logs/l42-gs4-<1440|1280>-c01..c17.png` (c = Naprej click; two frames per step, c9-c16 = steps 5-8). 0 page errors after the fix. Step 5 (q=-0.5): bars alternate about the limit line 0.667, readout rows highlighted. Step 7: limit 0.3333, bars flat. Step 8: q and Odstopanje pucks on the strip under the lesson card, clear; the tolerance band at 0.01 is a ~3 px dashed hairline at the limit (visible, thin). At 1280x720 the step 8 card clips its text (as L43); the x label "10" sits under Orodja.
- Checks: graph-check: contract, parity, declaration (11), shared (11) pass; golden FAIL (expected captions diff). `just unit` functions base learning/content localization inputs: passed. `just build` passed. `just smoke-lesson geometric-series --port 4391 --workers=1` passed; only tests/guided-lessons.smoke.spec.cjs names the id: `-g geometric` passed.
- Scratch deleted by name, shots kept.
