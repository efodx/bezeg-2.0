# Touch viewport motion previews

Status: authorized 2026-10-18.

## Behavior

On devices whose primary input cannot hover (`(hover: none)`), automatically play a preview while at least 50% of its image is visible. Stop and unload below that threshold. This applies to the catalog, workspace picker, and selected homepage preview through the shared player. Multiple sufficiently visible previews may play. Desktop retains hover/focus activation and its existing intersection requirement. Capability changes are observed live. This supersedes the touch visibility restriction in hover-motion-previews.md.

Document hiding and reduced motion always suppress playback; media rejection retains the poster. No new controls or tap interception: tapping still navigates immediately. Existing clips and mathematical runtime are unchanged.

## Acceptance and verification

- Touch visibility starts at 50%, stops below 50%, and restarts on re-entry; offscreen focus cannot override this threshold.
- Desktop hover/focus behavior remains intact, including overlap and cleanup.
- Live input-capability, reduced-motion and document-visibility changes update eligibility; listeners and media are released on disposal.
- Unit tests cover eligibility boundaries, capability changes and existing fallback behavior. Typecheck and production build pass.
- Production browser checks exercise touch catalog, picker and homepage playback, scrolling disposal, navigation and reduced motion, plus desktop hover/focus regression. Browser emulation is distinct from physical-phone verification.

## Verification (2026-10-18)

Implemented in the shared player using the live `(hover: none)` media query and intersection thresholds `[0, 0.5]`. Desktop keeps hover/focus eligibility for positive intersection; touch requires at least 50% even when focused. No route or stored-data changes.

Passed: 15 shared-player unit tests; 15 existing image/carousel tests; TypeScript; production build; all 14 production Chromium motion smoke cases, including three touch-emulation cases for catalog visibility/disposal/single-tap navigation, reduced-motion request suppression, and homepage/picker playback and cleanup. Existing build warnings remain (Sass, chunk size, JSXGraph eval). The handler reviewed the bounded diff.

Browser acceptance is based on automated Chromium checks. Independent manual smoke was blocked: the sandbox preview timed out; after an outside-sandbox preview returned HTTP 200, the browser connector reported no available browser. No manual visual or physical-phone/Safari checks were completed. Automated tests ran successfully outside the sandbox against this checkout's provenance-validated production build at base revision `4a6c092` plus the task changes.
