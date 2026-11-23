# Brief: task 05 puck components, unwired (slices 2, 3, 4, 5, 7 roles)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium, edits allowed in owned paths. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`; cwd, no `cd`, Write not heredocs, do not commit. Send independent reads in one message. Handoff note: `docs/reviews/ux-picks-app-wide/briefs/notes/05-puck-components.md`.

## Goal

Task 05 ([task](../../../tasks/ux-picks-app-wide/05-pucks.md), read whole; spec `docs/specs/ux-picks-app-wide.md`, search "puck"). Build the range puck, the count puck, the track-jump undo pill and the per-puck help card as React components driven by a declared parameter, with unit tests. **Not wired** into `BoardCards` or the layout (the handler wires the strip after task 04 settles the card layer), and **not subscribing** to the store yet (slice 0 gate): components take `value`, `onWrite(value)` and the declared parameter as props.

## Entry

- Contract: `src/graphs/base/declare/graphDeclaration.ts` (parameter declaration kinds `range`/`count`, help, formatting, locks). Handler-owned; report a needed change with `file:line`.
- How cards read and write today: `src/workspace/cards/SectionBody.tsx` (`read`/`write`), `src/workspace/presenter/cardSpecs.tsx`.
- Behaviour reference only: `git show aff6df6c:src/uxPicks/a1/ParamPucks.tsx` and `.css` (its registry and `set`/`setRaw` paths are not ported).
- Controls catalogue `docs/controls.md` (Slider, CountSetter sections) for keyboard and accessibility conventions; reuse shared helpers from `src/inputs/` where they fit (e.g. value formatting, typed-entry parsing).
- Localization: new strings in a fragment `src/localization/fragments/workspace-pucks.ts` (both languages; register in `fragments/index.ts`); follow AGENTS.md localization rules and `docs/localization.md#choosing-new-terms` for Slovenian terms. The undo pill says "Razveljavi".

## Settled (handler)

1. Range puck: `role="slider"`, accessible name = the declared parameter's name (same text its tools control had), `aria-valuemin/max/now/valuetext`. Pointer drag left/right with finer steps the further the pointer moves vertically away from the puck; the drag ruler stays inside a bounding rect passed as a prop; wheel; Arrow keys (step), PageUp/PageDown (10 steps), Home/End; typed entry on double-click, Enter, or starting to type a digit; out-of-range or unparsable entry refused with a reason shown at the puck and the value unchanged.
2. Count puck: `role="spinbutton"`, − and + buttons, Arrow keys, Home/End, typed entry with the same refusal rule.
3. Constant width: the value box reserves the widest formatted value over the declared range (compute from min/max/step and format), so a sweep never changes the puck width.
4. Track-jump undo: a jump (a click on the track or a typed value more than one step away) shows a "Razveljavi" pill for 4 s; clicking it or pressing Esc restores the previous value via `onWrite`. A component `UndoPill` plus a small pure controller with fake-timer tests.
5. Help: a "?" opens a small help card from the declared help text; tooltips only on hover or keyboard focus, never on touch.
6. A `refusal` prop (domain refusal from the setter) shows its message at the puck.
7. A locked parameter (lesson frame lock) renders disabled with its reason visible.
8. Reduced motion respected; elderflower identity (read `DESIGN.md` colour tokens); compact: a puck is about 120–160 px wide.

## Owned paths

`src/workspace/pucks/**` (new), the new fragment and one line in `fragments/index.ts`. Nothing else (another worker owns `src/workspace/presenter/**`, `DemonstrationWorkspace.*`).

## Checks

Unit tests for every settled rule, each observed failing once. `just unit src/workspace/pucks src/localization` (foreground, timeout 600000), `npx tsc --noEmit --pretty false`, `npx eslint src/workspace/pucks`, `just build`. No servers; do not use ports 4471, 4482, 4483, 4460.

## Return (≤350 words)

Components and their props (`file:line`), tests and observed failures, checks, contract gaps, open questions.
