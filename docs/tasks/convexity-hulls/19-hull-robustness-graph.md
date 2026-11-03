# 19 — Hull robustness graph (Batch 2, F2a)

Status: planned 2026-11-03 (geometry handler 48). Source: spec [A5](../../specs/convexity-hulls-lessons.md#a5-degenerate-cases-and-robustness) (steps, acceptance 2–4), [ADR 0021](../../adr/0021-exact-grid-predicates.md). Kind: F2a (engineering + UI/accessibility review). Depends on 17 and 10 (`HullTraceGraph`).

**Decision (handler 48, from ADR 0021).** The spec's Further Notes leave open whether A5 gets a "free double" board. ADR 0021 already rules that no graph mode lets free double points feed an algorithm. So the board is a fixed view of Kettner's inputs, not free placement: it shows `kettnerSignMap()`, and nothing a learner drags is evaluated in doubles.

`HullRobustnessGraph` under `src/graphs/compgeo/` has two modes, switched by a control and by a typed scene option.

1. **`chain` mode.** This mode shows `HullTraceGraph`'s monotone chain with Next, Play and Reset. Reuse its controller and controls, by subclass or by composition, whichever keeps 10's lifecycle tests valid. It adds two choices:
   - the pop rule: `<=` "drop collinear" or `<` "keep collinear", shown as `orient ≤ 0` or `orient < 0`;
   - duplicates: merge or keep.

   Changing a choice pauses playback and resets to step 0. The default is sample 1 with today's rule. The readout names the active rule and lists the output hull.
2. **`kettner` mode.** A \(64\times64\) cell board for \(i,j\), shown as two panels or with a toggle: "inexact (double)" and "exact". Cell shading encodes the sign, and a marker shape or pattern distinguishes \(+\), \(-\) and \(0\), so colour is never the only signal. A selected cell (default \(i=41,j=48\), selectable by keyboard) shows \(i\), \(j\), the exact sign and the double value. The readout gives the counts \(112\) and \(2052\). Every label of a double result carries the word "inexact" in both languages (acceptance 2). No point in this mode is draggable.
3. Locale keys go in one block after task 18's. The readout states what the picture shows for these inputs, not that doubles always fail (acceptance 4).
4. Tests:
   - sample 1 under both pop rules: \((2,0)\) on the hull edge is dropped under `<=` and kept under `<` (task 17's corrected outputs); three collinear points under `<` list the middle point twice; a duplicate appears on both chains under `<` + `keep`;
   - a mode switch disposes the other mode's board objects (exact counts) and restores them on return;
   - the selected cell's readout equals `kettnerSignMap()` at \((41,48)\) and at a few other cells;
   - every rendered string for a naive value contains the inexact label;
   - language switch and scene change;
   - observed failures under two mutations.

   Measure a mode switch and one cell selection on the production build, and record the timings if a switch takes more than 100 ms. There are 4096 cells, so if a naive draw is slow, draw them as few board objects, for example one image or one polygon per row.

Checks: as 18.
