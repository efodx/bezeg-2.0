# Brief: task 04 slice 1, layout API for the Orodja and lesson cards

Handoff-v13. Role: `bezeg-worker`, Sonnet medium, edits allowed in owned paths. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`; cwd, no `cd`, Write not heredocs, do not commit. Send independent reads in one message. Handoff note: `docs/reviews/ux-picks-app-wide/briefs/notes/04-slice1.md`.

## Goal

Implement the handler's layout additions for task 04 and the two shell/measure hooks the next slices need. Source: `docs/reviews/ux-picks-app-wide/04-design.md` sections 3 and 9 (section 9 is the decision; it wins where section 3 differs), `03-layout-design.md` (rules, tests).

## Items

1. `src/workspace/layout/boardLayout.ts`: `CardInput.reserve?`, `CardInput.defaultFolded?`, `LayoutInput.budget?`, `LayoutInput.expanded?` exactly as section 9 defines them; rule 4 order frozen → frame → stored fold → budget → `defaultFolded` → open; cut height = largest rowBreak ≤ available − reserve, plus reserve, never below `min.h`; `expanded` removes that card's cut and folds lower-priority open cards of its column (never frame-opened or lesson). `dropTarget`/`applyDrop` unchanged. Determinism and the property test (no docked overlap, inside board) must hold with the new inputs (extend the property generator).
2. `src/workspace/cards/CardShell.tsx`: a `headActions?: ReactNode` slot in the head, between title and fold/reset; keyboard order title → actions → fold → reset; pointer-down on a head action does not start a drag (same rule as fold/reset).
3. `src/workspace/layout/useMeasuredCards.ts`: a `MeasureItem.live?: true` item is not rendered in the hidden layer; instead the hook exposes `measureLive(id, element)` (or an equivalent the presenter calls from a layout effect on the shown card's body) that reads its natural height at the assigned width, `rowBreaks` from its line boxes/rows, `min`, `foldedHeight`, and feeds them into `measured` the same way as hidden items, before paint. Keep the hidden-layer path unchanged for other cards.

## Owned paths

`src/workspace/layout/**`, `src/workspace/cards/CardShell.tsx`, `CardShell.css`, their tests, and `docs/reviews/ux-picks-app-wide/03-layout-design.md` only if a rule needs a clarifying line (report it). Not `src/workspace/presenter/**` (presenter wiring is slice 2/4), not `src/workspace/pucks/**` (another worker), no graph or lesson files.

## Checks

Unit tests per item and per rule clause, each observed failing once (break the rule, see it fail, restore). `just unit src/workspace` (foreground, timeout 600000), `npx tsc --noEmit --pretty false`, `npx eslint src/workspace/layout src/workspace/cards`, `just build`. No servers.

## Return (≤300 words)

Types added (`file:line`), tests and observed failures, checks, any rule you found ambiguous and how you resolved it.
