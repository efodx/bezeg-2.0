# 08 — Interval sweep graph (C1)

Status: planned 2026-11-01 (geometry handler 12). Source: [spec C1](../../specs/sweep-algorithms-lessons.md#c1-sweep-as-an-idea) (example, capabilities, acceptance 1, 3–5), common criteria C-1–C-7, [implementation decisions](../../specs/sweep-algorithms-lessons.md#implementation-decisions). Kind: F2a (no route, no registration), engineering plus UI/accessibility review. Depends on 05 (`intervalSweepTrace`, `intervalReadouts`) and 07 (interval mode).

`IntervalSweepGraph extends PointSetGraph` in `src/graphs/compgeo/`, interval mode only (no mode toggle), shaped like `HullTraceGraph` and `EarClippingGraph`: the trace is recomputed from the model by `intervalSweepTrace`, and the step index and playback reuse the step controller in `hullTraceRun.ts`. Generalise the controller only if needed; the hull and ear-clipping host tests stay green unmodified.

1. **Trace stepping:** Next step, Reset and Play/Pause as on the hull graph (C-1, C-3). Editing an interval recomputes the trace, sets the step to \(0\) and pauses.
2. **Board (C-7):** a vertical sweep line at the current event's \(x\); open intervals highlighted; the interval of the current event emphasised by stroke width or dash as well as colour; a reported pair marked on both intervals at the moment it is reported.
3. **Side lists (C-7):** the event queue (remaining events in order, written \(x^+\)/\(x^-\) with the interval letter) and the status (open intervals, letters in order of entry), each with the current entry highlighted in the same way as on the board. Hovering or focusing a status entry highlights its interval.
4. **Readouts:** step \(i/N\); open count; maximum so far and, when done, the maximum with its range (`maxStart`, `maxEnd` from `intervalReadouts`); pairs reported so far; when done, the comparison "\(k\) pairs found, \(\binom n2\) pairs would be tested". The tie rule (entering before leaving at equal \(x\), closed intervals) is stated in the panel.
5. **Refusals (C-6):** `too-many`, `inverted` and the coordinate refusals from `checkIntervals` give an actionable localized message and no trace objects. The interval mode of 07 should already prevent most of them; the graph still guards the trace input.
6. **Presets:** a collection with the spec example \(a=[0,4]\), \(b=[2,7]\), \(c=[3,5]\), \(d=[6,9]\), \(e=[8,10]\) and one example with a shared endpoint and a zero-length interval; import validates as the point-set collection does.
7. **Localization:** one key block after the 07 interval keys, same position in `sl.ts` and `en.ts`. Terms from the spec's table (*pometanje*, *pometalna premica*, *dogodek*, *vrsta dogodkov*, *stanje*); check the table before choosing.
8. **Tests** (host tests in the style of `HullTraceGraph.host.test.tsx`):
   - The default example stepped to the end shows open counts \(1,2,3,2,1,2,1,2,1,0\), maximum \(3\) on \([3,4]\) and the five pairs \(ab, ac, bc, bd, de\) (acceptance 1), read from the panel and the board objects.
   - The tie example processes the entering event first and reports the zero-length interval as touching (acceptance 3, 4).
   - Next step and Play reach identical states; an edit resets the step to \(0\) and pauses.
   - Side lists match `sweepStateAt` after every step, and the highlighted entry is the current event's.
   - Each refusal shows its message and draws no trace objects.
   - Preset round trip, Reset and a live language switch re-render the panel and board text.
   - Disposal leaves no board objects, listeners or timers.

   Observe each new assertion fail against a deliberate mutation.

Not in scope: route, Demonstration registration and the C1 lesson (they wait for the S1 F2b/F3 slices, `G-REG`).

Checks: `just unit src/graphs/compgeo --maxWorkers=2`, `just lint` on touched files, `npx tsc --noEmit --pretty false`, `just build`.
