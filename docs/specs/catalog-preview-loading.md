# Calm catalog preview loading

## Scope

Smooth the initial appearance of DemonstrationCollection preview images on the demonstrations catalog and its shared workspace picker. Preserve mathematical assets, navigation, filtering, and usable card titles/actions. No route or stored preset changes.

## Acceptance criteria

- Preview space is reserved at its existing 360:220 ratio with a solid pale placeholder background, including during image loading and failures.
- Reveal each successfully loaded and decoded preview using an opacity fade of 180 ms. Reduced-motion users receive an immediate reveal without animation.
- Cached images reveal reliably; late decoding of a replaced or unmounted image cannot reveal the wrong preview. Decode failures must not produce unhandled rejections or leave successfully loaded images hidden indefinitely.
- Load the first three previews in the current filtered collection eagerly, retaining native lazy loading for subsequent previews. Do not preload the entire catalog.
- Titles, links, keyboard focus, search, topic filtering, and the workspace picker remain usable while previews are pending or failed. No spinner, shimmer, blocking loader, new dependency, or new localized copy.

## Verification

Use focused component tests for pending/decoded/cached images, failed images, and stale decode completion. Run existing collection/page tests, TypeScript, and production build. Browser-check delayed image responses, warm cache, reduced motion, filtering, and failed requests on a local production preview at desktop and narrow widths. Check the shared picker if reachable. Record any coverage limits explicitly.
