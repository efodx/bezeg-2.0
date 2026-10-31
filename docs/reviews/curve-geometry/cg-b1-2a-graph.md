# CG-B1-2a: `curve-parametric` graph (no registration)

Files: `src/graphs/curves/parametric/` (parametricCatalogue.ts pure catalogue/oracle maths, parametricPresetCollection.ts,
ParametricScene.ts owned elements, ParametricCurveGraph.tsx, three test files); 14 keys added to sl.ts and en.ts.

Base class: `BaseGraph` directly (as BernsteinGraph). `BaseCurveGraph`/`BaseBezierCurveGraph` assume control-point curves;
`BaseFunctionGraph` is the gated function model. No shared class edited. Preset data type is its own
(`{curve, radius, parameter}`), collection key `curve-parametric`, not added to `curvePresetCollections` (registration slice).

Ownership: one `ParametricScene` per catalogue choice; recreated by `importPresetData` (also covers checkpoint restore and
figure batch), `setCurve`, `initialize`; disposed by `disposeFigureScene`, `unmount`, and before each rebuild. Elements read
state lazily; one `onLanguageChange` subscription released in `dispose`. Roll animation: rAF driver, cancelled on
unmount/import/curve switch; `stopLessonAnimations` stops and resets to the domain start.

Local pending items for registration slice: `PARAMETRIC_ROLL_ANIMATION_ID = 'parametric-roll'` must be added to
`LESSON_ANIMATION_IDS`; collection added to `curvePresetCollections`; lesson action wiring; view fit happens in
`initialize` and on user actions only (not on import, so saved board state survives).

Mutation checks (observed red, then reverted by file copy, green again): cycloid area halved -> 5 area/scale tests red;
velocity vector returned d2 -> 5 velocity tests + scene arrow test + readout test red; `ensureScene` without `removeScene` ->
catalogue-switch and import-replaces tests red (14 failures in total with all three applied).

Checks: `just unit src/graphs/curves/parametric` 3 files pass (the real-board test needs ~40 s on a loaded machine and timed out once at the 15 s default under load; passed on rerun); `npx tsc --noEmit` clean; `npm run build` exit 0.
Not verified: browser/visual check, both languages in a browser, dragging performance, touch/keyboard review of controls.

## Review (handler 5, 2026-10-31)

Parallel `bezeg-reviewer` Sonnet reviews of `8c4b3ca`: engineering (ownership, rAF roll, base choice, Preset validation, controls, tests) and mathematics (parametrisations, velocity, cusps, all catalogue oracles, radius ray, quadrature).

- **Mathematics: no finding.** Notes accepted as is: the rose has no elementary arc-length closed form, so it has no length oracle (the shared Simpson integrator is pinned by the cycloid, cardioid and spiral); the cardioid's kink at \(\theta=\pi\) lowers Simpson to \(O(h^2)\) there, still far inside the 1e-5 test tolerance; readouts show whole-domain length and area, as the spec asks.
- **E1 (fixed, also the owner-level view-fit decision).** A Preset imported without a saved view kept the previous curve's view box. `importPreset` is now overridden: after the base import, a Preset with data and no `boardState` is fitted to its curve; a saved view is kept. The fit cannot live in `importPresetData`, because `BaseGraph.importPreset` applies the saved view before the data. Checkpoint restore and lesson fixtures apply their view after the data and are unaffected; the lesson default scene keeps the current view (F3 scene actions set views where a lesson needs one).
- **E2 (deferred, no user impact).** `checkGraphState` checks a partial `graphState` parameter against the cycloid domain. Imported data overwrites `curve`, `radius` and `parameter` right after, and `clampParameter` bounds drawing; only hand-written files reach it.
- **E3 (fixed).** `ParametricScene` disposes what it created if `build()` throws, then rethrows.
- Regression tests (`ParametricCurveGraph.test.ts`): view fit with and without a saved view, and the failing-build cleanup. Both observed red with the two source files at `8c4b3ca`, green after.

Checks after repair: `just unit src/graphs/curves/parametric` pass; `npx tsc --noEmit` clean. Browser check stays with CG-B1-2b.
