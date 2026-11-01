# 07 — Ear-clipping graph (T1, F2a)

Status: planned 2026-11-01 (geometry handler 10). Source: spec [B1](../../specs/triangulation-voronoi-lessons.md#b1-ear-clipping-and-the-art-gallery-theorem) (capabilities, examples, acceptance 1, 4–7), [implementation decisions](../../specs/triangulation-voronoi-lessons.md#implementation-decisions). Kind: F2a (no route, no registration), engineering plus UI/accessibility review. Depends on 06 (`src/compgeo/earClipping.ts`) and the point-set graph and hull trace graph (convexity 05, 10).

`EarClippingGraph extends PointSetGraph` in `src/graphs/compgeo/`, polygon mode only (no mode toggle), shaped like `HullTraceGraph`: the trace is recomputed from the model by `earClippingTrace`, and the step index and playback reuse the hull trace's step controller (`hullTraceRun.ts`). Generalise it only if needed, without changing hull behaviour; the hull host tests stay green unmodified.

1. **Trace stepping:** Next step, Reset and Play/Pause, as on the hull graph. Editing the polygon recomputes the trace, sets the step to \(0\) and pauses. The current event's ear test (apex, triangle, and the vertex found inside it, if any) is highlighted, along with the clipped triangles so far.
2. **Overlays** (the base overlay switch): `reflex` (reflex vertices marked), `triangulation` (the finished triangles and \(n-3\) diagonals, shown when the trace is done), `colouring` (Fisk's 3-colouring by `threeColouring`, three colours plus a non-colour cue such as the letter or shape, so it does not depend on colour vision), `guards` (the smallest class from `guardClass`; the selected guard's view from `guardView` shaded).
3. **Refusals:** `fewer-than-three`, `not-simple` and `collinear-vertices` give an actionable localized message in the panel and no trace. A clockwise polygon is reversed for the trace and the panel says so (acceptance 5); the stored model is not changed.
4. **Readouts:** step \(i/N\), triangles so far, predicate count, and when done: \(n-2\) triangles, \(n-3\) diagonals, colour class sizes, guards \(\lfloor n/3\rfloor\).
5. **Presets:** collection with Example 1 (notched pentagon) and Example 2 (comb) from the spec; import validates as the point-set collection does.
6. **Localization:** one new key block after the hull trace keys, at the same position in `sl.ts` and `en.ts`. Terms from the spec's table: *uho*, *rezanje ušes*, *Fiskovo 3-barvanje*, *stražar*, *izrek o galeriji*.
7. **Tests** (host tests in the style of `HullTraceGraph.host.test.tsx`):
   - Example 1 clips the three listed triangles in order when stepped to the end.
   - Next step and Play reach identical states.
   - An edit resets the step to \(0\).
   - Comb class sizes \(4,4,3\) in the readout.
   - Guard view equals the triangles at the guard's vertex (board objects counted against `guardView`).
   - Each refusal shows its message and draws no trace objects.
   - The clockwise note.
   - Preset round trip, Reset and a live language switch re-render the panel and board text.
   - Disposal leaves no board objects, listeners or timers.

   Observe each new assertion fail against a deliberate mutation.

Not in scope: route, Demonstration registration and lessons (they wait for the T1 F2b/F3 slices, `G-REG` open).

Performance: the triangles are few (\(n\le40\)); redraw on drag as the hull graph does. Measure only if a drag at 40 vertices visibly lags.

Checks: `just unit src/graphs/compgeo --maxWorkers=2`, `just lint` on touched files, `npx tsc --noEmit --pretty false`, `just build`.
