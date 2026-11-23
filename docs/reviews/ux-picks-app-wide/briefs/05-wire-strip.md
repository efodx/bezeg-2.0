# Brief: task 05, wire the puck strip (slices 1, 8, 9 and the store subscription)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium, edits allowed in owned paths. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`; cwd, no `cd`, Write not heredocs, do not commit. Send independent reads in one message. ESLint must report no errors on every file you change. Handoff note: `docs/reviews/ux-picks-app-wide/briefs/notes/05-wire.md`.

## Goal

Task 05 ([task](../../../tasks/ux-picks-app-wide/05-pucks.md)): every declared `range` and `count` parameter of a declared graph is a puck in the board's bottom-left strip, writing to the store as `learner`. Components exist, unwired (`src/workspace/pucks/**`, commit `77f35732`; read its message and the components' props). Layout: `layoutBoard`'s `pucks` input (strip rectangle, rule 2 in `03-layout-design.md`).

## Settled

1. `BoardCards` builds the pucks from the declaration's parameters of kind range/count that are placed on the board (task 02 placement: check `graphDeclaration.ts` for the placement field; a parameter placed in Orodja gets no puck), in declared order. The strip is measured (constant puck widths make this stable) and passed as `pucks: Size`; the strip renders at the returned `pucks` rect, inside the card layer, pointer events on.
2. Values: each puck subscribes to its own key only (a selector read through the parameter's binding reader, as task 01 slice 6 requires: a write to one key re-renders only that key's puck). Writes go through the arbiter with source `learner` (see how `SectionBody`/`cardSpecs` write today). A domain refusal from the setter shows at the puck (`refusal` prop).
3. A parameter with a puck is not shown as a slider/count in Orodja any more (slice 9). Find how Orodja's panels render declared parameters; if the panels are the graph's own JSX (not declaration-driven), hide the matching control by a marker the graph's control already has (e.g. its accessible name or a `data-parameter` attribute) under the declared-graph attribute, like `data-declared-panel` did, and list each pilot whose control could not be matched. Do not edit graph files beyond adding such an attribute, one line per control, and list them.
4. Playback (slice 8): a parameter with existing playback (De Casteljau's `t`) shows its Play control with its puck (reuse the existing playback buttons component); a learner write stops playback (task 01 arbiter, already in place).
5. Lesson locks: if the active frame declares a parameter locked, its puck renders locked with the reason (`lockReason` prop; the contract has only a boolean: use the frame's text or a generic catalog string, and log the gap).
6. Role/name: the puck keeps the accessible name the tools control had, so role-based tests still find one control of that name (not two: the Orodja control is hidden per item 3).

## Owned paths

`src/workspace/presenter/**`, `src/workspace/cards/**`, `src/workspace/pucks/**`, `src/localization/fragments/workspace-pucks.ts`, one-attribute edits in pilot graph files if item 3 needs them. Not `DemonstrationWorkspace.*` (another worker), `boardLayout.ts` (report a needed rule change), `tests/**`, all-graph suites.

## Checks

Unit tests (observed failing once): a declared pilot shows one puck per board range/count parameter in order; a puck write lands in the store in the same tick with source `learner`; a refused typed value leaves the store unchanged; a write to one key does not re-render another key's puck (render counter); Orodja has no duplicate control for a puck's parameter. `just unit src/workspace src/graphs src/learning` (foreground, timeout 600000), `npx tsc --noEmit --pretty false`, eslint on changed files, `just build`. Browser on the dev server `http://127.0.0.1:4483/bezeg-2.0/` (running; do not start/stop; clear localStorage `bezeg-2.0:board-layout`): Taylor, linear map, De Casteljau (play, then drag t: playback stops), phase portrait at 1440x900: strip visible bottom left, no overlap with cards, no page errors. Report numbers.

## Return (≤300 words)

Changes (`file:line`), tests and observed failures, checks, browser results, pilots whose Orodja control could not be matched, contract gaps.
