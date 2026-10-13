# Demonstrations opening prototype

Status: prototype for owner review; no production design selected.

## Question

What opening treatment makes `/bezeg-2.0/demonstrations` feel like the start of exploration, with gentle mathematical motion and more than the current three suggested entries, while matching Bezeg's warm graph palette?

## Prototype scope and acceptance

- Compare three structurally distinct treatments on the existing demonstrations route in development, selected with `?variant=A|B|C` and a clearly separate floating switcher. Keep the unchanged catalog below.
- Each treatment offers at least five real demonstration destinations across multiple families. Keep direct graph and available guided lesson destinations working. Do not add routes or change graph state, presets, or lesson availability.
- Use illustrations and motion rooted in curves, control points, or constructions. The visual language should use the existing cream, elderflower green, ochre, and graph-grid vocabulary rather than generic promotional effects.
- Motion must remain subtle, pause or settle for reduced-motion users, and must not be necessary to understand or use a card. Keyboard focus and narrow layouts stay usable without horizontal page overflow.
- The prototype is disposable. Development-only variant controls and query handling must be absent from production builds. No production selection or deployment is implied by this exploration.

## Review question

Choose a whole treatment or name elements to combine. Then write the selected behavior into this spec before production implementation.

## Comparison available for review

The disposable implementation is on `codex/prototype-demonstrations-opening`. Run `npm start` and open `/bezeg-2.0/demonstrations?variant=A`; use the floating arrows or the `variant` URL value to compare:

- **A — curve atlas:** one animated Bézier feature beside an index of five more demonstrations.
- **B — construction trail:** six vertically ordered entries with compact sketches.
- **C — curve map:** one large animated graph above six linked destinations.

All three use the same six real routes, keep available guided lesson links, and leave the full catalog below unchanged. Desktop and 390 px captures are in `docs/prototypes/demonstrations-opening-{A,B,C}-{1440,390}.png`. No variant has been selected for production.

TypeScript, the production build, and the existing three catalog component tests passed. Local Chromium review checked each variant at 1440 and 390 px with no horizontal document overflow, the URL switcher by click and arrow key, graph and lesson destinations, and reduced motion removing the moving point animation. The prototype has not been reviewed on a physical phone or projector.

## Owner feedback: develop C as a carousel (2026-10-13)

The six starting choices in C must remain on one horizontal line at every width. They should form a manual carousel: selecting a choice changes the prominent preview, title, short prompt, and graph/lesson actions to that Demonstration. Keep all six routes available and show a partial next choice when the row overflows, so it is apparent that the row moves. Do not wrap the row or introduce page-level horizontal scrolling.

Provide previous/next controls and direct selection buttons. The selected choice must be visually and programmatically clear, and moving selection should bring its button into view. Keyboard users can Tab to and activate any choice, and Left/Right should move between choices while focus is in the carousel without triggering the development-only A/B/C switcher. Do not autoplay. Use a distinct accurate preview for each selection, preferably the existing captured assets, and keep transitions calm with reduced-motion support. Preserve the unchanged catalog and development-only production boundary.

Variant C now uses one scrollable choice row under a route-specific preview. Captures after the entrance transition are in `docs/prototypes/demonstrations-carousel-C-{1440,810,390}.png`. Local Chromium checks at those widths confirmed one-line choice labels, direct and keyboard selection, selected state, image and route changes, choice scrolling, no initial vertical jump, and no document-level horizontal overflow. Previous/next controls worked, and reduced-motion mode removed the entrance animation. The existing catalog remains below the prototype. This is still a development-only prototype pending owner review of the carousel treatment.
