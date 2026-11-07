# Stable guided lesson navigation

Status: implemented and locally verified, 2026-11-07. The owner selected A after its runnable trial; the compact top toolbar is the release behavior. Source: the owner's two browser comments on the B-spline blossom guided example, image comparison, and follow-up choosing A with shorter navigation labels in Codex chat `01a1b334-019f-7781-91c9-7f7719bc02cd`. The exploratory images remain in the conversation; no image has been selected as a project asset.

## Problem and previous behavior

The owner wants to read successive frames without moving the pointer to find **Naslednji okvir**, and wants the observation action consolidated into the existing **Skrij** control.

Before this change, the panel had natural height with a maximum height. Navigation followed the reading region in its footer, so a short observation frame raised the buttons relative to a long explanation. Both the observation button and the hide button already called `hideOverlay`; observation frames suppressed the header hide button and showed **Opazuj na grafu** below navigation instead.

Relevant constraints are the [lean movable overlay](lesson-panel-visual-refinement.md#lean-movable-overlay--2026-10-31), [compact lesson controls](lesson-mobile-controls.md), and [product guardrails](../guardrails.md). Keep the cream/green identity, graph prominence, draggable placement, bilingual labels, and existing scene, focus, and hide/reopen behavior.

## Selected direction: compact toolbar

Move the existing progress and Previous/Next group together into a stable toolbar immediately after the compact utility row, before the frame's reading content. Keep one navigation group. The text below it retains natural height up to the available space; long content scrolls within that region. Short observation frames can therefore expose more of the graph.

Keep **Skrij** in the same header position for every frame where instructions can be hidden. Remove the separate **Opazuj na grafu** button. **Skrij** performs the existing hide-and-unlock action without advancing the frame or resetting the graph. Reopening returns to the same frame and retains the existing reading-position and focus contract. **Končaj** remains the separate exit action.

The stable region must include progress, which currently travels with navigation. Frame-specific actions and observation disclosures remain available with their content. Do not duplicate navigation at the bottom.

### Remove repeated identity text

In the blossom example, the demonstration name repeats in the page heading, panel title, and chapter/section identity line. On 2026-11-07 the owner requested that this text appear once and that the panel become more compact. The proposed refinement keeps the existing page heading as the visible demonstration identity, removes redundant identity text from the panel, and moves **Nazaj v poglavje** into the utility row with the grip, **Skrij**, and **Končaj**. Removing the extra row saves height rather than replacing repetition with more metadata. The panel's changing frame heading remains the main reading heading and appears once per frame.

This is a semantic context rule, not a claim that every lesson title equals its section or demonstration title. Preserve a single meaningful lesson identity when it differs from the surrounding demonstration, or when surrounding context is absent, such as a presentation layout that hides the page heading. Keep an accessible name for the instruction region even when a repeated visible lesson title is removed. The compact utility row and toolbar remain stable throughout a lesson; conditional identity must not appear or disappear between its frames.

### Short navigation labels

The owner requested **Nazaj** and **Naprej** instead of repeating the frame noun in each button. English counterparts are **Back** and **Next**. The refined mockup pairs these words with small left/right arrows. This keeps the action explicit at low space cost; arrow-only navigation was considered but is not the recommendation. Arrows are decorative to assistive technology. Full accessible names may explain the frame action but must include the visible word, for example **Nazaj: prejšnji okvir** and **Naprej: naslednji okvir**. Preserve an explicit completion action on the last frame.

### Alternative shown

A fixed-height card with a fixed bottom footer also stabilizes navigation and preserves the familiar content-then-navigation order. It reserves blank space on short frames and covers more of the graph. The owner selected the compact toolbar, which retains the lean overlay's natural height.

## Acceptance for implementation

- At an unchanged viewport and panel position, Previous/Next retain their screen coordinates across long and short frames, steps, frame kinds, formula typesetting, and observation disclosure expansion. Reserve enough button width for the final-frame label as well.
- Use the short visible labels **Nazaj** / **Naprej** and **Back** / **Next**, with small directional arrows. Keep accessible names consistent with the visible words and frame action; hide decorative arrows from assistive technology. Keep the existing disabled first-frame Back state.
- At very narrow panel widths, omit the decorative arrows and reduce horizontal padding so enlarged words remain legible. Preserve the words, focus treatment and 44px minimum target height.
- In the normal chapter-owned blossom layout, show the demonstration title once in the page heading. Remove its duplicate panel title and chapter/section identity row, placing **Nazaj v poglavje** in the utility row instead. Keep a single frame heading in the body. Preserve meaningful distinct or otherwise unavailable context and the instruction region's accessible name.
- Keep the header and toolbar anchored after a manual drag. Bound the reading region by the remaining visible graph/viewport space rather than allowing longer content to push the panel anchor elsewhere. Viewport resizing and intentional dragging may reposition controls.
- Long content remains scrollable and all controls remain reachable. Short frames retain a compact body. Support 320px width, enlarged text, short landscape, desktop, Slovenian, and English without clipped labels or horizontal page overflow; action targets remain at least 44px tall.
- **Skrij** is present in the header consistently, including observation frames. It hides the panel, unlocks graph editing, and preserves the current scene. Reopening preserves the frame and existing reading-position/focus behavior. Escape and graph-background hiding retain their current behavior.
- Remove the duplicate observation CTA and update lesson prose that explicitly tells readers to press **Opazuj na grafu**, including its English counterpart. Update guided-example replay helpers and tests that locate the old action. Keep action instructions accurate in both languages.
- Keep frame-specific actions, playback controls, expected-observation disclosures, and the separate exit flow usable. Preserve keyboard and screen-reader order and announcements.
- Do not change mathematics, routes, preset data, or persisted placement.

## Evidence and verification boundary

The handler inspected the two supplied screenshots, the panel CSS and runtime handlers, the incumbent design context, and the relevant specifications. An independent read-only layout assessment supported the compact toolbar. A generated four-state image comparison shows long and short frames for each option. After the owner selected A and requested shorter labels, a second two-state image showed the compact toolbar with **← Nazaj** and **Naprej →**. A third image responds to the owner's repetition comment: the page heading supplies identity and the panel has only a utility row and stable toolbar above its body. These are layout illustrations, not authoritative lesson mathematics or runtime tests.

The image exploration changed no application code and did not test browser interaction. Production implementation requires runtime/workspace regression checks, localization typecheck and build if copy changes, and browser smoke through the project's smoke-tester workflow for the affected shared lesson runtime. Browser checks must measure navigation coordinates as well as exercise hide, graph editing, reopen, dragging, keyboard access, disclosures, and long-content scrolling.

## Production implementation — 2026-11-07

The owner approved implementation after the runnable trial on `codex/prototype-lesson-navigation` at `42caae71`. That branch retains the complete A/B/C comparison. [The production task](../tasks/lesson-navigation-stability/implementation.md) carries the selected compact toolbar into the real runtime, including affected prose, replay consumers, regression tests and browser acceptance. Production has one layout without a variant parameter or comparison controls. No route or stored-preset format changes are intended.

## Completion panel refinement — 2026-11-07

- After the last frame, replace step navigation with a completion heading and the existing invitation to explore the final scene. Use one continuous panel surface and move focus to the completion heading.
- For chapter-owned examples, show one primary **Nadaljuj v poglavju** action in the completed panel. Keep the chapter return link available during the lesson and retain the existing scene restoration when returning to the chapter.
- Keep Hide and Exit available, and leave the completed graph editable. Verify completion and chapter return on desktop and at narrow widths in Slovenian and English, including keyboard access and enlarged text.
