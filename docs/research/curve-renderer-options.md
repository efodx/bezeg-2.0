# Curve renderer options

Research date: 2026-10-09. This is a source and official-documentation comparison, not a migration decision or performance benchmark. The current product inventory is in [capabilities](../capabilities.md), [UI functionality](../ui-functionality.md), and [current architecture](../current-architecture.md). The [performance plan](../performance-plan.md) requires representative interaction measurements before selecting a renderer optimization or replacement.

## Recommendation

Retain JSXGraph while extracting mathematical state, demonstration operations, and explicit scene ownership from its adapters. The immediate maintainability benefit comes from changing those boundaries: replacing the drawing library alone would move the same responsibilities into another set of classes. A future renderer should consume Bezeg-owned geometry and scene descriptions rather than own the mathematical model or saved presets.

If a replacement is later justified, evaluate a small SVG renderer first, optionally using individual D3 interaction/axis modules. It has the closest fit to existing vector exports and modest educational scenes, but transfers interaction and coordinate-system responsibilities into this repository. Paper.js is a reasonable alternative if Canvas scene management and path hit testing are independently valuable. Two.js provides renderer choice and scene primitives, but currently offers less directly relevant educational board machinery than JSXGraph. These rankings are architectural judgments; no speed or bundle-size ranking has been measured.

## What Bezeg actually delegates today

The dependency declaration is `jsxgraph: ^1.14.1`; [package-lock.json](../../package-lock.json) resolves JSXGraph 1.14.1. The official online reference below describes the currently published documentation. Check the chosen package's source and types before implementing an experiment; do not assume an online example establishes support in Bezeg's installed dependency.

- [BaseGraph](../../src/graphs/base/BaseGraph.tsx) initializes the board, coordinate bounds, aspect ratio and axes; attaches a container ResizeObserver; frees workspace boards; serializes `renderer.svgRoot` for SVG; and captures the graph container for PNG. Initialization leaves renderer selection to JSXGraph. SVG export assumes an SVG renderer and currently revokes its download object URL.
- [BaseCurveGraph](../../src/graphs/base/BaseCurveGraph.tsx) translates board down/up/move events into editing and selection, uses JSXGraph coordinates and point hit tests, batches mutations, and imports/exports curve DTOs.
- [AbstractJXGPointControlledCurve](../../src/graphs/curves/object/AbstractJXGPointControlledCurve.ts) supplies separate X/Y callbacks to the geometry evaluator; creates draggable and dependent points, polygons, bounding-box handles and segments; uses curve hit testing for selection; and owns an update listener. Its existing disposal is a useful seam to preserve.
- [JXGPHBezierCurve](../../src/graphs/curves/object/JXGPHBezierCurve.ts), [BasePhBezierCurveGraph](../../src/graphs/curves/ph/BasePhBezierCurveGraph.tsx), and [HodographInputBox](../../src/graphs/curves/ph/HodographInputBox.tsx) add offset objects and a separate generating-point board. Replacing the main curve stroke leaves that second editor and its ownership to solve.
- Polynomial, rational, PH, continuity and parameterization semantics are implemented under [src/bezeg](../../src/bezeg), rather than supplied by a generic path library. Lesson capabilities, local presets, visibility controls and transformations must continue to act on that domain model.

These observations are from source inspection. A library capability is not evidence that every existing Bezeg route configures or successfully exposes it. In particular, grid support is an option to evaluate, not a claim that Bezeg currently provides a grid control.

## Documented capabilities

### JSXGraph

The official [Board reference](https://jsxgraph.org/docs/JXG.Board_.html) documents axes, pan/zoom, touch-related configuration, keyboard interaction, renderer selection and batched updates. Renderer choice is immutable after board creation; SVG and Canvas are supported options. [Curve](https://jsxgraph.org/docs/Curve.html) accepts parametric coordinate functions or arrays. Its advanced plotting can attempt jump/singularity detection; this is not a guarantee that arbitrary rational singularities are safely represented. [JXG.Curve](https://jsxgraph.org/docs/JXG.Curve.html) documents screen-space `hasPoint` hit testing. [JSXGraph lifecycle](https://jsxgraph.org/docs/JXG.JSXGraph.html) supplies `initBoard` and `freeBoard`.

**Implication for Bezeg:** retaining this adapter preserves existing interactive primitives and lets domain extraction proceed separately. Testing JSXGraph's Canvas backend would be a bounded renderer experiment, but current direct SVG-root export requires redesign or a separate vector export path. A configuration switch alone does not preserve the full product contract.

### SVG/Canvas owned by Bezeg

[SVG 2 path commands](https://www.w3.org/TR/SVG2/paths.html) include line segments, quadratic/cubic Bézier segments and elliptical arcs. They do not provide a general arbitrary-degree rational Bézier command. [Pointer Events](https://www.w3.org/TR/pointerevents3/) supplies mouse/touch/pen input, pointer capture, cancellation and `touch-action`. [Canvas in the HTML standard](https://html.spec.whatwg.org/multipage/canvas.html) supplies path drawing, stroke hit testing and bitmap serialization.

**Implication for Bezeg:** a minimal SVG adapter can render sampled polylines, points, segments and labels from the existing evaluator. SVG nodes can receive focus and interaction handlers, but coordinate conversion, drag constraints, selection priority, keyboard behavior and accessible names still need application code. Canvas requires an explicit hit-testing and accessible-control layer and a separate vector export path. Neither browser technology automatically supplies an educational graph board or its construction dependency graph.

### Paper.js

The [Project reference](https://paperjs.org/reference/project/) documents a Canvas-backed scene project, item/segment/stroke hit tests, SVG export, and project/view removal. [View](https://paperjs.org/reference/view/) documents transforms, zoom, coordinate conversion, mouse and keyboard handlers, resizing and scheduled updates. [Tool](https://paperjs.org/reference/tool/) exposes drag and key handlers. Paper's [Curve](https://paperjs.org/reference/curve/) represents cubic Bézier geometry.

**Implication for Bezeg:** project-local ownership and hit testing are useful, but library curve objects must remain presentation objects. High-degree polynomial, weighted rational and quintic PH curves need evaluation-driven drawing; converting them to a single cubic would change the mathematics. Axes, ticks, grid rules, teaching dependencies, focus navigation, pinch policy and formula composition remain application responsibilities. The reviewed API pages do not establish complete touch-gesture parity; verify real devices rather than infer it from mouse handlers.

### Two.js

[Two.js](https://two.js.org/) advertises SVG, Canvas and WebGL renderers. The current [Two reference](https://two.js.org/docs/two/) documents scene groups, manual/automatic updates, pause, recursive event release and `getShapesAtPoint` with stroke/fill, precision and tolerance options. The [Path reference](https://two.js.org/docs/path/) describes vertices and curve controls.

**Implication for Bezeg:** it is inaccurate to dismiss current Two.js as lacking hit testing. However, hit tests do not supply mathematical point constraints, a coordinate board, axes, educational constructions, or complete accessible dragging. Those features need a Bezeg controller and viewport. SVG output can be the basis of vector serialization when using its SVG renderer; Canvas/WebGL output requires a separate vector path. Explicit teardown must handle the animation loop, scene references, DOM listeners and container, as well as releasing object events. Confirm all APIs against a selected released package before an experiment.

### D3 modules with a Bezeg renderer

[d3-drag](https://d3js.org/d3-drag) documents mouse/touch dragging for SVG, HTML or Canvas, configurable containers and custom drag subjects. [d3-zoom](https://d3js.org/d3-zoom) documents mouse/touch pan/zoom, programmatic transforms and removal of namespaced listeners. [d3-axis](https://d3js.org/d3-axis) supplies scale-driven SVG axes and ticks.

**Implication for Bezeg:** selected modules can reduce the input/axis work of a custom SVG adapter without replacing geometry or requiring D3 to own the entire DOM. Canvas curve selection still needs an application hit-test subject; keyboard controls and teaching constructions still need Bezeg code. React and D3 should have explicit, distinct DOM ownership. D3 is a toolkit for a replacement adapter, not a drop-in JSXGraph board.

## Preservation cost by capability

The following ratings are judgments relative to the existing implementation: **low** means adapting an existing Bezeg/JSXGraph path; **medium/high** means substantive new product code and verification. They are not measured effort estimates or claims of unsupported library features.

| Product responsibility | JSXGraph retained | Custom SVG + optional D3 | Custom Canvas | Paper.js | Two.js |
| --- | --- | --- | --- | --- | --- |
| Drag/edit points, fixed and derived points | Low; separate model writes from board coordinates | Medium; controller, capture, constraints | High; controller plus picking | Medium; events/hit tests, custom constraints | Medium; events/hit tests, custom constraints |
| Axes, ticks, bounds, aspect ratio; optional grids | Low | Medium; D3 axes optional, grid/viewport owned here | High; draw/measure text and ticks | High; board behavior owned here | High; board behavior owned here |
| De Casteljau, Farin, spline continuity, PH constructions | Low rendering change; domain extraction remains | High port of scene dependencies | High port of scene dependencies | High port of scene dependencies | High port of scene dependencies |
| Rational/high-degree/PH evaluation and offsets | Keep existing geometry | Keep geometry; new sampling contract | Keep geometry; new sampling contract | Keep geometry; avoid cubic substitution | Keep geometry; avoid path interpolation substitution |
| Curve/handle selection and transformation modes | Low | Medium; screen-space hit tolerances/order | High; hit tests/index | Medium; hit-test mapping/order | Medium; hit-test mapping/order |
| Zoom/pan, touch arbitration, keyboard point edits | Low/medium; audit current routes | Medium/high even with D3 | High | High; transforms are only a foundation | High; transforms are only a foundation |
| SVG/PNG and ZIP figure export, math labels | Medium; existing fidelity gaps | Medium; SVG serialization plus label/capture work | High; independent SVG exporter | Medium/high; SVG export plus label/capture work | Medium/high; renderer-specific export |
| Auxiliary hodograph board and full disposal | Medium; improve existing owners | High; separate viewport/controller | High; separate viewport/controller | Medium/high; project per editor | Medium/high; instance per editor |
| Lessons, preset DTOs and all 26 routes | Preserve and detach from renderer | Preserve domain IDs/scenes; port adapter | Same | Same | Same |

## A useful boundary before choosing a replacement

Have a demonstration/controller own geometry, constraints, operation results, animation progress and scene restore. A renderer session owns only its viewport, graphical objects, subscriptions and disposal. Its API should express Bezeg needs: editable/dependent point, evaluated curve with interval, segment/polygon, label, selection appearance, coordinate conversion, view bounds, input notifications, update batching and disposal. It should not reproduce every JSXGraph API.

Use stable scene/object identities so dragging updates owned objects instead of recreating the entire scene. Keep construction geometry separate from sampled display geometry. Preserve exact evaluator and construction results; any adaptive polyline/cubic approximation must declare its display tolerance, endpoint behavior and handling of undefined values. Rational denominator failures must break the drawn path or report invalid input rather than connect across an asymptote.

Keep presets in Bezeg's domain format, and exports in an explicit service consuming a stable scene snapshot. Library scene JSON would couple user files to a particular renderer. Lesson scene actions should continue through typed demonstration capabilities, with animations cancelled on restore/navigation/disposal.

## Evidence needed to change this recommendation

1. Profile the existing production scenes from the performance plan, including visible constructions and PH offsets. Separate evaluation, model invalidation, object updates, React work and painting. Repeat route/preset changes to inspect lifetime accumulation.
2. After extracting one renderer seam, compare the same polynomial and rational scene under JSXGraph and a minimal SVG adapter. Include a construction-heavy scene and PH auxiliary editing before deciding a production replacement.
3. Verify mathematical invariants, settled drag positions, singular-path behavior, selection/transform modes, touch gestures, keyboard workflows, axes/labels, preset round trips, lesson restoration and SVG/PNG/ZIP export.
4. Select a library only when the observed maintenance benefit or measured bottleneck outweighs the preservation work. Record a consequential choice in an ADR and scope implementation separately from build-tool/UI changes.

No replacement package was installed, no app behavior changed, and no new benchmark was run for this comparison.
