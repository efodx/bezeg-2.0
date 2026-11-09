# Wave 2 slice P2: finish the projective family

Read `w2-common-brief.md`, then `w2-p-brief.md`, then `w2-p-handoff.md` (what the first projective worker did). You continue that slice.

**Owned:** `src/graphs/projective/**` except `ThreeViewsControls.tsx` and `ThreeViewsGraph.host.test.tsx`, which slice S owns now (it adds `Slider` props for the angle slider's reason, grid snap and value text).

**Handler decisions on P's proposals:**
- Changed field and select names ("Točka A, x", "P, dx", "Izberi: Točka B"), the custom-example entry shown only while custom, and Pascal's "Lastni vrstni red" entry for an imported order: accepted.
- Typed out-of-range values refused with the stated range instead of clamped; drag and nudge clamps unchanged: accepted (decisions 3 and 8).
- PolePolar zero ideal direction refused with a message: accepted.
- Pascal readout: show a 1-based position to the reader ("Položaj N od M" or similar, chosen per `docs/localization.md#choosing-new-terms`), keep the raw table index in `data-pascal-index` for clips. Rejected: the raw 0-based index as visible text, which reads as off by one.

**Your work:**
1. Apply the Pascal readout decision; update its test.
2. Run `just lint src/graphs/projective` and `just typecheck`; fix errors in your files.
3. Run the whole projective suite in one `just unit src/graphs/projective` run plus the projective lesson tests (`grep -rl` of the graph ids under `src/learning`); fix failures in your files.
4. Record observed pre-change failures for the new assertions by a deliberate mutation (Pascal readout, PolePolar off-grid, FivePoint out-of-range, zero ideal direction).
5. Check by search that no `sl.ts`/`en.ts` key you removed is still used and none you added is unused.
6. Write `w2-p.md` with the evidence and the test-time delta (note machine load).

**Handoff note:** `w2-p2-handoff.md`.
