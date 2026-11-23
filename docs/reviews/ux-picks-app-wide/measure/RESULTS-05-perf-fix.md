# Taylor puck drag at 4x CPU: production check and fix

Tree `board-workspace` @ 1d9c9997 plus uncommitted changes. Production preview 127.0.0.1:4472 (`just build`, asset hash index-BWn0PQ7t -> Cq6wdXGS -> CQUod0Lv confirmed served). Raw: `perf-pre-t4`, `perf-post-t4`, `perf-post-t1`, `perf-master-t4` (.json/.log). Scripts: `measure-05.cjs`, `profile-05.cjs` (CPU profile), `trace-05.cjs` (Chrome trace), `renders-05.cjs` (React commits, dev), `measure-01-pm.cjs` (measure-01 with the puck metric: pointermove time stamp), `entry-width-05.cjs`.

## 1. The "regression" on production

The 45-48 long tasks of RESULTS-05-final.md are a dev-server artefact. On the production build before any change (3 runs, 4x):

| Metric | Gate (master, slider, `input` stamp) | Pre-fix, production | Post-fix, production |
|---|---|---|---|
| long tasks | 1-4 | 2, 2, 1 | 1, 3, 3 |
| frame p95 | 33.3-33.4 | 33.4 x3 | 33.4 x3 |
| input delay median | 23.6-28.2 | 38.7, 39.6, 41.4 | 39.1, 38.0, 41.1 |

The input-delay gap is mostly the metric. Master rerun with the puck metric (pointermove stamp, `measure-01-pm.cjs`, 4x, 3 runs): median 34.0, 34.5, 35.3 ms (with the `input` stamp: 23.3-25.2). Like for like the puck is about 4 ms (11 %) slower, p95 50-58 vs 44-48, long tasks 1-3 vs 1.
1x: no long tasks, frame p95 16.8, Play unchanged (0 long tasks, p95 16.7-16.8); input delay median 14.5-14.8 (was 14.5-16.9).

## 2. Attribution (profile and trace, 4x, per pointer move)

Production trace: RunTask 43.8 ms per move; EventDispatch 28 ms, FunctionCall 31 ms; style 4.3, layout 2.4, paint 2.6, commit 2.9. CPU profile self time, production: jsxgraph/graph 770 ms of the drag (BaseGraph chunk 606 + BaseFunctionGraph 161), React and app render ~540, forced layout reads (getBoundingClientRect, offsetWidth) ~410, GC 82. Dev profile inclusive: `performSyncWorkOnRoot` 1785 ms, of which `renderRootSync` 1524, `onPointerMove` 889 (graph redraw `updateElements` 666), `layoutBoard` 30.
React commits: 2 per pointer move, 1 per key step; each store write re-renders GraphHost, DemonstrationWorkspace, BoardCards and every readout row. That is the existing store-write path, not the puck (the old slider writes the same store).
Ruled out: the drag ruler (disabled, dev 4x A/B: long tasks 36-47 vs 40-47, input delay 57-58 vs 57-59), the per-move `bounds()` read (removed; the forced layout is only paid by the next reader: getBoundingClientRect self time 322 ms before, 313 after), BoardCards layout work (30 ms of 6000).
Other forced layout: `ReadoutsBody.tsx:82` reads `getBoundingClientRect` in a layout effect of every readout row on every render (about 106 of the 322 ms). Not in the owned files; left.

## 3. Changes

- `RangePuck.tsx`: the board rectangle is read once at pointer down (`Drag.bounds`) instead of every move. No measurable gain; avoids a read in the handler after each redraw. Test: `pucks.test.tsx` "reads the board rectangle once per drag" (fails before: 5 reads).
- Constant width: `RangePuck.tsx` and `CountPuck.tsx` entry width `widthCh` (was `widthCh + 2`); `pucks.css` `.puck-input` border-box, padding 0, margin -1px 0, weight 600 so it matches the value span; range entry keeps the body structure (value line over track, `puck-body-entry`) so the puck height is unchanged. Test: "keeps the typed entry exactly as wide as the value". Browser (`entry-width-05.cjs`, production): slot rects (x, y, width) of Taylor (3 pucks) and De Casteljau (1) identical before and with the first puck's entry open. Before the fix the first puck's slot moved 13 px vertically and (earlier build) widened. CountPuck entry: width changed the same way, slot rect not browser-checked.

## 4. Verdict against the acceptance

Long tasks 1-3 (<= 6): pass. Frame p95 33.4 (<= 33): at the gate. Input delay median 38-41 vs <= 35 (1.25 x 28): not met by the old metric; met like for like with master on the same metric (34-35 -> 38-41, within 1.25 x). I found no puck-side cost worth 4 ms; the rest is the wide per-write React render and graph redraw, which the old slider also paid. A follow-up that narrows the re-render on a store write (GraphHost/BoardCards/readout rows memoised on their data) would help all parameters, not just pucks.
