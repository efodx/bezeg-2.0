# 08 h13 parity determinism: worker notes

## Cause

The board cards wait for MathJax before they measure (`src/workspace/layout/useMeasuredCards.ts:126`, `waitForFontsAndMath` at :54-73
loads MathJax when the measure layer holds raw `\(...\)`; extrema's Odčitki shows `\(f(x)=x^{2}\)`). jsdom never loads the CDN script
and never fires its `error` either, so `loadMathJax` (`src/mathjax/loadMathJax.ts:80-83`) settles only at its 15 s wall-clock timeout,
and its promise is module-global (`loading`, :15), shared by every test in the worker. Until then BoardCards has no final layout, so
`directorGeometry` is null (`src/workspace/presenter/BoardCards.tsx:331-334`) and the view director never fits; the board shows the
raw intent. When the 15 s elapse, whichever recording is in flight gets its layout and fit at that moment, from that state on.

Instrumented evidence (per state: director geometry, fitted box, unitX, captions; dumps under `.command-logs/h13pd-*/`):

- Extrema alone, before: no geometry, `fitted` null, unitX 39-51 in every state of both recordings (layer shows `\(f(x)=x^{2}\)`,
  `script#MathJax-script` present). After: geometry and fit from the first state, unitX 20-27.
- Full `parity.test.tsx`, before (`.command-logs/h13pd-before-1/`, `h13pd-flips.py`): mean-value's two recordings fitted
  `--------` and `-------G`, euler-method's `---GGGGGG` and `---------`: the fit lands at a different state in each recording.
  That run's captions happened to agree; in CI (extrema) and the earlier sequence failures they did not: extrema's compact label
  choice reads `board.unitX` (fitted vs unfitted) and sequence's threshold marker reads the shown box.
- After (`.command-logs/h13pd-after-*/`): 0 recordings with a mid-recording fit, 0 differing patterns.

The graphs are right to read the shown view (a marker off screen is hidden); the transient was the test's layout settling on a
wall clock, so the fix is in the harness, not in the graphs.

## Fix

- `failMathJaxLoads()` in `src/graphs/base/realGraphTestHarness.tsx`: fails a `MathJax-script` as it is added (and one already
  pending), the offline path `useMeasuredCards` already handles; formulas stay source text as before (Tex's `typesetMath` failed
  before too, only later).
- `recordParityWithDeclarations` (`src/graphs/base/declare/parity.ts`) installs it for the recording and stops it after.
- The previous worker's stable-for-2-frames wait: kept. After the fix every state settles in the minimum 2 frames (logged), so it
  costs nothing and guards a multi-pass layout.

## Checks (all after the instrumentation was removed, except after-1 and the parity check, which carried it)

- Full `parity.test.tsx` under 8 busy node loops (`.command-logs/h13pd-burn.sh`) plus other checkouts' runs: 5/5 passed,
  `.command-logs/h13pd-load-{1..5}.log` (568 s, 499 s, 1318 s, 795 s, 793 s). Before the fix, unloaded: passed but 2 of 78 ids had
  the fit land mid-recording at a different state in each recording (`h13pd-before-1.log`); CI failed once on extrema.
- `BEZEG_PARITY_CHECK=1` full file: passed (`h13pd-paritycheck.log`).
- Golden check, all 127: 8 failed (`h13pd-golden-all.log`). Without the fix, the same 6 of them fail with identical differences
  (counting-tree, lattice-paths, logistic-map, recursion-cobweb, recursion-growth, waves: `h13pd-golden-before.log`), so they are
  not from this change (four are the other worker's graphs). Extrema and sequence differed by being fitted now (extrema: compact
  labels without the classification lines in one state; sequence: "N = 11" shown in two states); both re-recorded with
  `BEZEG_PARITY_GOLDEN_RECORD=1 BEZEG_PARITY_GOLDEN_ID="extrema sequence"` and now pass (`h13pd-golden-final.log`).
- `just unit src/graphs/functions/Extrema src/graphs/functions/Sequence src/workspace/view src/graphs/base/realGraph`: 200 passed.
  tsc: 0 errors. `just lint` on the two changed files: passed.

## Open

- Recordings now show the fitted view from the first state.
- Harness size mismatch: the director's canvas is the layer rect (1400 x 900, `installBoardShims`) while JSXGraph's board is
  600 x 400 (`clientWidth`), so a fitted unitX is 600/1400 of the browser's. Extrema then always picks compact labels. Not changed
  (it moves every real-graph test).
- About 400 other files using `installBoardShims` without `vi.mock('../../mathjax/loadMathJax')` share the 15 s race.
