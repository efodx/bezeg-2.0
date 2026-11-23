# Brief: task 03 card fixes after the presenter (round 1)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium, edits allowed in owned paths. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`; cwd, no `cd`, Write not heredocs, do not commit. Send independent reads in one message. Handoff note: `docs/reviews/ux-picks-app-wide/briefs/notes/03-card-fixes.md`.

Context: commit `e082af01` mounted declared cards over the board (`src/workspace/presenter/BoardCards.tsx`, `src/workspace/cards/*`). Its inspector panels are hidden on the pilots (`data-declared-panel`).

## Items

A. **Live values.** The hidden panels announced value changes through `src/graphs/base/controls/LiveReadout.tsx` (`SettledReadout`, 500 ms settle, polite). Card rows announce nothing now. Give the Odčitki card the same behaviour: settled, polite announcements of the rows the old panel announced, one live region per card (not per cell), and none from the hidden measure layer (it is `aria-hidden`/inert; make sure no live region exists in it). Reuse `SettledReadout`; do not fork it. Test: a parameter write produces one settled announcement with the new value; the measure layer contains no `aria-live`.
B. Items from the smoke report `docs/reviews/ux-picks-app-wide/smoke/03-presenter.md` that the handler lists in the dispatch.

## Owned paths

`src/workspace/**` and its tests. Not graph files, `boardLayout.ts`, `graphDeclaration.ts`, `tests/**`, all-graph suites. Report a needed change elsewhere with `file:line`.

## Checks

Observe each new assertion fail once. `just unit src/workspace` (foreground, timeout 600000), `npx tsc --noEmit --pretty false`, lint on changed files, `just build`. No servers; do not use ports 4482, 4483, 4471.

## Return (≤300 words)

Per item: what changed (`file:line`), test, observed failure; check results; anything left.
