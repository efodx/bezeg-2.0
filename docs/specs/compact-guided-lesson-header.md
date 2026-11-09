# Compact guided lesson header

Design agreed on 2026-11-09. This follow-up defines one header layout for all active frames in the shared guided lesson panel, including lessons opened from a chapter. [Stable guided lesson navigation](lesson-navigation-stability.md)

In a chapter-owned lesson whose title differs from the graph heading, the current panel adds a row for the chapter and section names and the return link. Move the link into the utility row and remove the extra row so the reading area begins higher in the panel.

## Shared layout

| Row | Left | Right |
| --- | --- | --- |
| Utilities | Drag handle and optional lesson title | **Nazaj v poglavje** when the lesson has a chapter owner, then **Skrij** and **Končaj** |
| Progress and navigation | Frame kind and step/frame progress | **Nazaj** and **Naprej**, with the existing completion action on the last frame |

The chapter return link is the sole chapter element in the active header. Keep the title in the space left by the utilities, on one line with visual ellipsis if needed. Give the controls enough room for their localized labels and focus indicators. Frame headings belong in the reading area.

Use the same two rows at desktop widths whether the title is visible or omitted. At narrow widths or enlarged text sizes, use width-driven stacking as needed for readable labels and touch targets. Apply the same stacking across frames at a given size. [Compact lesson controls](lesson-mobile-controls.md)

## Title visibility

Compare the localized lesson title with the visible graph page heading after trimming, collapsing whitespace, and ignoring capitalization. Omit the title if they match. Show one lesson title if they differ or if the workspace has no visible heading, including in layouts that hide it. Base this decision on lesson and workspace context, independent of the current frame. Give the panel its full localized lesson name for assistive technology in either state.

Apply the rule in the shared header. Use the existing chapter return, hide, exit, navigation, and drag handlers. On completion, focus the completion heading and use the existing **Nadaljuj v poglavju** action for chapter-owned lessons. [Guided lesson panel](../../src/learning/runtime/GuidedLesson.tsx) · [Completion behavior](lesson-navigation-stability.md#completion-panel-refinement--2026-11-07)

## Acceptance criteria

- At desktop widths, both **Cvetenje (polarna oblika)** and **Bézierjeva krivulja: od točk do oblike** render two toolbar rows. Blossom omits its matching lesson title. The Bézier example shows its distinct lesson title and gains the vertical space of the former chapter/section row. Both show a single chapter return link when launched from their chapters.
- Cover case and whitespace variants, a missing visible page heading, and a lesson without a chapter owner in the focused header checks. A long lesson title truncates visually within the utility row while the accessible name stays complete.
- At a fixed viewport and panel position, measure the same **Nazaj** and forward-button coordinates across short and long frames, steps, observation disclosure changes, and the final frame's label. Repeat after dragging the panel. The reading region scrolls when needed.
- At 320 CSS pixels, enlarged text, short landscape, and desktop, verify Slovenian and English labels, 44px minimum action heights, visible keyboard focus, and a panel that fits horizontally. Check chapter return, hide and reopen, and completion with keyboard and pointer.

Extend focused `GuidedLesson` regression coverage and use the repository browser smoke workflow for the affected shared lesson paths. [Browser smoke checklist](../smoke-tests.md)
