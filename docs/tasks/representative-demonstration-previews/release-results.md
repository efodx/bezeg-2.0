# Representative preview release verification

Source: [spec](../../specs/representative-demonstration-previews.md), tasks 05–06. Capture details and supported-control limitations are in [capture results](capture-results.md).

## Delivered behavior

The catalog and shared picker use 45 genuine 720×440 posters and three optional silent WebM clips. Every clip is three seconds with 72 frames at 24 fps. Encoded sizes are 10,616 bytes for repeated subdivision, 17,802 for bisection, and 25,612 for Bézier movement. Media is imported with `?no-inline`, attached only on activation, muted and inline, and never loops. One collection owns one activation generation. The localized sibling control supports Play, Stop and Replay; reduced motion permits explicit playback while suppressing automatic activation.

The first three filtered posters remain eager, later posters remain native-lazy, and existing decode/cache/error behavior remains covered. Completion, leaving the card, filtering, offscreen removal, document hiding, picker close and unmount return to the poster. Stale media events and play-promise rejections cannot affect a replacement. Homepage assets, route defaults, lessons, presets and mathematical implementations are unchanged.

## Stable checkpoint and checks

The starting revision was `d4bff5638dcee2da1b6bdaf177b81fda785657a2`, initially clean. The manifest records mathematical-source fingerprint `7f915616d9b973b00d7f93d4f79950d463b23f72364b6821197409ac3f6effd7` and no relevant dirty mathematical files. Capture used the verified `index-CXDMgzcE.js` production module; final integration builds include the player fixes and generated delivery map.

| Check | Observed result |
| --- | --- |
| Exhaustive recipes, poster map, dimensions, hashes and motion provenance | Passed for 45 distinct posters and three clips. |
| Focused capture tooling | Seven Node tests passed, including semantic corruption, fixed cameras and publication/copy/pruning rollback. |
| Focused player and poster loading | 23 tests passed, including real component lifecycle, touch modality, contained focus, explicit-pass identity, document hiding, failures and stale promises. |
| TypeScript, all unit tests, production build | `just check` passed: 140 files, 2,444 tests, then production build. |
| Production Chromium browser suite | 67 tests passed across `demonstrations`, `library-picker` and the new eight-case `demonstration-motion` suite. |
| Mathematical invariance | Existing Bézier polynomial/rational subdivision and elevation checks plus bisection and metadata checks passed; all mathematical/default/lesson/route source diffs are empty. |
| Two-speed generation | All 72 Bézier point arrays and curve-path hashes, all discrete checkpoints and every camera agreed. Endpoints and stationary controls are exact. |
| Independent reviews | Mathematical/engineering and visual/accessibility reviews completed; all actionable findings were corrected and rechecked. All 45 posters were reviewed at 360×220, plus decoded frames 0/35/71 from each clip. |

The browser suite observed zero clip requests before activation, native decoding at 720×440, `video/webm` responses, one active clip, hover/focus/explicit keyboard and actual touch events, reduced-motion cancellation, offscreen/filter/picker cleanup, delayed and failed media, retained navigation and 390px overflow checks. Existing picker tests also exercised edited-scene retention, current-graph selection and lesson entry. Full lesson browser traversal was outside this change; lesson source/runtime stayed unchanged.

Command logs remain ignored under `.command-logs/`: full check `2026-10-16T17-38-52-168Z-33212-9ea6fc20.log`, build `2026-10-16T17-41-01-011Z-33212-9d25fccf.log`, browser suite `2026-10-16T17-41-16-827Z-50728-5a278964.log`, focused player `2026-10-16T17-30-33-704Z-25780-49b74603.log`. Browser-run warnings concern `NO_COLOR`/`FORCE_COLOR`; build warnings include existing dependency direct-eval diagnostics.

Application JavaScript totals 1,369,554 gzip bytes versus the source-verified baseline 1,368,227: **+1,327 bytes** across all JS chunks. The three clips total 54,030 bytes and are separate assets. No application dependency was added. WebM is the delivered pilot format; no observed target-browser failure required MP4.

## Acceptance scope and remaining limits

Implementation and local automated acceptance are complete. Two static scene targets retain explicit scope limits: existing extrapolation controls replace the original representation and cannot fully distinguish its original interval; spline parameterization shows twelve markers but its count is inspector-only. These targets are not claimed fully satisfied, and no owner-approved runtime expansion or deferral is inferred. The proposed dispositions are documented in capture results.

Physical device/projector, Safari/WebKit, Firefox and screen-reader review were not performed.

## Independent smoke observations

The smoke-tester worker used fresh installed Chrome and Edge contexts against the handler's verified production preview on port 4300, at 1440×1000 and 390×844. It observed all three clips decoding at 720×440 with HTTP 200 `video/webm`, no clip requests before activation, and no console/page errors. Card-size rendering was legible; the narrow catalog had no horizontal overflow. Reduced-motion hover retained the poster, and explicit Play/Stop worked. A real point drag changed graph geometry; picker playback/cancel/reopen retained that edited graph exactly. A keyboard De Casteljau slider change from 0.50 to 0.51 changed the construction. Fresh contexts were closed and shared storage was untouched.

Actual document-hide browser verification was **blocked**: headless Chrome's frozen lifecycle left `document.visibilityState` visible. The component test exercises a hidden visibility state and verifies cancellation/listener removal, but that is not a real hidden-tab browser pass. True 200% browser zoom was **skipped** because headless keyboard zoom did not alter the viewport or pixel ratio. Narrow-screen/keyboard coverage is separate evidence. Screenshots remain ignored in `.command-logs/smoke-worker-2026-10-16/`.

The full unit run rewrote only the line endings of an unchanged PH snapshot. That incidental write was restored, and the final mathematical-source fingerprint again exactly matches the capture manifest. The final rebuild passed (`2026-10-16T17-48-05-914Z-63660-f7f23aed.log`): inputs `5255ca6af7e810df00678eaafbd6273bb919e2d5a3e9311c0794994dbdd4cf73`, output `1ade4e2104aeb1bbe874c28e6ffb2818db16751474a92495e5d70ad22e272386`. The output digest is exactly identical to the build exercised by all browser checks, so no browser rerun was needed for that formatting-only cleanup.
