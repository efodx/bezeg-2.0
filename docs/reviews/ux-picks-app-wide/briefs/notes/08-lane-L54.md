# 08 lane L54 (computational geometry)

## Session 1: bezier-hulls, convex-hull, delaunay (PARTIAL, stopped at the 175k budget signal)

State: `npx tsc --noEmit --pretty false` empty at the stop. No unit/graph-check/build/smoke run yet. Nothing committed.

### Done
- Parity recorded from the OLD panels (before any graph conversion) with the new SAMPLES in `src/graphs/base/declare/parity.test.tsx`:
  `compgeo/__parity__/bezier-hulls.json` (7 states), `convex-hull.json` (10), `delaunay.json` (11). Goldens already existed.
- Delaunay had no `data-readout-note` markers: added (text unchanged) in `DelaunayControls.tsx` (step, note, detail, incircle, selected-triangle,
  hull-edges, done, cocircular, neighbour `li`) and `TriangulationControls.tsx` (event `p`). Its readout rows already carry `data-readout`.
- bezier-hulls, graph side converted but UNTESTED: new `bezierHullsNotes.ts` (pure, Message list, ids step/depth/candidates/kept/tests/empty/remaining);
  `BezierHullsControls.tsx` renders from it (`data-declared-panel` on the readout group); `BezierHullsGraph.tsx` opts in
  (`declaresPointSetWorkspace`, `overlayMessage`, `overlayIsPuck` = `pieces` only, `overlaySwatch`, `pointSetNotes`, `declaration` with legend curveA/curveB
  and tools actions next-step/play/reset in section `playback`, `drawnObject`, `performAction`; exported `BezierHullsIds`);
  fragment `fragments/bezier-hulls.ts` (curve A/B) registered in `fragments/index.ts`.
  Placement: playback stays in Orodja (non-puck board actions have no board UI in `PuckStrip`; same as L40). Control polygons/hull: Orodja display.
- convex-hull, partial: new `hullTraceNotes.ts` (pure: `hullTraceNotes`, `hullNoteMessage`, `hullAlgorithmMessage`; ids step/note/detail/count/total-<algorithm>);
  `HullTraceControls.tsx` renders from it (`data-declared-panel` on the status div; algorithm select wrapped in `PuckOwnedGroup` params
  `["algorithm", ...HULL_ALGORITHMS]`). `HullTraceGraph.tsx` NOT yet changed, so the wrapper currently renders the select as before.

### Next (not done)
1. Bezier-hulls: declaration test `BezierHullsGraph.declaration.test.tsx` (copy `BezierClippingGraph.declaration.test.tsx`; break once), SAMPLES parity check,
   `just graph-check bezier-hulls --route compgeo/bezier-hulls`, frames (`bezierHulls` lesson ~line 3157 of `compgeoGuidedLessons.ts`, 7 steps, local `frame` has `declare`;
   highlight depth/kept/tests; uses `pieces`), pinning tests, `BezierHullsControls.host.test.tsx` etc.
2. Convex-hull: `HullTraceGraph.tsx`: add `declaresHullWorkspace()` hook (default true) used by `declaresPointSetWorkspace()`, and a ONE-LINE override returning false in
   `HullRobustnessGraph.tsx` (session 2's demo inherits the class; needs handler OK or do it in session 2). `overlayMessage` (trace, hull), pucks for trace ("Sled algoritma", 14 chars)
   and hull (needs short key, e.g. "Ovojnica", in a `convex-hull` fragment), swatches; algorithm as a 3-action choice puck group (key `algorithm`, ids = algorithm ids,
   shorts in fragment; `performAction` calls `setAlgorithm` as learner; group help = `hulltrace_slow_note` for slow-edge-test), `pointSetNotes` via `hullTraceNotes` (needs `totals`
   when `run.view(step).done`), `drawnObject`, actions next-step/play/reset in tools (section `playback`), ids type, test, frames (convexHull lesson line 404, 7 steps; frame
   helper `frame(...)` has `declare`; do not highlight predict values).
3. Delaunay: notes (pure function from `DelaunayStatus` + the inherited `TriangulationReadout` rows n, k, triangles, edges, angle, angle-before + event), opt in
   in `DelaunayGraph.tsx` only (do not make `TriangulationGraph` declare: point-set-triangulation is session 4), overlays triangulation/edges/angles, playback actions,
   example select and triangle list stay in Orodja, optional `nice` mark for the circumcircle, test, frames (delaunay lesson line 1067).
4. Checks per shared brief (graph-check each, parity golden check, `just unit src/graphs/compgeo src/graphs/base/PlaybackRoutes.test.tsx src/learning/content src/localization src/graphs/base/declare`,
   `just lint`, then `just build` and `just smoke-lesson <id> --port 4395 --workers=1`).

### Unverified
Everything above beyond tsc: no test, parity check, golden check, lint, build or browser run; no red check observed yet.
Scratch scripts in `.command-logs/` (ed3.py, ed4.py) are mine; delete or ignore.

### Session 1 continuation (bezier-hulls and convex-hull DONE; delaunay NOT started)

- bezier-hulls: `BezierHullsGraph.declaration.test.tsx` (7 tests). Red check: `overlayIsPuck` returned `hull` instead of `pieces` -> "AssertionError: expected { id: 'pieces', ... } to match object { placement, puck, ... }", restored. Frames: `bhFrame` highlights depth/kept/candidates/tests on observation frames (not the predict step), explore explanation `uses: next-step`, `open: tools`. Own test updated: `BezierHullsGraph.host.test.tsx` checkbox count 4 -> 3 (pieces is now a board puck). No lesson prose names the pieces switch, so no prose rewording.
- convex-hull: `HullTraceGraph.declaration.test.tsx` (10 tests, includes "robustness stays undeclared"). `declaresHullWorkspace()` hook in `HullTraceGraph` (default true); one-line `false` override in `HullRobustnessGraph.tsx`. Placement: trace, hull = switch pucks; algorithm = 3-segment choice puck (action ids = algorithm ids, group key `algorithm`, help = slow-edge cost note); next/play/reset in Orodja (section `playback`, no board UI for non-puck actions). Fragment `fragments/convex-hull.ts` (puck shorts), registered in `fragments/index.ts` (also added `bezierHulls`/`convexHull` to `catalogFragments`). Red check: `overlayIsPuck` returned only `trace` -> "AssertionError: hull: expected { id: 'hull', ... } to match object { Object (placement, puck, ...) }", restored. Frames `chFrame` in the convexHull lesson (slow-intro, slow-reveal, monotone-chain, gift-wrapping, counts; predict not highlighted). Own test `HullTraceGraph.host.test.tsx` updated: the algorithm select is a puck now, so the three cases that used the combobox/help text use `performAction('gift-wrapping')` and the declared puck help (`algorithmHelp`). Lesson prose "zamenjaj algoritem" still fits (control label "Algoritem"); no rewording.
- Observed green: `just graph-check bezier-hulls --route compgeo/bezier-hulls` and `... convex-hull --route compgeo/convex-hull` (contract, parity, golden, declaration, shared; browser skipped); parity golden checks for both; `just unit src/graphs/compgeo src/graphs/base/PlaybackRoutes.test.tsx src/learning/content src/localization src/graphs/base/declare` (after the two own-test fixes; the second full run had only the HullTraceGraph.host failures, re-run of HullTrace/HullRobustness host+lesson tests green); tsc empty; lint of changed files green; `just build` passed; `just smoke-lesson convex-hull bezier-hulls --port 4395 --workers=1` passed.
- Not verified: a full compgeo unit run after the last host-test and lint edits (only the touched files re-run); no screenshots at inspector width (`just shot`); delaunay (notes, overlays, frames, test) is untouched except the earlier `data-readout-note` markers.
- Next: delaunay per the earlier "Next" item 3.

## Session 2a: delaunay, ear-clipping (DONE; fortune and hull-robustness not started)

- delaunay (opt-in from `DelaunayGraph.tsx`; `TriangulationGraph` stays undeclared, test asserts it). New pure `delaunayNotes.ts` (trace sentences, the six angle rows, selected triangle and neighbours, result, last event, inherited triangulation counts as notes; angle lists joined by a nested message with the fragment key `del_angle_join`, because `messageNumberList` joins with ", " and the panel with "; "). Hook in `TriangulationGraph.tsx`: it passes `declared={this.declaresPointSetWorkspace()}` (false for itself) to `TriangulationControls`, which adds `data-declared-panel` to the event sentence and the counts list only. `DelaunayControls` wraps its sentences and rows in `data-declared-panel`; playback, triangle list, example select, edge/flip select and refusal stay in Orodja. Judgements: `angles` ("Najmanjši kot", 13 chars) is a puck (flipped while flipping edges); triangulation and edge numbers are display switches in Orodja; playback in Orodja (no board UI for non-puck actions). Marks: points must; circumcircle of the tested/selected triangle as `nice` boxes (memoized). Frames: highlights on the five observation frames except predict (and only rows present in the scene: `cocircular` is absent at the test step). Red check: `overlayIsPuck` returned `triangulation` -> "AssertionError: expected { id: 'angles', label: ..., } to match object { Object (placement, puck, ...) }", restored.
- ear-clipping: marked the one unmarked sentence (`reversed`, text unchanged), recorded `__parity__/ear-clipping.json` (8 states) before converting, SAMPLES entry in `parity.test.tsx`. New pure `earClippingNotes.ts` (ids refusal/reversed/step/note/detail/triangles/count/result-*; detail+blocker joined by fragment key `earclip_detail_join`), fragment `fragments/ear-clipping.ts`. `EarClippingControls` wraps all sentences (incl. refusal alert) in `data-declared-panel`, live region moved after them. No puck: the five overlay names are 14 to 38 characters and the lesson sets overlays by scene actions; all overlays are display switches, playback in Orodja. Legend: points, trace (area), reflex (point), triangulation (area), guards (ring). Frames: observation highlights, first-ear explanation `uses next-step`, `open tools`. Red check: trianglesSoFar + 1 in the notes -> notes differ from the panel (AssertionError toEqual), restored.
- Golden difference, reported not re-recorded: `delaunay.golden.json` holds no notes (recorded before the markers); `just graph-check delaunay` golden row fails with "state default notes: golden [] now [Korak 1 od 5, Začetna triangulacija...]" and the same for `delaunay-guided/del-flip`, `del-seven`, `del-square`. Rows are unchanged. ear-clipping golden passes.
- Observed green: tsc empty; `just graph-check ear-clipping` all rows pass; delaunay all rows pass except golden (above); `just unit src/graphs/compgeo src/graphs/base/PlaybackRoutes.test.tsx src/learning/content src/localization src/graphs/base/declare` passed; lint of changed files passed; `just build` passed; `just smoke-lesson delaunay ear-clipping --port 4395 --workers=1` passed.
- Not verified: inspector-width screenshots, browser probe/fuzz, prose rewording (no prose names a moved control; "izpis pod grafom" kept).
