# Brief: the task 03 card presenter (wire the cards on the declared pilots)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium, edits allowed in the owned paths. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`; keep it as cwd, no `cd`, create files with Write (no heredocs). Do not commit; the handler commits. Send independent reads and searches in one message. Handoff note if you run out of budget: `docs/reviews/ux-picks-app-wide/briefs/notes/03-presenter.md`.

## Goal

Task 03 ([task file](../../../tasks/ux-picks-app-wide/03-layout-and-board-cards.md), slices 2 to 4 wired): on a graph whose `getDeclaration()` returns a declaration (the eight pilots), Odčitki, Legenda and the declaration's section cards render as cards over the board, placed by `layoutBoard`, measured by `useMeasuredCards`, framed by `CardShell`, with placements and folds kept in `storedLayout`. Their old readout and legend panels are no longer rendered on those graphs. An undeclared graph renders exactly as today.

## Entry files (all exist; read their exports first)

- Design, handler-owned, do not change types or rules: `docs/reviews/ux-picks-app-wide/03-layout-design.md`; `src/workspace/layout/boardLayout.ts` (`layoutBoard`, `dropTarget`, `applyDrop`).
- `src/workspace/layout/useMeasuredCards.ts`, `storedLayout.ts`; `src/workspace/cards/CardShell.tsx`, `ReadoutsBody.tsx`, `LegendBody.tsx`, `SectionBody.tsx`, `cards.css`, `CardShell.css`.
- Contract: `src/graphs/base/declare/graphDeclaration.ts` (handler-owned; report a needed change with `file:line`). `BaseGraph.tsx:256-275` (`declaration()`, `getDeclaration()`, `drawnObject`), `performAction`, `graph.parameters` (arbiter keys; writes go through the arbiter with the learner source as the declaration tests do).
- Host: `src/graphs/base/GraphHost.tsx` (creates the graph, mounts the board into `container`, renders `DemonstrationWorkspace` with `getWorkspacePanels()`); `src/graphs/base/DemonstrationWorkspace.tsx`; live state via `useSyncExternalStore(graph.store.subscribe, () => graph.store.getVersion())` as `GraphHost.tsx:24` does.
- Behaviour reference only (not visuals): `git show aff6df6c:src/uxPicks/dock/DockCard.tsx`, `git show aff6df6c:src/uxPicks/dock/BoardDock.tsx`, `git show aff6df6c:src/uxPicks/declare/ReadoutCard.tsx`.

## Settled (handler)

1. New presenter under `src/workspace/presenter/` (e.g. `BoardCards.tsx`), mounted by `GraphHost` only when `graph.getDeclaration()` is defined. Pass the graph reference down; do not add a registry or a global.
2. The card layer is an absolutely positioned sibling over the board container, inside a shared relatively positioned wrapper, never inside `board.containerObj`: figure export (`FigureCapture.ts:248`, captures `containerObj`) must not see cards. The layer itself has `pointer-events: none`; only cards take pointer events, so board drags and clicks outside a card reach JSXGraph.
3. The declaration is re-read on every store version (it is a pure function of state). Card ids: `readouts`, `legend`, `section:<id>`. Default anchors: readouts `tr` order 0, legend `br` order 0, sections `tl` in declaration order unless the section declares otherwise. Priorities: legend 1, sections 2, readouts 3. Legenda with a single shown entry is not rendered (`isLegendHidden`).
4. Measure then lay out before paint: measure each card's natural size in the hidden layer, call `layoutBoard`, and when a card's assigned width differs from its natural width, measure its height again at that width once, all before the cards are first shown (`useLayoutEffect`). Fill `min`, `foldedHeight` and `rowBreaks` from the measured DOM (row elements). Remeasure on a content key: language, the declaration's group/row/section ids, highlight set and fold state; not on every value change. Value cells use tabular figures and a reserved width so a slider sweep does not change a card's width.
5. Board size from a `ResizeObserver` on the wrapper. Constants: `maxSpan = 1600`, `columnMaxFraction = 0.32`, `gap = 8`, exported from one place (the feel slice tunes them).
6. Rect changes move as one CSS transform/size transition (about 160 ms, disabled under `prefers-reduced-motion`); the feel slice will refine motion, keep it simple.
7. Drag: during a drag call `layoutBoard({...input, stored: applyDrop(stored, id, dropTarget(...)), frozenFolds: current folds})` for the preview; commit on drop to `storedLayout` (`setPlacement`), fold via `setFold`, reset via `resetCard`; save with `saveBoardLayout`. Owner's drag rules (task 03 slice 2): pickup moves nothing; only cards a drop would move glide; outside all targets a card floats.
8. Section cards: `SectionBody` with `read`/`write` through the graph's parameters and `perform` through `performAction`. Lesson frame highlights (`FrameDeclaration`) pass to `ReadoutsBody.highlight` when a lesson frame is active, if a frame is reachable from the host without new plumbing; otherwise leave a `TODO(task 07)` and report it.
9. Hide the old panels on declared graphs at the smallest point: find where the readout and legend JSX is put into `getWorkspacePanels()`/`DemonstrationWorkspace` and skip them when a declaration exists. Do not remove the inspector or its tabs (task 04). Name the file and line in your report.
10. Fullscreen/presentation mode (`SiteContext.fullScreen`) keeps the cards.

## Owned paths

`src/workspace/presenter/**` (new), `src/workspace/cards/**` and `src/workspace/layout/useMeasuredCards.ts` (small fixes only; report them), `src/graphs/base/GraphHost.tsx`, the panel-hiding change in `BaseGraph.tsx` or `DemonstrationWorkspace.tsx` (minimal), and their tests. Do not edit `boardLayout.ts`, `graphDeclaration.ts`, graph files, lesson files, all-graph suites (`PresetRoundTrip.contract`, `graphTeardownContract`, `controlsSignature`, `GraphTransientState`), or `tests/**`. Localization: reuse the existing `workspace.ts`/`workspace-shell.ts` fragments; a new key goes into those fragments in both languages.

## Checks (observe each new assertion fail once, then restore)

- `src/workspace/presenter/*.test.tsx` with the real Taylor graph harness (see `src/graphs/functions/TaylorGraph.declaration.test.tsx`): the presenter renders Odčitki with the same values the declaration gives; a parameter write updates the shown value; folding and a keyboard move persist through `storedLayout` and survive a remount; a corrupted stored record falls back to defaults; an undeclared graph renders no card layer.
- A test that the card layer is not inside the board container element.
- `just unit src/workspace`, `just unit src/graphs/base`, `just unit src/graphs/functions` (foreground, timeout 600000); `npx tsc --noEmit --pretty false`; `npm run lint` (or the lint recipe); `just build`.
- Unit tests only; do not start servers and do not use ports 4482, 4483 or 4471 (the handler runs the browser checks).

## Return (≤400 words)

Files touched with `file:line` for the host mount and the panel hiding; how measurement ordering works (one paragraph); check results; deviations from "Settled" with reasons; open questions. Bulky output to `docs/reviews/ux-picks-app-wide/03-presenter-report.md`.
