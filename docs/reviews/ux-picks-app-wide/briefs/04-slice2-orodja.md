# Brief: task 04 slice 2, host API and the Orodja card

Handoff-v13. Role: `bezeg-worker`, Sonnet medium, edits allowed in owned paths. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`; cwd, no `cd`, Write not heredocs, do not commit. Send independent reads in one message; read large files by range. Handoff note: `docs/reviews/ux-picks-app-wide/briefs/notes/04-slice2.md`.

## Goal

Task 04 slices 1, 7 and 8 ([task](../../../tasks/ux-picks-app-wide/04-tools-and-lesson-cards.md)): the tools column is gone; every graph gets an Orodja card in the task 03 card layer. Plan: `docs/reviews/ux-picks-app-wide/04-design.md` sections 1, 2, 5 and 9 (section 9 is the handler's decision and wins). Slice 1 of this task already added `reserve`, `defaultFolded`, `budget`, `expanded` to `layoutBoard`, `headActions` to `CardShell` and live measuring to `useMeasuredCards` (read their tests for usage).

## Settled

1. `DemonstrationWorkspace`'s `boardOverlay` becomes a render prop `boardOverlay(host: WorkspaceCardHost)` as in 04-design section 2; `GraphHost` always passes it (drop the `declared` latch: the stage wrapper is now always present, so the board never changes wrapper after mount). `BoardCards` builds only `tools` (and later `lesson`) when `getDeclaration()` is undefined.
2. The `<aside id="workspace-inspector">`, its toolbar and tabs, and the 310 px grid column are removed; the graph takes the full width. Remove now-dead CSS (`DemonstrationWorkspace.css`, `DemonstrationWorkspaceIdentity.css`), keeping rules that style controls inside the panels (`.inspector-group`, `.inspector-help` and the like: keep those class names in the body markup).
3. New `src/workspace/cards/ToolsBody.tsx`: renders the active panel (`edit`/`display`/`save`) in `<section id="inspector-{tab}" data-testid="inspector-{tab}">` as today. Head actions: Uredi, Prikaz, Shrani icon buttons with `aria-pressed`, `aria-label`, `title`, `aria-controls="inspector-{tab}"`; choosing one unfolds the card. Card title "Orodja" (existing catalog key if there is one, otherwise the `workspace.ts` fragment). The card is a labelled region (`role="region"` or `complementary` with the name the smoke test `demonstrations.smoke.spec.cjs:57` expects: "Demonstration tools" in English / its Slovenian twin; check the catalog).
4. Declared sections whose controls live in Orodja render as `ToolSection`s (fold, "?" help) inside the Orodja body; `section:` cards only for sections the declaration places on the board. Check `graphDeclaration.ts` for a field that says where a section lives; if none, report it and keep today's behaviour (all declared sections stay `section:` cards) — do not change the contract.
5. Tools card spec: id `tools`, anchor `tr`, order 1, priority 4. Budget per 04-design section 9 item 3 (`open` 2 at board width ≥ 1200 else 1; order lesson, readouts, tools; tools first for an undeclared graph). Legend and `section:` cards `defaultFolded`.
6. Undeclared graph: Orodja is its only card, starts open, holds its present panels unchanged (readout and legend inside `display` as now). Its view logic is untouched.
7. Presentation: the header toggle (DemonstrationWorkspace l.229 region) folds/unfolds Orodja instead of hiding the aside; in Presentation pass `toolsFolded` to `BoardCards` as a non-persisted override (not written to `storedLayout`). Its `aria-controls` points to the card.
8. Playback slot: keep `data-playback-slot` and its narrow/short behaviour; on desktop `PlaybackButtons` stay in the Orodja panels.
9. Keep `GuidedLesson` where it is for now (slice 3 moves it); just make sure removing the inspector column does not break the lesson column CSS (`GuidedLessonLayout.css` overrides that reference `.workspace-inspector`: neutralise them minimally and list them for slice 3).
10. Uredi (editing) mode keeps working: it is the `edit` panel; the default tab stays `edit`.

## Owned paths

`src/graphs/base/DemonstrationWorkspace.tsx`, `DemonstrationWorkspace.css`, `DemonstrationWorkspaceIdentity.css`, `src/graphs/base/GraphHost.tsx`, `src/workspace/presenter/**`, new `src/workspace/cards/ToolsBody.tsx` (+ css/test), `src/localization/fragments/workspace.ts` (new keys, both languages), minimal neutralising edits in `src/learning/runtime/GuidedLessonLayout.css`. Unit tests that assert the removed column (list in 04-design section 6) may be updated **only** where the assertion moves to the card one-for-one (same intent); list each. Not `tests/**` (handler), not `src/workspace/layout/**` or `CardShell*` (report a needed change), not `src/workspace/pucks/**`, not graph files.

## Checks

Tests observed failing once for: undeclared graph renders an open Orodja card with its panels; declared graph has Orodja + Odčitki; head icons switch panels and unfold; Presentation toggle folds without writing storage; no `#workspace-inspector` aside remains; budget gives 2 open at ≥ 1200 px, 1 below. Then `just unit src/workspace src/graphs/base src/learning/runtime` (foreground, timeout 600000), `npx tsc --noEmit --pretty false`, eslint on changed files, `just build`. Report which other unit suites fail because of the column removal (run `just unit src/graphs` and list failing files only; do not fix all-graph suites).

## Return (≤350 words)

Files with `file:line` for the render prop, ToolsBody, removed CSS blocks; tests and observed failures; failing suites list; contract gap on section placement; anything left for slice 3.
