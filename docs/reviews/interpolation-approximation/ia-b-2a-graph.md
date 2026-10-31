# IA-B-2a: `interp-hermite` graph (lesson I3), evidence

Unregistered (no route, catalog, LESSON_ANIMATION_IDS, lessons). Worker (Sonnet `medium`) handed off at its 135k budget with implementation and tests complete; the handler ran the remaining checks.

## Files touched
- `src/graphs/curves/hermite/`: `HermiteGraph.tsx`, `HermiteScene.ts`, `hermiteModel.ts`, `hermitePresetCollection.ts`, `HermiteGraph.test.ts` (fake board), `HermiteGraphReal.test.tsx` (real jsdom board).
- `src/localization/sl.ts`, `en.ts`: 16 `hermite_*` keys added in lockstep (coincident points/notice, tangent_invalid, mode(+2), tension(+2 help), show_tangents, show_bezier, tangent_list, tangent_name, end_note, board_catmull, board_hermite). Reuses `interp_parameter_rule`, `interp_rule_*`, `interp_point_count`, `interp_point_list`, `interp_point_name`, `interp_points_range`, `interp_coordinate_invalid`.
- Not changed: `PointListInput`, kernels, interpolation folder.

## Decisions beyond the brief
- Curve is one functional curve over the global parameter t (not a sampled data curve), so tests can evaluate X(t), Y(t) exactly. Bezier overlay: one polygon data curve and two control points per segment (end points are the data points).
- Own `hermite_coincident_*` messages (the `interp_` text mentions the Lagrange polynomial). Unlike I1, uniform also rejects equal points (kernel RangeError). Chord/uniform switch is refused only when chord parameters round to a repeat (e.g. (0,0),(1000,0),(1000,1e-300)).
- Mode switch and add clamp copied tangents to +-1000. Add uses the tension-1 Catmull-Rom tangent. `setTension` is a no-op in Hermite mode.
- Tangent tip handles are always created; fixed via `setAttribute` in `sync()`; the drag handler refuses in Catmull-Rom mode and snaps back.
- View fit uses the points only (arrows may leave the view).
- Flag: in Hermite mode a uniform/chord switch changes the curve shape (stored m_i are global derivatives, local tangent h_i m_i). Not a contradiction, but visible to users.

## Checks run
- `npx tsc --noEmit --pretty false`: 0 errors (run before the tests were added).
- `just unit src/graphs/curves/hermite --maxWorkers=2`: passed (last run after the final test edit; 2 files, about 45 tests).
- NOT run: `just lint`, `just unit src/graphs/curves src/localization`, `npm run build`, tsc after the final test edits.
- Logs: `C:\Users\NonFriedMotherBoard\.claude\jobs\6d78d052\tmp\ib2a-*.log`; mutation script `mutate.py` there.

## Mutation checks (each observed failing, then restored; source verified identical to backup)
M1 drop h from Hermite local tangents: chord derivative test, Bezier test. M2 swap Bezier control points: Bezier overlay test. M3 tension offset: default-scene, mode-switch, model tests. M4 move also drags last point: locality test. M5 skip coincident check: drag, refused-drag, typed/rule-switch tests. M6 skip rejection in editPoint: typed edit test. M7 import does not throw: import test. M8 mode switch keeps tangents: 2 tests. M9 setTension ignores mode: 2 tests. M10 tangent drag in any mode: 2 tests. M11 slider never disabled: slider test. M12 lessonDefaultState drops data: fixture tests (2). M13 dispose keeps language subscription: 2 tests. M14 no board update on language change: language test. M15 add tangent zero: 2 tests. M16 import skips scene rebuild: 4 tests. M17 tips do not follow points: 3 tests. M18 no fit for view-less Preset: importPreset test. M19 end note in Hermite mode: UI test. M20 collection ignores tangent count: 3 tests. M21 export omits tension: first survived, test strengthened (export equals input), then failed round-trip test. M22 figure dispose no-op: caught only by the fake-board dispose test (the real figure test passes because import rebuilds the scene anyway). M23 tangent limit unchecked: 3 tests. M24 point drag resets its tangent: 2 tests.

## Not verified
Browser, real pointer drag, SL/EN live switch in a browser, keyboard flow, touch. Real `fixed` attribute effect on dragging (only `visProp.fixed` is asserted). Figure batch only via `disposeFigureScene` + `importFigurePresetData` + `initialize`, not the full batch download.

## Handler acceptance (handler 6, 2026-10-31)

Reviews: engineering + UI (`bezeg-reviewer` Sonnet) and mathematics (`bezeg-reviewer` Sonnet); no blocking finding.
- Fixed, mathematics 1: copying Catmull-Rom tangents into Hermite mode clamped them to 1000, so the curve could change silently (uniform end tangent tension (P_1 - P_0) reaches 4000 within the caps). `HERMITE_TANGENT_LIMIT` is now 2 * tension max * coordinate limit = 4000, so the copy is exact. A new model test (extreme points, tension 2) fails with the old limit (observed). Two cap tests moved their out-of-range value to 4001.
- Fixed, engineering 1: the view fit includes the drawn tangent arrows (Hermite tangents or the Catmull-Rom ones). Not test-pinned (view polish).
- Deferred to the lesson slice (text): the Bezier handles are P_i + h_i m_i / 3, equal to the spec's P_i + m_i / 3 only for uniform parameters; and in Hermite mode a uniform/chord switch rescales the local tangents h_i m_i and so changes the shape. The mathematics reviewer confirmed this is correct (m_i are velocities in the global parameter) and should stay.
- Deferred, engineering 2: Add at the coordinate limit steps left and can land on the previous point, so it is refused with the notice; same as I1, safe, no user impact before registration.
- Handler checks after the repairs (revision 0129abe + this diff): `npx tsc --noEmit --pretty false` clean; `just lint src/graphs/curves/hermite src/localization src/inputs` clean; `just unit src/graphs/curves src/localization src/inputs --maxWorkers=2` passed; `npm run build` exit 0.
- Not verified: browser drawing, real pointer drags, SL/EN live switch in a browser, keyboard and touch flows, projection and narrow sizes (registration slice).
