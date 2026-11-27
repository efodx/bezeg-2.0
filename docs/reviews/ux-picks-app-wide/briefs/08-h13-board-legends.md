# Board legends to the Legenda card: logistic map, growth, cobweb; counting tree leaf labels

Role: `bezeg-worker` (Sonnet), edit permission. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`, branch `board-workspace-2`. Never commit, push, stash or create a worktree. Another worker edits the extrema graph and `src/graphs/base/declare/parity*` in the same tree: leave those alone. One heavy command at a time, foreground.

## Problem (observed 2026-11-27, shots in `.command-logs/h13-b4-*`)

After caption sweep batch 4 (`git show HEAD --stat`; notes "# Batch 4" in `briefs/notes/08-caption-sweep.md`), these graphs still draw line-style legends and rule captions as board text, because their declarations say `legend: never`:
- Logistic map (`src/graphs/dynamics/LogisticMapGraph.tsx`, route `analysis/logistic-map`): a left caption column ("preslikava…", "diagonala…", "pajkova mreža…") sits under the lesson card at 1280x720 (lesson steps 1 and 4), overlaps the "r =" row / puck, and at 1440 free page crosses the y axis. Shots `h13-b4-learn-1280/analysis-logistic-map-learn-1-*.png`, `h13-b4-step4-analysis-logistic-map-1280.png`, `h13-b4-free-1440/analysis-logistic-map-*.png`.
- Growth (`src/graphs/recursion/GrowthGraph.tsx`, `analysis/growth`): at 1280 lesson, "aₖ (člen zaporedja)" and "stolpci: členi aₖ…" are clipped by the lesson card, leftmost bars under it. `h13-b4-step4-analysis-growth-1280.png`.
- Cobweb (`src/graphs/recursion/RecursionCobwebGraph.tsx`, `analysis/recursion`): at 1280 lesson, the "Pajkova mreža: navpično do krivulje, vodoravno do diagonale" caption runs under Odčitki; at 1440 free it crosses the y axis and the "−4" tick. `h13-b4-step4-analysis-recursion-1280.png`, `h13-b4-free-1440/analysis-recursion-*.png`.
- Counting tree (`src/graphs/combinatorics/CountingTreeGraph.tsx`, `combinatorics/counting`): lesson step 4 at 1280, leaf labels under the tree collide into an unreadable smear. `h13-b4-step4-combinatorics-counting-1280.png`.

## Goal and acceptance

1. Logistic, growth, cobweb: a caption that names a drawn line's style (map, diagonal, cobweb, bars, chord, interest curve…) becomes a declared legend entry shown in the Legenda card (replace `legend: never` with entries; follow a converted graph that declares a legend, e.g. `src/graphs/functions/WavesGraph.tsx` `declaration()` legend, and `docs/guides/converting-a-graph.md` legend section). The board caption goes. A caption carrying information no card shows (a rule or a note) stays on the board but must be clear of every card and of the axes at 1440x900 and 1280x720 in lesson and free mode: anchor it in user coordinates inside the followed frame or as `marks.must` (pattern `89e4245ee`, extrema labels measured against `this.boardView.intent().box`).
2. Counting tree: leaf labels never overlap each other at 1280x720 or 1440x900 for the lesson steps; when they cannot fit, thin or drop them by a rule (e.g. show every m-th, or move the list to a row) rather than letting them collide. Keep mathematical meaning.
3. Lesson prose that tells a learner to read a moved caption points to "legenda"/"the legend" (sl and en); grep the lesson files.
4. Keys that become unused: delete from `sl.ts`/`en.ts` (or the fragment) in lockstep after grepping src, tests, e2e, scripts.
5. Tests that asserted the captions now assert the legend entries (never drop an assertion without a replacement). Add one failing-first assertion per graph for the legend entries; quote the observed failure before the change.

## Checks

tsc; `npx eslint` on every changed file; `just unit src/graphs/dynamics src/graphs/recursion src/graphs/combinatorics src/learning/content/declarationContract src/localization` plus the lesson content tests for these graphs; `just unit FirstTask`; golden diff `BEZEG_PARITY_GOLDEN_CHECK=1 just unit src/graphs/base/declare/parityGolden.test.tsx -t <id>` for logistic-map, recursion-growth, recursion-cobweb, counting-tree (report only; expect captions/legend only); `just build`; `just smoke-lesson logistic-map recursion-growth recursion-cobweb counting-tree --port 4391 --workers=1`. Browser: dev server `http://127.0.0.1:4483/bezeg-2.0/` (running; do not start servers): shots with `just shot` at 1440x900 and 1280x720 of the free page and every lesson step of each graph, to `.command-logs/h13-bl-*.png`; open and check each for text under cards, text crossing axes or ticks, and overlapping labels.

## Return

≤300 words, `file:line` per change, check results with log paths, shot verdicts per graph and width. Notes go to `docs/reviews/ux-picks-app-wide/briefs/notes/08-h13-board-legends.md`. At the `HANDOFF` budget signal, write done/next there and return partial. Delete scratch by name.
