# Homepage carousel and dedicated demonstrations catalogue

**Status:** visuals approved and implementation authorized by the owner on 2026-10-15. Implementation and verification are recorded in [the review](../reviews/homepage-carousel-and-demonstrations-catalogue.md).

## Problem

The owner wants to retain the existing starting-demonstrations carousel, but give it a clearer role. On the Demonstrations page its large preview and choice strip precede the complete catalogue, delaying deliberate topic browsing. The homepage currently introduces Bezeg through a standalone curve illustration and a catalogue link, although the carousel offers a more useful introduction to the actual demonstrations.

## Confirmed direction

Give the two existing pages distinct jobs:

- The homepage supports discovery through a compact introduction and the existing carousel. Visitors can open a demonstration or an available Guided lesson directly.
- The Demonstrations page supports deliberate browsing through the existing independently expandable topic catalogue, immediately after its introduction.

This is a bounded change to page composition and carousel ownership. It preserves the elderflower identity, mathematical preview assets, catalogue cards, demonstration metadata, graph routes, and Guided lesson availability.

## Homepage composition

Use the existing shared header, followed by:

1. The existing eyebrow, headline, and introduction: “Bezeg · Raziskuj krivulje”, “Matematika, ki jo lahko premakneš.”, and “Spremeni točko ali parameter. Opazuj obliko. Razumi povezavo.”
2. An explicit **“Vse demonstracije →”** shortcut to `/bezeg-2.0/demonstrations`, positioned near the introduction and before the carousel in visual and reading order. Reuse the existing `all_demonstrations` translation and its English counterpart. This replaces the homepage's “Začni raziskovati” action label.
3. The full-width starting-demonstrations carousel, retaining the “Začetne demonstracije” section label and its large selected preview, family, title, prompt, graph/lesson actions, previous/next controls, position counter, and compact horizontal choice strip.
4. The existing project description, author/mentor attribution, and contact information beneath the carousel. Preserve the actual localized footer content.

Replace the standalone homepage curve illustration and its caption with the carousel. Keep the introduction compact rather than stacking the old two-column hero above another large showcase. Retain existing cream, ivory, sage, dark green, ochre, and restrained elderflower styling; this does not authorize a new logo, typography system, or mathematical art direction.

At 1440 × 900 CSS pixels and normal text size, target a first viewport containing the shared header, introduction, catalogue shortcut, selected preview, actions, arrows, and choice strip. Preserve readable mathematical annotations and comfortable controls when balancing spacing. The footer may fall below that viewport. Do not impose a fixed-height layout that clips enlarged text or longer translations.

At narrow widths, allow natural vertical scrolling. Keep the preview and copy readable, stack the selected card as needed, and retain the existing single horizontal choice strip with internal scrolling. A partially visible next choice is intentional; page-level horizontal overflow is not.

## Carousel behaviour

Relocate the existing experience rather than creating a second implementation. The detailed interaction contract in [the opening-carousel spec](demonstrations-opening-carousel.md) remains authoritative except for its old placement above the catalogue.

- Keep the six existing IDs and order: `bezier`, `bernstein`, `rational`, `spline-c1`, `ph-cubic`, and `derivative`. Read localized names, prompts, paths, and family information from existing metadata; use the current six-choice selection rather than the older three-entry `starting` metadata list.
- Select the first choice on a fresh homepage mount. Advance every six seconds with wraparound when the page and carousel are visible and automatic advancement is permitted.
- Hover or focus temporarily pauses advancement. Resuming starts a full interval; there is no catch-up after inactivity.
- Explicit selection, previous/next, Left/Right navigation, and manual choice-strip interaction take lasting manual control for that page visit. Hover/focus alone remains a temporary pause.
- Reduced-motion users receive the existing manual experience. Automatic changes do not steal focus, scroll the document, or repeatedly announce the preview.
- Update preview, title, prompt, family, graph action, and available lesson action together. Preserve keyboard navigation, selected-state semantics, visible focus, full accessible names, touch targets, and internal strip scrolling.
- Preserve document-visibility and viewport-visibility handling, timer/listener/observer cleanup, and the existing visit-scoped state. No carousel-position persistence is introduced.

## Catalogue composition and behaviour

Use the existing shared header and one page introduction:

- Heading: **“Demonstracije”**.
- Instruction: **“Raziskuj po temah. Začni s tistim, kar te zanima.”** (`explore_by_topic`).
- Topic/demonstration count derived from current metadata; it is currently seven topics and 34 demonstrations, rather than a hardcoded copy of older spec counts.

Begin the family accordions immediately afterward. Remove the carousel and the redundant “Vse demonstracije” section heading from this page. Keep a coherent heading outline and an accessible name for the catalogue without introducing a second visible page introduction.

Preserve family order, conceptual family illustrations beside their titles, independent disclosure operation, card previews, separate graph/lesson actions, and current responsive card layout. The first family, **Osnove**, opens on a fresh mount; all others begin closed. Opening another family does not close the first. Expansion remains local component state and resets on a fresh mount, with no saved expansion preferences. Keep the existing explanatory note about family illustrations and route-default demonstration scenes.

## Acceptance criteria

1. `/bezeg-2.0/` presents the compact introduction, explicit catalogue shortcut, carousel, and existing attribution/contact footer, with the standalone curve illustration replaced.
2. `/bezeg-2.0/demonstrations` is catalogue-only and starts with one heading, the topic-browsing instruction, derived count, and existing family accordions. It contains no starter carousel or redundant catalogue heading.
3. The six existing carousel choices, selected preview/actions, timing, pauses, manual takeover, reduced-motion behaviour, and keyboard/touch workflows operate on the homepage as before.
4. The carousel's first-view composition is reviewed at 1440 × 900 in both languages. Choice labels may ellipsize and the strip may overflow internally; readable text, mathematical previews, and usable controls take precedence over showing all six tiles simultaneously.
5. Review both routes at 390, 724, and 1440 CSS pixels, including enlarged text. There is no document-level horizontal overflow, clipped action, obscured focus, or forced fixed-height viewport layout.
6. All current catalogue entries remain reachable. Osnove is initially open, independent expansion and hidden-panel focus exclusion work, and a fresh mount restores the existing default.
7. The shared header's Demonstrations link and homepage shortcut reach the catalogue; the brand reaches home. Carousel and catalogue actions retain their existing graph and supported `?learn=1` destinations. Direct loading, refresh, and back navigation work for both existing page routes.
8. Preview assets, mathematical scenes, graph routes, Presets, stored data, and lesson content/availability retain their current behaviour. The home and catalogue mount no live mathematical boards.
9. Slovenian remains the default. Reuse existing typed localization keys where possible and keep Slovenian/English catalogues in lockstep if copy changes require additions.
10. Update page-ownership descriptions and affected tests with implementation. Record actual browser evidence and any incomplete device or projector coverage.

## Implementation boundary

The current `WelcomePage.tsx` owns the introduction, static illustration, and footer. `DemonstrationsPage.tsx` currently owns both the carousel and catalogue. Extract or relocate the carousel's presentation, state, data selection, and styles into a clearly owned component used by the homepage; keep catalogue disclosures with the catalogue. Avoid mounting duplicate carousel instances or coupling the welcome route to catalogue-only styles through incidental selectors.

Keep mathematical graph owners and hosting/runtime concerns separate. The app remains static and client-only. Dispose of page-owned timers, media-query/visibility listeners, and viewport observers on navigation. Do not create a parallel metadata source, preview pipeline, or new dependencies for this move.

Routes and stored data do not change. The user-visible change is where discovery begins: the homepage now contains the starters, while the existing catalogue route opens directly onto topics. No URL alias, preset migration, or storage reset is needed.

## Verification for implementation

- Use the homepage and Demonstrations route/component seams. Move existing carousel behavioural coverage to its new host; retain catalogue coverage at its current route. Test observable selection, links, timing, manual takeover, reduced motion, mount/unmount, default expansion, and hidden-panel access, without asserting internal extraction details or exact CSS values.
- Run the relevant existing focused tests, `npx tsc --noEmit --pretty false`, and the production build through the project's established scripts. Localization changes require both TypeScript and production-build success.
- Use the smoke-tester workflow and browser checklist for both affected routes. Cover homepage selection and autoplay/manual control, catalogue navigation/disclosures, graph and available lesson entry, return navigation, production assets, direct loading/refresh, both languages, focus, and the specified viewport sizes. This bounded page change does not itself require full workspace or lesson-runtime smoke coverage.
- Use the current route-default previews and verify asset loading; no regenerated mathematical imagery or changed geometry is expected. Static image mockups do not establish behaviour, responsive fit, accessibility, or mathematical correctness.
- Update architecture/page-ownership guidance when implementation changes it. Update hosting guidance only where it describes the changed entry flow; URL and fallback behaviour remain the same.

## Relationship to previous specifications

This confirmed brief takes precedence for homepage/catalogue composition and carousel placement over:

- [Dedicated demonstrations view](../reviews/interface-implementation-history.md#dedicated-catalogue-and-topic-presentation): the homepage now owns featured starting demonstrations rather than only an introduction and standalone illustration; the dedicated catalogue remains.
- [Opening carousel](demonstrations-opening-carousel.md): the homepage becomes its host; its detailed interaction contract remains in force.
- [Selector and topic refinement](../reviews/interface-implementation-history.md#dedicated-catalogue-and-topic-presentation): preserve its compact choice tiles and thumbnail/title grouping, while replacing its old placement-preservation requirement.
- The existing local `demonstrations-visual-hierarchy.md` draft: its requirement to preserve the old section order is superseded. Its broader preview/surface refinement is separate work; the draft is left untouched by this specification.

The independently expandable catalogue and faithful route-default preview decisions remain in force. Earlier route prefixes, family counts, and demo counts in historical acceptance evidence are not current implementation inputs.

## Mockup record and scope

Source: the 2026-10-15 design interview, with explicit confirmation of the complete brief. Built-in image generation is used for an exploratory homepage view and catalogue view. These images answer the composition question; generated text, dimensions, logos, and mathematical marks are not production assets or authoritative content. The owner approved the final homepage and catalogue accuracy revisions on 2026-10-15. Their prompt record is `bezeg-homepage-catalogue-mockup-prompts.md` in the originating conversation artifact directory; the existing production previews and logo remain authoritative assets.

The original design delivery recorded the specification and image studies only; the subsequent implementation follows this bounded brief. Sidebar navigation, search/filtering, new card descriptions, new carousel controls, altered timing, new preview artwork, and broader catalogue redesign remain outside this scope.
