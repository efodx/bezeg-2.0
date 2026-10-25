# Homepage preview spacing

## Scope and approved direction

The owner approved the subtle mockup on 2026-10-25: remove the green gutters around the homepage's starting-demonstration artwork, reduce the desktop preview column from about 58% to 40%, and use a continuous cream card surface. Preserve the complete mathematical artwork, card height, green leading accent, copy, actions, and carousel behaviour.

This refines the presentation in [the homepage composition spec](homepage-carousel-and-demonstrations-catalogue.md). Catalogue previews and shared media styling remain outside scope. There are no route, storage, or preset changes.

## Acceptance

- Desktop artwork occupies 40% of the card and the copy receives the remaining space, without a vertical divider or green media gutters.
- The stage, image layers, and nested media share the existing cream preview-panel surface. Posters and motion retain proportional containment without cropping or stretching.
- Keep the existing minimum desktop height and mobile stacking at 700px; no horizontal document overflow at 390px, 724px, or 1440px in Slovenian and English.
- All six choices still select matching artwork and actions. Previous/next, keyboard selection, and motion previews remain functional.
- Verify the production build, existing homepage browser checks, and a focused visual check at desktop/mobile sizes, including enlarged text.

## Verification (2026-10-25)

Implemented and accepted locally. `just build` passed with existing Sass, script-bundling, chunk-size, and JSXGraph eval warnings. The Impeccable detector reported no findings. Four focused production Chromium tests passed (homepage navigation/layout plus carousel and touch playback/disposal). Direct browser checks passed for all six slides in Slovenian and English at 390px, 724px, and 1440px: continuous cream surfaces, contained artwork, 40% desktop column, no document overflow, 200% root text sizing, keyboard selection, and no page errors. Desktop and mobile screenshots were visually reviewed. This route-local styling change used focused browser validation under the smoke-tester skill; a full workspace smoke run and physical-device testing were outside scope.
