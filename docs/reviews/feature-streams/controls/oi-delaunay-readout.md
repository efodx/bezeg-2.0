# Open item: Delaunay second readout region

Decision 18: one live readout region per inspector.

- Cause: `DelaunayGraph.workspaceEdit` renders the inherited `TriangulationControls` (own `LiveReadout`, `data-triangulation-live`) next to the trace `LiveReadout` (`data-delaunay-live`).
- Fix: `TriangulationControls` takes `announce` (default true; `TriangulationControls.tsx` props and the `LiveReadout` line). `TriangulationGraph.announcesEvents()` feeds it; `DelaunayGraph` overrides it to false. `DelaunayControls` takes `event` and prepends its non-refusal sentence (`eventText`) to the one trace readout. Refusals keep their own alert/notice region (outside the one-region rule).
- Information: the event sentence still shows as the visible `data-triangulation="event"` paragraph and is now announced via the trace region; nothing dropped. Triangulation, ear clipping and other users of the panel are unchanged (default true; `readoutParts.test.tsx` asserts one region on Triangulation).
- Test: `DelaunayGraph.host.test.tsx` ("exactly one live readout region"). Before the fix: `AssertionError: expected [ 'delaunay', 'triangulation' ] to deeply equal [ 'delaunay' ]`.
