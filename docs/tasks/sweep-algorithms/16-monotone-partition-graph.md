# 16 — Monotone partition graph (C3)

Status: accepted 2026-11-02 (geometry handler 34): engineering, mathematical and UI reviews without blockers ([eng](../../reviews/sweep-algorithms/16-review-eng.md), [math](../../reviews/sweep-algorithms/16-review-math.md), [UI](../../reviews/sweep-algorithms/16-review-ui.md)); handler fixes: a clockwise-diagonals test (observed failing under a shifted-endpoint mutation), type labels 14 px and piece fill 0.4 for projection. Kept as is: a helper change shows at the last event of its vertex, so a right-boundary regular vertex without a merge helper shows its new helper at its pop. Planned 2026-11-02 (geometry handler 26). Source: [spec C3](../../specs/sweep-algorithms-lessons.md#c3-partitioning-a-polygon-into-monotone-pieces) (steps, capabilities, acceptance 1, 4, 5), common criteria C-1–C-7, [implementation decisions](../../specs/sweep-algorithms-lessons.md#implementation-decisions). Kind: F2a (no route, no registration), engineering, mathematical (readouts) and UI/accessibility review. Depends on 14 (`monotonePartitionTrace`, `partitionStateAt`), triangulation 07 (`EarClippingGraph`, polygon handling) and 09 (`SweepSideLists`).

`MonotonePartitionGraph extends PointSetGraph` in `src/graphs/compgeo/`, closed-polygon mode only, shaped like `EarClippingGraph` (the polygon is coerced to a closed polygon on restore or import, as `asClosedPolygon` does there; reuse it rather than copy it) and `BentleyOttmannGraph` (trace recomputed from the model, step index and playback through the shared step controller). A run module `monotonePartitionRun.ts` turns the kernel result into a view, like `bentleyOttmannRun.ts`.

1. **Trace stepping (C-1, C-3):** Next step, Reset and Play/Pause. An edit recomputes the trace, sets the step to \(0\) and pauses. Step \(0\) is the polygon with the sweep line above it.
2. **Board (C-7):** the horizontal sweep line at the current vertex's height; the current vertex emphasised; every processed vertex marked by type with a text label (*začetno*, *končno*, *razcepno*, *zlivno*, *navadno* / start, end, split, merge, regular) as well as colour and marker shape, never colour alone; status edges highlighted; diagonals drawn as they are reported; when done, the pieces filled with distinguishable fills and an outline per piece.
3. **Side lists (C-7):** the event queue (vertex names in processing order) and the status left to right as edge names, each with its helper (`e3 — pomočnik v5` / `e3 — helper v5`), through `SweepSideLists`; current entry highlighted.
4. **Readouts:** step \(i/N\); the current vertex's type and the reason (the two neighbours below or above, interior angle less or greater than \(\pi\)); diagonals so far; when done, the piece count with "pieces \(=\) diagonals \(+1\)" and the type counts with start\(+\)split \(=\) end\(+\)merge.
5. **Refusals (C-6):** each kernel refusal (too few or too many vertices, coordinates, non-simple with the named edges, collinear with the named vertex) gives an actionable localized message and no trace objects.
6. **Presets:** C3's two examples; import validates as the ear-clipping collection does, with the 20-vertex limit.
7. **Localization:** one key block after the Bentley–Ottmann keys, same position in `sl.ts` and `en.ts`; terms from the spec's table (*monotoni večkotnik*, *razcepno*, *zlivno*, *pomočnik roba*, *diagonala*).
8. **Tests** (host tests):
   - The first example stepped through: the queue order, the type shown at each vertex, the helper of the left edge when the split vertex \((4,3)\) is processed (the merge vertex \((8,5)\)), the single diagonal, two pieces when done (acceptance 1), read from the side list and panel.
   - The second example: the diagonals of task 14's result appear, no vertex is labelled split.
   - Next step and Play reach identical states; an edit resets the step to \(0\) and pauses.
   - Each refusal shows its message and draws no trace objects; a clockwise polygon is drawn with the same diagonals.
   - Preset round trip, Reset and a live language switch re-render the panel, side lists and board labels.
   - Disposal leaves no board objects, listeners or timers.

   Observe each new assertion fail against a deliberate mutation.

Not in scope: route and registration (18), the C3 lesson (19).

Checks: `just unit src/graphs/compgeo --maxWorkers=2`, `just lint` on touched files, `npx tsc --noEmit --pretty false`, `just build`.
