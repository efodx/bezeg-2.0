# BS-A-2a3: de Boor triangle graph (evidence)

What: `DeBoorGraph` (BaseGraph subclass; state degree/knots/points plus t and revealed level; exports `DEBOOR_ANIMATION_ID` = 'deboor' with next step / play / pause / reset levels), owned `DeBoorScene` (JXG B-spline curve layer with draggable control points, k + 1 passive rings on the active points, level points and segments r = 1..k, board readout), pure `bsplineDeBoorModel.ts` (readout lines, appended point, knots for a point count, clamped t). Reuses `KnotEditor` from 2a2. Locale: 11 `bsd_*` keys in `sl.ts` and `en.ts`.

Checks (observed, 2026-11-02):
- `just typecheck`: clean (log `~/.claude/jobs/a2299c30/tmp/bs-a-2a3b-tsc.log`).
- `just lint`: passed (`bs-a-2a3b-lint.log`).
- `just unit src/graphs/curves/bspline src/bezeg/impl/curve`: 21 files, 382 tests passed (`bs-a-2a3b-unit.log`).
- `just build`: passed twice; the wrapper reported "Build inputs changed while building" (another worker edits src/learning concurrently), so provenance is not recorded. Rerun at integration (`bs-a-2a3b-build.log`).

Mutations (path-filtered `DeBoorGraph.test.tsx`, vitest summary read, reverted): alpha flipped `1 - (...)` caught (4 failed); +1e-9 on the blend result caught (4; triangle numbers and basis-sum at TOL 1e-12); ring count k instead of k + 1 caught (7); ring `hasPoint` true caught (1); language subscription not released caught (1); board objects not removed on dispose caught (1). No survivors. Locality and convex hull share the kernel mutations above (not mutated separately).

Measurement (jsdom, real JSXGraph board, degree 2, 4 points; not a browser): `BSPLINE_DEBOOR_MEASURE drag 3.21 ms/event, t sweep 7.31 ms/step`. console.info is not kept in the command log; read by a temporary failing expect (removed).

Decisions: rings are fixed, `highlight: false`, and `hasPoint` returns false so they never take a pointer hit from the control point beneath; test asserts it and that a drag of a highlighted control point moves the state. The readout writes `P^r` with `^`, which JSXGraph renders as superscript. A point-count change rebuilds the curve layer.

Not verified: any browser drag or smoke (jsdom `control.hasPoint` is false, so the positive hit is unchecked); SL/EN visual check.

Follow-ups:
- 2a3b presets: `presetCollection()` is undefined in `DeBoorGraph`, so the fixture path throws "cannot check lesson geometry" and the figure step falls back to the default; wire `bsplinePresetCollection` there. State shape and `lessonDefaultState`, `importPresetData`, `figurePresetGraphState` already carry the data.
- 2b: register 'deboor' in `LESSON_ANIMATION_IDS` and `registerLessonActions`; register the graph route; browser drag check of the rings over control points; SL and EN smoke.
