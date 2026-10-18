# Hover-activated motion previews

Status: authorized by the owner on 2026-10-18, alongside restoring PH quintic and subdivision clips.

## Behavior and scope

Previews show their poster until the pointer hovers the preview image/link. Keyboard focus on the corresponding existing graph navigation link provides equivalent activation (the homepage's graph action supplies this for its decorative preview). Leaving both hover and focus stops playback and restores the poster. Touch navigation remains a normal link, without a new playback button or tap interception.

This supersedes the visible-only automatic playback policy in [representative previews](representative-demonstration-previews.md). Apply the same behavior to catalog, workspace picker and the selected homepage carousel preview. Merely scrolling a preview into view must not attach or request video. Eligibility still requires intersection, a visible document and no reduced-motion preference. Reduced motion always keeps the poster. Media failures keep the poster and navigation usable. Re-entry begins a fresh loop; moving within the activation region must not restart it.

Keep the existing silent four-second clips, source maps, framing, cleanup and navigation. No new focus stops, controls, localization strings, mathematical runtime changes or playback dependencies.

## Acceptance and verification

- Shared player tests cover no request on visibility alone, hover/focus start, leave/blur stop, overlap between hover/focus, stable playback within the region, offscreen/document-hide/reduced-motion disposal, failures and stale events.
- Verify catalog, picker and carousel parity, including carousel selection cleanup. Existing image-loading and carousel-navigation tests pass.
- Run focused player/capture tests, TypeScript and production build. Smoke-test the shared path using the repository smoke-tester skill: desktop hover, keyboard focus, 390px layout/navigation, reduced motion, failures and no unhovered/offscreen requests; include both restored clips.
- Review implementation and UI/accessibility independently. Record observed checks and limitations here on completion.

## Verification record (2026-10-18)

Implemented in the shared player. Pointer hover on the preview frame and focus on its existing navigation wrapper are independent activation reasons; the homepage supplies its existing graph-action ref. The player removes its observer, focus, document-visibility and media-query listeners on unmount. Touch pointer entry does not activate hover playback or intercept navigation.

Focused player/image tests, the App test, TypeScript and the production build pass. The production Chromium smoke run passes 65 checks across motion, homepage and catalog suites: no video requests on visibility alone, hover/focus activation and overlap, disposal on leaving both, reduced motion, offscreen cleanup, media failures/stale delivery, picker/carousel parity and both restored clips at desktop/390px. Independent engineering/accessibility review found no actionable implementation issue.

The smoke-tester worker reviewed the stable production build at `b8d48b8` plus this task's changes, served locally on port 3021. Both restored clips played at actual catalog size: 323×196 CSS pixels at 1440×1000 and 341×207 at 390×844. The subdivision construction, coloured portions and polygon stayed clear; the PH quintic's larger offset remained distinct. Screenshots near 3.89 s and immediately after wrapping to 0 s showed consistent framing and no visible loop jump. The narrow catalog had no horizontal overflow. These are Chromium viewport observations, not physical-device or other-browser coverage; local preview checks do not establish deployed hosting behavior. The original 18 motion records/assets and 43 unaffected posters are unchanged.
