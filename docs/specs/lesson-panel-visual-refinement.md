# Guided lesson panel visual refinement

## Scope — 2026-10-25

Refine the expanded lesson overlay identified on `/bezier/curve`. The owner approves the existing UX and requests a better visual treatment. Preserve the overlay/minimize interaction defined in [lesson-overlay-minimize.md](lesson-overlay-minimize.md), all lesson copy, scene state, navigation, routes and presets. This is an Operate surface within the existing cream, green and elderflower identity.

## Acceptance

- Give the lesson title a full reading-width row; utility actions must not squeeze it into a narrow column. Group those actions quietly beneath it, with an obvious primary Next action in the footer.
- Use a warm opaque reading surface, consistent typography, modest panel padding and restrained rules. Remove redundant visual eyebrows above headings and the automatic full-panel focus outline while preserving meaningful keyboard focus on controls.
- Preserve natural content height, bounded scrolling for long prose and persistent narrow-screen controls. At 320px, 390px, intermediate desktop, wide desktop and short landscape, all controls remain reachable without document horizontal overflow. Check English expansion and enlarged text.
- Preserve minimize/reopen, previous/next, observation actions and exit confirmation behavior. No mathematical, localization or runtime logic changes.
- Preserve all pre-existing uncommitted changes; commit only this refinement.

## Verification

Focused lesson/workspace unit tests, production build and delegated browser checks of Bézier and a long lesson. Inspect actual rendered desktop/mobile screenshots and keyboard focus. No renderer or performance changes are intended.

## Follow-up refinement — 2026-10-25

The owner likes the interaction but finds the expanded panel visually poor. Refine the incumbent Operate surface: cap the panel's desktop reading width, inset it slightly over the graph, distinguish the smaller lesson title from the current frame heading, and bring progress and navigation together in a compact footer. Keep all copy and actions; move frame-type metadata out of the space above the frame heading. Use the existing shell palette and sans-serif type, with no decorative imagery or new visual system. Preserve the full-width title row and quiet utility actions beneath it. Narrow layouts retain full-width reading and persistent actions.

Acceptance additionally requires visible graph around the short desktop panel, a readable prose measure, no extra full-width navigation row on wide screens, and unchanged formula scrolling, lesson transitions, graph state, language support and exit behavior. Check the existing responsive reading suite and Bézier/long-lesson walks; inspect desktop, 390px, 320px and enlarged-text screenshots.

### Verification evidence

- Focused runtime/workspace unit tests: 36 passed. Typecheck and production build passed. Lint was unavailable because this checkout lacks its local ESLint executable.
- Delegated Chromium smoke: 22 selected checks passed, covering Bézier/Taylor lesson walks, responsive reading and observation flows. Manual inspection covered 1517×1004, 390×844, 320×844 English at 200% text, and 844×390; keyboard focus and Enter navigation worked. A visual review found awkward mid-word navigation wrapping at enlarged text; the responsive grid now stacks buttons when their text needs more room.
- After that CSS-only repair, all 15 responsive reading checks passed again, including projection, short landscape, enlarged text and wide-font variants. Final desktop/enlarged-mobile screenshots confirmed containment and legible navigation. The earlier 22-check run and final 15-check recheck overlap; full lesson walks were not repeated after the narrow grid adjustment.
- The design scan returned palette/radius advisories against the shell-focused catalog; the lesson retains its existing geometry and local component shapes. No detector blockers were reported. Desktop graph exposure and final enlarged-text screenshots were inspected directly. Physical devices/projectors were not tested.

## Lean, movable overlay — 2026-10-31

The owner asked for leaner frames during guided lessons, and for both the open instructions and the closed tab to be draggable across the graph. This supersedes the full-width title row above: the panel had grown to three header rows (title, Hide/Exit, chapter line) and covered most of the desktop graph.

### Decisions

- **Lean card.** Desktop width 34rem (was 52rem), tighter padding, max height `min(68vh, 640px)`. One heading row holds a grip, the 15px lesson title and quiet Hide/Exit actions; the actions wrap beneath the title only when the row is too narrow. Visible labels are short (Skrij/Končaj, Hide/Exit), and the full accessible names are unchanged. Each visible label is contained in its name (WCAG 2.5.3) and given as a tooltip. The chapter line is one ellipsized row with the full text as a tooltip. The frame heading is 20px and reading text 15px/1.55. Notes and worked examples are separated from the reading surface by tint alone, without a nested border. The footer stacks by a container query on the panel's own width (was a 1100px viewport query), so a lean panel stacks when its text needs it, at any viewport.
- **Dragging.** The panel's heading row (outside its buttons and links) and the whole closed tab are drag surfaces. The movement is a translate offset from the CSS home placement, kept within the part of the graph that is in the window. It is re-clamped when the graph or element resizes and kept across frames and hide/show, and it resets when another lesson starts. A press under 5px of travel stays a click, so tapping the tab still reopens the instructions. A press that ends a drag does not reopen them. The grip and the tab also move with arrow keys (Shift for larger steps), declared through `aria-keyshortcuts`. A lifted shadow while carrying is the only added motion, and reduced motion removes its transition. Positions are not stored: there are no route, preset or storage changes.
- Touch targets stay at least 44px tall; the grip is 28×44px and the heading row around it is also draggable.

### Acceptance

Every pre-existing overlay contract still holds: minimize/reopen focus, Escape, exit confirmation, observation handoff, locking, reading position, 44px reachable controls with fitting labels, and no horizontal overflow at 320px with enlarged text. Additionally, the panel and the tab move by pointer and keyboard, stay within the visible graph, and keep their places for the lesson.

### Verification evidence

- Typecheck, lint of the changed files and production build passed. Runtime and workspace unit tests passed (228, 13 files), including new tests for the clamp and for panel/tab dragging, the action-press exclusion, arrow keys, drag-release not reopening and positions surviving Next and hide/show.
- The lesson smoke suites (`guided-lessons`, `lesson-graph-access`) passed 155/155 on the final build.
  - The first run found two failures. The 200%-text Presentation check failed because three rem sizes had been converted to px; rem was restored.
  - The same-frame reading-position check no longer had a scroll range at 1100×540: the lean panel fits that observation frame, and its old overflow came from the viewport-stacked footer. The fixture now applies 200% page zoom.
  - That fixture then exposed an older defect. On reopen, the reading position was restored before MathJax re-typeset the content, so the restore was clamped to the shorter untypeset height. The panel now re-applies the saved position once typesetting settles, unless the learner hides or navigates first.
- Chromium checks on `/bezier/curve` at 1440×900 and 390×844 in Slovenian and English (screenshots inspected):
  - the panel follows a header drag, and an overshoot stops 6px inside the visible graph, including the window's bottom edge;
  - arrow keys move it by 16px, and it keeps its place across Next and hide/reopen;
  - the tab drags without reopening, and a plain click reopens it.
- Not tested: real touch devices, projectors and the full smoke checklist (the shared app shell is unchanged).
