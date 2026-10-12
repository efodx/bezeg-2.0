# 3. Scene store, `GraphHost` and controller base

Spec: [React architecture refactor](../../specs/react-architecture-refactor.md), findings 3, 4, 8, 9, 10. Depends on [task 2](02-jsxgraph-typings.md).

## Goal

Graphs stop being React class components. A graph is a plain controller whose state lives in a synchronous store; one function component hosts it.

## Design

- **`SceneStore<S>`** (`src/graphs/base/SceneStore.ts`): `getState(): S`, `setState(update: Partial<S> | ((s: S) => Partial<S> | null))` that applies **synchronously** and replaces the state object, `notify()` for changes outside `S` (curve objects, adapter flags), `subscribe(listener)`, and `getVersion()` for `useSyncExternalStore`. Unit-tested.
- **`BaseGraph<S>`** keeps its name and subclass API but no longer extends `React.Component`:
  - `state` is a getter over the store; `setState(update, callback?)` applies synchronously, so a later read in the same tick sees it. Side effects keep React's batching and ordering: `onStateChange(prevState)` (replaces `componentDidUpdate`; subclasses drop the `prevProps` checks) runs once per host commit with the state from before the first pending update, followed by queued callbacks in order. `flushStateChanges()` runs them immediately for hostless unit tests and before unmount.
  - `componentDidMount`/`componentWillUnmount` become `mount(container: HTMLElement)`/`unmount()`; `mount` creates the `GraphSession` on the given element (no `#jgbox` lookup). `mount` after `unmount` on the same instance must work (React StrictMode).
  - `forceUpdate(cb?)` becomes `requestRender(cb?)`: `store.notify()`, and `cb` runs after the host has committed the render (the host flushes pending callbacks in `useLayoutEffect`). Figure batches rely on this ordering.
  - Initial state comes from a constructor-safe path: no virtual method call from a field initializer. Subclasses declare `getInitialState()`; the base reads it in an `init` step after construction (the host calls it), or the subclass passes it to `super`.
  - `PresetService` is created once (constructor or `init`), never in render.
  - Host context (`SiteContext` workspace title/description, selected preset, fullscreen) is passed in by the host (`setHostContext`), not read from `this.context`.
  - Panel methods (`workspaceEdit`, `workspaceDisplay`, `workspaceSave`, `getGraphCommands`) stay and are called by the host during render.
- **`GraphHost`** (`src/graphs/base/GraphHost.tsx`): `GraphHost({create})` creates the controller with `useState(() => create())`, subscribes with `useSyncExternalStore`, mounts it in `useLayoutEffect` on a container `ref` that `DemonstrationWorkspace` forwards to `JGBox` (JGBox takes a ref; no `id="jgbox"` lookup anywhere, including `GuidedLesson`'s `querySelector('#jgbox')`, which gets the element through the workspace instead), renders `DemonstrationWorkspace` with the panels, and calls `useLanguage()` until task 7.
- **Routes** map ids to `<GraphHost create={() => new XGraph()}/>`.
- The PH hodograph board (`HodographInputbox`) takes its container through a `ref`, not `#hodograph-input-box`.
- `setState({...this.state, ...})` spreads become partial updates.
- The AGENTS.md lesson-ordering rule no longer needs graph-field side channels; keep existing side channels working, but add a multi-action unit test where a later action reads `this.state` written by an earlier one in the same tick.

## Owned files

`src/graphs/**` (base, all graph classes, PH input box), `src/JGBox.tsx`, `src/Routes.tsx`, `src/graphs/base/DemonstrationWorkspace.tsx`, `src/learning/runtime/GuidedLesson.tsx` (container lookup only), and their tests. Not `src/bezeg/**` (task 6).

## Acceptance

1. No class in `src/` extends `React.Component`/`Component`; no `forceUpdate`, `componentDidUpdate`, `this.props` or `this.context` in graph code; no `getElementById`/`querySelector` for `jgbox` or `hodograph-input-box`.
2. Store and host unit tests: synchronous `setState`, `onStateChange` ordering, `requestRender` callback after commit, StrictMode mount/unmount/mount, disposal on unmount.
3. Existing graph unit tests pass after mechanical adaptation (construct the controller instead of a component); no assertion weakened.
4. Lesson multi-action same-tick test passes without a graph-field side channel.
5. `tsc`, build, Jest and `npm run test:smoke` pass. A browser smoke check covers all routes, dragging, sliders, De Casteljau animation, presets save/load/reset/import, single and batch figure export, guided lessons, PH hodograph board, language switch, presentation mode.
6. Drag and slider responsiveness on De Casteljau and Bézier is no worse than before (performance plan protocol, desktop).

## Implementation notes (2026-10-12)

- `BaseGraph<S>` dropped the former props type parameter; subclasses declare only their state type.
- Host values are passed as arguments: `getWorkspacePanels({title, description})` during render and `mount(container, {selectedPreset})` in the layout effect. The controller is never mutated during render.
- `unmount()` drops a pending `onStateChange` (React never ran `componentDidUpdate` after unmount) but still runs queued callbacks so batch promises settle; callbacks that start work are wrapped in `whileMounted`.
- A remount of the same instance (React StrictMode) starts from `getInitialState()`.
- The same-tick side channels `SubdivisionGraph1.pendingT` and `SplineAlphaParametrizationGraph.pendingAlpha` were removed; the AGENTS.md lesson rule was relaxed accordingly.
- Element ids `jgbox` and `hodograph-input-box` remain because JSXGraph derives sub-element ids from them and CSS/Playwright select on them; no code looks them up.
