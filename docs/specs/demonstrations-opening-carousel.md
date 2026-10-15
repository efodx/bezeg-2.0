# Demonstrations opening carousel

Status: specified for implementation. Variant C of the [opening prototype](demonstrations-opening-prototype.md) is the chosen direction; the prototype remains review evidence, not production code.

Placement update (2026-10-15): the confirmed [homepage-carousel and catalogue brief](homepage-carousel-and-demonstrations-catalogue.md) moves this carousel to the homepage and makes Demonstrations catalogue-only. It supersedes placement above the catalogue; the interaction, timing, accessibility, and lifecycle contract below remains authoritative. The relocation is not yet implemented.

## Problem Statement

The first view of the Demonstrations page should invite a learner to explore, but a fixed set of three cards feels static and hides the range of mathematical ideas available. The owner chose the single-row Variant C carousel and wants it to advance automatically until the learner interacts with it. The opening must retain the calm Bezeg identity and leave the full Demonstrations catalog easy to reach.

## Solution

Show one prominent, route-specific preview above a single horizontal row of six starting Demonstrations. The preview displays the selected Demonstration's family, title, short exploration prompt, graph action, and Guided lesson action when that lesson is available. The selected choice is clear in the row. The carousel advances through the six choices automatically after a readable interval, then wraps to the first. A learner can select any choice or use previous/next controls; their manual interaction takes control for the rest of that page visit. Hover or keyboard focus pauses automatic advancement while it lasts. Reduced-motion users see a fully manual carousel.

## User Stories

1. As a new learner, I want the opening to show a curve immediately, so that I can see what the app lets me explore.
2. As a new learner, I want several starting Demonstrations to appear over time, so that I discover more than the first suggestion.
3. As a learner, I want enough time to read each title and prompt, so that automatic movement does not interrupt comprehension.
4. As a learner, I want the preview image, title, prompt, and actions to describe the same Demonstration, so that I know what will open.
5. As a learner, I want to choose any visible starting Demonstration directly, so that I can follow my interest.
6. As a learner, I want previous and next controls, so that I can browse at my own pace.
7. As a learner, I want my manual choice to stay selected, so that the carousel does not move away while I am deciding.
8. As a learner, I want the selected choice to be obvious in the row, so that I can connect it to the large preview.
9. As a learner, I want a partial next choice visible when the row overflows, so that I know there are more Demonstrations to browse.
10. As a touch user, I want to swipe the choice row and select a card, so that the opening remains usable on a narrow screen.
11. As a keyboard user, I want to Tab to choices and actions and use Left/Right within the carousel, so that I can explore without a pointer.
12. As a keyboard user, I want the carousel to stop moving while my focus is inside it, so that my target stays in place.
13. As a pointer user, I want the carousel to pause while I hover over it, so that I can inspect a preview before choosing.
14. As a user who prefers reduced motion, I want the choices to remain still until I act, so that the page does not move unexpectedly.
15. As a screen reader user, I want each choice and its selected state announced, so that I can navigate the opening without seeing the row.
16. As a screen reader user, I want automatic changes to avoid repeated announcements, so that they do not interrupt the rest of the page.
17. As a learner, I want the graph action to open the selected Demonstration and the Guided lesson action to appear only when supported, so that both destinations are trustworthy.
18. As a learner, I want to continue into the full catalog below, so that the opening does not limit what I can explore.
19. As an educator, I want the opening to remain legible on a projected desktop view, so that I can introduce a topic to a class.
20. As an English-language user, I want the same controls and Demonstration information translated, so that the opening works like the rest of Bezeg.

## Acceptance Criteria

- The production Demonstrations route uses the Variant C layout: a large accurate preview and six starting choices in one horizontal row at desktop and narrow widths. The row can scroll internally; the page has no horizontal overflow. The full catalog remains below it.
- The first choice is selected on entry. With the page visible, the carousel in view, no pointer hover or focus within it, and no manual interaction, selection advances every six seconds and wraps after the sixth choice. The timer restarts at a full interval after each advance; there is no rapid catch-up after inactivity.
- Pointer hover or focus within the carousel pauses automatic advancement. It resumes with a full interval after hover or focus leaves, unless a manual interaction has occurred.
- Activating a choice, using previous/next, using Left/Right within the carousel, or manually scrolling/swiping the choice row stops automatic advancement for the rest of that page visit. It does not restart merely because hover or focus ends. Reloading the route begins a fresh visit.
- Automatic advancement pauses while the page is hidden or the carousel is outside the viewport and resumes with a full interval when it is visible again, unless the user has taken manual control. No timer or observer survives route unmount.
- With reduced motion enabled, there is no automatic advancement and no entrance animation. All manual controls remain available.
- Selection updates the preview image, family, title, prompt, graph destination, and available Guided lesson destination together. The selected choice is visually distinct and programmatically exposed. Manual selection brings its choice into view without moving the whole page vertically.
- Automatic changes do not force keyboard focus, scroll the page, or announce every preview to assistive technology. Manual changes expose the selected state and updated content.
- All controls work with touch, pointer, and keyboard. Focus is visible; choice labels remain on one line, with their full names available to assistive technology when visually truncated.
- Development-only variant switching and query handling are absent from the production implementation. No Demonstration routes, graph state, Presets, or lesson availability change.

## Implementation Decisions

- Treat the carousel as page-shell presentation of existing Demonstration catalog data. It does not own mathematical graph state, create new routes, or alter Guided lessons.
- Promote the selected parts of Variant C into the production opening. Remove the disposable variant selector from the shipped experience and keep the prototype as a visual reference.
- Use the six existing starting Demonstrations and their localized catalog titles and prompts. Use route-specific preview assets or an equally accurate existing preview for each choice. Show a Guided lesson action only for supported Demonstrations.
- Keep one selected index and one visit-scoped manual-takeover state in the carousel. Automatic advancement, manual controls, and direct selection all update the same selected choice. A timer is active only when the page and carousel are visible, reduced motion is off, manual takeover has not happened, and the pointer and focus are outside the carousel.
- Interpret "unless a user interacts" as lasting manual control after an explicit selection, arrow command, previous/next command, or direct row scroll. Hover and focus only pause while present; they do not by themselves commit the visit to manual mode.
- Use a six-second dwell per choice and a short, calm visual transition. Reset the dwell after resuming from a temporary pause. Keep the graph preview prominent and use the existing cream, elderflower green, ochre, and graph-grid palette.
- Keep the horizontal choice row on one line at every supported width. Manual selection scrolls within that row as needed. Automatic selection may move the row enough to reveal the active choice but must not scroll the document or steal focus.
- Keep Slovenian as the default and provide matching English labels. Avoid making timing or animation necessary to reach any Demonstration.
- Dispose of timers and viewport/visibility listeners when leaving the route. This is decorative page behavior, separate from graph-owned mathematical animation and Guided lesson timing.

## Testing Decisions

- Test behavior through the Demonstrations route as the highest useful seam, extending the existing page tests rather than testing timer internals or individual helper functions. Control time in the test to verify the six-second dwell, wrap, temporary pause, manual takeover, and reduced-motion behavior from visible selection and links.
- Use focused browser checks for touch-width row scrolling, pointer hover, keyboard focus and arrows, page visibility/viewport behavior, link destinations, and no document-level horizontal overflow. Review representative desktop, projection, and narrow layouts.
- Check production route and asset loading, direct navigation, and the absence of prototype controls in the production build. Existing Demonstrations page and browser smoke tests are prior art for route and link checks.
- A good test observes which Demonstration is selected and where its actions lead. It should tolerate internal timer or observer refactoring and avoid asserting animation implementation details.

## Out of Scope

- Changes to the full Demonstrations catalog, Demonstration routes, mathematical evaluation, graph controls, Presets, and Guided lesson content or availability.
- Backend state, accounts, saved carousel position, personalization, analytics, or a content management system.
- Automatic graph manipulation inside the featured preview. The carousel changes which Demonstration is presented; it does not play a mathematical construction.
- Implementation task breakdown. Create task documents only when implementation is requested.

## Further Notes

- The [prototype comparison](demonstrations-opening-prototype.md) records the original A/B/C exploration and the manual Variant C interaction. This spec supersedes its "do not autoplay" prototype decision for the production opening.
- Automatic carousel motion is separate from Guided lesson graph animation. The latter remains explicit and learner controlled under the existing lesson decisions.
