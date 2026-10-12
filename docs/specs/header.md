# Shared header

Status: implemented and browser-verified. Physical-device and projector review remain follow-up evidence.

The owner selected header prototype A on 2026-10-08 for the whole app. Use a quiet, warm off-white header with elderflower + Bezeg at the left, one demonstration menu, and the real language selector at the right.

Acceptance criteria:
- The same header appears on the home page, all demonstration routes, and presentation views; brand stays visible on narrow screens.
- All 26 existing demonstrations remain reachable through a grouped menu with the current route indicated.
- Navigation and menu dismissal work with keyboard and pointer; essential controls have visible focus and 44px targets.
- Slovenian/English selection retains existing persistence, export locking, and failure notices. New labels are translated.
- At 390px there is no horizontal page overflow. Desktop styling matches prototype A.
- Remove the development variant switcher and losing variants. Existing variant URLs simply show the accepted header; routes and preset contracts do not change.

Scope: app header only; mathematical rendering, workspace layout, home content, build tooling, and hosting are unchanged. Verify TypeScript, production build, representative desktop/mobile routes, menu navigation and language switching. The original comparison is preserved at commit `1a90bf1` on `codex/header-prototype`.

Implemented on `codex/shared-header`. TypeScript and production build passed (existing repository warnings remain). Fourteen existing localization tests passed, including persistence and export-lock behavior. Browser smoke checks covered the home page and all 26 demonstrations: each demonstration showed one shared header, its title, and an SVG graph. At 390px the header fit without horizontal overflow; menu navigation, active-route indication, Escape dismissal, Slovenian/English switching, and presentation access were checked. Captures: [desktop](../reviews/header-desktop.jpg), [mobile](../reviews/header-mobile.jpg). Physical-device and projector checks remain outside this browser verification.
