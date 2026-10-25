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
