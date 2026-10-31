# IA-A-2a: `interp-lagrange` graph (lesson I1), evidence

Unreviewed worker output; not registered (no route, catalog entry or `LESSON_ANIMATION_IDS`), no lessons.

## Files
- `src/graphs/curves/interpolation/`: `InterpolationGraph.tsx`, `InterpolationScene.ts` (owned elements), `interpolationModel.ts` (types, rejection rules, readout, hull), `interpolationPresetCollection.ts` (key `interp-lagrange`), tests `InterpolationGraph.test.ts` (fake board) and `InterpolationGraphReal.test.tsx` (real JSXGraph board).
- `src/localization/sl.ts`, `en.ts`: 15 `interp_*` keys in lockstep.

## Decisions
- Base class: `BaseGraph` directly, like `ParametricCurveGraph`. `BaseBezierCurveGraph` brings spline/control-point machinery that a non-Bezier interpolant would bypass (gate G-CURVE forbids editing it); the owned-scene, lazy-read, dispose pattern fits. No shared base edited.
- Preset data `{points, parameterRule, showHull, showBezier, t}`; scene state adds `notice: '' | 'coincident'` (last refused edit). State is written only through `setState`; the scene reads it lazily.
- Parameter scale: `t` is one shared position s in [0,1]. Lagrange parameter = t_n * s on [0,t_n] (t_0 = 0); Bezier parameter = s on [0,1]. Default s=1/2 gives Lagrange t=3/2 and Bezier t=1/2. The Lagrange t=1/2 case is s=1/6. The readout and slider help state both scales.
- Coincident rule: parameters must be strictly increasing (only chord can fail). Drag/rule/add/remove that would break it is refused, state keeps the old valid data, the point snaps back and a notice shows. Import throws `LocalizedError`; the collection returns a rejection.
- Caps: 2..12 points, |coordinate| <= 1000 (my addition, to reject out-of-range imports).
- Add appends a point one unit right of the last; remove drops the last (CountSetter). Basis plot, typed list, registration are later slices.

## Mutation checks (observed failing, then restored)
- Evaluator ignores chord rule: pass-through test fails.
- Coincident check disabled: 5 tests fail (drag, import, collection, rule switch).
- Bezier curve parameter u*u: lesson-defaults board test fails.
- Readout t = 3s instead of t_n s: chord-scale assertion fails.
- Scene dispose skips `removeObject`: 4 fail (count bounds, import stacking, build failure, real unmount).
- Scene dispose skips language unsubscribe: subscription-count test fails.

## Checks run
- `just unit src/graphs/curves/interpolation --maxWorkers=2`: passed (17 tests, 2 files).
- `just unit src/graphs/curves/interpolation src/localization`: passed.
- `npx tsc --noEmit --pretty false`: exit 0. `npm run build`: exit 0.

## Not verified
- No browser/touch/keyboard check, no SL/EN live-switch check (board text uses `onLanguageChange`, tested only for release).
- Dragging with real pointer events; the real-board test triggers the drag handler directly.
- Hull outline is a sampled function curve (corners to ~1/1000 of the loop). `insideHull` for a 2-point hull checks only the vertices.
- Lesson checkpoint restore (`replaceState`) does not rebuild the scene on a point-count change (same as parametric); lesson wiring belongs to the registration slice.

## Repair round
- E1: `lessonDefaultState()` override keeps the just-imported data (fixture with 6 points: state and board agree). Failed without the override.
- E2: real-board test, checkpoint with 4 points, add a fifth, restore: 4 points on the board. Pins existing behavior (passes without a fix).
- E3: add at x=1000 steps left (999), no notice. Failed before.
- M1: `insideHull` with fewer than 3 hull vertices uses the clamped segment distance. Failed before.
- M2: `interpolationRejection` also rejects nodes whose barycentric weights overflow (new key `interp_nodes_too_close`); a draw returns NaN, never throws. Failed before.
- M3: hull is a closed-polyline data curve (`updateDataArray`), same ownership; test checks 4 distinct vertices plus the closing one. New behavior, not mutation-checked.
- Checks: `just unit src/graphs/curves/interpolation` passed (23 tests); `npx tsc --noEmit --pretty false` exit 0. Build not re-run.

## Handler acceptance (handler 5, 2026-10-31)

Reviews: engineering + UI (`bezeg-reviewer` Sonnet) and mathematics (`bezeg-reviewer` Sonnet). All findings fixed in one repair round except keyboard point editing, deferred to IA-A-2b (the typed point list, ADR 0026), with no user impact until registration. The engineering reviewer refuted the worker's checkpoint-restore flag; a test now pins it. The fixture defect (E1) also existed in the pushed parametric graph and was fixed there (`6950745`).
Handler checks after repair: `just unit src/graphs/curves/interpolation src/graphs/curves/parametric` pass; `npx tsc --noEmit` clean; `npm run build` exit 0. Not verified: browser drawing, SL/EN live switch, real pointer drags (registration slice).
