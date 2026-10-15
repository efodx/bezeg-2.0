# Demonstrations visual hierarchy refinement

**Status:** direction approved; implementation not started. This spec records the three visual changes selected from the Demonstrations page review on 2026-10-13: simplify the surface hierarchy, improve mathematical preview legibility, and make the family accordion hierarchy more decisive.

## Problem Statement

The Demonstrations page has a distinctive elderflower identity and a useful existing structure, but its visual hierarchy is flatter than it needs to be. The page grid, botanical decoration, card surfaces, preview surfaces, borders, and shadows compete at similar visual volume. The static mathematical previews are faithful, but several curves, labels, axes, and construction lines become difficult to read when reduced to catalog-card size or viewed in a classroom projection. The family accordion rows are understandable, but the expanded and collapsed states differ mainly through quiet tonal changes, so the catalog does not establish a strong visual rhythm between topic groups.

The owner approved a visual prototype that keeps the existing Demonstrations page concepts and content while making those three relationships clearer. The change is visual refinement only; it is not a new catalog model or interaction redesign.

## Solution

Refine the existing Demonstrations page in place.

1. Simplify the surface system so the page background, catalog cards, and featured opening card have distinct but restrained roles. Reduce the visual weight of the page-wide graph grid below the opening, keep the elderflower motif quiet, use one clearly elevated featured card, and rely on consistent borders and shallow shadows for the catalog.
2. Improve the legibility of route-default mathematical previews at their rendered display sizes. Adjust capture-time framing, annotation scale, stroke contrast, and preview treatment without changing route defaults, curve geometry, meaningful constructions, coordinate context, or mathematical content.
3. Make Demonstration-family hierarchy more decisive. Give an expanded family a clear shared accent rail and stronger sage-toned header surface, keep collapsed families quieter, give the family title visual priority over its count, and make the conceptual family illustration read as an intentional secondary visual rather than a faint thumbnail.

The page keeps its current section order, carousel behavior, family order, titles, routes, action destinations, Guided lesson availability, localization model, and static preview workflow.

## User Stories

1. As a student arriving at Bezeg, I want the Demonstrations page to establish one clear visual focus, so that I understand where to begin without the decoration competing with the content.
2. As a student, I want the featured Demonstration card to feel more important than the catalog cards, so that the recommended entry point is visually obvious.
3. As a student, I want page decoration to support the elderflower identity without looking like another content layer, so that the mathematical previews remain the strongest visual evidence.
4. As a student, I want the graph grid to be visible enough to connect the page to geometry but quiet enough not to interfere with card boundaries and graph labels.
5. As a student, I want catalog cards to look like a coherent set, so that I can scan several Demonstrations without each card competing for attention.
6. As a learner, I want the curve and important point labels in a preview to remain recognizable at card size, so that I can choose a Demonstration from its mathematics rather than from its title alone.
7. As a learner, I want the preview image to communicate the same default scene I will see after opening the Demonstration, so that the visual promise remains trustworthy.
8. As a learner, I want preview curves, control points, construction lines, axes, and labels to retain their meaningful relationships, so that improved legibility does not become a mathematically misleading illustration.
9. As an educator, I want preview details to remain readable on a projected desktop layout, so that the page can introduce a mathematical topic to a classroom.
10. As a student scanning the catalog, I want the expanded family to be immediately identifiable, so that I know which Demonstrations are currently visible.
11. As a student, I want collapsed families to remain visually available but secondary, so that the catalog has a clear open-versus-closed rhythm.
12. As a student, I want each family name to lead its item count, so that the mathematical area is easier to recognize than its number of entries.
13. As a student, I want conceptual family illustrations to support the family heading without overpowering it, so that the catalog remains calm and mathematical.
14. As a keyboard user, I want the stronger expanded and focused styling to preserve the existing visible focus treatment, so that visual refinement does not reduce keyboard orientation.
15. As a screen-reader user, I want the existing family disclosure semantics, localized names, hidden-state behavior, and action destinations to remain unchanged, so that the visual hierarchy does not alter the accessible catalog model.
16. As a touch user, I want the existing family-header and catalog-action target sizes to remain usable, so that stronger visual styling does not make controls harder to activate.
17. As an English-language user, I want the same visual hierarchy to work when Slovenian labels become English labels, so that longer or shorter translations do not break the composition.
18. As a learner who prefers reduced motion, I want the page to remain visually clear without relying on animation, so that the refined hierarchy works in a still presentation.
19. As a contributor adding a Demonstration, I want its route-default preview to use the same legibility treatment as existing previews, so that the catalog does not accumulate one-off visual rules.
20. As a contributor maintaining the catalog, I want the preview asset map and provenance checks to remain exhaustive, so that visual refinement does not create missing or stale Demonstration images.

## Implementation Decisions

- Keep the change within the existing Demonstrations page presentation and static preview workflow. Do not add routes, alter route metadata, change the catalog content model, or introduce a second preview system.
- Preserve the current page hierarchy: shared header, page introduction, starting-Demonstrations carousel, full Demonstrations catalog, independently expandable families, and catalog cards.
- Treat the page background, featured opening, topic container, preview canvas, and card footer as a small local surface system with consistent border, radius, and shadow roles. Avoid stacking multiple equally prominent surfaces around one piece of content.
- Retain the calm cream, ivory, sage, dark green, ochre, graph-grid, and low-contrast botanical palette. The grid and botanical motif remain decorative and outside assistive-technology reading order.
- Reduce the graph-grid’s visual emphasis below the opening section rather than removing the graph reference entirely. The featured opening remains the strongest place for page texture and the botanical identity.
- Give the featured opening card the clearest elevation and visual contrast. Catalog cards use quieter boundaries and shallow or no shadows so the page does not read as a stack of equally elevated panels.
- Improve previews through the established route-default capture workflow. Capture-time changes may adjust framing, annotation scale, line weight, contrast, and preview-surface treatment; they must not change graph state, route defaults, curve geometry, construction meaning, coordinate context policy, or mathematical labels.
- Preserve the existing per-route coordinate-context policy. Coordinate-dependent previews may retain axes, ticks, grid, and labels where they explain the Demonstration; geometric previews may continue to use the closer framing policy when coordinate context is not meaningful.
- Keep every meaningful scene element inside the preview frame with equal geometric scale where required. A preview may become more legible through presentation treatment, not by omitting evidence or inventing a more attractive scene.
- Style the expanded family with a shared dark-green leading accent, a stronger sage-toned header surface, and a clear boundary between the header and its card grid. Keep collapsed families quieter through the existing cream surface and a lighter boundary.
- Give family titles primary typographic weight. Keep item counts and sequence numbers secondary, aligned consistently, and visually subordinate to the family name.
- Preserve conceptual family illustrations, but give them a deliberate visual slot, sufficient contrast, and stable sizing so they read as supporting topic marks rather than incidental low-contrast thumbnails.
- Preserve current carousel timing, manual takeover, reduced-motion behavior, accordion semantics, visible action labels, focus indicators, touch targets, and route destinations. This spec does not introduce pause controls, search, new catalog navigation, card-wide links, or additional metadata.
- Keep Slovenian as the default and keep the existing typed localization contract. The visual treatment must tolerate both Slovenian and English labels without relying on fixed text widths or untranslated copy.
- Use the approved visual prototype as directional evidence only. Generated prototype text, counts, and placeholder Demonstration names are not production content; production content continues to come from the existing Demonstration metadata and localization catalogs.

## Testing Decisions

- Use the existing Demonstrations page route/component seam as the primary visual-behavior seam. Tests should observe the rendered page structure, family expansion state, selected starting Demonstration, visible action labels, route destinations, localization, and focus behavior rather than CSS selector details.
- Use the existing preview-generation and asset-map seam for preview coverage. Verify that every active Demonstration still has exactly one generated route-default preview, that the manifest and typed map remain exhaustive, and that capture provenance remains available for review.
- Review the page at 390, 724, and 1440 CSS pixels. Check that the surface hierarchy remains clear, the graph grid and botanical motif stay quiet, expanded and collapsed families are distinguishable, family illustrations do not crowd titles, and there is no horizontal overflow.
- Review representative previews from Bézier, De Casteljau, rational, spline, PH, and function families at their actual card display sizes. Check curve shape, construction lines, control points, labels, axes or coordinate context where meaningful, scene containment, and annotation readability.
- Use a visual contact sheet or equivalent review to compare the preview set at common card scale. A good review catches thin strokes, clipped labels, inconsistent framing, or one route receiving a visually special treatment without a documented reason.
- Check that the existing carousel, disclosure controls, catalog actions, keyboard focus, and localized labels continue to behave as before. The visual change must not cause a family panel to hide focusable content incorrectly or change a link destination.
- Run the existing focused Demonstrations page tests, TypeScript checking, and the production build after implementation. Add tests only for observable regressions introduced by this spec; do not encode exact color values, shadow blur, or other implementation-specific CSS details as behavioral contracts.
- Run the smoke-test workflow for the Demonstrations route because the change affects rendering and interaction-path presentation. Include representative opening-carousel selection, family expansion, catalog action navigation, Slovenian and English labels, and the reviewed viewport sizes.
- The proposed seams are therefore: one page-level route/component seam for layout and state preservation, plus the existing preview-capture seam for route-default image legibility and coverage. No new test seam is needed.

## Out of Scope

- Reordering or replacing the Demonstrations page sections, starting carousel, family grouping, family order, Demonstration titles, routes, or lesson availability.
- Adding search, filtering, expand-all controls, sticky navigation, card-wide links, pause/play controls, or other catalog and carousel behavior changes.
- Changing curve mathematics, graph runtime rendering, graph controls, route defaults, Presets, Guided lesson content, Guided lesson runtime, or graph animation.
- Replacing the existing static route-default preview workflow with live catalog boards, user-specific scenes, hand-authored per-route artwork, or an animation system.
- Removing meaningful mathematical content from previews to make thumbnails look cleaner. Any per-route coordinate-context or capture policy changes must remain within the existing preview specification and be justified by the Demonstration’s mathematical meaning.
- Introducing a broad design-system, renderer, build-tool, or typography migration. The implementation should remain a bounded Demonstrations page refinement.
- Changing the language model, adding new user-facing copy beyond what is required to support the existing visual hierarchy, or weakening localization type checking.
- Creating an implementation task document. A task breakdown should be created only after this spec is reviewed and the owner asks for implementation.

## Further Notes

- This is a follow-up to the existing Demonstrations visual-refinement, closer-preview-framing, expandable-catalog, and action-affordance decisions. It narrows the next visual pass to three approved directions instead of reopening the page’s information architecture.
- The current live page and its existing specifications remain the source of truth for content, routes, behavior, preview coverage, and localization. The generated prototype is a visual reference, not a source of production copy or route counts.
- Before implementation, confirm that the two proposed test seams match the owner’s expectations: the Demonstrations page route/component seam for hierarchy and preservation, and the preview-generation seam for mathematical preview legibility.
