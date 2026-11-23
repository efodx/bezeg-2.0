# Handoff: task 04 slice 2 (partial, budget signal at 135k)

## Done (tsc --noEmit clean; no unit test, eslint or build run yet)
- `src/workspace/presenter/cardHost.ts` (new): `WorkspaceCardHost` {tools{panels,section,setSection,locked}, fullScreen, toolsFolded, setToolsFolded}.
- `src/workspace/cards/ToolsBody.tsx` (new) + `tools.css` (new): `ToolsBody` (root `#inspector-content.workspace-inspector.tools-body`, role complementary, label `demonstration_tools`; three `<section id="inspector-{tab}" data-testid>` all mounted; `inert`/aria-disabled when locked; `data-declared` hides `[data-declared-panel]`), `ToolsHeadActions` (Uredi/Prikaz/Shrani icon buttons, aria-pressed/label/title=hint/aria-controls). In the measure pass the body is a 310x420 proxy (no second copy of the graph's controls).
- `cardSpecs.tsx`: `TOOLS_ID`, `toolsCardSpec(declared)` (priority 4, anchor tr, order 1), `defaultFolded` on legend and `section:` cards.
- `BoardCards.tsx`: new required `host` prop; tools spec added for every graph; fresh ToolsBody/headActions per render (not memoised); budget `{open: board.w>=1200?2:1, order: declared ? [lesson, readouts, tools] : [tools]}`; Presentation fold override merged into `storedFolds`, never saved; head icon choose = setSection + unfold.
- `StaticToolsCard.tsx` (new): fallback when `boardOverlay` is absent (bare workspace in tests).
- `DemonstrationWorkspace.tsx`: `boardOverlay(host)` render prop; stage wrapper always; aside, tabs, `expanded`, inspector refs and `data-board-cards` removed; Presentation toggle drives `toolsFolded`; `aria-controls="board-card-tools"`.
- `GraphHost.tsx`: `declared` latch removed; always passes `host => <BoardCards graph host/>`.
- CSS: removed the 310 px columns and aside/toolbar/tabs/scrollbar/phone-inspector rules from `DemonstrationWorkspace.css` and `...Identity.css`; kept `.inspector-group`, `.inspector-help` etc. `GuidedLessonLayout.css:21` selector no longer needs `.workspace-inspector[hidden]`.

## Not done
- Unit tests not run or migrated. Known to need one-for-one moves: `BoardCards.test.tsx:82-92, 212-222, 228-234` (`#workspace-inspector`, `data-board-cards` on main; now `[data-declared]` on `.tools-body`, undeclared graph now HAS a layer with only Orodja), `DemonstrationWorkspace.test.tsx:83` (`#inspector-content` scroll and Strni/Odpri button gone), PlaybackCompanion/Routes/Slot tests. New tests listed in the brief (undeclared open Orodja, declared Orodja+Odčitki, head icons, Presentation fold not stored, no aside, budget 2/1 at 1200) are not written.
- eslint, `just build`, `just unit src/graphs` not run. Expect many graph suites to fail: the card appears only after the async measure, and a declared graph at board < 1200 starts Orodja folded (panels unmounted).
- No screenshot of the card at 310 px.

## Gaps to report
- Section placement: `SectionCard` has no placement field (only parameters/actions have `placement`/`section`); the contract cannot say a section lives in Orodja. Today's behaviour kept: all declared sections stay `section:` cards. No `ToolSection` component exists; none added.
- `CardShell` has no DOM `id`, so `aria-controls="board-card-tools"` dangles; it also cannot carry `role`/label, so the "Demonstration tools" complementary is the body (absent while folded) and does not contain the head icons. Needs `CardShell` change (handler).
- "Tools first when the declaration names its main action in Orodja": no declaration field found; not implemented.
- Slice 3: `GuidedLessonLayout.css` still has `.lesson-content ... .workspace-inspector` (visibility hidden when docked, pointer-events/opacity, l.28, l.69, l.128); they now hide the Orodja body, leaving its head. `.guided-lesson` still uses `grid-area: inspector` (`GuidedLesson.css:24`), kept alive by the lesson-open grid templates.
- `realGraphScenes.ts:212` and `realGraphTestHarness.tsx:177` query `#inspector-content` (kept on the body root).
- Presentation: body keeps the navy `.is-presenting .workspace-inspector` rules inside a light card; taste check needed.
