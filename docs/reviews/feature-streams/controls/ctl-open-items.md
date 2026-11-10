# Controls open items (handoff-v13)

## A. One live region per point-set graph
- Choice: the polygon status line and the pending line no longer mount `StatusLive`. They use a local `ChangeNotice`
  (`src/graphs/compgeo/PointSetControls.tsx`, before `Status`): a visually hidden `role="status"` region, empty at mount,
  that speaks the sentence each time it changes (marker `data-pointset-announce`, not `data-readout-live`).
- Reason: a notice region is outside the one-region rule (decision 18) and the graph's own `LiveReadout` stays the only
  always-speaking region. Folding into `LiveReadout` was rejected: `PointSetControls` has no access to the graph's readout,
  and graphs such as the plain point-set graph have none. Visible text and `data-pointset-status` / `data-pointset-pending` are unchanged.
- Consequence: the plain point-set graph no longer has any `data-readout-live`; its status is announced on change.
  A change from a drag or a preset load also announces (not only the panel's own press).
- Tests: Delaunay, Bezier clipping, point-set polygon (`*.host.test.tsx`, last tests). Before: Bezier clipping 2 regions, Delaunay 3 (log ctl-open-before.log).
  Delaunay 3, polygon test failed (log `.command-logs/ctl-open-before.log`).

## B. Voronoi blocked-construction reason
- `PlaybackButtons` takes optional `noRunReason`, replacing the text of the `no-run` block only; `playbackBlocks` unchanged.
- `VoronoiControls.tsx` passes it when `status.cellSite === null`; new key `vor_construct_choose_first` (sl.ts, en.ts):
  "Najprej izberi mesto v seznamu mest." / "Choose a site in the site list first." (term "mesto" from `vor_sites_label`).
- Test: `VoronoiGraph.host.test.tsx` last test; failed before with the generic text (`.command-logs/ctl-open-before-b.log`).

## Not verified
- No browser smoke; no screen-reader check of the new notice region.
- REMAINING: Delaunay still has 2 regions: its trace `LiveReadout` and the inherited `TriangulationControls` one
  (`TriangulationGraph.tsx:540`, `TriangulationControls.tsx:128`); not from PointSetControls, outside the owned paths. Needs a decision.
- `just typecheck` fails only in `src/graphs/base/presets/PersistedEntryParity.test.ts` (other worker's untracked file).
