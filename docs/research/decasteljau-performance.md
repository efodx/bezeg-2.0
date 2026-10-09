# JSXGraph performance research for De Casteljau drawing

**Status:** research report, 2026-10-09

**Scope.** This note covers JSXGraph behavior that matters for interactive curve drawing, especially phone/touch dragging, dynamic parametric curves, and a visible De Casteljau construction. It is source research, not a performance result or an authorization to change the renderer. The repository currently locks JSXGraph 1.9.2 in [`package-lock.json`](../../package-lock.json#L10972-L10975). The official source links below point to the maintained `main` source tree; implementation work should re-check any candidate against the locked version or an explicitly approved upgrade. The official changelog records the 1.9.2 release.

## Findings

### 1. A board update is the main unit of work

JSXGraph's documented event model updates the board in response to pointer movement; a board update prepares elements, updates their dependencies, updates conditions, redraws the renderer, and emits an `update` event. `fullUpdate()` forces all elements through that path. `suspendUpdate()` suppresses updates, but `unsuspendUpdate()` immediately calls `fullUpdate()` when resuming. See the [official event-model FAQ](https://jsxgraph.org/wiki/index.php/FAQ_-_Frequently_asked_questions), [board update source](https://github.com/jsxgraph/jsxgraph/blob/main/src/base/board.js#L5731-L5788), and [suspend/unsuspend source](https://github.com/jsxgraph/jsxgraph/blob/main/src/base/board.js#L5900-L5920).

**Implication for Bezeg:** suspending around several structural mutations is useful, but suspending and then unsuspending once per animation frame does not remove the final full-board cost. In Bezeg, [`BaseGraph.unsuspendBoardUpdate`](../../src/graphs/base/BaseGraph.tsx#L237-L240) calls `boardUpdate()` and then `board.unsuspendUpdate()`; [`boardUpdate`](../../src/graphs/base/BaseGraph.tsx#L259-L262) invalidates the geometry cache and calls `board.update()`, which is suppressed while suspended, and JSXGraph then performs the full update on unsuspend. Measure actual update count and duration before adding more suspension layers.

### 2. JSXGraph has a touch-aware drag path, including event throttling

JSXGraph registers pointer handlers on the board's `moveTarget`, sets the board container's `touchAction` to `none` for touch capture, and exposes `moveTarget` for dragging outside the board. The official options documentation specifically calls out mobile usability for an external move target, while warning that dragging points outside the board can make them unreachable. See the [pointer-handler source](https://github.com/jsxgraph/jsxgraph/blob/main/src/base/board.js#L2037-L2063) and [mobile move-target option](https://github.com/jsxgraph/jsxgraph/blob/main/src/options.js#L884-L910).

Move events pass through `checkFrameRate()`, which discards events arriving faster than the configured maximum. The documented default `maxFrameRate` is 40 updates per second. Pointer and legacy touch moves set low update quality while moving and restore high quality afterward; touch moves also use touch-specific hit precision. See [frame-rate handling](https://github.com/jsxgraph/jsxgraph/blob/main/src/base/board.js#L922-L946), [pointer moves](https://github.com/jsxgraph/jsxgraph/blob/main/src/base/board.js#L2932-L3034), [touch moves](https://github.com/jsxgraph/jsxgraph/blob/main/src/base/board.js#L3361-L3490), and the [Board API reference](https://jsxgraph.org/docs/symbols/JXG.Board.html).

**Actionable guidance:**

- Treat input delivery, board update, and renderer time as separate measurements. A phone may feel laggy because events are intentionally throttled, because a permitted event is expensive, or because the browser is presenting frames late.
- Do not add a second application-level pointer/touch throttle before measuring. JSXGraph already filters move events; an additional `requestAnimationFrame` queue could reduce work, but it must retain the latest input and flush the final position exactly.
- Verify that responsive CSS or future wrapper changes do not override JSXGraph's `touch-action` behavior. Test a physical phone with a control point near the board edge and decide explicitly whether `moveTarget`/pointer capture is needed.
- JSXGraph exposes element `drag`, `touchdrag`, and related events through the point API; Bezeg currently uses the unified board `down`/`move`/`up` events and point `drag` callbacks rather than separate touch listeners. See the [Point event reference](https://jsxgraph.org/docs/JXG.Point.html), [`BaseCurveGraph` event registration](../../src/graphs/base/BaseCurveGraph.tsx#L141-L146), and its move path [`handleMove`](../../src/graphs/base/BaseCurveGraph.tsx#L323-L349).

### 3. Curve sampling has a built-in low-quality drag mode, but it does not cover animation automatically

JSXGraph documents low and high curve plotting controls. With `doAdvancedPlot: true` (the default), plotting uses recursive bisection; `recursionDepthLow` and `recursionDepthHigh` control the lower- and higher-quality paths. `numberPointsLow` and `numberPointsHigh` apply to the non-advanced plotting path. The optional `RDPsmoothing` simplifier can be faster, but the official documentation warns that it can cause problems for some dependent/intersection constructions. See the [Curve API reference](https://jsxgraph.org/docs/Curve.html) and [official curve options](https://github.com/jsxgraph/jsxgraph/blob/main/src/options.js#L5126-L5304).

Bezeg's De Casteljau animation is not a pointer move: [`animateRecursive`](../../src/graphs/curves/bezier/DecasteljauGraph.tsx#L97-L110) calls React `setState()` from `requestAnimationFrame`, and [`componentDidUpdate`](../../src/graphs/curves/bezier/DecasteljauGraph.tsx#L26-L31) drives the board update. Therefore the pointer/touch low-quality path should not be assumed to protect phone animation. A curve-quality experiment should compare:

1. ordinary point dragging;
2. parameter-slider changes; and
3. requestAnimationFrame animation with the construction visible.

The experiment must record settled high-quality output and verify endpoints and the displayed construction. Lowering recursion depth or enabling simplification is a rendering approximation decision, not a mathematical evaluation optimization.

### 4. De Casteljau's visible construction is a separate dynamic-object workload

The main De Casteljau curve is a JSXGraph parametric `curve` whose X/Y callbacks call the mathematical curve evaluator and whose interval ends at the current `t`: [`DecasteljauGraph.initialize`](../../src/graphs/curves/bezier/DecasteljauGraph.tsx#L51-L70). The shared curve wrapper uses the same function-backed X/Y pattern for every point-controlled curve: [`AbstractJXGPointControlledCurve`](../../src/graphs/curves/object/AbstractJXGPointControlledCurve.ts#L51-L83).

When the construction is shown, Bezeg creates a triangular collection of function-backed points and segments. Their coordinates repeatedly request the cached De Casteljau table: [`generateLineSegments`](../../src/graphs/curves/object/AbstractJXGBezierCurve.ts#L129-L190). The table cache is keyed by parameter and the global geometry-cache revision: [`getDecasteljauScheme`](../../src/graphs/curves/object/AbstractJXGBezierCurve.ts#L181-L190). Control-point drag callbacks invalidate that cache, and the shared board update path also invalidates it: [`createJSXGraphPoint`](../../src/graphs/curves/object/AbstractJXGPointControlledCurve.ts#L442-L467) and [`BaseGraph.boardUpdate`](../../src/graphs/base/BaseGraph.tsx#L259-L262).

**Actionable guidance:**

- Profile the main curve sampling and construction-point/segment updates separately. A faster point-only evaluator cannot by itself remove the cost of plotting the main curve or updating every visible construction object.
- Keep the construction objects stable while only `t` changes; rebuild them only when the control-point count changes. The current code already separates creation/removal in `generateLineSegments()` from per-update coordinate callbacks, so this should be preserved during optimization.
- Consider a parameter-owned freshness key in a future experiment. Parameter-only animation should not invalidate geometry derived solely from unchanged control points, but any cache change must retain correct invalidation for point, weight, and mutable-coordinate edits.
- Do not set `needsRegularUpdate:false` on the main curve or construction points: JSXGraph documents that this skips normal board updates, which would make function-backed objects stale. That attribute is appropriate only for genuinely static objects. See the [GeometryElement reference](https://jsxgraph.org/docs/JXG.GeometryElement.html) and [official option definition](https://github.com/jsxgraph/jsxgraph/blob/main/src/options.js#L2167-L2178).

### 5. `reducedUpdate` is a lead, not an accepted optimization

The Board API documents `reducedUpdate` as a mode that updates only the dragged element and a few following elements during movement, followed by a whole-construction update on release. That sounds relevant to slow phones, but a visible De Casteljau construction has dependencies spread across the main curve, intermediate points, and segments. A reduced update could leave a teaching construction visually stale unless its dependency graph is proven compatible. It must be tested against the exact JSXGraph version in use; the checked installed 1.9.2 source exposes the documented field but does not make it a demonstrated drop-in solution for this scene. See the [Board API description](https://jsxgraph.org/docs/symbols/JXG.Board.html) and the [official Board source](https://github.com/jsxgraph/jsxgraph/blob/main/src/base/board.js#L456-L462).

## Recommended investigation order

1. Use a production build and record the locked JSXGraph version, browser, phone, viewport, input method, control-point count, construction visibility, and animation state.
2. Instrument one representative drag and one animation frame path to separate pointer/event filtering, React commits, mathematical evaluation, JSXGraph curve sampling, construction updates, board update, and renderer time.
3. Compare the existing default adaptive plotting path with one controlled curve-quality candidate (`recursionDepthLow`/`High` or, only if justified, `doAdvancedPlot:false` with point counts). Verify the settled curve and construction numerically and visually.
4. Test coalescing only after the measured bottleneck is known. Preserve the latest pointer position, flush the final input, and ensure the construction never skips a required settled state.
5. Only then evaluate parameter-specific cache revisions, direct graph-layer animation scheduling, or `reducedUpdate`. Keep each candidate isolated so a phone result can be attributed to one mechanism.

## Bezeg React and lifecycle review

The React findings below are codebase observations, not claims that React is the
measured phone bottleneck. The main issue is that React state currently sits on
the hot path between animation frames and the imperative JSXGraph board.

### High priority: the animation rerenders the whole graph workspace

[`DecasteljauGraph.animateRecursive`](../../src/graphs/curves/bezier/DecasteljauGraph.tsx#L97-L110)
calls `setState()` from every `requestAnimationFrame` callback. That causes the
class component to render again, rebuild the graph-command JSX, and run
[`componentDidUpdate`](../../src/graphs/curves/bezier/DecasteljauGraph.tsx#L26-L31).
The update hook does not compare the changed field: its identity check is false
for the new state object created by `setState({...this.state, ...})`, so changing
the animation speed or another state field also enters the board-update path.
React documents that `componentDidUpdate` should compare the specific props and
state values that control the side effect, and that updater functions should be
used when next state depends on pending state. See the [official
`componentDidUpdate` guidance](https://react.dev/reference/react/Component#componentdidupdateprevprops-prevstate-snapshot)
and [`setState` guidance](https://react.dev/reference/react/Component#setstate).

The bounded experiment should keep per-frame `t` in the graph/animation layer
and update the existing JSXGraph elements directly, calling one ordinary
`board.update()` per scheduled frame. React should update the visible control
label and persistent state at a deliberately chosen cadence, such as on slider
input and animation stop. If state remains on the frame path, use functional
updaters and compare `t`/geometry changes explicitly; this fixes correctness
and stale-update risk but does not remove React work by itself.

### High priority: parameter-only animation invalidates geometry caches

[`BaseGraph.boardUpdate`](../../src/graphs/base/BaseGraph.tsx#L259-L262)
calls `geometryCache.invalidate()` before every board update. A changing
De Casteljau parameter is not a control-point or weight edit, but it advances
the same global revision used by point-coordinate and curve-evaluation caches.
This prevents unchanged geometry, including any separately maintained full-curve
sampling, from being reused between frames. The project’s existing performance
results already identify global invalidation as a remaining experiment; use
separate geometry and construction-parameter freshness only after adding
mathematical checks for mutable and function-backed points/weights.

### High priority: the visible construction performs repeated visibility work

[`setDecasteljauT`](../../src/graphs/curves/object/AbstractJXGBezierCurve.ts#L279-L284)
calls `showCurrentDecasteljauScheme()` every time `t` changes. Once the scheme
exists, [`showDecasteljauScheme`](../../src/graphs/curves/object/AbstractJXGBezierCurve.ts#L97-L107)
walks the construction objects and calls `show()` on them, then shows the
control polygon. This is redundant when visibility has not changed. The
construction list also stores repeated point references while it is built
([`generateLineSegments`](../../src/graphs/curves/object/AbstractJXGBezierCurve.ts#L129-L177)),
so the visibility walk can repeat work on the same object.

Keep construction object creation tied to control-point-count changes and keep
show/hide operations tied to visibility changes. A parameter update should only
change the coordinate callbacks and the drawing point, followed by the single
board update selected by profiling. Preserve the full teaching construction;
this is an object-lifecycle optimization, not a drawing approximation.

### Medium priority: hidden full-curve sampling is still work

[`DecasteljauGraph.initialize`](../../src/graphs/curves/bezier/DecasteljauGraph.tsx#L58-L69)
creates a second full parametric curve and uses `visible: () => this.state.wholeCurve`
to hide it by default. JSXGraph’s curve `update()` calls `updateCurve()` before
the renderer checks visibility, so hiding the element does not avoid its
function sampling. The JSXGraph source documents the separate sampling and
rendering phases in [`JXG.Curve.update`](https://jsxgraph.org/docs/symbols/src/src_base_curve.js.html#L432-L495).

Measure this as a controlled candidate: create the full curve only when the
full-curve mode is enabled, or keep it static/non-regular while hidden and
explicitly update it when the mode changes. Do not apply
`needsRegularUpdate:false` to function-backed elements whose coordinates must
change; JSXGraph documents that this skips normal updates.

### Medium priority: animation has no unmount cleanup

The recursive animation stores no frame handle and `BaseGraph.componentWillUnmount`
does not stop it. If the user navigates away while animation is enabled,
[`animateRecursive`](../../src/graphs/curves/bezier/DecasteljauGraph.tsx#L97-L110)
can continue scheduling frames and call `setState` on an unmounted component.
Store the request ID, cancel it in `componentWillUnmount`, set `animating=false`,
and reset the timestamp on start/stop. This is primarily a lifecycle correctness
fix, but it also prevents a hidden route from consuming CPU after navigation.

### Medium priority: imperative subscriptions have incomplete ownership

Each [`AbstractJXGPointControlledCurve` constructor](../../src/graphs/curves/object/AbstractJXGPointControlledCurve.ts#L51-L83)
registers a board-level `update` listener for the convex hull. Preset import
removes the old objects in
[`BaseCurveGraph.importPresetData`](../../src/graphs/base/BaseCurveGraph.tsx#L294-L308),
but there is no curve-level dispose method that unregisters that listener before
discarding the wrapper. Repeated preset imports can therefore retain old
closures until the whole board is freed. Add explicit ownership/disposal for
curve subscriptions and call it before removing replaced curves.

Similarly, the board is created unconditionally in
[`BaseGraph.componentDidMount`](../../src/graphs/base/BaseGraph.tsx#L127-L174),
but [`componentWillUnmount`](../../src/graphs/base/BaseGraph.tsx#L177-L183)
only calls `JSXGraph.freeBoard` when `workspaceTitle()` is truthy. That
conditional is a lifecycle hazard for any legacy or non-workspace route. Free
every board that this component created; JSXGraph documents `freeBoard()` as the
operation that removes event handlers and board contents ([official
reference](https://jsxgraph.org/docs/JXG.JSXGraph.html#freeBoard)).

### Lower priority: avoid avoidable React tree work and warnings

- [`BaseGraph.getGraphCommandsArea`](../../src/graphs/base/BaseGraph.tsx#L264-L267)
  calls `getGraphCommands()` once to test `.length` and again to pass the
  commands, constructing two JSX trees on every render. Compute the array once.
- [`Commands`](../../src/graphs/base/Commands.tsx#L4-L12) maps commands to
  `ListGroup.Item` elements without keys. Several command builders also return
  arrays of elements without stable keys. Fixing keys avoids reconciliation
  warnings and makes control identity predictable, but it is unlikely to be
  the primary phone-drawing bottleneck.
- The parent workspace is rebuilt on each animation state update. Once the
  imperative graph is detached from frame state, split or memoize the controls
  that do not depend on `t`; React’s [official `memo` guidance](https://react.dev/reference/react/memo)
  recommends it for granular drawing-editor interactions only after profiling.

### Library upgrade is a separate experiment

The lockfile pins JSXGraph 1.9.2 while the official package currently lists
1.13.3 as latest ([npm package](https://www.npmjs.com/package/jsxgraph?activeTab=versions),
[official releases](https://github.com/jsxgraph/jsxgraph/releases)). The
changelog includes later curve, pointer, SVG, and lifecycle fixes, but an
upgrade can change rendering and event behavior. Test it independently against
the current production benchmark, preset/export behavior, construction
correctness, and the target phone; do not combine it with an application-side
renderer or cache rewrite.

## Prioritized recommendations

| Priority | Recommendation | Why it comes first | Evidence needed |
| --- | --- | --- | --- |
| P0 | Remove the per-frame suspend/unsuspend/full-update wrapper from the hot drag/animation path; schedule one normal `board.update()` per frame. | Current code makes the suspended `board.update()` a no-op and `unsuspendUpdate()` calls `fullUpdate()`. | Board update count, element-update time, renderer time, settled geometry. |
| P0 | Stop driving `t` through the entire React workspace on every animation frame. | React rerender and `componentDidUpdate` are on the same hot path as the board. | React commit count/time and input-to-visible-update delay. |
| P1 | Remove or defer hidden full-curve sampling. | The hidden curve still runs its function sampling before visibility suppresses rendering. | Curve-sampling time with hidden curve present/absent; visual equivalence. |
| P1 | Make construction visibility and object creation change-driven. | `show()` walks and duplicate references add work on every `t` update. | Construction element-update time and visual/mathematical checks. |
| P1 | Separate geometry freshness from parameter/construction freshness. | Global invalidation discards reusable geometry caches on parameter-only frames. | Cache-hit rate, evaluation time, point/weight mutation tests. |
| P1 | Add animation and imperative-board cleanup. | Prevents CPU work and stale callbacks after route changes or preset replacement. | Repeated navigation/import test, object/listener counts, no post-unmount updates. |
| P2 | Benchmark curve quality, SVG vs Canvas, and JSXGraph 1.13.3 separately. | These can help phones but alter fidelity, exports, or compatibility. | Same production scene, renderer type, frame/update tails, visual/export review. |

## Suggested benchmark matrix

Keep the project’s existing protocol and add explicit toggles for the findings
above. Use the same phone/browser/build and record medians plus p95/p99:

| Scenario | Construction | Whole curve | React frame state | Hidden full curve | Board path |
| --- | --- | --- | --- | --- | --- |
| Point drag | on | off | n/a | n/a | current vs normal `update()` |
| Parameter slider | on | off | current | yes | current vs normal `update()` |
| Animation | on | off | current vs imperative `t` | yes | current vs normal `update()` |
| Animation | on | on | current vs imperative `t` | n/a | current vs normal `update()` |

Record update counts, curve sample counts, construction object updates, React
commits, renderer type, and final geometry. This separates the likely P0/P1
causes before any renderer migration or quality reduction.

## Evidence boundary

This note records official JSXGraph API/source behavior and Bezeg source observations. It does not claim that JSXGraph, curve sampling, React, or the construction is the measured phone bottleneck. Physical-device measurements and mathematical before/after checks remain required before implementation or renderer changes.

## Primary sources

- [JSXGraph API reference](https://jsxgraph.org/docs/)
- [JXG.Board reference](https://jsxgraph.org/docs/symbols/JXG.Board.html)
- [Curve reference](https://jsxgraph.org/docs/Curve.html)
- [JXG.GeometryElement reference](https://jsxgraph.org/docs/JXG.GeometryElement.html)
- [Official event-model FAQ](https://jsxgraph.org/wiki/index.php/FAQ_-_Frequently_asked_questions)
- [JSXGraph source repository](https://github.com/jsxgraph/jsxgraph)
- [Official Board source](https://github.com/jsxgraph/jsxgraph/blob/main/src/base/board.js)
- [Official options source](https://github.com/jsxgraph/jsxgraph/blob/main/src/options.js)
- [Official changelog, including 1.9.2](https://github.com/jsxgraph/jsxgraph/blob/main/CHANGELOG.md#192)
