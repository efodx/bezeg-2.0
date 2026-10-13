# Demonstrations page visual refinement and repeatable previews

**Status:** implementation complete; production build and browser smoke verification remain incomplete because of local environment limitations. The owner approved the visual direction shown in the [static mockup](../prototypes/demonstrations-visual-refinement.png) and confirmed the choices below on 2026-10-13. Verification details are recorded in the [implementation task](../tasks/demonstrations-visual-refinement/implement.md).

## Problem Statement

The owner likes the placement and concepts on the Demonstrations page, but its current visual treatment feels flat. Preview drawings and controls need clearer contrast and hierarchy while the page keeps its calm elderflower identity and remains focused on interactive mathematics.

The preview workflow also needs to stay dependable as Demonstrations are added. A future option is to animate selected previews in sync with some Guided lesson steps, but the current request is for improved static previews and a repeatable way to keep them current.

## Solution

Refine the existing page presentation without changing its section order, content model, or navigation. Use a subtle page-wide graph grid and a low-contrast elderflower motif, distinguish page, card, and preview surfaces more clearly, improve the legibility of accurate route previews, and make the page and catalog actions easier to scan.

Extend the existing static preview workflow so that Demonstrations added in the future receive accurate, generated default-scene previews and exhaustive catalog mappings without adding a hand-maintained image entry for each route. Keep lesson-linked animated previews as a possible later capability, not part of this visual refinement.

## User Stories

1. As a student arriving at the page, I want the current layout to retain its clear opening and catalog sections, so that the way I choose a Demonstration stays familiar.
2. As a student, I want a quiet elderflower motif and graph texture, so that the page feels distinctive without competing with the mathematical content.
3. As a student, I want cards and preview canvases to stand apart from the page background, so that I can quickly see which content belongs together.
4. As a learner choosing a starting Demonstration, I want its curve and important point labels to be easy to see, so that I can recognize the mathematical idea before opening it.
5. As a learner, I want the preview to show the actual default scene, so that the picture matches the Demonstration I will enter.
6. As a student starting from the feature card, I want “Odpri demonstracijo” to read as the primary action and “Vodena učna pot” as an available secondary path, so that I understand the two ways to begin.
7. As a student browsing the full catalog, I want visible “Odpri” and “Vodena pot” labels beside the action icons, so that I can understand the destinations without relying on a hover tooltip.
8. As a keyboard or screen-reader user, I want catalog actions to retain visible focus, localized names, and their existing destinations, so that the clearer visual labels do not reduce access or change behavior.
9. As a student scanning topic groups, I want each family name to lead and its item count to be secondary, so that I can find a mathematical area before reading its size.
10. As an educator projecting the page, I want the page decoration and small preview details to remain restrained and legible, so that they support a classroom introduction rather than distracting from it.
11. As a contributor adding a Demonstration, I want the established capture workflow to produce its static preview and catalog mapping from its default scene, so that new content does not require a separate one-off illustration process.
12. As a contributor maintaining previews, I want the generated asset list and provenance to stay complete for every active Demonstration, so that missing or stale previews are caught during review.
13. As a learner using a reduced-motion preference, I want this visual refinement to keep previews static, so that the page introduces no new automatic movement.
14. As a future learner, I may want selected previews to illustrate a Guided lesson step over time, so that a preview can introduce a mathematical process as well as a static scene.

## Implementation Decisions

- Preserve the current page hierarchy, carousel behavior, family order, Demonstration titles, lesson availability, and route destinations.
- Use the approved mockup as the visual reference: a faint page-wide graph grid, a low-contrast elderflower sprig in the upper-right background, cream page surface, ivory cards, sage preview surfaces, dark green text, and restrained ochre accents. Keep decoration behind content and outside assistive-technology reading order.
- Strengthen surface boundaries with clearer tonal separation and subtle edges. Keep effects quiet and preserve readable contrast at classroom projection sizes.
- Improve the fit and contrast of the existing route previews so curves, construction lines, control points, and labels read at a glance. Keep every meaningful scene element and preserve equal geometric scale where required; do not change route defaults or mathematical content to make a preview more attractive.
- Style the feature card’s “Odpri demonstracijo” link as the primary action and retain “Vodena učna pot” as a visually quieter secondary action when that lesson is available.
- Show the localized “Odpri” and “Vodena pot” labels beside the existing catalog action icons. Keep their links, accessible names, focus behavior, touch targets, and conditional lesson availability. This visible-label choice supersedes the icon-only visual treatment recorded in the earlier catalog action-affordance decision.
- Keep family illustrations conceptual and keep route previews faithful to their Demonstration’s fresh default scene. Do not replace either category with hand-picked geometry.
- Extend the existing static preview generation workflow rather than introducing a second system. The active Demonstration catalog is the source of coverage; generation produces the route preview assets, exhaustive typed asset mapping, and provenance manifest. New Demonstrations must not require a new hard-coded total count or manual per-image mapping in production UI code.
- Continue capturing from clean browser storage at each exact default route, without mounting graph boards in the catalog or capturing a user Preset or Guided lesson scene. Retain capture provenance, dimensions, per-route coordinate-context policy, and scene-containment checks.
- Keep current and newly added previews static in this scope. Do not infer animated previews from lesson prose or generic scene actions. A future animated preview must be explicitly associated with a supported, reviewed Guided lesson step and defined in a separate bounded specification.
- Keep Slovenian as the default. Add matching English catalog action labels and any other new interface copy through the existing typed localization system.

## Testing Decisions

Tests should observe what learners and contributors can rely on, not specific CSS declarations or capture-script internals.

- Use the existing Demonstrations page route/component seam to check the visible action labels, the selected preview and destinations, lesson availability, topic counts/order, keyboard focus, and Slovenian/English copy.
- Use the existing preview-generation and asset-map seam to check that every active Demonstration has exactly one generated route preview, that the manifest and generated map match the catalog, and that new content does not depend on a fixed route total.
- Review the production page at 390, 724, and 1440 CSS pixels. Check that the graph grid and botanical decoration stay quiet, preview details remain legible, action labels fit, and the page has no horizontal overflow.
- Check representative generated previews against their actual default routes, preserving mathematical shape, constructions, labels, scene containment, and coordinate context where it is meaningful.
- No graph-mathematics, route, Preset, or Guided lesson runtime tests are needed for the static visual refinement because those behaviors remain unchanged.
- If animated previews are specified later, test their explicit association to Lesson steps, static fallback, reduced-motion behavior, and lifecycle alongside the relevant Guided lesson flow.

## Out of Scope

- Reordering or redesigning the page concepts, section placement, carousel behavior, or demonstration-family grouping.
- Changes to curve mathematics, route defaults, graph workspaces, controls, Presets, lesson content, or lesson availability.
- Live graph boards in the catalog, user-specific preview scenes, backend storage, or a preview-authoring interface.
- Animated previews in this change. The owner identified Lesson-step-linked animation as a future possibility; its timing, controls, eligibility, lifecycle, and reduced-motion behavior require a separate specification.
- Broad graph-renderer, build-tool, or design-system migrations.

## Further Notes

- Related decisions: [dedicated Demonstrations view](demonstrations-view.md), [opening carousel](demonstrations-opening-carousel.md), [expandable catalog](expandable-demonstration-catalog.md), [catalog action affordances](demonstration-action-affordances.md), and [closer preview framing](closer-demonstration-previews.md).
- The existing preview capture process already creates static route-default images and an exhaustive map. This specification makes that workflow the supported path for future Demonstrations and removes fixed-count assumptions where they prevent repeatable growth.
- The future animation direction uses the project terms **Guided lesson**, **Lesson step**, and **Graph animation**. A later design should decide which steps qualify and how preview motion remains explicit, accessible, and separate from ordinary carousel selection.
