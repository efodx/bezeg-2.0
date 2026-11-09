# Wave 2 slice C2: PointSet family

Read `w2-common-brief.md` first; it holds role, shared files, test rules, checks and return format.

**Owned:** `src/graphs/compgeo/PointSetControls.tsx`, `PointSetGraph.tsx`, `PointSetSegments*`, `OrientationGraph.tsx`, `PolygonAreaGraph.tsx`, `PointInPolygonGraph.tsx`, `TriangulationControls.tsx` (and its graph), `CurvePairGraph.tsx`, `TraceCurvePairGraph.tsx`, and their test files. Not owned: `BentleyOttmannControls.tsx` and `IntervalSweepControls.tsx` (slice C3), though their segment and interval rows come from your `PointSetControls`.

**Work (inventory rows 51–55, 59, 74):**
- Segment and interval rows in `PointSetControls` still have their own add and remove buttons and native `disabled` (C6). Add and remove go through the shared point-collection controls with a stated reason at the limit (C1, C2, C6, C7); editing a row's endpoint pair stays the recorded exception ("Segment and interval rows", spec *Likely exceptions*). Raw checkboxes (Closed, overlays: C11) become `OnOffSwitch` or `BooleanField`; the pressed mode group (C25) follows the spec target.
- PolygonArea Reverse: native `disabled` becomes `UnavailableButton` with a reason (C6). Triangulation edge `<select>` with native `disabled` becomes the shared choice control, unavailable with a reason when there are no edges; Flip keeps `aria-disabled` with a reason; its `role=alert` refusal uses the shared `RefusalChannel` (C7). Both are uncatalogued domain actions: only C6 and C7 apply.
- PointInPolygon query point: the second `CoordinateField` becomes the shared point list as a single-point form with no add or remove (spec *Likely exceptions*, query points). Its limit notice goes per decision 7 (task 0 item 7). "Select q" keeps working by keyboard.
- Status paragraphs (`aria-live` or `role=status`) in PointSetControls, Orientation, PolygonArea and PointInPolygon move to `LiveReadout` (`src/graphs/base/controls/LiveReadout.tsx`; pattern in `HullTraceControls.tsx`). Refusals stay in `RefusalChannel`, shown alone.
- Duplicate mechanics tests to delete include `PointSetSegments.host.test.tsx:149,200` (see `controls-impact.md`).
- PointSet already has the full shared behaviour in `sharedControls.graphs.test.tsx`; keep it passing and do not add to it.

**Lessons:** compgeo lessons drive these graphs (point in polygon, polygon area, orientation, triangulation). Run their lesson tests (`PointInPolygonLessonActions.host.test.tsx` and peers found by `grep -rl`).

**Evidence file:** `w2-c2.md`. **Handoff note:** `w2-c2-handoff.md` (both in `docs/reviews/feature-streams/controls/`).
