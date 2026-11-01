# 09 — Bentley–Ottmann graph (C2)

Status: planned 2026-11-01 (geometry handler 12). Source: [spec C2](../../specs/sweep-algorithms-lessons.md#c2-bentleyottmann-segment-intersections-showpiece) (default and degenerate examples, capabilities, acceptance 1, 3–7), common criteria C-1–C-7, [implementation decisions](../../specs/sweep-algorithms-lessons.md#implementation-decisions), testing decisions (performance at 12 segments). Kind: F2a (no route, no registration), engineering, mathematical (readouts and exact display) and UI/accessibility review. Depends on 04 (segment-set mode) and 06 (`bentleyOttmannTrace`). Independent of 08 except for the shared step controller and side-list component; if 08 lands first, reuse its side list instead of writing a second one.

`BentleyOttmannGraph extends PointSetGraph` in `src/graphs/compgeo/`, segment-set mode only (no mode toggle), shaped like `HullTraceGraph`: the trace is recomputed from the model by `bentleyOttmannTrace`, step index and playback through the step controller of `hullTraceRun.ts`.

1. **Trace stepping:** Next step, Reset and Play/Pause (C-1, C-3). Editing a segment recomputes the trace, sets the step to \(0\) and pauses.
2. **Board (C-7):** a horizontal sweep line at the current event's \(y\) and the event point; the segments in the status highlighted; the current event's segments emphasised by stroke width or dash as well as colour; the pair of a `neighbour-test` shown while it is the current event; reported crossings drawn as points. Rational positions are drawn at their double value only; nothing is compared as a double.
3. **Side lists (C-7):** the event queue in order (kind and position) and the status left to right (segment names \(s_0,s_1,\ldots\)), current entry highlighted in both; hovering or focusing a status entry highlights its segment (spec capability). Positions show the exact fraction next to the decimal, e.g. \(\tfrac{21}{16}\) and \(1{,}3125\) (spec "fraction display").
4. **Readouts:** step \(i/N\); crossings so far; neighbour tests so far versus \(\binom n2\) pair tests (acceptance 6, counters from `sweepStateAt`); when done, the event count and the crossing list with exact coordinates.
5. **Refusals (C-6, acceptance 3):** `too-many-segments`, coordinate refusals and `overlap` (named pair, "overlap, not a point") give an actionable localized message and no trace objects.
6. **Presets:** the default example \(s_0\)–\(s_3\) and the degenerate example \(a,b,c\) (three through \((2,2)\)) plus \(d\) (four), as in the spec; import validates as the segment collection of 04 does.
7. **Localization:** one key block after the 08 keys (or after the 07 interval keys if 08 has not landed), same position in `sl.ts` and `en.ts`. Terms from the spec's table.
8. **Tests** (host tests):
   - The default example stepped through shows the 13 events and the status after each exactly as listed in the spec (acceptance 1, 4), read from the side list, and the five crossings with the exact fractions in the panel.
   - The degenerate example reports one point with all involved segments and reverses the block in one step.
   - The counter readout equals the trace's neighbour-test count (acceptance 6).
   - Next step and Play reach identical states; an edit resets the step to \(0\) and pauses.
   - Each refusal, including an overlapping collinear pair, shows its message and draws no trace objects.
   - Preset round trip, Reset and a live language switch re-render the panel and board text.
   - Disposal leaves no board objects, listeners or timers.

   Observe each new assertion fail against a deliberate mutation.

Performance: record one measurement of dragging an endpoint with 12 segments (trace recompute plus redraw) per [the performance plan](../../performance-plan.md) before choosing any optimization; redraw on drag as the hull graph does unless the measurement shows visible lag.

Not in scope: route, Demonstration registration and the C2 lesson (S1 F2b/F3 slices, `G-REG`).

Checks: `just unit src/graphs/compgeo --maxWorkers=2`, `just lint` on touched files, `npx tsc --noEmit --pretty false`, `just build`.
