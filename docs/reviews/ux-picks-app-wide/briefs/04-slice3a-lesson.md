# Brief: task 04 slice 3a, the lesson side of the lesson card

Handoff-v13. Role: `bezeg-worker`, Sonnet medium, edits allowed in owned paths. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`; cwd, no `cd`, Write not heredocs, do not commit. Send independent reads in one message; read large files by range. Handoff note: `docs/reviews/ux-picks-app-wide/briefs/notes/04-slice3a.md`.

## Goal

Task 04 slices 2 and 3 ([task](../../../tasks/ux-picks-app-wide/04-tools-and-lesson-cards.md)); plan `docs/reviews/ux-picks-app-wide/04-design.md` sections 2 ("Lesson card without remount"), 4 (frame plumbing) and 9. This slice prepares everything **except** placing the lesson in `BoardCards` (slice 3b, after another worker finishes in `src/workspace/presenter/BoardCards.tsx`).

## Items

1. **Portal mount:** `DemonstrationWorkspace` renders `GuidedLesson` through `createPortal` into a persistent element (`useState(() => document.createElement('div'))`), exposed on the `WorkspaceCardHost` (`src/workspace/presenter/cardHost.ts`) as `lesson: {slot: HTMLElement | null, active, mode}`. Until slice 3b appends the slot into the card, the workspace appends it where the lesson renders today, so the app behaves as now. Test: moving the slot element to another parent does not remount `GuidedLesson` (a mount counter or a state value survives).
2. **Frame plumbing:** `GuidedLesson` gets `registerFrameDeclaration?: (d: FrameDeclaration | undefined) => void`, called from an effect on the frame id and cleared on unmount (pattern of `registerGraphActions`). `DemonstrationWorkspace` keeps it in state and exposes `frame` on `WorkspaceCardHost`. Test: walking two frames reports each frame's declaration; unmount reports `undefined`.
3. **Reading frames do not lock controls** (slice 3): remove the content-mode `inert` / `aria-disabled` / `data-lesson-locked` locks on the graph and tools (04-design §1 lists the lines); "Povrni" appears when the graph differs from the frame (find how restore works today in `GuidedLesson`; keep its logic, only the visibility rule changes: shown whenever the graph state differs from the frame's prepared state, hidden otherwise; one rule on every screen size). Test both.
4. **Lesson chrome for a card:** `GuidedLesson` gets a `presentation: 'card'` mode (or prop) in which its own drag, dock and hide controls are not rendered (the card shell moves and folds it) and its root has no fixed position; overlay `explore` maps to an `onRequestFold(true)` callback instead of hiding itself. Keep today's behaviour when the prop is absent. The Povrni row is always reserved (empty when hidden) so its appearance never changes the height (04-design §9 item 1).
5. **CSS:** neutralise the `GuidedLessonLayout.css` rules that reference `.workspace-inspector` (about l.28, 69, 128) and `GuidedLesson.css:24` `grid-area: inspector` for the card mode; leave the docked-column layout working when the prop is absent.

## Owned paths

`src/learning/runtime/GuidedLesson.tsx`, `GuidedLesson*.css`, `GuidedLessonLayout.css`, their tests, `src/graphs/base/DemonstrationWorkspace.tsx`, `src/workspace/presenter/cardHost.ts` (type additions only), new `src/workspace/cards/LessonCardBody.tsx` if you want a body component that appends the slot (not mounted yet). Not `BoardCards.tsx`, `cardSpecs.tsx`, `useMeasuredCards.ts`, `src/workspace/layout/**`, `DemonstrationWorkspace.css` (another worker), not lesson content files, not `tests/**`.

## Checks

Tests per item observed failing once. `just unit src/learning src/graphs/base` (foreground, timeout 600000), `npx tsc --noEmit --pretty false` (ignore errors only in files another worker owns; name them), eslint on changed files, `just build`. No servers.

## Return (≤300 words)

Per item: change (`file:line`), test, observed failure; checks; anything slice 3b needs (the host fields and how to append the slot).
