# React architecture refactor

Status: all seven implementation tasks completed on 2026-10-13. Commit provenance and the deferred prototype-gating decision are recorded in the [engineering implementation history](../reviews/engineering-implementation-history.md#react-architecture-refactor). The findings below preserve the original 2026-10-12 review, not a current list of defects. This continues the [curve ownership refactor](curve-ownership-refactor.md) and [ADR 0006](../adr/0006-model-input-ownership-before-renderer-migration.md); a renderer decision remains separate.

## Problem

Each demonstration is a React class component that also owns a JSXGraph board. Graph state is split across four places: React `this.state`, instance fields, JSXGraph objects and module-level singletons. With no single source of truth, synchronization relies on `forceUpdate`, revision counters, `key` remounts and `setTimeout`. The rule in [AGENTS.md](../../AGENTS.md) that a lesson action must not read `this.state` written by an earlier action in the same scene is a symptom of this design.

## Findings

### State and data flow

1. **Mutable singletons named "contexts".** `SizeContext`, `AxisContext` and `VisibilityContext` (`src/graphs/context/*.ts`) are module objects that are not React context. Writers must follow with `board.fullUpdate()` (`SizeRange` in `BaseGraph.tsx`); settings leak across routes, cannot differ between boards, and tests must `reset()` them.
2. **Remount as a state transition.** `App` keys the whole application on `selectedPreset`, so choosing a preset tears down the header, workspace and board. `Refresher` and `RefreshContext` (`Routes.tsx`, `ResetButton`, `PresetSelector`) implement Reset and post-import refresh by bumping a key. `DemonstrationWorkspace` keys topic `<details>` on `pathname` to reset `open`.
3. **Manual re-render signals instead of subscriptions.** `forceUpdate` in `BaseGraph` (figure batches), `BaseCurveGraph.refreshWorkspace` and the point editor `onChange`, `BasePhBezierCurveGraph` and `BaseSplineCurveGraph`; `workspaceRevision` is used as a component key. `GuidedLesson` holds a mutable `LessonSession` and forces renders with a `revision` counter and `void revision`.
4. **Spreading `this.state` into `setState`.** For example `deselectSelectedCurve`, `selectCurve`, `onSelectChange` (`BaseCurveGraph`) and the De Casteljau controls. Updates computed from a stale snapshot are the source of the lesson-ordering rule. `deselectSelectedCurve` also writes `showingControlPolygon`, which is not part of the graph state type.
5. **Props copied into local state.** `OnOffSwitch` and `Slider` keep local state and re-sync it from `initialState` in an effect, while the value actually lives on the curve adapter (`curve.isShowingControlPolygon()`). A lesson action that changes the adapter without a React render leaves the switch showing a stale value.
6. **One global geometry cache revision.** `geometryCache.invalidate()` is called from about 60 sites, including the mathematical layer (`src/bezeg/impl/curve/*`) and every `BaseGraph.boardUpdate()`. Any change invalidates every curve's derived values, and mathematics depends on graph-global state, contrary to the engineering practice in AGENTS.md.

### Component and lifecycle structure

7. **Inheritance as the extension mechanism.** `BaseGraph → BaseCurveGraph → BaseBezierCurveGraph → concrete graph`, with about 30 overridable hooks (`figurePresetGraphState`, `captureFigureEntryPreset`, `disposeFigureSceneResources`, ...). Lesson actions are `if` chains that fall through to `super.applyLessonAction`.
8. **Side effects in `render()`.** `BaseGraph.render()` constructs a new `PresetService` and assigns it to an instance field on every render.
9. **Virtual call from a field initializer.** `BaseCurveGraph` declares `state = this.getInitialState()`, which runs before subclass fields are initialized; it works only while no override reads an instance field.
10. **Global DOM ids instead of refs.** The main board mounts on `#jgbox` (`BaseGraph.componentDidMount`, `JGBox`), the PH hodograph board on `#hodograph-input-box`, and `GuidedLesson` locates the graph with `querySelector('#jgbox')`. Only one board per page is possible, and mounting depends on a child's DOM existing during the parent's `componentDidMount`.
11. **Renderer adapters return JSX.** `AbstractJXGPointControlledCurve.getCurveCommands()` and its subclasses build React elements, and `PointControlledCurveCommands(curve)` is called as a function rather than rendered as a component. JSXGraph adapters therefore depend on React.
12. **Opt-in language reactivity.** `t()` reads a module variable; each component must remember to call `useLanguage()` (34 call sites). Class graphs re-translate only because `Refresher` re-renders its subtree, so any memoization boundary would silently stop translation.

### Hacks and hygiene

13. **Dead legacy layout.** Every active route has a workspace title, so the non-workspace branch of `BaseGraph.render()` is unused, together with `Help`, `getTools`, `BaseCurveGraph.getSelect`, `getSelectableCurveArea`, `Commands` and the fixed-size code in `JGBox`.
14. **Type escapes and debug output.** 66 `@ts-ignore` comments, mostly missing JSXGraph typings (`AxisStyles`, `PointStyles`, curve adapters). `BaseCurveGraph.importPreset` mutates its argument under `@ts-ignore`. `console.debug` ships in production, preset names fall back to `Math.random()`, and `AxisSelect` enum values are Slovenian UI strings used as identifiers.
15. **Prototype code in production paths.** On the `codex/prototype-demonstration-motion` branch, `DemonstrationsPage` imports `*.prototype.tsx` variants into the production bundle. Prototypes need an explicit development-only gate before such work merges.

## Target architecture

- **Scene store per graph.** A plain TypeScript store with `getSnapshot()` and `subscribe()` owns curves, selection, parameters, editing mode, animation status and display settings, and updates synchronously. JSXGraph reads from it; React reads it through `useSyncExternalStore`. Lesson actions, presets, figure batches and controls all mutate the store, which removes findings 3–5 and the lesson-ordering rule.
- **`GraphHost` function component.** Owns the container `ref` and the `GraphSession` in `useLayoutEffect`, and disposes both on unmount. A demonstration becomes a `GraphController` (create scene, dispose, action handlers, panel components) rather than a `Component` subclass. The hodograph board uses its own `GraphHost`. Fixes 8–10.
- **Composition of features.** Curve selection and editing, point coordinate editing, animation, figure export and the lesson adapter become independent modules attached to a controller. Lesson actions dispatch through a `Record<kind, handler>` registry with an explicit unsupported-action error. Inspector panels render from the store; adapters stop returning JSX. Fixes 7 and 11.
- **Display settings in the session.** Size, axis mode and point labels live in the scene store under stable enum identifiers; styles read them from the board's session. Fixes 1.
- **Explicit preset operations.** The selected preset is route state (`?preset=`); Reset and import call `controller.loadPreset()`. `App`'s key remount, `Refresher` and `RefreshContext` are removed. Fixes 2.
- **Per-curve cache versions.** Each mathematical curve increments its own version on mutation, and memoized values key on their own and their dependencies' versions. `geometryCache` leaves `src/bezeg/impl`. Fixes 6.
- **Subscribing translation hook.** A `useT()` hook subscribes and returns `t`; `LessonSession` becomes a subscribable store created in `useState` with a disposal effect instead of `useMemo`. Fixes 12.

## Implementation order

Each step is a separate bounded slice with its own verification.

1. Remove the dead legacy layout and debug output (13, part of 14).
2. Add a JSXGraph type augmentation for the members used (`svgRoot`, `hasPoint`, `defaultAxes`, `infobox`, ...) and remove the corresponding `@ts-ignore` comments (14).
3. Introduce the scene store, `GraphHost` and `GraphController` and migrate one pilot route: De Casteljau, because it combines animation, lessons, presets and figure export. Measure dragging and slider interaction against the [performance plan](../performance-plan.md) baseline before continuing.
4. Extract the composable feature modules and the lesson action registry; migrate the remaining routes family by family.
5. Move display settings into the store and replace preset/reset remounting.
6. Replace the global geometry cache with per-curve versions, with mathematical checks and performance measurement.
7. Add `useT()` and the subscribable lesson session; gate prototypes behind a development-only flag with `React.lazy`.

## Acceptance criteria

1. No graph component extends `React.Component`; no source file calls `forceUpdate`, uses `key` changes to reset state, or locates a board container by global id.
2. `SizeContext`, `AxisContext`, `VisibilityContext`, `RefreshContext`, `Refresher` and the `App` preset key are removed; display settings are per board.
3. A multi-action lesson scene that reads a value written by an earlier action in the same tick passes a unit test without a synchronous side-channel; the AGENTS.md lesson-ordering rule can be relaxed accordingly.
4. Controls reflect adapter changes made by lesson actions without an unrelated re-render (covered by a test that toggles the control polygon through a lesson action and checks the switch).
5. `src/bezeg/impl` has no import of graph-global cache state. Mathematical endpoint/reference, subdivision, elevation and construction checks pass, and representative drag and slider measurements are no worse than the recorded baseline.
6. All active routes, the legacy preset import format and storage namespace, localization, guided lessons, figure export (single and batch) and PH child-board behavior keep working. Any route change (such as `?preset=`) is recorded with its reason and user impact.
7. `@ts-ignore` count is reduced to cases with a written justification; no `console.debug` in production code.
8. TypeScript and the production build pass; Jest and `tests/*.smoke.spec.cjs` pass; a browser smoke check per the [smoke checklist](../smoke-tests.md) covers both languages, lessons, presets, export, narrow and keyboard workflows.

## Out of scope

Replacing JSXGraph, changing the build tool (Create React App), changing UI design or lesson content, and altering mathematical algorithms or sampling quality. Each needs its own evaluation per AGENTS.md.

## Decisions at approval (2026-10-12)

- **Selected preset stays route-local, not in the URL.** The graph controller owns the selected preset; Reset reloads it (or the default) in place. No route change. Previously the selection lived in app-wide state and remounted the whole app; the only user-visible change is that the selection no longer carries across demonstrations, where preset collections are separate anyway.
- **The store is hand-written** (no new dependency): a small class with `getSnapshot`/`subscribe` consumed through `useSyncExternalStore`.
- **Base-class migration instead of a single-route pilot.** All 43 graph classes share `BaseGraph`/`BaseCurveGraph`, so one route cannot leave React class components without duplicating the hierarchy. Step 3 converts the base into a controller while keeping the subclass API (`state`, `setState`, `initialize`, panel methods) and migrates every route at once. De Casteljau and the plain Bézier route are the measured representatives.
- **Display settings are per board.** Size, axis mode and point labels reset to defaults when another demonstration opens. Previously they leaked across routes through module singletons.
- **Prototype gating (finding 15) is deferred** to the branch that introduces the prototypes; `master` has none.
