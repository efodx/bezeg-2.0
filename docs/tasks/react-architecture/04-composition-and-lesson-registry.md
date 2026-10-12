# 4. Lesson action registry and React-free adapters

Spec: [React architecture refactor](../../specs/react-architecture-refactor.md), findings 5, 7, 11. Depends on [task 3](03-scene-store-graph-host.md).

## Goal

Replace inheritance-based extension points with composable pieces, starting where the coupling is worst.

## Scope

- **Lesson action registry.** Graphs register handlers in a `Record<LessonAction['kind'], handler>` (with a target/name discriminator where needed) built by composition: the curve feature contributes visibility/evaluation handlers, De Casteljau contributes parameter/animation handlers. Unknown actions throw `UnsupportedLessonActionError`. Remove the `if` chains that fall through to `super.applyLessonAction`.
- **Adapters stop returning JSX.** Remove `getCurveCommands()` and `PointControlledCurveCommands(curve)` from `src/graphs/curves/object/**`. Add React components (`CurveDisplayControls`, `BezierCurveControls`, rational/PH equivalents) under `src/graphs/base/controls/` that receive the adapter and read its flags through the graph store.
- **Controlled inputs.** `OnOffSwitch` and `Slider` become controlled (`checked`/`value` + `onChange`); remove the effects that copy props into state. Callers pass the live value from the store or adapter. Adapter flag changes (e.g. lesson `curve-visibility`) call `store.notify()` so controls stay in sync.
- **Curve selection/editing feature.** Extract pointer handling, selection and editing mode from `BaseCurveGraph` into a `CurveEditingFeature` object that the graph composes; `BaseCurveGraph` delegates to it.

## Acceptance

1. No `.tsx`/JSX import in `src/graphs/curves/object/**`.
2. A unit test toggles the control polygon through a lesson action and asserts the rendered switch is checked without any other state change.
3. Every lesson action used in `src/learning/content/**` resolves through the registry (test enumerates lesson actions across all lessons and checks each target graph has a handler).
4. `tsc`, build, Jest, `npm run test:smoke`, and a smoke check of curve selection, add/delete point, display toggles and all guided lessons pass.
