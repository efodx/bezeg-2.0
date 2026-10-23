# Chapter activity control access

Source: the owner's 2026-10-23 report that opening **Odpri raziskovanje** from the Bézier chapter leaves lesson-related controls difficult to reach. Extends [standalone learning](standalone-learning.md), retaining its scene and reading-return contracts.

## Acceptance

- Opening a chapter activity from a scrolled reading section positions the activity context and its Return to chapter action in view. Keyboard focus moves to that action once per activity visit, including direct entry and browser history entry.
- Return to chapter and Continue reading are visually prominent, with at least 44 CSS pixel targets. Reset and Free exploration remain available and clearly secondary.
- Entry positioning must not repeat on parameter edits, language changes, or Guided lesson open/close. Existing reading scroll/focus restoration remains intact.
- At 1440×900 and 390×844, return controls are reachable, wrap without horizontal document overflow, and retain visible focus. At 200% text size on the narrow viewport, controls remain reachable through ordinary scrolling without a fixed overlay covering the graph.
- At intermediate widths (800–1024px), action wrapping preserves a readable explanation column rather than squeezing the prompt into one-word lines.
- Keep shared graph/inspector functionality, routes, stored Presets, and mathematical behavior unchanged.

## Verification

Use the chapter-to-activity browser flow to assert return-action viewport visibility and focus, keyboard return, language/slider stability, narrow layout, and enlarged text. Run the standalone-learning smoke suite, focused workspace unit tests, typecheck and production build. Run the repository smoke workflow for the shared workspace and record coverage limits.

Known acceptance limit: at 390px and 200% text the existing De Casteljau inspector creates a 395px document width on ordinary entry as well. This change verifies that the activity context fits within 390px, all four actions remain reachable, and activity entry does not worsen the standalone width; full-document enlarged-text acceptance remains open.
