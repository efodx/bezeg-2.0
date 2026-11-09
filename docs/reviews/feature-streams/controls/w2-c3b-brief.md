# Wave 2 slice C3b: finish compgeo trace panels (except Voronoi)

Read `w2-common-brief.md`, then `w2-c3-brief.md` (ownership and work), then `w2-c3-handoff.md` (what the first C3 worker did). You continue that slice without Voronoi and DegenerateSites, which go to a later slice C3c.

**Handler decisions on C3's proposals:**
- Delaunay triangle rows stay an `aria-pressed` group (they select derived items, not coordinate rows). Recorded exception.
- The behaviour changes C3 listed (Monotone steps counted from 1; an unchanged announcement is not repeated; choosing the shown example does nothing) are accepted.

**Your work:**
1. Fix tests for what C3 already migrated: Fortune, Delaunay, EarClipping, MonotonePartition, MonotoneTriangulation host tests, `formatReadouts.test.tsx` (new `exampleId` prop), `scripts/fortune-browser-perf.cjs` if it uses removed selectors. Add the pure tests (`matchingExample`, the `frameFit` helpers) and one real-graph Fit case for Fortune; one thin wiring check per migrated graph. Delete duplicate mechanics cases per `controls-impact.md`.
2. Migrate the remaining panels: BentleyOttmann, IntervalSweep, BezierHulls and BezierClipping live paragraphs to `LiveReadout` via C3's `useStatusReadout.ts`; BezierClipping tolerance `<select>` to `ChoiceSelect`; check HullRobustness for a hand-written live region and migrate it if present. Update their tests the same way.
3. Update the remaining trace graph class comments that describe `advance()` or `IterationController`.
4. Delete unused keys from both `sl.ts` and `en.ts`: `fortune_view_reset`, the per-graph `*_step_counter` keys no longer used (keep `vor_view_reset` until C3c, unless unused already: check by search).
5. Remove `BezierClippingControls.tsx` from `controlExemptions`. Delete `.command-logs/w2-c3-edit1.py`.
6. Run `just typecheck`, `just lint` on your files, and `just unit` on every touched test file and the lesson tests for these graphs. Report pre-change failures for new assertions and the test-time delta.

**Evidence file:** append to `w2-c3.md`. **Handoff note:** `w2-c3b-handoff.md`.
