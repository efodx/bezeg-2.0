# Task 04: Orodja and lesson cards (implementation plan)

Worker note for the handler ([task](../../tasks/ux-picks-app-wide/04-tools-and-lesson-cards.md), [layout design](03-layout-design.md)). Read-only research; no source edited. Line numbers are in the present tree. Test lines marked "not read" are inferred from selectors.

## 1. Today's structure

`src/graphs/base/DemonstrationWorkspace.tsx` (309 lines) is one `<main className="demonstration-workspace">` (l.202) with CSS grid areas `heading / graph / inspector / learning`.

- **Header** `.workspace-heading` (l.205-235): breadcrumb, title, description; `.workspace-actions` holds chapter "read about" / "return" (l.214-215, the chapter context row), library switch, "Learn" (l.225), lesson animation controls while exploring (l.226), Presentation tools toggle (l.229), Presentation (l.231). `.activity-notice` (l.236) is the chapter error row.
- **Lesson**: `lessonOpen` = `?learn`/`?example` route (l.62); `lessonActive` needs lesson and graph capabilities (l.185); `lessonMode` content/explore/complete/closed fed by `GuidedLesson.onModeChange` (l.100, l.254). `GuidedLesson` is a direct child of `<main>` (l.244), so a grid area places it. `closeLesson` and `exitLesson` are refs registered by it (l.44-47). `userActionMode` (l.188) is free / lesson-card / lesson-observe. In `content` mode the inspector is `inert` (l.195-196), `aria-disabled` (l.281) and the graph is `data-lesson-locked` (l.264); that is what slice 3 removes.
- **Inspector** `<aside id="workspace-inspector">` (l.280-307): `.inspector-toolbar` with heading and collapse button (l.283-291), `.inspector-tabs` edit/display/save from the `sections` array (l.91-95, l.292-301), `#inspector-content` with one `<section id="inspector-{tab}">` per tab filled from the graph's `edit`/`display`/`save` props (l.303-306). Scroll owner is `inspectorContent` (l.103). State: `section`, `expanded` (l.97-98).
- **Presentation**: `fullScreen` from `SiteContext` (l.96, l.134); `inspectorVisible = !fullScreen || presentationControls` (l.180) drives `hidden` (l.280).
- **Playback slot** (l.135-179, `data-playback-slot` div l.269): `useGraphAdjacentPlayback()` on narrow or short viewports, never in Presentation; `PlaybackSlotContext` lets `PlaybackButtons` render below the board instead of in the inspector.
- **Uredi mode**: not a host feature; it is the `edit` panel (`editing-mode` buttons) and the default tab.
- **Card layer**: `boardOverlay` prop (l.41, l.266-267) renders inside `.workspace-board-stage` next to `JGBox`. `GraphHost.tsx:20` latches `declared`, and `:52` passes `<BoardCards graph={graph}/>` only for declared graphs.
- **310 px column**: `DemonstrationWorkspace.css:28` (`grid-template-columns: minmax(0,1fr) 310px`) and `:384` (media query), `DemonstrationWorkspaceIdentity.css:11`; lesson column `GuidedLessonLayout.css:5-43` (`--lesson-column`, area `lesson`, `:has(> .guided-lesson-docked)` rules, `.workspace-inspector` overrides l.28, l.69); `.workspace-inspector` styling is `DemonstrationWorkspace.css:91-199` and about 50 more rules there, plus `WorkspaceControls.css`, `ControlRow.css`, `FunctionReadout.css`.

## 2. Target tree

**One host API.** Replace `boardOverlay: ReactNode` with a render prop `boardOverlay(host: WorkspaceCardHost)`; the workspace calls it inside `.workspace-board-stage`. `WorkspaceCardHost` = `{tools: {panels: {edit, display, save}, section, setSection, headActions}, lesson: {slot: HTMLElement | null, active, mode}, frame: FrameDeclaration | undefined, fullScreen, toolsFolded}`. The workspace keeps owning panels, lesson state and Presentation; `BoardCards` stays free of React-route knowledge. `GraphHost` always passes the overlay (every graph gets the Orodja card, so the `declared` latch at l.20 goes), and `BoardCards` handles `getDeclaration() === undefined` by building only `tools` (and `lesson`).

**Orodja card**: a normal card body (`ToolsBody`, new, in `src/workspace/cards/`). It renders the three panels as today (`id="inspector-{tab}"` kept so unit tests addressing panels survive) and, for declared graphs, `ToolSection`s (fold, "?" help) from `declaration.sections`. The card is measured in the hidden layer like `SectionBody`; the measure copy is inert (`MeasurePassContext`).

**Tabs as head icons**: `CardShell` needs a `headActions?: ReactNode` slot (change in `src/workspace/cards/CardShell*`, a task 03 file; handler decides). Uredi / Prikaz / Shrani become three icon buttons with `aria-pressed`, `aria-label`, `title`, `aria-controls="inspector-{tab}"` (same names the smoke tests use), `setSection` also unfolds the card.

**Lesson card without remount.** `GuidedLesson` keeps its session in component state, so it must mount once. The layer already keys cards by id (`BoardCards.tsx:167`), but the measure layer renders every body a second time, so the lesson cannot be a plain body. Proposal: a keyed portal into a persistent element.
- `DemonstrationWorkspace` renders `createPortal(<GuidedLesson/>, lessonSlot)` where `lessonSlot` is a `div` created once with `useState(() => document.createElement('div'))` and appended by the card body (`LessonCardBody` effect) into the shown card. React keeps portal state while the container element is unchanged, and an `appendChild` move does not unmount.
- Measure: the lesson is measured live, not in the hidden layer: a layout effect sets the shown body to `width: assigned; height: auto`, reads `scrollHeight` and `rowBreaks` (text line boxes, for "ends on whole lines"), before paint. This needs an `items` entry flagged `live` in `useMeasuredCards` (handler/task 03 file).
- Rejected: render `GuidedLesson` once in the measure layer and once shown (two sessions); lift the session into a store and make the card a pure view (cleaner but rewrites `GuidedLesson`; keep as the fallback if live measure proves flaky).

`GuidedLesson` today picks its own placement (`guided-lesson-docked` / `-task` classes, `panelDrag`, `dockCard`, l.548, l.648). In the card the drag, dock and hide controls go; `docked` is always true, the card's own `CardShell` moves it. Overlay-phase logic (`overlayPhase`, `explore` mode that hides the card) maps to fold: explore = card folded to its chip.

**Undeclared graphs (slice 7)**: Orodja is the only card from the graph; it starts open, holds the panels unchanged (edit/display/save, with readout and legend inside `display` as now), counts first in the budget. No view fit.

**Playback slot and Presentation (slice 8)**: the slot stays (`data-playback-slot` l.269, narrow/short only, so phone, task 09) and `PlaybackButtons` stays in the Orodja panels on desktop. Presentation: the header button (l.229) toggles Orodja's fold instead of `hidden`; in Presentation `toolsFolded` is passed to `BoardCards` as a non-persisted overlay on `stored.folds` (`{tools: !presentationControls}`), not written to the store. `aria-controls="workspace-inspector"` becomes the card id. Chapter context row (l.214-215) and `.activity-notice` stay in the header; slice 6 hides the strip during lessons.

## 3. Layout inputs

`BoardCards` adds two `CardSpec`s in `cardSpecs.tsx`: `tools` (priority 2.5, anchor `tr`, order 0 or `mr` below readouts, handler picks; priority above readouts so it folds last of the three) and `lesson` (`id: 'lesson'`, priority `Infinity`, anchor `tl`, order -1; `natural`, `rowBreaks` from the live measure). Frame: `layoutInput.frame = {open: frame.open, usesTools}`. Proposed `boardLayout.ts` changes (handler owns; none assumed):

1. `CardInput.reserve?: number`: height of a bar that sits inside the card rect under the scroll area ("Več", Povrni pill). The lesson reserves the Povrni row always (empty row keeps the height when the pill appears) and the "Več" bar's height only when a cut applies, as part of `rect.h` and `cut`, so neither covers text. This is slice 2's "part of the layout function's input".
2. `LayoutInput.budget?: {open: number; order: readonly string[]}`: first-view cap (2 from 1200 px board width/viewport, else 1; order lesson, readouts, tools; `tools` first when the graph names a main action in the tools). Applies only to cards without a stored fold and not frame-opened; extends rule 4 ("otherwise the budget default, otherwise open"). Legend and `section:` cards default folded.
3. `frame.toolsSection?: string`: which Orodja section a used control lives in (scrolls/unfolds `ToolSection`), result passed through `CardLayout`. Optional.
4. `LayoutInput.expanded?: string`: "Več" on a cut card: removes its cut and folds lower-priority cards of its column; "Manj" clears it. Not stored.

## 4. Frame plumbing

Smallest path: `GuidedLesson` already knows `frame` (l.128, `frame.declare`, the `FrameDeclaration`). Add one prop `registerFrameDeclaration?: (d: FrameDeclaration | undefined) => void`, called from an effect on `frame.id` and cleared on unmount, the same pattern as `registerGraphActions` (l.80, l.541-543). `DemonstrationWorkspace` stores it in `useState` and puts it in `WorkspaceCardHost.frame`. `BoardCards` then:
- feeds `declaration.highlight` to the existing `highlight` prop (fills `TODO(task 07)` at `BoardCards.tsx:21`; keep `NO_HIGHLIGHT` stable, memoise on the frame object);
- computes `usesTools` = some id in `uses` is a parameter/action whose home is Orodja (declared sections, or an undeclared graph: true whenever the lesson is active) and sets `frame.open`.
No store, no host registry, no change to `BaseGraph`.

## 5. Undeclared graph in a lesson, and below 1200 px

An undeclared graph has no `FrameDeclaration.uses`, so `usesTools` is true while its lesson is active: Orodja opens beside the lesson card even beyond the budget (frame-opened cards never fold, rule 5), at any width including below 1200 px (where the budget of 1 would otherwise give it to the lesson only). Free exploration below 1200 px: Orodja opens for an undeclared graph (budget counts it first); declared graphs follow budget 1 with lesson, then Odčitki, then Orodja. A 1024 px board with two stacked tall cards relies on fold-before-clip and cut; check at 1024×768 on three unconverted graphs.

## 6. Test migration list (slice 9)

`tests/` (11 files, handler-owned):
- `lesson-smoke-helpers.cjs:190-193` opens a tab via `.inspector-tabs button[aria-controls="inspector-<section>"]`: rewrite to the head icons (keep the `aria-controls`), unfold the card if folded.
- `controls-fixture.spec.cjs` (23 hits): `getByTestId('inspector-edit')`/`display` visible; testids stay if `ToolsBody` keeps them, otherwise rename.
- `curve-editing-modes.smoke.spec.cjs`: clicks Edit/Save tabs in `.inspector-tabs` (l.12, l.104).
- `curve-ownership.smoke.spec.cjs` (26): `inspector(page)` = `.workspace-inspector` for every assertion.
- `demonstrations.smoke.spec.cjs:57`: `complementary` named "Demonstration tools" visible; card needs `role`/label or the test moves.
- `guided-lessons.smoke.spec.cjs` (14): range sliders in DOM order (`inspectorRange`, l.295); order changes if sliders become pucks.
- `lesson-experience-checks.cjs:227`: degree stepper fits `.workspace-inspector .count-setter-controls`.
- `lesson-graph-access.smoke.spec.cjs:63`: asserts the tools stay visible beside the task card (`inspectorVisibility`); becomes "frame's control in reach".
- `library-picker.smoke.spec.cjs:37-38`: picker flow opens Edit tab in the complementary region.
- `rendered-appearance.smoke.spec.cjs:16-17`: `inspector()`, `openTab()`; screenshots of the column change.
- `workflows.smoke.spec.cjs` (18): `bezierInspector` = `.workspace-inspector`.

Unit tests asserting the column or its element ids (other hits are `.inspector-group`/`.inspector-help`/`.inspector-playback`/`.inspector-disclosure`, control internals that survive if markup is kept):
- `src/graphs/base/DemonstrationWorkspace.test.tsx:83`: `#inspector-content` scrolling.
- `src/workspace/presenter/BoardCards.test.tsx:85,90,215-223`: asserts `#workspace-inspector .inspector-tabs` and declared panels inside it for a declared graph; becomes the Orodja card.
- `src/graphs/base/PlaybackCompanion.test.tsx:45,52`, `PlaybackRoutes.test.tsx:48,74`, `PlaybackSlot.test.tsx:65,85,100,116`: playback controls inside or outside `#workspace-inspector`.
- `src/graphs/curves/ph/PhHodographFirst.test.tsx:35`, `rational/RationalCurvesConstructionFirst.test.tsx:43`, `patches/PatchFirstTask.test.tsx:60`: `#inspector-edit` groups.
- CSS-text tests `src/graphs/base/controls/OperationApplyReason.test.tsx:43-44`, `src/inputs/ControlRow.test.ts:16`: regex on `.workspace-inspector .tools` selectors; retarget when CSS moves.
- `src/learning/runtime/*` and `src/graphs/**/*FirstTask.test.tsx` use `.inspector-group, .tools` closest(): unaffected unless the markup moves.

## 7. Proposed slices (serial; one owner per shared file)

1. **Layout API** (`src/workspace/layout/**`, `src/workspace/cards/CardShell*`, `useMeasuredCards`): `reserve`, `budget`, `expanded`, `headActions`, `live` measure + unit tests. Checks: `just unit src/workspace/layout`, `just unit src/workspace/cards`.
2. **Host API and Orodja card** (`DemonstrationWorkspace.tsx`/`.css`, `DemonstrationWorkspaceIdentity.css`, `GraphHost.tsx`, `BoardCards.tsx`, `cardSpecs.tsx`, new `ToolsBody.tsx`): render-prop overlay, remove the aside and the 310 px column, head icons, Presentation switch, undeclared Orodja open. Checks: `just unit src/workspace src/graphs/base`, `just shot --width 310 --selector` of the card, then a handler pass on migrated tests.
3. **Lesson card** (`GuidedLesson.tsx`, `GuidedLesson*.css`, `GuidedLessonLayout.css`, new `LessonCardBody.tsx`): portal mount, live measure, `registerFrameDeclaration`, drop locks (slice 3), Povrni/"Več" reserve. Checks: `just unit src/learning/runtime`, frame sampling for a move (no remount counter).
4. **Budget, A9 and frame wiring** (`BoardCards.tsx`, `cardSpecs.tsx`): budget input, `usesTools`, highlight, undeclared lesson rule. After 2 and 3 (same files).
5. **Header and surroundings** (`DemonstrationWorkspace.tsx` header only, header CSS): slim header, counter, hidden activity strip, hint on toolbar. After 4.
Handler: tests migration (6), taste shots, docs (ADR 0061, DESIGN.md, lesson layout spec). No planned edit under `src/workspace/pucks/**`; slice 2 and 4 only read the pucks' strip size when it exists.

## 8. Risks and taste choices for the owner

- **Taste (slice 5)**: where a frame's Orodja action shows. Default proposed: Orodja opens at that section beside the lesson card (budget counts it); the alternative, a button on the lesson card ("Pokaži oceno napake" inline), keeps the board quieter but duplicates the action. Decide on Taylor and bisection screenshots.
- Open: whether declared `sections` stay separate `section:` cards (spec slice 4 says section cards start folded) or become `ToolSection`s inside Orodja (slice 1). This plan assumes both exist: ToolSections in Orodja, `section:` cards for frames that open them; confirm.
- Live measure of the lesson is the riskiest piece (reflow before paint, Povrni height stability, line-box `rowBreaks` on MathJax text). Fallback is the session-in-store view.
- Many unit tests and smoke helpers hang on `#workspace-inspector`; keeping `id="inspector-{tab}"` and the head tab names limits churn.
- Moving the playback slot logic and Presentation both depend on the card layer being present for undeclared graphs, so slice 2 removes the latch; figure export ignores the layer (sibling of the board) and should be rechecked.
- Not verified: no build or tests run; the `tests/` assertions above are from selector greps; whether `CardShell` already has a head slot was not read.

## 9. Handler decisions (2026-11-23)

Changes to `boardLayout.ts` (handler-owned; also recorded in `03-layout-design.md`):

1. **`CardInput.reserve?: number`** (default 0): height of the bar row(s) inside the card under its scroll area. Included in the card's `natural.h` and `min.h` by the presenter; for the layout it means a cut height is `largest rowBreak ≤ available − reserve` plus `reserve`, so a "Več" bar or the Povrni row never covers a row and never changes the card's height when it appears. The lesson reserves its Povrni row always.
2. **`CardInput.defaultFolded?: boolean`**: Legenda and `section:` cards start folded. Rule 4 becomes: frozen → frame → stored fold → budget → `defaultFolded` → open.
3. **`LayoutInput.budget?: {open: number; order: readonly string[]}`**: on first view (no stored fold for the card, not frame-opened) only the first `open` ids of `order` that are present start open; other cards in `order` start folded. The presenter sets `open = 2` when the board is at least 1200 px wide, else 1, and `order = ['lesson', 'readouts', 'tools']`, with `tools` first for an undeclared graph or a graph whose declaration names its main action in Orodja.
4. **`LayoutInput.expanded?: string`**: "Več" on a cut card: that card is not cut, and lower-priority open cards of its column fold to make room (frame-opened and lesson never fold). Not stored; "Manj" clears it.
5. Rejected for the layout: `frame.toolsSection` (it is the Orodja body's own scroll/unfold, done in the presenter).

Other decisions:

- **Sections:** a declared section whose controls live in Orodja renders as a `ToolSection` inside the Orodja card; a `section:` card exists only for sections the declaration places on the board. The slice 2 worker reads the contract (`graphDeclaration.ts` section/placement fields) and reports if the contract cannot express this.
- **Lesson card:** keyed portal into a persistent element plus live measure, as proposed; fallback (session in a store) only if live measure fails frame sampling.
- **Tools card default:** anchor `tr`, order 1 (below Odčitki), priority 2.5.
- **Slice 5 taste** (Orodja opens at the section vs a button on the lesson card): built as the default (Orodja opens at the section), then shown to the owner with Taylor and bisection screenshots in 04's feel slice.
- Slices run as proposed in section 7, serial on shared files; slice 1 starts now.
