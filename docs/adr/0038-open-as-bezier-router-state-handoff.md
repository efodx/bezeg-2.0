# Open as Bézier: a one-shot router-state handoff

Status: accepted, 2026-11-03 (Curves stream, slice BS-B-2b2). Serves [L4](../specs/b-splines-nurbs-lessons.md) step 3: a Bézier piece of the extraction graph opens in the ordinary Bézier Demonstration.

## Context

No route takes control points today. The extraction graph (`BSplineExtractionGraph.pieceControlPoints`) can name one piece's k + 1 points, and the Bézier Demonstration (`bezier`, `/bezeg-2.0/bezier/curve`) loads Presets of the `bezier-curve` collection. `location.state` already carries an app-owned Demonstration return context (`demonstrationNavigation.ts`), and `DemonstrationWorkspace` forwards the whole state on its replace navigations.

## Decision

- The points travel in `location.state.bezierHandoff` (`{kind: 'bezier-points', points}`), a field separate from `demonstrationReturn`. `src/bezierHandoff.ts` builds, reads (validating), and strips it; adding it keeps every other state field.
- `GraphRoute` (which already has router access) reads the handoff on its first render and removes the field from history state with a replace navigation in its first effect, before the graph and workspace exist. A reload, a Back/Forward visit, or a later workspace replace therefore never re-applies it over the user's edits. The graph instance keeps the validated points, so React StrictMode's mount, unmount, mount applies them twice identically.
- `BaseGraph.hostBridge` is the only seam: `bezierHandoff` (input) and `openAsBezier` (output, a navigate to the Bézier route with the points). Geometry and the graph classes stay free of router code. `BezierCurveGraph` overrides `initialPresetData()`; the points go through the graph's existing `bezier` Preset collection check as one `JSXBezierCurve` entry, with 2 to 16 points (degree 1 to 15; 16 is the B-spline graphs' cap). Anything else is ignored silently and the default scene loads. Reset returns to the default scene, not to the handoff.
- The extraction inspector shows one "Open as Bézier curve" button per piece when the host provides `openAsBezier`.

## Alternatives

- **`?points=` query.** Shareable, but a persistent public route parameter whose format must stay stable, and it would need a separate import path with its own limits and error display. Rejected.
- **`sessionStorage`.** Survives reload but is global, not tied to the history entry, can leak into a later unrelated visit of the route, and needs its own cleanup. Rejected.
- **Preset in `localStorage`.** Would pollute the user's saved Presets. Rejected.
- **Handoff through a module-level variable.** Lost on reload (which is fine) but invisible to tests and unsafe with several tabs or StrictMode. Rejected.

## Consequences

- The opened curve is not shareable or bookmarkable: the URL is the plain Bézier route. Copying it, or reloading after the first render, gives the default scene (a fresh mount has no selected Preset). The workspace never forwards the field in its own navigations, so a search-normalising replace cannot bring it back.
- Back from the Bézier page returns to the extraction page (its state is lost, as with any route change); Forward re-enters the Bézier entry with the handoff already removed, so it shows the default scene.
- Existing routes, stored Presets and the return-context navigation are unchanged. A handoff sent to a route whose graph ignores `hostBridge.bezierHandoff` is stripped and dropped.
- The extraction route is registered separately (BS-B-2b3).
