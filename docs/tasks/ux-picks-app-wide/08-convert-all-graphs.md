# 08 Convert all demonstrations

Source: [board workspace spec](../../specs/ux-picks-app-wide.md) "Converting all graphs"; [ADR 0065](../../adr/0065-graphs-declare-presenters-render.md). This is an [item batch](../feature-streams/README.md#item-batches): triage first.

## Goal

Every registered demonstration declares itself and renders only through the presenters. The unit is the demonstration as registered in `src/graphs/**/runtime.ts`: 138 by the independent review's count, with the inventory script of task 02 as the authority. 29 graph files carry a prototype declaration to port (`workspaceUx` at the frozen commit; conversion notes copied from `night/conv/<id>/NOTES.md`). Eight are done as pilots.

## Gate

Tasks 02 to 07 are accepted on the pilots and released to `master`; the contract is frozen. From here a contract change is reported to the handler and stops the affected lane; converters do not work around it.

## What the review found about sharing (verified counts on `master`)

- Lesson files do not partition the demonstrations: one covers 16, fifteen cover three or more, and 11 demonstrations span several lesson files.
- 18 shared panel files hold sliders (for example `src/graphs/base/controls/BezierCurveControls.tsx`), and `BaseFunctionGraph` has 35 subclasses.
- Catalog keys are type checked (`src/localization/sl.ts`, 6,070 lines): a lane cannot pass `tsc` with a new string whose key does not exist.
- All-graph suites (`PresetRoundTrip.contract`, `graphTeardownContract`, `controlsSignature`, `GraphTransientState*`) iterate every demonstration.

## Steps

1. **Triage** (one worker): run the inventory; class each demonstration as plain, several modes, expensive redraw, playback, board-drawn legend, point-set, surface, controls outside `BaseGraph` (Playground), or needs a contract change. Demonstrations needing a contract change go to the handler before any lane starts.
2. **Shared code first** (handler's workers, sequential): convert the shared panels and base classes, so their subclasses inherit bound parameters and declared controls. Rerun the inventory; many "plain" function graphs should now need only readouts, legend and frames.
3. **Golden values:** record every remaining demonstration's present panel values with the parity tool, in one run, before any lane removes a panel.
4. **Partition:** connected components over shared files (graph file, lesson files, remaining shared panels, own tests). A component is never split across lanes. A component too large for one session (the 16-demonstration lesson file) is one lane's work for several consecutive sessions. Write the lane table below; order rounds so each can be published by itself.
5. **Catalog keys per round:** the handler adds the round's keys (listed by the inventory) to `sl.ts` and `en.ts` and commits before dispatch, or uses the per-family fragments if task 02 chose them.
6. **Lanes:** three at a time, each a `bezeg-worker` (Sonnet `medium`) in its own worktree and branch with its own dev server port, two or three demonstrations per session. One shared brief file serves every lane (the repository's conversion guide with its worked example, the checklist, the per-demonstration check recipe, the owned-path rule, a 300-word report with the recipe's summary per demonstration and a notes file); a dispatch adds only the lane's inventory rows. Workers edit their component's files and their demonstrations' own tests; they do not edit the catalogs, shared inputs, shared panels or all-graph suites, and report a missing key or a failing all-graph case to the handler. Two judgements are the converter's, by the guide's examples, each with one line of reasoning in the notes: where each non-slider control goes (board or Orodja), and Legenda's default place when bottom right covers the data.
7. **Accept per lane:** recipe green for each demonstration. A `bezeg-visual` agent captures one contact sheet per lane with `just shot --sheet --selector <board>` and judges it against the guide's checklist, returning pass or fail per demonstration as text. The handler plays one in four in the browser (free play with interruption, lesson walk); a `bezeg-reviewer` reads one in four for mathematics and highlight rules. Then merge the round's lanes, run `just check` (the all-graph suites), the full contract test and the fuzzer at 5 seeds per merged route, and publish once per round in the background ([running the work economically](README.md#running-the-work-economically)).
8. **After round one:** record worker time, context, repairs and files touched per demonstration here, and replace the estimate before round two.

## Estimate

Not known yet. The trial's figure (about 50k context and 5 minutes per graph in a long session) came from conversions that kept the old UI behind a flag, edited no tests and wrote no catalog keys, and all twelve were "accept with fixes". Planning figure: two or three demonstrations per session, so roughly 45 to 65 sessions after the pilots and the shared-code step. Round one decides.

## Acceptance

- The contract test passes for every demonstration and lesson frame; each declaration reproduces its golden values.
- No demonstration renders its own readout, legend, or range, count, choice or toggle control; controls left in Orodja by decision are listed by the inventory.
- `just check` passes after every round; the fuzzer passes 5 seeds per route; a `just shot` sweep of every route, free and lesson, at 1440×900 shows no page error.
- Mathematics untouched: no geometry edit in a lane's diff (checked by search per lane; the reviewer's sample confirms).

## Lane table

To be written by step 4.

| Round | Lane | Demonstrations | Files owned | Status |
| --- | --- | --- | --- | --- |
