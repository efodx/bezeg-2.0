# 08 Convert all graphs

Source: [board workspace spec](../../specs/ux-picks-app-wide.md) "Converting all graphs"; [ADR 0065](../../adr/0065-graphs-declare-presenters-render.md). This is an [item batch](../feature-streams/README.md#item-batches): triage first.

## Goal

All 116 graph classes declare themselves and render only through the presenters. 28 have a prototype declaration to port (`workspaceUx` at the frozen commit; conversion notes in `night/conv/<id>/NOTES.md`); 88 are new. Six are done as pilots in task 02.

## Gate

Tasks 02 to 07 are accepted on the pilots. From here a contract change is reported to the handler and stops the affected lane; converters do not work around it.

## Steps

1. **Triage** (one worker): run the inventory script; class each graph as plain, several modes, expensive redraw, board-drawn legend, sentence catalog keys, or needs a contract change. Resolve shared blockers centrally. Graphs needing a contract change go to the handler before any lane starts.
2. **Partition:** group graphs by lesson content file so no two lanes share a graph, lesson or shared component file. Write the lane table below. Order lanes so each round can be published by itself.
3. **Lanes:** three at a time, each a `bezeg-worker` (Sonnet `medium`) in its own worktree and branch with its own dev server port, four graphs per session. Brief: the repository's conversion guide, the lane's inventory rows, the per-graph check recipe, owned paths, a 300-word report with the recipe's summary per graph and a notes file. Workers do not edit the catalogs or shared inputs. Two judgements are the converter's, by the guide's examples, each with one line of reasoning in the notes: where each non-slider control goes (board or Orodja), and Legenda's default place when bottom right covers the graph's data.
4. **Accept per lane:** recipe green for each graph; the handler looks at one graph in four in the browser (free play with interruption, lesson walk); a `bezeg-reviewer` reads one in four for mathematics and highlight rules; then merge, run the full contract test and the fuzzer at 5 seeds per merged route, publish.
5. **After round one:** compare worker time, repairs and context per graph with the estimate (about 5 minutes and 50k per graph) and adjust the brief, session size or lane count before round two. Record the numbers here.

## Acceptance

- The contract test passes for every graph and lesson frame; the parity test passed for each graph at conversion time.
- No graph renders its own readout, legend or range/count control.
- Fuzzer: 5 seeds per route across all converted routes; no page errors on a sweep of every route, free and lesson, at 1440×900.
- Each graph's declared values match what it showed before (parity), and its mathematics is untouched (no geometry edits in the diff, checked by search per lane).

## Lane table

To be written by the triage step.

| Round | Lane | Graphs | Lesson files | Status |
| --- | --- | --- | --- | --- |
