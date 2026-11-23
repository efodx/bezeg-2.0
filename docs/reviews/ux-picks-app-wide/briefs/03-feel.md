# Brief: task 03 slice 6, docking feel

Handoff-v13. Role: `bezeg-worker`, Sonnet medium, edits allowed in owned paths. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`; cwd, no `cd`, Write not heredocs, do not commit. Send independent reads in one message. Handoff note: `docs/reviews/ux-picks-app-wide/briefs/notes/03-feel.md`.

## Goal

Task 03 slice 6 ([task](../../../tasks/ux-picks-app-wide/03-layout-and-board-cards.md)); spec section "Room to improve on the prototype" in `docs/specs/ux-picks-app-wide.md` (read that section). The owner said docking "could feel better/smoother". Make dragging and docking the board cards feel better than the prototype: pickup and drop motion, how cards make room, the target preview, snapping near an anchor, drag on touch, and the glide when a card folds or a neighbour resizes. Read `~/.claude/skills/impeccable/SKILL.md` and apply what fits (motion and interaction parts; stay inside the elderflower identity).

## Fixed (do not change)

- Owner's drag rules: pickup moves nothing; only cards a drop would move glide; outside all targets a card floats.
- The layout function and its types (`src/workspace/layout/boardLayout.ts`), the store (`storedLayout.ts`), the declaration contract. You change presentation and motion only. `layoutBoard` already returns final rectangles before paint: every move should be one interruptible glide between two known rectangles (FLIP or transform transitions that retarget from the current visual position when interrupted, never jump).
- Keyboard moves and their announcements keep working; `prefers-reduced-motion` turns glides into instant moves.
- No layout after paint: no card may show an intermediate size (no width/height animation that reflows content mid-glide unless it is a clip/scale that keeps text crisp; explain your choice).

## Known rough spots (prototype and current)

Current: `src/workspace/cards/CardShell.css` transitions `transform/width/height .16s ease`; dragging card has `transition: none`; there is no visible target preview while dragging (only the other cards moving). Prototype (`git show aff6df6c:src/uxPicks/dock/DockCard.tsx`, `BoardDock.tsx`, `dockFlip.ts`): FLIP glides, drop preview; judged "could feel smoother".

## Previews (do not start or stop servers)

- Current work: dev server `http://127.0.0.1:4483/bezeg-2.0/` (HMR picks up your edits). Pilot routes: Taylor `/analysis/taylor`, linear map, De Casteljau (see `docs/reviews/ux-picks-app-wide/smoke/03-presenter.md` for routes and Playwright scripts to reuse).
- Prototype: `http://127.0.0.1:4460/bezeg-2.0/` (branch `ux-picks`), its board cards on the same graphs.
- Clear localStorage `bezeg-2.0:board-layout` at the start and end of each browser run.

## Deliverable

1. The motion changes, in owned paths.
2. A before/after frame sequence: for (a) pick up Odčitki and drop it at the opposite corner, (b) fold a card with a neighbour below, (c) drag across two anchors and release in the free area — capture frames every ~16 ms with Playwright on the prototype, before (current HEAD, capture before you edit) and after. Store contact sheets under `docs/reviews/ux-picks-app-wide/feel/03/` (PNG sheets, not hundreds of files; `just shot --sheet` or a small sheet script) and a short note `docs/reviews/ux-picks-app-wide/feel/03/note.md`: what changed and why, frame evidence that no card shows an intermediate size and that interrupted glides retarget without jumps.
3. Tests where jsdom can show it (e.g. reduced motion → no transition class; a glide interrupted mid-way starts from the current transform).

## Owned paths

`src/workspace/cards/**`, `src/workspace/presenter/**` (not `layoutConstants.ts` values: `maxSpan` is shown to the owner as is), and `docs/reviews/ux-picks-app-wide/feel/03/**`. Not `boardLayout.ts`, `storedLayout.ts`, graph files, `tests/**`.

## Checks

`just unit src/workspace` (foreground, timeout 600000), `npx tsc --noEmit --pretty false`, `npx eslint src/workspace`, `just build`. Delete scratch scripts not referenced by the note.

## Return (≤350 words)

What changed (`file:line`), the frame evidence paths, check results, and what you would try next if the owner wants more.
