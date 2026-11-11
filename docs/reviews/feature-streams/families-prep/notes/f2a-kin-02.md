# f2a-kin-02 final evidence (kinematics state model and graph, no route)

Files (uncommitted): `src/kinematics/kinematicsModel.ts` + `.test.ts`, `src/graphs/curves/kinematics/KinematicsGraph.tsx` + `.test.tsx`, the `kinematics_graph_*` block (80 lines each) in `sl.ts`/`en.ts`, term rows and status in `docs/tasks/kinematics/README.md` and `02-kinematics-graph.md`. Accepted kernel files untouched. The model imports only `PARAMETRIC_CATALOGUE` (pure TS); no React/JSXGraph reaches it.

## Checks (observed)
- `just unit src/kinematics src/graphs/curves/kinematics`: exit 0, 5 files, 164 tests (`.command-logs/kin02c-unit.log`).
- `npx tsc --noEmit --pretty false`: exit 2, two errors, both in `src/graphs/recursion/RecursionCobwebGraph.test.tsx` (156, 582; another worker). None in kinematics.
- `just lint src/kinematics src/graphs/curves/kinematics`: exit 0. `just build`: exit 0.
- No trailing whitespace and no control characters in the owned files or both locale files. Every `kinematics_graph_*` line matches `"key": "value"`. Locale diff outside `kinematics_graph_`/`recursion_graph_`: empty.

## Mutations (each restored; `cmp` identical to the backup)
Failing the suite: reset, framecap, clamp, dispose, cache, mute, driver, help, edit-pause, endstop (earlier round, `kin02b-mutations.log`).
- `comma` (scale caption number without the decimal comma): earlier survived because steps were integers. New test "a scale step with a decimal ..." uses circular motion at the minimum radius and omega, asserts the comma in caption and readout (sl) and a point (en), and that a decimal step exists. Rerun: 4 failure lines, restored, `cmp` identical to `kin02c-comma.bak` (`kin02c-comma.log`).
- `cusp` (dropping `&& regular()` from the velocity arrow `shown`): EQUIVALENT. At an exact zero speed `longEnough` already hides the arrow, so the guard is belt-and-braces. The behaviour is still tested: `KinematicsGraph.test.tsx:77` (at the cusp no velocity arrow, `status_cusp` shown, cusp caption, acceleration kept).

## Redraw measurement
JSDOM PLACEHOLDER (`kin02b-redraw.log`): 60 frames, median 3.31 ms, p95 6.64 ms. Not a browser result; owed at F2b.

## Not verified
Browser layout of captions, text overlap with arrows, `keepaspect` fit; fonts for the subscripts aₜ, aₙ, v₀. Lesson checkpoint capture/restore of `kinematicsTime`, figure capture, Preset round trip and `restoreTransientState` have no test. Slovenian wording not owner-reviewed.

## Decisions and doubts for review
- Scale maximum sampled at 720 points (1e-5 slack; tests allow 1e-4).
- Arc length, KN2's second moving point, KN4's hold and the osculating circle are not in F2a.
- Arrows shorter than 1e-3 of the full arrow are hidden (`longEnough`); zero acceleration shows no arrow while its scale caption stays.
- `label` objects (ticks) come and go with zoom, so the disposal test excludes them and compares the graph's own 25 objects.
- New Slovenian terms (obhodni čas, težni pospešek, kroženje, primerjalna točka, izstrelni kot) are in the README terms table.
- The comma test drives only the circular motion to reach decimal steps; the catalogue motions at defaults have integer steps.

## Review repairs (round d)
Logs `.command-logs/kin02d-*.log`. Pre-fix run: new suite against the original graph file (`kin02d-prefix.log`) fails 1 (object count 26) + 9 tests (items 1, 2 refusal, 3, 4, 5, 6/7); file restored, `cmp` identical to `kin02d-graph.new`.
1. Pause on every edit: `KinematicsGraph.tsx` `onStateChange` halts when any `STORED_FIELDS` entry changed. Test "every edit of the scene pauses a run ..." (direct `setState`; failed before).
2. Time capture/restore: `restoreTransientState`. Decision: an invalid saved time (beyond range, negative, NaN, non-number) is REFUSED, not clamped (shared rule: restored values are never changed): t = 0, stopped, status says `notice_time_refused`. Tests: checkpoint keeps t and stops after a motion change (passes on old code, coverage), 4 refusal cases (failed before), no-time case, Preset round trip serialize/parse/set plus malformed radius with an actionable message (model tests already cover every field).
3. b reset: `notice_reset_b` when leaving circular with b > 0; test names it, and plain notice for b = 0 (failed before).
4. Cusp: `standstill()` (speed / velocity step <= `MIN_ARROW` or singular) drives the status and the cusp caption (only when the velocity or split is shown); test at cycloid t = 0,001 (failed before). Wording is now "0 ali skoraj 0" / "0 or nearly 0".
5. Acceleration scale caption visible when `showAcceleration || split` (`accelerationShown`); test with a off, split on (failed before).
6. Dash words: a "črtkano"/"dashed"; aₙ "dolge črtice"/"long dashes" (`cap_components`, `split_help`); test for both languages (failed before).
7. Sign hint: caption `cap_sign` on the board with the split, `<p data-kinematics-sign>` beside the readout ("negativno: tir zavija desno" / "negative: the path turns right"); owned objects now 26.
8. Cache: `deriveKinematics(state)` is called with its SI defaults; units are resolved by `unitOf()` at render time. Test: derived object and count unchanged by a language change. Not mutation-testable (the Slovenian and English unit strings are identical), stated honestly.
9. `playBlock="reduced-motion"`: kept. `shared-graph-controls.md` C12 (line 188) adds `reduced-motion` for continuous runs ("Play stays focusable and says why it is unavailable instead of greying out", line 243; Epicycle line 244). SimulationGraph is a stepwise run and uses `no-more-steps` (its reduced motion shows everything at once), so it is not the model; kinematics is a continuous run, as the spec states.
10. `kinematicsModel.ts:2` keeps `PARAMETRIC_CATALOGUE` (pure TS, no React/JSXGraph): it is the one place for the domains and the rose petal count that the parametric graphs show; importing `parametric-sources` would duplicate them and let them drift.
11. Dense check: 20 000-point maximum of speed and acceleration vs the 720-sample maximum (relative 1e-4) and vs the scale step (1e-4), for cardioid, rose, spiral, circular, circular with b = 0,9. Mutation `SAMPLES = 9`: rose fails (restored, `cmp` identical to `kin02d-model2.bak`); the step comparison alone did not fail because of the 1, 2, 5 ladder headroom, hence the added direct comparison.
Not verified: browser layout of the new caption rows (now up to 11 stacked), the new Slovenian wording (owner review).
