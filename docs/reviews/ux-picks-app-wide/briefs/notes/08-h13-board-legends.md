# H13 board legends: worker note (partial, stopped at the HANDOFF budget signal)

## Done (code and unit tests pass)
- Logistic map: `LogisticMapGraph.tsx` legend now carries the rules (map with r, diagonal, cobweb note, diagram range) and two new entries `second`/`onset` (one dashed marks curve names both; `this.drawn.set("onset", marks)`). Board caption column removed (`columnTexts`, `captionLines`, `CAPTION_CHAR_PX` deleted); only the three "r = ..." tick captions remain; `openingWindow` needs only TICK_ROW + 1.5 rows. Fragment `fragments/logistic-map.ts` (sl+en) gained `logistic_legend_second/onset`, legend map/diagonal/cobweb/diagram texts now carry the rules (with placeholders); `phase_graph_logistic_cap_{map,diagonal,cobweb,diagram,mark_second,onset}` deleted from sl.ts/en.ts.
- Cobweb (`RecursionCobwebGraph.tsx`): legend `map|diagonal|cobweb` (curves in a `drawn` map, `drawnObject`, `mapLegend()`); the three board captions removed; off-view fixed/iterate captions stay. Keys `recursion_graph_cap_map_*`, `recursion_graph_cap_diagonal` capitalised (now legend labels). `clearOfYAxis`/`legendInFrame` in `cobwebFocus.ts` are now unused in source (still unit-tested there); left in place.
- Growth (`GrowthGraph.tsx`): `legendEntries()` per panel (bars, limit, 4 interest curves with values, points, chord); captions and the hand-drawn interest legend sample curves removed; only the two axis titles remain on the board. Caption keys capitalised.
- Counting tree (`CountingTreeGraph.tsx`): `leafLayout()` (pixel-based): stagger over up to 3 rows, then every m-th leaf is named; `TreeData.rows` removed.
- Tests updated/added: LogisticMapGraph.declaration.test (new legend-text test, ALWAYS list), LogisticMapGraph.test (captions, narrow board, key count), RecursionCobwebGraph.{test,declaration.test} (legend texts, SCENE_OBJECTS 3+2+3), CobwebLessonActions.host.test (`openTools` before Next step: the legend card now folds Orodja), GrowthGraph.{test,declaration.test}, CountingTreeGraph.test (new overlap test, 64-leaf test thinned).
- Observed failing-first: logistic only (`expected 'Preslikava' to be 'Preslikava y = 3,1·x·(1 − x)'`, log `.command-logs/h13-bl-logistic-fail.log`). Cobweb, growth, tree tests were written together with the change; their failure before the change is argued (legend was `never`, all 64 labels drawn) but not observed.

## Passing runs
tsc clean (`.command-logs/h13-bl-tsc.log`, run before the tree test edits); `just unit` of src/graphs/dynamics, src/localization, src/graphs/recursion, src/graphs/combinatorics all passed (logs `.command-logs/h13-bl-*.log`).

## Not done
- `npx eslint` on changed files; tsc rerun after last edits; `just unit src/learning/content/declarationContract`, lesson content tests, `just unit FirstTask`; parity golden diffs (logistic-map, recursion-growth, recursion-cobweb, counting-tree; goldens will need re-recording, captions to legend only); `just build`; `just smoke-lesson ... --port 4391`.
- Lesson prose grep for text that points at the moved captions ("legenda"); unused-key check for other callers.
- All shots (1440x900 and 1280x720, free and every lesson step) and verdicts. Open questions for shots: whether the growth y-axis title / leftmost bars still sit under the lesson card at 1280 (director keeps (0,0) as a must mark; not verified), logistic r-tick row at 1280.
- Scratch to delete by name: `.command-logs/h13-bl-cobweb.py`, `h13-bl-growth.py`, `h13-bl-growthtest.py`, `h13-bl-tree.py`.
- Note: Python edits rewrote sl.ts/en.ts/fragment/test files; line endings were preserved where I checked (CRLF-aware scripts) but the first logistic edit of sl.ts/en.ts/logistic-map.ts/declaration test may have converted CRLF to LF (git reports only autocrlf warnings).

## Session 2
- Fixed: unused `values` in GrowthGraph.tsx (eslint); recursionCobwebGuidedLessons.test.ts `openTools()` before Next step (legend card folds Orodja; 4 failures before); CountingTreeGraph.tsx `leafRowGap()` (staggered leaf rows were 1.1 user units apart, overlapped vertically at small unitY; now font+3 px).
- Removed dead `clearOfYAxis`/`legendInFrame` from cobwebFocus.ts and their test.
- Checks: tsc clean, eslint clean on all slice files; unit declarationContract, src/learning/content (after fix), FirstTask, combinatorics pass; build passed; smoke-lesson 4 ids passed (log .command-logs/h13-bl-smoke.log).
- Golden diffs (not re-recorded): captions only for logistic-map (12 states), recursion-growth (12), recursion-cobweb (7), counting-tree (6); logs .command-logs/h13-bl-golden-*.log.
- Lesson prose grep: no text pointing at the moved captions found.
- Shots `.command-logs/h13-bl-*`: logistic, cobweb, tree clean at 1440/1280 (free and steps checked: logistic s1/s4, recursion s4, tree s4 at both widths). Growth lesson at 1280 (step 2) still has the y title "aₖ" and leftmost bars/origin under the lesson card: the view director cannot fit the must polyline in the card-free area at 1280 (same as baseline; not a caption). Not fixed. Growth at 1440 and free 1280/1440 clean. Not every one of 12 steps per graph viewed (96 shots exist).
