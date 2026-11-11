# f2a-ls-04: level-sets task 04, scope items 1-3 (first half)

Status: items 1-3 done, uncommitted. ContourMapGraph done (FINAL EVIDENCE below); LinearProgramGraph done (FINAL EVIDENCE: LinearProgramGraph below).

## FINAL EVIDENCE: ContourMapGraph (finishing worker)

Done: contourScene.test.ts (19 tests: typedGrid/snapGrid, levelValues, levelDrawings, gradientAt incl. exact stationary, numericGradient error 7,5e-6..7,7e-6 at h = 0,01 for hills (1,1), descentInfo valley H=3,5,9 -> 123/73/40 and the exact rule, pathPoly cut, lagrangeInfo (1,2) lambda 2 via Rational, circle tangent params K=6,18,30,42, rationalText, surfaceMesh watertight/finite, zScale, buildSurfaceScene owner `function`); contourPresetCollection.test.ts (5: round trip, out-of-range, off-grid, malformed, shape, graph state, English); ContourMapGraph.test.tsx extended (ownership with the JSXGraph timer baseline and handler counts, each mode x function mounted, drag snap for probe/start/line/circle point and the refused drag, pause rule for 12 direct setState fields and the no-content write, reduced-motion Play block through the rendered button, language switch with decimal comma and true minus, surface view failure). ContourPanels.tsx has the comment for the queueMicrotask report.
Mutations (21, each killed with an observed FAIL, restored, cmp clean; backups .command-logs/ls04i-<name>.bak, driver ls04i-mut.py, result ls04i-mut.out): typed-off-grid, snap-clamp, hills-spacing, stationary, numeric-h, descent-eps, valley-rule, line-param, circle-wrap, zscale, mesh-faces, owner-kind, preset-name, preset-field, pause-rule, pause-always, reduced-block, drag-snap, handler-off, view-dispose, unavailable.
Product defects found by the tests: none (two test-side mistakes: the graph's private `clock` field collided with my fake-clock name; the English point format is "(x, y)").
Checks: `just unit src/levelsets src/graphs/levelsets` passed (153 passed, 1 opt-in perf skipped, before the last test-type fix; contourScene.test.ts re-run passed); `just lint` passed; `npx tsc --noEmit`: no error in src/levelsets, src/graphs/levelsets (errors seen only in src/graphs/linear/LinearMapGraph.tsx, the other worker's file, mid-edit); whitespace, control-character and end-of-file greps clean on owned files. No build, no browser smoke, no real WebGL surface view verified.

### Decisions and doubts for review
- Surface-view synchronous failure is reported through queueMicrotask (settled); the failure case is tested for the console message and the alert note. The async attach rejection path has no test.
- Pause rule is a content compare in onStateChange (`sameContent`), so a direct setState with equal content keeps playing.
- Unmount timer test compares with a reference mount that redrew one step, as the recursion graph does.
- LinearProgramGraph, `levelsets_graph_lp_*`, build and smoke remain open.

Decisions so far (for review): extra levels drawn as c + k*d with d = 1 (hills 1/8); the contour through the probe/point is a separate dashed curve at c = f(point); LS2 numeric toggle shows the central difference at h = 0,01 as a computed estimate with its error (the spec's kernel note says no learner-visible central difference, LS2 scene asks for one); the surface is a panel beside the map in the workspace (not a second board), mesh rebuilt only on function/window change; arrows drawn at one common scale when long (scale stated).

Files: src/levelsets/contourDrawing.perf.test.ts (opt-in), src/levelsets/contourModel.ts + .test.ts, src/optimization/lpModel.ts + .test.ts,
surfaceScene.ts:56 (`'function'` added to SceneMeshOwner.kind; no exhaustive switch needed an arm), docs/adr/0053 "Measurement results" under section 2.

Measurement: see the ADR table (jsdom, compute-only). Worst compute cell N=120, 9 levels, level drag: 6,97 / 11,34 ms median / p95. Probe drag <= 2,3 ms p95 everywhere. jsdom
JSXGraph curve update <= 8 ms p95. N=40 mesh: build 0,09/0,67, painter 0,34/1,51, JsxSurfaceView jsdom update 23,2 / 48,9 ms (over 16 ms in jsdom only; solids precedent; not on the drag path if the surface is rebuilt only on function change). N=60 default kept. Browser numbers owed at F2b.

Contour model API (contourModel.ts): ContourState {mode, fn, level(L/8), levelCount 1..9, probe [P/20], numeric, start [S/4], step H 1..30, constraint 'line'|'circle', lineParam T (x=T/4, -16..48), circleParam K (0..47, 2*pi*K/48), camera}.
parseContourState(unknown) -> {ok,value}|{ok:false,error:{field,reason,min?,max?,choices?}}; serializeContourState; withFunction(state, fn); DEFAULT_CONTOUR_STATE; levelOf/probeOf/startOf/stepOf/lineParamOf/circleAngleOf; probeFits/startFits/windowHalf; CONSTRAINT_LINE {1,2,5}, CONSTRAINT_CIRCLE_R2 = 2.
Reasons: not-an-object, not-finite, off-grid, out-of-range, unknown-value, missing, inconsistent (probe/start outside the function window; line with hills).
LP model API (lpModel.ts): LpState {constraints[1..5] {a,b in -9..9 not both 0, c in -30..30}, objective {p,q in -9..9}, sweep -100..100}; parseLpState, serializeLpState, DEFAULT_LP_STATE; extra reason zero-row; constraints count error uses out-of-range with min/max = row count.

Mutations (8, each killed, restored, cmp clean; backups .command-logs/ls04-*.bak): range check, window consistency, hills-line rule, -0 norm, withFunction fallback, zero-row, row count, objective range.

Checks: just unit src/levelsets src/optimization passed; BEZEG_PERF=1 perf passed; tsc 0 errors; just lint passed; trailing-whitespace grep empty.

Doubts: grid choices (level 1/8, probe 1/20, line x in [-4,12], circle 48 steps, LP bounds, `sweep` stored) are mine, not in the spec; `camera` stored like solids. Line x+2y=5 barely meets the bowl window [-2,2] (only the corner (1,2)); the graph needs a wider LS4 view.

## HANDOFF: LinearProgramGraph (LS5) worker, stopped at the budget signal

Done (uncommitted, tsc clean outside the other worker's files at the time of the check):
- src/graphs/levelsets/lpScene.ts (solveState + status unique/segment/ray/unbounded/infeasible/flat, clipping, view box, texts), lpScene.test.ts (17 tests, passing after the last fix), lpPresetCollection.ts + .test.ts (5 tests passed), LinearProgramGraph.tsx (board, objective handle drag snap, typed refusal setters, controls, readout rows, status), LpPanels.tsx (LpReadout).
- `levelsets_graph_lp_*` block in sl.ts and en.ts after `levelsets_graph_error_graph_state` (about 85 keys, lockstep).
Remaining, in order:
1. LinearProgramGraph.test.tsx (mount/unmount with the JSXGraph timer baseline as ContourMapGraph.test.tsx:149, a state change, typed refusal incl. zero row, handle drag snap, preset round trip via exportPresetData/importPresetData, status for infeasible/unbounded/edge, language switch decimal comma, locale lockstep over `levelsets_graph_lp_`).
2. `just unit src/optimization src/graphs/levelsets`, `npx tsc --noEmit --pretty false`, `just lint src/optimization src/graphs/levelsets`, git diff --check, whitespace/control-char greps, no blank line at end of new files.
3. One mutation per assertion group, backups .command-logs/ls04lp-<name>.bak, cmp.
4. Update docs/tasks/level-sets/04-graphs.md Status and README status; FINAL EVIDENCE with doubts.
Decisions so far: constraint rows have numeric inputs only (no draggable row handle); only the objective (p, q) handle drags; the view is fixed at [-10, max(10, 1.15 * largest vertex + 1) up to 60] so the handle range is always visible; new row is x + y <= 30; kernel lists a bounded polygon counter-clockwise (not lexicographic) in result.vertices.

## FINAL EVIDENCE: LinearProgramGraph (finishing worker)

Done: LinearProgramGraph.test.tsx (23 tests): LS5 default (12 at (2; 3), four vertices, walk), each status on a hand-checked instance (infeasible x <= -1; unbounded -x + y <= 1 with 1,1 and ray (1; 1); flat 0,0; unique; segment 1,2 on the default rows, value 8, ends (0; 4) and (2; 3); ray x - y <= 0 with 1,-1, value 0 at (0; 0)), exact fractions (2x + y <= 7, maximize x: 7/2 = 3,5 at (7/2; 0) in sl, 3.5 in en; true minus in -2 and the row text), state change with solve-once cache, typed refusal (off-grid, out of range, NaN, missing row, zero row, row count) and the input refusal, drag snap (4,4;-2,6 -> 4;-3, clamp at the range edge), row count (new row x + y <= 30), Preset round trip through a second mounted graph, language switch, announcement via the single `data-readout-live` region (settles after 500 ms, follows the language), unmount against the JSXGraph timer baseline, locale lockstep (all `levelsets_graph_lp_` keys and every key named in the four source files).
Mutations (12 killed, restored, cmp clean; backups .command-logs/ls04lq-<name>.bak, driver ls04lq-mut.py, result ls04lq-mut.out): zero-row, bound-range, drag-snap, status-key, fraction, announce, listeners, import, lang, memo, en-placeholder, sl-key-missing. One throwaway ("window", an extra report call in cleanup) survived and has no assertion group; not counted.
Product defects found by the tests: none. Test-side mistakes: a drag outside the range clamps to the range edge (as the contour graph), it is not put back; the page has other `role=status` nodes, so the single-region check counts `data-readout-live`.
Checks: `just unit src/optimization src/levelsets src/graphs/levelsets` passed; `just lint src/optimization src/graphs/levelsets` passed; `npx tsc --noEmit`: 2 errors, none in levelsets, optimization or localization (the other worker's files); `git diff --check` clean for owned files (only a CRLF warning for src/graphs/linear/LinearMapGraph.tsx); whitespace and control-character greps clean; no blank last line. No build, no browser smoke, no real JSXGraph pointer drag.

### Decisions and doubts for review (LinearProgramGraph)
- The objective handle drag clamps to p, q in -9..9 instead of refusing (same as the contour graph); typed values are refused.
- The status sentence is tested by its Slovenian stem plus values, not whole text, except the default and the fraction case.
- Row handles do not drag (numeric only); the LS5 spec scene may want them, owner to confirm.
- The `ray` status sentence says "from the vertex"; for an unbounded region cut by the window the legend shows the clip row.


## Review repairs

Checks: `just unit src/levelsets src/optimization src/graphs/levelsets src/localization` passed; `npx tsc --noEmit` clean; `just lint` passed; whitespace, control-character and end-of-file checks clean. No build, no browser run. Failure-before-fix was observed only where noted; the others were written together with the fix.

1. Legend vs board: done. `DRAWN_STYLE` (ContourMapGraph.tsx) is the one table of dash and width per legend row, spread into the drawing calls. The level set through the point stays dashed; the constraint is now a solid, very thick line (width 5 against 3 of the chosen level set), so it differs by style and not only colour. Legend texts name the true style (sl/en). Test "the legend and the drawing agree": per language and mode, each row's stated style is matched to the dash and width of a visible board element of the row's colour. It failed for the gradient and tangent rows (no style word) until their texts said "solid".
2. Shapes: done. Path "solid line" (no dots), step "hollow square", tangency "cross" (x marks). Checked the rest against the drawing: LP region (thick edge, fill), rows (thin), vertex (filled circle), optimum (outlined square), objective (width 4 solid), sweep (dash 2), walk (dash 1 dotted), direction arrow and handle all match; no change. Gradient and tangent rows now say "solid arrow" / "solid segment".
3. `cap_grad_g` says "dashed arrow", `cap_grad_f` "solid arrow": done (same table test).
4. Exact tangent point: done. `exactPointText` shows (25/7; 5/7) ≈ (3,5714; 0,7143) via `levelsets_graph_lp_exact_decimal`; test on valley.
5. `drawn_value` reworded (sl, en) to the real cut: 4 half-widths of the window from the origin.
6. `settled_never` takes the cap (`DESCENT_MAX_STEPS`): "ni dosežen v 200 korakih". Tested as text only.
7. contourModel.ts:57 comment fixed.
8. Terminology: "Vez" -> "Vezni pogoj" (and inflected forms) in all levelsets keys. "Tangenta" (the line) is standard school usage and stays; "tangenca" is not: "Tangenca" -> "Dotikanje", "Točka tangence" -> "Dotikališče", "tangentni koti" -> "Koti s približnim dotikom".
9. `p_{value0}` -> `p{value0}` with Unicode subscript digits from a helper (sl, en).
10. Surface panel: done by keying the panel on the graph (`ContourSurfacePanel` wraps `SurfacePanelOf`). Tests: rejected async attach shows the alert; unmount before rejection gives no console error and no alert; a swapped graph clears the note.
11. Clamp: done. `snapPair` clamps to min(grid range, floor(windowHalf x scale)); old "refused" test replaced by clamp tests for probe and start.
12. Memo moved to `src/graphs/levelsets/Memo.ts`; `lpPresetCollection.ts` and `contourPresetCollection.ts` use `currentLanguage()` in formatNumber; sceneKey comment added.

Not verified: browser view of the thicker constraint line; the keyed-panel test and the clamp test were not run against the old code.
