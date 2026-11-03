# Task 19 handoff (partial), worker, 2026-11-03

## State
Implementation written, NOT yet compiled, linted, tested or built. No test file exists yet. No check has an observed result.
`npx tsc --noEmit --pretty false > docs/reviews/convexity-hulls/19-tsc.log` was started in the background; the log was still empty (0 bytes) when I stopped, so it is either still running or finished clean. Re-run it.

## Files
New (all under `src/graphs/compgeo/`):
- `hullRobustnessReadout.ts`: pure; mode/pop/duplicates/panel parsers and defaults, `kettnerCellReadout(i,j)`, `kettnerCounts()`, `signSymbol`, `chainOutputReadout(hull, points)` (repeated locations by coordinates).
- `kettnerBoard.ts`: pure SVG per panel (memoized; 4096 cells as one image; plus mark on blue, bar on orange, ring on grey; dark frame on cells where inexact differs from exact), `drawKettnerImage`, `drawKettnerCell` (polygon frame), `drawKettnerTitle` (text with function string). Kettner mode = 3 board objects: names `kettner-image`, `kettner-cell`, `kettner-title`.
- `HullRobustnessControls.tsx`: `RobustnessModeSelect`, `ChainChoices`, `ChainReadout`, `KettnerControls`, `kettnerCellLines`.
- `HullRobustnessGraph.tsx`: subclass of `HullTraceGraph`. Overrides `algorithm` (always monotone chain), `run()` (passes `{pop, duplicates}`), `setAlgorithm` (throws for non-chain), `syncScene` (chain: remove Kettner objects then `super.syncScene()`; Kettner: `super.disposeFigureScene()` once, then draw 3 objects), `disposeFigureScene`, `unmount`, `createMainView` (keydown arrows, board press selects cell, language subscription, aria-label), `initialView`, `fitView`, `overlayInputs`, `hullControls`, `workspaceEdit`, `sceneGraphState`, `figurePresetGraphState`, `setAddMode`. State fields: `mode`, `pop`, `duplicates`, `panel`, `cellI`, `cellJ` (`mode` is the typed scene option). Public: `setRobustnessMode`, `setPopRule`, `setDuplicateRule`, `setKettnerPanel`, `selectKettnerCell`.

Changes to hull-trace files (minimal, to be reported):
- `hullTraceRun.ts`: `runHullTrace(algorithm, points, chainOptions?)` and `monotoneRun(points, options?)` pass options to `monotoneChainTrace`.
- `HullTraceGraph.tsx`: `hullActions` private -> protected; `workspaceEdit` now renders `{this.hullControls()}{super.workspaceEdit()}` with the old JSX moved to new `protected hullControls()`.
- `HullTraceControls.tsx`: optional props `fixedAlgorithm` (hides the algorithm select) and `collinearKept` (test-collinear note uses `hullrobust_note_test_collinear_kept`).
Existing hull-trace tests have not been re-run.

Locale: 34 keys `hullrobust_*` added to `src/localization/sl.ts` and `en.ts` directly after `hulltrace_note_accept_wrap` (before the `// Ear clipping graph` comment), under the comment `// Hull robustness graph (convexity task 19).` Both files in lockstep. Placeholders: `rule_active` {value0,1}; `hull_output` {value0,1}; `hull_entry` {value0,1,2}; `hull_repeated` {value0}; `cell_title` {value0,1}; `cell_exact`, `cell_naive_sign`, `cell_naive_value` {value0}; `counts` {value0=total,value1=wrongSign,value2=falseZero}. Slovenian "inexact" = "nenatančno (double)".

## Remaining steps
1. `npx tsc --noEmit --pretty false` (log `19-tsc.log`); fix errors. Likely spots: `JXG` import/global in `HullRobustnessGraph.tsx` (I import `JXG from "jsxgraph"`; check how `BaseGraph.tsx` obtains `JXG.getDimensions`, my grep printed nothing), `override get algorithm` accessor, `this.robustRunMemo!` non-null assertion (remove with a local variable), `board.getBoundingBox()` cast, `setState(update)` typing in `writeRobust`, `session.on` signature, `this.board.containerObj` type.
2. Write `HullRobustnessGraph.host.test.tsx` (pattern: `HullTraceGraph.host.test.tsx` with `installBoardShims`, `Observed` subclass exposing `liveBoard()`), and a pure `hullRobustnessReadout.test.ts`. Required (task item 4): sample 1 under both pop rules ((2,0) dropped under `<=`, kept under `<`); three collinear points under `<` list the middle point twice (indices 0 1 2 1); a duplicate on both chains under `<` + `keep`; mode switch disposes the other mode's board objects with exact counts and restores them on return (chain: 9 `P\d+` points + curves/polygon; Kettner: 3 named objects, 0 points); selected cell readout equals `kettnerSignMap()` at (41,48) and a few others (counts 112 and 2052 shown); every rendered string for a naive value contains the inexact label (`/nenatančn/` in sl, `/inexact/i` in en); Reset, rule change, mode switch, scene change (`replaceState` / lesson reset) and language switch leave readout and board consistent; no draggable point in Kettner mode (add mode refused). Unknown: whether JSXGraph `image` works under `installBoardShims`; if not, adjust `drawKettnerImage` or the shims use in the test.
3. Two mutations with failing test names (e.g. pop rule ignored in `run()`; Kettner objects not removed in `syncScene` chain branch), revert after.
4. `just unit src/graphs/compgeo src/compgeo --maxWorkers=2`, `just lint src/graphs/compgeo src/compgeo`, `just build`; logs to `docs/reviews/convexity-hulls/19-*.log`. Existing `HullTraceGraph.host.test.tsx`, `HullTraceLessonActions.host.test.tsx`, `hullTraceRun.test.ts` must still pass.
5. 100 ms mode-switch timing: defer to task 20 (production build) or take a host-test timing.
6. Update the task 19 file status after acceptance (handler).

## Known gaps / notes for the handler
- The Preset collection is still `hullTraceCollection` (inherited `presetCollection()`); a self-export carries `mode`/`pop`/... and that collection's `checkGraphState` rejects unknown fields. Task 20 must add `compgeo-hull-robustness` with validation and the invalid-value messages (no `hullrobust_invalid_*` keys added here).
- Kettner view uses a toggle between panels (inexact/exact) instead of two panels, so the board's axes ticks read as i and j. No board axis titles for i and j (only the inspector and aria-label say so).
- Lesson action `set-algorithm` with a non-chain algorithm throws on this graph.
- The other worker's locale block (point-in-polygon, after the polygon-area block) was left untouched.
- Spec contradiction: none found. Spec A5 step 5 ("free double board") is realised as the fixed Kettner map per task 19's decision paragraph.
