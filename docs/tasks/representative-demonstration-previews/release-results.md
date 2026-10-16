# Representative preview release verification

Source: [spec](../../specs/representative-demonstration-previews.md), tasks 05–06. Exact capture provenance, regeneration instructions and scene limitations are in [capture results](capture-results.md).

## Owner revision and delivered behavior

The owner's local visual review superseded the first delivery's one-pass hover/focus activation, playback buttons, single-active-clip policy and homepage exclusion. The current catalog, picker and selected homepage carousel layer share one graph-free player and the same asset maps. No duplicate carousel assets are introduced; carousel choices, layout and six-second advancement remain intact.

All 45 posters are genuine 720×440 route captures. Six silent four-second, 96-frame WebM clips loop automatically while their preview frames are visible. Bézier movement is larger and has endpoint holds; subdivision and bisection have readable discrete holds. Affine rotation returns through supported inverse steps. Polynomial and rational elevation show original/elevated/original representations of the same curve on one board. Their posters use the original representation, replacing split-image compositions.

There are no thumbnail playback buttons. Multiple visible clips may run concurrently. Offscreen, hidden-document and reduced-motion previews have no attached video source. Each visible session owns its video instance, source release and stale-event guards. The poster remains visible until a decoded video frame is ready and on failure. Navigation, filtering, decoded-image handling and first-three eager/native-lazy poster loading remain available.

## Stable checkpoint and evidence

The revision starts from first-delivery HEAD d889661. Mathematical-source fingerprint remains 7f915616d9b973b00d7f93d4f79950d463b23f72364b6821197409ac3f6effd7 with no relevant mathematical source edits. Runtime defaults, route registrations, lessons and presets are unchanged.

- Generated validation passed for all 45 posters and six clips, including dimensions, hashes, maps, provenance, budgets and exact mathematical samples.
- Capture tooling: 9/9 Node tests passed, including elevation invariance, affine rotation, corruption rejection and publication rollback.
- Focused player/poster/homepage tests: 21/21 passed; worker TypeScript check passed.
- Independent source and mathematical review: no open findings. Lifecycle guards and thumbnail target height were repaired during review. Single-board elevation frames and peak affine/Bézier frames were inspected. Rational elevation intentionally suppresses overlapping central weight annotation under the existing annotation policy; all numerical weights are still validated.

Integrated unit, build, browser and budget results are recorded below.

## Acceptance limits

Two existing static targets retain explicit limits: extrapolation controls replace the original representation and cannot fully distinguish its original interval; spline parameterization displays twelve markers but its count is inspector-only. These targets are not claimed fully satisfied. This task adds no mathematical runtime feature to resolve them.

Physical-device/projector, Safari/WebKit, Firefox and screen-reader checks are not performed. Actual hidden-tab behavior and true browser 200% zoom require suitable browser access; simulated visibility tests and narrow-layout checks are separate evidence.

## Revised integrated verification

The full unit run passed: **139 files, 2,434 tests** (175.4s), log `.command-logs/2026-10-16T18-10-20-444Z-60584-2fa7cb94.log`. Obsolete button/controller tests were replaced by visible-loop lifecycle coverage. The runner's incidental PH snapshot line-ending rewrite was restored; there is no mathematical source diff. TypeScript and production build passed via `just check-localization` (16.7s), log `2026-10-16T18-13-33-794Z-12860-aa7e05a8.log`.

Application JavaScript totals **1,369,094 gzip bytes**, versus the original source-verified baseline 1,368,227: **+867 bytes**, and 460 bytes smaller than the first player delivery. All six clips total **97,510 bytes**, each below 29 KB and imported as separate assets with `?no-inline`. No runtime dependency was added.

Two-speed generation produced identical 96 Bézier point arrays, curve path hashes, strokes and cameras at 0ms/125ms extra settling. FFprobe confirmed all six clips are silent, 96 frames and four seconds. Native Chromium decode/play/seek checks passed for all six capture outputs; integrated app browser results follow.

Production Chromium coverage is complete across **69 cases**: 68 initial passes and the corrected focused loop case, logs `2026-10-16T18-14-11-016Z-26948-e90cfcae.log` and `2026-10-16T18-16-36-210Z-54464-1dfacf5f.log`. Two initial assertions in that case were corrected: the target selector matched thumbnail and title links, and the 1000px viewport legitimately contained multiple motion cards. The corrected check measures the thumbnail link and proves every requested clip corresponds to an actually visible frame. Native playback crosses the four-second boundary and loops. Other cases cover all six decoders, simultaneous loops, hover/focus identity, reduced motion, offscreen/filter/picker/carousel disposal, delayed/failed media, navigation, retained edited scenes and homepage containment at 390/724/1440px in both languages.

Independent smoke used installed Chrome and Edge at 1440×1000 and 390×844 against the verified production preview. Both decoded all six clips at 720×440/four seconds with muted looping and no playback controls. No page/console errors or failed requests were observed. Desktop/mobile screenshots showed single-board affine and elevation scenes, contained home media, usable graph links and no horizontal overflow. Catalog and homepage Bézier used identical poster/video URLs. This delegated lane was selected because the player crosses catalog, picker and homepage workflows; unchanged graph interaction baselines were already exercised in the first delivery, while current automated picker checks cover edited-scene retention.

The final formatting-only rebuild passed, log `2026-10-16T18-19-22-217Z-37028-4d3b7824.log`. Source inputs are `71247f3abb2e7a3248b886fe10d3b8896a7076f17743dac1145558d1302d902e`; output is `72665722d4b21dc1b3fb0061de49900af34df8e1caedd71b4ccf72f240581491`, exactly identical to the production build exercised by all browser checks. The mathematical-source fingerprint remains identical to the manifest.
