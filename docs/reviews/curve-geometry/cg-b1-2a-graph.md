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
