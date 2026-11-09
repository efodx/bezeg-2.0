# Wave 2 slice C2b: finish the PointSet family

Read `w2-common-brief.md`, then `w2-c2-brief.md` (ownership and work), then `w2-c2-handoff.md` (what the first C2 worker did and the 11 failing tests). You continue that slice.

**Handler decisions on C2's proposals:**
- Segment and interval rows call `UnavailableButton` directly; no item-noun prop on `PointCollection` now (rejected for this sweep: a shared-control change for one family; revisit in step 5).
- Triangulation's empty edge list shows "none" plus a help line; a `reason` prop on `ChoiceSelect` goes to step 5.
- `PointSetSegments.host.test.tsx:200` rewritten as a wiring check instead of deleted: accepted, provided it is the thin wiring check and not a mechanics duplicate.

**Your work:**
1. Fix the 11 failing tests per the handoff note. Where a test asserted mechanics now covered by the shared behaviour test, delete it rather than adapt it.
2. PointInPolygon's two raw example buttons (C10 button row) become `ChoiceSelect` (decision 9), as in the other compgeo panels. Slice C3 added `src/graphs/compgeo/ExampleSelect.tsx`; reuse it if it fits.
3. Delete the unused keys `pointinpolygon_query_select`, `pointinpolygon_query_x`, `pointinpolygon_query_y` from both `sl.ts` and `en.ts` (check by search first).
4. Run the compgeo lesson tests for these graphs, `sharedControls.graphs.test.tsx`, all your touched tests, `just typecheck` (your files) and `just lint` on your files.
5. Report observed pre-change failures for the new assertions (Reverse wiring, single-point list, limit silence) by a deliberate mutation, and the test-time delta for the touched test files.

**Evidence file:** `w2-c2.md` (write it). **Handoff note:** `w2-c2b-handoff.md`.
