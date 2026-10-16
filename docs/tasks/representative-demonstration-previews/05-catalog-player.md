# 05 Add the lightweight catalog player

Source: [spec](../../specs/representative-demonstration-previews.md), delivery interface, playback/loading policy and acceptance 10. Depends on: [04](04-motion-pilots.md) format/contract acceptance; can proceed while task 03 finishes disjoint poster recipes.

## Goal and scope

Add one reusable preview player to `DemonstrationCollection` for the catalog and shared workspace picker. Own catalog markup/CSS, focused player tests and exact matching Slovenian/English playback-control keys. Accept a poster and optional media description; keep graph/capture details outside the player.

## Deliverables and acceptance

- Preserve the existing reserved frame, first-three eager loading, native lazy posters, cached/decode/error handling and navigation. Stills work without motion assets. Do not change homepage starting cards or carousel.
- Request clips only after activation, with at most one active video per collection. Support one-pass hover/focus activation and a separate Play/Stop/Replay button for touch and keyboard. The control is a sibling of image/title navigation, never nested inside interactive markup. Ignore focus moves within the same card.
- Use muted inline video without looping. Stop and return to the poster on completion, leaving/offscreen, document hide, filter removal, picker close and unmount. Dispose listeners/observers and ignore stale async events/play promises after replacement.
- Reduced motion suppresses automatic playback; the explicit labeled control may start one pass. A preference change to reduced motion stops current playback. No decorative transitions in this mode.
- Keep the poster visible until media can display a first frame and on failed/unsupported playback. Titles, actions, filtering and keyboard navigation stay usable during slow or failed loads. Media remains decorative; localize accessible control labels/state without announcing frames.
- Meet the source spec's request/concurrency budgets and record compressed application-code delta. Add no runtime animation/encoding dependency.

## Checks and evidence

Test activation/cancellation, focus containment, rapid card changes, deferred/failed loading, rejected playback, stale completion, reduced motion, filter/unmount cleanup and poster-only entries through the player's interface. Use browser network evidence to prove zero clip requests before activation and confirm real media playback. Run collection/page tests, localization TypeScript checking and production build. Coordinate the stable preview for catalog and picker browser checks under task 06; capture any focused checks here too.
