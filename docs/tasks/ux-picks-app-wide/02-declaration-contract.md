# 02 Declaration contract and conversion tooling

Source: [board workspace spec](../../specs/ux-picks-app-wide.md) requirements A1, A8 and "Converting all graphs"; [ADR 0065](../../adr/0065-graphs-declare-presenters-render.md).

## Goal

The final shape of what a graph and a lesson frame declare, with the tests and scripts that make converting a graph mechanical and machine-checked. Reference: `src/uxPicks/declare/graphUx.ts`, `night/GUIDE.md`, and the contract gaps in `docs/reviews/ux-picks/trial-report.md` and the state note ("Contract gaps reported by converters").

## Slices

1. **Contract types** (handler-owned design): parameters with key, kind (`range`, `count`, `choice`, `toggle`), range, step, format, label, help, and placement (board or Orodja); formula with label; readout groups, rows (`valueTex`, legend link), notes; legend entries bound to drawn objects, including the kinds the prototype lacked (`ring`, `cross`); section cards; actions (a button the graph offers, such as "Pokaži oceno napake" or "Naslednji korak"); view marks; status lines. A lesson frame declares the controls and actions its text asks the learner to use (spec A9), next to its opened cards and highlighted rows. Per-graph id unions so `FrameUx` references are type checked. Located with the graph base code, independent of React and JSXGraph.
2. **Shared gaps closed once:** every shared range or count input takes a declared parameter; one shared lesson step builder carries frame declarations for all lesson files (the prototype copied ten lines per file); frames can highlight notes.
3. **Contract test:** for every declaring graph and each of its lesson frames, run the scene's actions synchronously, evaluate the declaration, and fail on unknown ids, a highlighted row or opened card absent in that scene's state, more than three highlighted rows, a legend entry whose object is not drawn, a used control that does not exist or is locked in that frame, or text not from the catalog. Whether a frame's text asks for a control cannot be machine-checked (nothing is inferred from prose): the conversion guide makes it a converter's step per frame, and the inventory script lists frames whose text contains a control's label as candidates. Taylor step 1, part 3 of 5 ("Pokaži oceno napake") is the worked example.
4. **Parity test helper:** declared readout values equal the present panel's values over sampled states. Used while the present panel exists; removed in task 10.
5. **Inventory script:** per graph, its controls and ranges, readout rows and catalog keys, legend entries, board captions, lesson file, frames naming values, and blocker class. Output is the work list for task 08 and names the sixth pilot (a legacy `step()` lesson).
6. **Per-graph check recipe:** contract test, parity test and browser probe for one graph, with a short summary a worker can paste.
7. **Conversion guide** in the repository, replacing `night/GUIDE.md`, including the highlight rules, the catalog rule, and the placement rule for controls with worked examples from the pilots: which choices and toggles go on the board, which controls stay in Orodja, and why.
8. **Pilots declared:** the six pilot graphs declare themselves and pass the recipe. Nothing renders the declarations yet.

## Acceptance

- The six pilots pass the per-graph recipe; the contract test fails on a seeded wrong id, a hidden highlighted row and an undrawn legend entry (observed failures recorded).
- Converting a plain pilot touches the graph file and its lesson file only.
- `npx tsc --noEmit --pretty false` and the production build pass; `sl.ts` and `en.ts` are in lockstep.

## Open

Catalog ownership during the batch: workers may not edit the shared catalogs in parallel lanes. Decide here whether needed keys are added by the handler per merge or the catalogs are split per family.
