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
