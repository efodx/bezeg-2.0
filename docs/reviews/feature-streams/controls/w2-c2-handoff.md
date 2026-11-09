# W2 C2 handoff (partial, budget)

## Done (source, lint clean, typecheck clean for my files)
- New `src/graphs/compgeo/StatusLive.tsx`: visible sentence stays plain text, hidden shared `LiveReadout` announces it (`replace`).
- `PointSetControls.tsx`: status, pending line via `StatusLive`; mode group is a `ChoiceSelect` (label "Prikaz"/"Display", decision 9); segment/interval Add, Remove, Clear are `UnavailableButton` with reason (limit, no selection, no points); notice and blocked-press reason are shown alone in `RefusalNotice` inside `div[data-pointset-notice=kind]`. The Add-mode pressed button stays (board tool).
- `OrientationGraph.tsx`, `PolygonAreaGraph.tsx`, `PointInPolygonGraph.tsx`: status via `StatusLive` (outside the readout div; `data-*-live` on the visible `p`, no role). Reverse is an `UnavailableButton` + `RefusalNotice` (new key `pointset_area_reverse_few`).
- PointInPolygon: query point is a single-point `PointListInput` (label "q", select = `Izberi: q`, fields "q, x" "q, y"); `queryRefused` and `data-pip-notice` removed (decision 7); raw `CoordinateField` removed; example buttons remain raw buttons.
- `TriangulationControls.tsx`: `ChoiceSelect` for the edge list (no edges: only "none" plus help `tri_edges_unavailable`), Flip is `UnavailableButton` (reason `tri_event_needs_edge`, blocked press still calls `flip()`), refusals (derived refusal, flip-refused, flip-needs-edge) go to `RefusalNotice` in `div[data-triangulation=refusal-slot]`.
- `eslint.config.mjs`: removed `PointInPolygonGraph.tsx` and `TriangulationControls.tsx` from the compgeo exemptions.
- Keys added in sl/en lockstep: `tri_edges_unavailable`, `pointset_area_reverse_few`. Unused now (delete): `pointinpolygon_query_select`, `pointinpolygon_query_x`, `pointinpolygon_query_y` (check with grep first).

## Tests: last run 11 failed, 289 passed (log `.command-logs/2026-11-08T21-12-40-105Z-21544-3e64ccb3.log`)
Remaining test updates (all are expected consequences of the changes above):
1. `OrientationGraph.host.test.tsx:64` and `PointSetGraph.host.test.tsx:240`: visible readout no longer has `role=status`; assert the hidden `[data-readout-live]` region instead.
2. `PointInPolygonGraph.host.test.tsx` "adding and removing vertices...": typed fields commit on Enter; use `enterNumber` from `src/inputs/testEntry.ts` for "q, x"/"q, y".
3. `PointSetIntervals/Segments.host.test.tsx`: `getByLabelText('Prikaz')` is ambiguous; use `getByRole('combobox', {name: 'Prikaz'})`. `getByText` of the limit and pending sentences now finds the visible line plus hidden live copy and the hidden reason span: query `[data-refusal-notice]` or use `getAllByText(...)[0]` (Intervals:105,118,310; Segments:100).
4. `TriangulationGraph.host.test.tsx`: "Flip button is described by the hint" -> `toContain('triangulation-flip-hint')`; "flip of a non-convex..." and "no edge selected" still call `part('event')`/`part('refusal')`: the refusal sentence now lives in the refusal slot, not `event`; update to `part('refusal')`.
5. Then run lint on the test files, the lesson tests (`PointInPolygonLessonActions`, `TriangulationLessonActions`, `compgeoPointSetTriangulationLesson.test.ts`), and add the pre-change observation for new assertions (not done).

## Done in tests
- Deleted the arrow-nudge case (Segments:149); rewrote the 13th-segment case as a wiring check; PIP limit-notice case now asserts silence; PolygonArea Reverse wiring test added; PIP single-point list assertion added.

## Not done / unverified
- No observed pre-change failures, no test-time delta, no `compgeo` lesson test run, no smoke or browser check. PIP "arrow keys move q" case (host test:210) kept (selection priority is graph-specific); `PointSetControls` is not a lint exemption in HEAD already.
- Shared-control gaps to report: `PointCollection` has fixed "point" wording and no item noun, so segment/interval Add/Remove/Clear use `UnavailableButton` directly; `ChoiceSelect` has no unavailable/disabled state (edge list uses help text).
