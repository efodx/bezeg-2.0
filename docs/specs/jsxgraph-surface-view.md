# JSXGraph surface view for Bézier patches

Status: in progress. The [task 01 gate](../reviews/jsxgraph-surface-view/gate.md) passed under owner option A (2026-10-30): [ADR 0019](../adr/0019-jsxgraph-surface-view.md) supersedes [ADR 0018](../adr/0018-three-surface-view-adapter.md) with the `board2d` strategy, 2–3 frames of accepted orbit latency, and a reduced-detail teapot orbit. Tasks: [jsxgraph-surface-view](../tasks/jsxgraph-surface-view/README.md).

## Owner decision

The owner wants patch views drawn with JSXGraph instead of Three.js, and accepts JSXGraph's built-in point dragging (behaviour and speed) as it is. The reason is product consistency: the rest of the site draws with JSXGraph, and one look and interaction feel across 2D curves and 3D patches makes a better user experience. Breaking changes are allowed, but this plan expects no route or stored-Preset break.

ADR 0018 chose Three for these reasons. This plan must overcome them rather than set them aside:

| ADR 0018 finding (JSXGraph prototype) | Evidence | Plan |
| --- | --- | --- |
| Drag event → next rAF p95 170.6 ms desktop / 243.1 ms narrow (tensor, iso8/tiling8); budget ≤ 60 ms | [renderer measurements](../reviews/bezier-patches/renderer-measurements.md) | Owner-accepted (2026-10-29): drag latency is recorded, not gated. Settled geometry after a drag must still be exact |
| Orbit p95 51.9 ms tensor, 34.0 ms teapot desktop; budget ≤ 16.7 ms | same | Same gate; a camera change reprojects only and does not rebuild geometry |
| Four-view depth ordering never accepted | [JSX confirmation](../reviews/bezier-patches/jsx-final.md) | Own painter's order over triangles *and* line segments (below); checked at four camera presets |
| PNG export blocked by a tainted canvas | [functional evidence](../reviews/bezier-patches/prototype-functional.md) | Use the 2D graphs' existing SVG → PNG export path, with no external images in the SVG |
| Touch z-mode drifted in XY | same | Owner-accepted (2026-10-29): JSXGraph's built-in 3D point drag is used as it is, including its touch behaviour. Drift is recorded as a known limitation; the numeric x/y/z editor stays the exact path |
| Board listeners grew 15 → 21 over three remounts | same | The adapter owns and removes every listener; covered by a remount test |

The prototype was throwaway code without batching, partial updates or a sorted mesh. Its numbers bound the risk but do not predict a production adapter. ADR 0018 itself rejects claims of fundamental JSXGraph incapability.

Alternative considered: keep Three and restyle it with the 2D graph tokens (colours, line weights, point style, fonts, background). That is cheaper and keeps the budgets already met, but it still means two renderers, and interaction and export would still feel different. The owner prefers one renderer. If the gate fails, this alternative is the fallback.

## What stays

- The plain-data contract in `src/graphs/patches/surface-view/surfaceScene.ts` (`SurfaceView`, `SurfaceScene`, `SurfaceEdit`, `LabelLayout`, `SurfaceCapture`). Small additive changes are allowed. Scenes stay free of renderer objects.
- All geometry, scene builders, panels, Presets, lesson actions, localization and routes. `BaseSurfaceGraph` changes only its `viewFactory` default.
- `SurfaceCamera` semantics: perspective, `az`/`el` in radians, `distance`, `target`, vertical FOV `FOV_DEG` (38°). Stored Presets and lesson `view3d` cameras must frame the same content as before.
- Camera, orbit, zoom and fitting mathematics in `surfaceMath.ts`. The custom horizontal-plane and z-mode drag functions are removed in task 07 unless JSXGraph's drag needs them.
- The parameter-domain inset board (already JSXGraph).

## Design

`JsxSurfaceView implements SurfaceView`, in `src/graphs/patches/surface-view/`, split by concern so workers can own separate files: view/lifecycle, projection, depth ordering, picking/drag, labels/capture.

- **Board.** One JSXGraph board per `attach`, sized to the host, styled from the same visual tokens as the 2D boards ([graph visual style](graph-visual-style.md)). Whether to use `view3d` with `projection: 'central'` or a plain 2D board fed by the adapter's own projection is decided in task 01 by measurement. Either way, the adapter computes projection from `SurfaceCamera` with one pure function, tested against an independent oracle, so stored cameras stay valid.
- **Depth.** The adapter sorts mesh triangles, planes, line segments (polylines split at mesh resolution), markers and points by view depth and draws them in that order, back to front. One SVG element per drawable, reused across frames; a camera change reorders and reprojects but does not recreate elements. Painter's-order failures (cyclic overlap, long segments crossing many triangles) are bounded by splitting, and accepted visually at the four camera presets.
- **Interaction.** Points are JSXGraph 3D points with their built-in drag, picking and touch handling. The adapter turns their drag events into `point` start/move/end `SurfaceEdit`s, so the scene store stays authoritative, and the next `reconcile` overwrites the view's copy. The visible z-mode toggle maps onto JSXGraph's own vertical drag if it has one; otherwise it is removed (a recorded UI change). Orbit and zoom use `orbit` / `zoom` and emit camera edits. The numeric x/y/z editor and index selection stay as the exact, accessible path.
- **Labels.** `onLayout` keeps its contract: positions are projected with the same function as the geometry, and occlusion is tested by ray–triangle against the scene mesh with `chordTolerance`. During an active drag or orbit, occlusion may lag one settled frame.
- **Capture.** `capture()` returns a PNG data URL plus the label layout, as now. Figure SVG export may additionally embed the board's vector SVG instead of a raster image. That would be a user-visible improvement: editable vector surfaces, with depth order baked in. `AttachOptions.onContextLost/Restored` become unused and are removed once Three is gone.
- **Lifecycle.** `dispose()` frees the board (`JXG.JSXGraph.freeBoard`), the listeners, the `ResizeObserver` and pending frames, and is idempotent. `attach` stays async so a pending attachment can still be cancelled.

## Acceptance criteria

1. **Gate (task 01).** On the production build, at iso8/tiling8, desktop 1440×1000 and narrow 390×844, with constructions shown: orbit p95 ≤ 16.7 ms for tensor and triangular; teapot (32 patches, tiling 8) orbit p95 recorded against the same budget. Drag latency is measured and reported but does not gate (owner decision). Same host and harness as the [ADR 0018 measurements](../reviews/bezier-patches/renderer-measurements.md). If the gate misses, the owner chooses one of three paths before more work starts: adjust budgets or defaults (for example density 6, or a smaller teapot tiling), accept the miss as an explicit user-visible tradeoff, or stop and take the restyle alternative.
2. **Mathematics.** Every rendered vertex, net point, marker and label anchor equals its scene coordinate. Projection agrees with an independent pinhole-camera oracle to ≤ 1e-9 in normalized device coordinates for random cameras and aspect ratios. The two lesson tests that use Three as an oracle get a replacement oracle without weakening their assertions.
3. **Depth.** At the four camera presets on tensor, triangular, joins and teapot, the net never shows on the wrong side of the surface. Covered by a per-pixel or per-element automated check plus an inspected screenshot set.
4. **Interaction.** Mouse and touch drag use JSXGraph's built-in behaviour, documented in the review: which axes move, how vertical moves happen, and how touch behaves. After every drag, the scene, Presets and readouts hold exactly the point the view shows, and the camera does not change during a drag. Keyboard orbit, zoom, fit and the numeric editor work. Narrow-viewport default framing shows every control point.
5. **Export.** SVG and PNG figure export contain current geometry and MathJax labels. PNG has no taint error.
6. **Lifecycle.** Over 3 remounts, board count, listener count on host/window/document, and observers return to baseline; disposal during a pending attach leaves nothing behind.
7. **Parity.** All existing patch unit, real-graph, lesson, Preset and smoke tests pass unchanged, except tests that assert Three internals, which are rewritten against the `SurfaceView` contract. Bilingual patch lesson walks pass.
8. **Removal.** `three` is removed from `package.json`. Patch-route bundle size is recorded before and after. Catalog posters and the six surface-orbit clips are recaptured with geometry-checked frames.
9. **Docs.** ADR 0019 supersedes 0018. Capabilities, architecture, the [patches spec](bezier-patches.md) rendering contract and hosting notes are updated.

## Out of scope

Changes to geometry, lessons, routes or Preset format; a JSXGraph upgrade; restyling 2D graphs.
