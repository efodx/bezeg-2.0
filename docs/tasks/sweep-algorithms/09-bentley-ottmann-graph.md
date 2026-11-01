# 09 — Bentley–Ottmann graph (C2)

Status: accepted 2026-11-01 (geometry handler 15): 09a graph and 09b shared side lists and perf, plus review repairs. Sonnet engineering+math review (no high): fraction text now uses the app minus sign U+2212 like its decimal (`−3/4 = −0,75`), with a unit test; the perf test no longer runs or writes files in the unit suite (opt-in `BEZEG_PERF=1`, ceiling 1000 ms). Sonnet UI/accessibility review: no high or medium. Accepted lows: hover/focus halo dropped on every step (also during Play), segment-sweep `data-queue-entry` holds only the kind (tests key by position), every status entry is a Tab stop (at most 12), a tiny fraction shows `≈ 0`. Side lists and board marks are unseen in a browser until registration (S1 F2b). Planned 2026-11-01 (geometry handler 12). Source: [spec C2](../../specs/sweep-algorithms-lessons.md#c2-bentleyottmann-segment-intersections-showpiece) (default and degenerate examples, capabilities, acceptance 1, 3–7), common criteria C-1–C-7, [implementation decisions](../../specs/sweep-algorithms-lessons.md#implementation-decisions), testing decisions (performance at 12 segments). Kind: F2a (no route, no registration), engineering, mathematical (readouts and exact display) and UI/accessibility review. Depends on 04 (segment-set mode) and 06 (`bentleyOttmannTrace`). Independent of 08 except for the shared step controller and side-list component; if 08 lands first, reuse its side list instead of writing a second one.

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

## Decisions (handler 14, 2026-11-01)

- **Segment names are 1-based** (`s1`…`s4` for the spec's \(s_0\)…\(s_3\)), matching the segment-set mode's board labels and inputs from task 04 (`pointset_segment_x`). One helper, `segmentName` in `bentleyOttmannRun.ts`, owns the naming. The C2 lesson text uses the app's names.
- **Step 0** is the state after the initial endpoint scheduling; the leading `schedule` events are not steps.
- **The default example makes 9 neighbour tests against \(\binom42=6\) pair tests:** with \(k=5\) crossings among four segments the sweep tests more than brute force. The C2 summary step must say so (the \(O((n+k)\log n)\) gain needs \(k\) small), not claim fewer tests.
- **Fractions in the panel are text** (`21/16 = 1,3125`): panels do not render KaTeX.
