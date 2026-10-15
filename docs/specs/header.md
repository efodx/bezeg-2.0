# Shared header

## Aesthetic alignment — 2026-10-15

Bring the shared header into the current homepage/catalog visual language: warm paper (#f7f5e9), forest green (#19372f / #244c37), soft rounded controls, and restrained botanical gold (#b88a43). Preserve the elderflower brand and existing navigation, localization, and notices. Limit implementation to header styling; do not change global palette tokens used by other components.

Acceptance: the header feels continuous with the home/catalog background; the brand and controls have at least 44px targets, visible keyboard focus, distinct hover/current states, and no header overflow at 390px or at 200% text size. Check home, catalog, and a graph route at desktop/narrow sizes, language switching, and header navigation against a production preview. Build and TypeScript must pass. Physical projector/device review is outside this browser check.

Verification: TypeScript and production build passed (existing Bootstrap Sass and JSXGraph warnings). A delegated Chromium production-preview check covered home, catalog, and `/bezeg-2.0/bezier/curve` at 1440×1000 and 390×844: 44px header targets, no horizontal overflow, visible keyboard focus and Enter navigation, hover/current styling, and SL/EN switching with unchanged graph SVG paths. Doubling header text sizes at 390px retained header fit on all three routes; this was CSS text enlargement, not browser zoom. No console/page/request errors were observed. Handler reviewed desktop home and mobile graph captures. Sandbox dependency-resolution/loopback restrictions required running the build and preview outside the sandbox; package manifests and lockfile are unchanged. Physical-device/projector checks remain outside coverage.

## Original implementation

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
