# Demonstration catalog action affordances

**Status:** Accepted and implemented on 2026-10-12. The owner selected treatment A, circular outline buttons.

## Problem Statement

The all-demonstrations catalog repeats a graph-opening arrow and a text link for a Guided lesson beside each Demonstration. Across many entries, the repeated wording competes with the titles and graph previews and makes the two ways to begin less distinct. The owner wants compact, recognizable actions while keeping each Demonstration's picture visible and the catalog dense.

## Solution

Give each Demonstration entry a decorative schematic graph preview, its title, and a compact inline action area. Put the graph action and, when available, the Guided lesson action to the right of the title in the same footer row. Use icon-only links with localized accessible names and localized tooltips on hover and keyboard focus. Keep the existing route and destination behavior.

The prototype compared three visual treatments for the same layout: circular outline, rounded square, and minimal ghost buttons. On 2026-10-12 the owner selected treatment A, circular outline buttons. See [the catalog prototype notes](demonstration-catalog-prototype.md) and the prototype source on `codex/prototype-demonstration-motion` at `7bd9630`.

## User Stories

1. As a student browsing a mathematical family, I want to recognize each Demonstration from its small graph picture and title, so that I can choose a relevant curve concept quickly.
2. As a student who wants to experiment, I want a clearly identifiable graph action, so that I can open the Demonstration directly.
3. As a student who wants instruction first, I want a separate Guided lesson action where one is available, so that I can begin with an explanation before exploring the graph.
4. As a student using a keyboard, I want both actions to be reachable by Tab and to show visible focus and a descriptive tooltip, so that I can identify and activate either destination without a pointer.
5. As a screen-reader user, I want each icon link to have a localized name that includes its purpose and Demonstration title, so that the icon is understandable without its visual tooltip.
6. As a touch user, I want each action to retain a target at least 44 by 44 CSS pixels, so that I can activate it reliably on a small screen.
7. As a student browsing on a phone, I want the family cards and actions to reflow without horizontal scrolling, so that I can browse every Demonstration on a narrow screen.
8. As an English-language user, I want action names and tooltips in English while the interface language is English, so that the choices remain understandable after switching languages.
9. As an educator projecting the catalog, I want the graph previews to remain larger visual anchors than the action icons, so that the pictures communicate each topic at a glance.
10. As a returning user, I want graph and lesson links to keep their existing destinations, so that direct Demonstration routes and the current lesson-entry flow continue to work.
11. As a catalog maintainer, I want lesson actions to follow the existing lesson-availability metadata, so that unsupported Demonstrations do not advertise an unavailable learning path.

## Implementation Decisions

- Keep the change within the existing Demonstrations catalog presentation. Do not add routes, alter route metadata, or change the graph workspace or Guided lesson runtime.
- Preserve the three starting Demonstration cards above the family catalog and preserve every family and Demonstration title.
- Add a small, decorative, distinct schematic preview for every catalog Demonstration. Base the production previews on the reviewed catalog prototype artwork. Previews must not construct graph boards, attach listeners, or change mathematical state.
- Keep each entry's preview above a footer row. In the footer, place the Demonstration title at the left and the icon actions at the right. Wrap long titles without pushing actions outside the card.
- The graph icon links to the existing Demonstration path. The book/lesson icon links to that path with the existing `learn=1` query only when the Demonstration is reported available by the existing lesson catalog.
- Make each action a separate link with a localized accessible name containing the action and Demonstration title. Show a localized tooltip on hover and keyboard focus. Keep visible focus and a minimum 44 by 44 CSS pixel target.
- Use owner-selected treatment A, circular outline. Preserve the different graph and lesson semantic colors.
- Keep the compact family-entry grid: one column on narrow phone layouts, three columns around the reviewed 724px tablet width, and auto-filled columns on wider desktop. Avoid horizontal overflow and conspicuous empty rows at the target widths.
- Slovenian remains the default language; action names and tooltips use the existing localization catalog and have English counterparts.
- Remove development-only variant switching from the production catalog when the selected treatment is implemented. Existing graph routes and lesson query behavior remain unchanged.

## Testing Decisions

Tests should exercise user-visible catalog behavior rather than CSS implementation details.

- Extend the existing Demonstrations catalog interaction coverage to check that a catalog entry exposes a named graph link to the existing route and, when available, a separately named lesson link to the same route with `learn=1`.
- Check that all active Demonstrations retain their titles and distinct decorative previews, and that lesson-link presence follows the existing availability source.
- Check keyboard traversal, visible focus, and tooltip visibility on focus. Check the localized accessible names and tooltips in Slovenian and English.
- Use browser review at 390, 724, and 1440 CSS pixels to check preview prominence, title wrapping beside actions, the three-column tablet layout, one-column phone layout, desktop density, and no horizontal overflow. Exercise hover and touch-sized targets where the browser supports them. This viewport review is browser evidence, not physical-device acceptance.
- Run TypeScript and the production build. No geometry or graph-rendering checks are needed because the preview is decorative and the graph destinations are unchanged.

Prior art includes the existing Demonstrations catalog navigation tests, localized interaction tests, and the browser catalog review recorded in [the dedicated demonstrations view spec](demonstrations-view.md).

## Out of Scope

- Changes to graph mathematics, live graph rendering, graph controls, Guided lesson content/runtime, or preset behavior.
- New Demonstration routes, route aliases, query semantics, lesson support, or changes to the three starting-card destinations.
- Reordering mathematical families or changing Demonstration titles or metadata.
- A production style switcher, icon library, backend service, persistence, or analytics.
- Physical-device, classroom, or projector certification beyond the specified browser viewport review.

## Further Notes

The action-style comparison is preserved on `codex/prototype-demonstration-motion` at `7bd9630`; the production catalog has no action-style switcher or query interpretation. Earlier prototype captures and visual feedback are in [the catalog prototype record](demonstration-catalog-prototype.md).
