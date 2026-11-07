# Collision playground — batch B acceptance (CP7)

Source: [spec acceptance criteria](../../specs/collision-playground.md#acceptance-criteria) 1–9, for circles. [Task CP7](../../tasks/collision-playground/07-batch-b-acceptance.md). Handler 2, 2026-11-07. Batch C parts of criteria 1 and 8 belong to CP8–CP10.

| # | Criterion | Evidence | Result |
| --- | --- | --- | --- |
| 1 | Mathematics | `src/compgeo/collisions/world.test.ts`: "gives identical touching-pair sets for seeds 1-50, n in {0,1,2,10,200,1000}", "reports circles at distance exactly r1 + r2", "reports boxes sharing an edge or a corner as candidates", "sweep keeps a body active when x_max equals the next x_min", "keeps bodies inside the world", "preserves the velocity sum over a step without wall contact". Box-test counts: [CP1 notes](cp1-notes.md). Mathematical review at CP1 acceptance | pass |
| 2 | Containment | [Performance results](../../bezier-performance-results.md#collision-playground-containment-and-draw-pacing--2026-11-07), [investigation](cp7-containment-investigation.md). Chapter page, naive at its limit: no long animation frame over 50 ms; scroll p95 is 38–40 ms on desktop and 52–54 ms on mobile 4×; link-click p95 is 16 ms on desktop and 32–40 ms on mobile 4×; naive → sweep median is 21 ms on desktop and 45–52 ms on mobile 4×. Draw pacing was required for mobile scroll (77–104 ms before it) | pass |
| 3 | Bounded cost | Limits are in the spec (CP3). [Lifecycle runs](cp7-lifecycle.md): off-screen 0 snapshots in 2 s, resume when back in view. Hidden tab and idle: `useCollisionWorker.test.tsx` "pauses when the document is hidden and resumes when visible again" and "pauses after the idle timeout and does not resume by itself". Headless and headed Chromium kept `document.hidden` false, so there is no browser evidence for the hidden tab. Unmount: "terminates the worker on unmount" | pass; hidden tab has unit evidence only |
| 4 | Smoothness | Sweep at its limit: draw callback median 1 ms on desktop and 4.7 ms on mobile 4× (p95 6.5–6.9) | pass |
| 5 | Interaction and accessibility | `CollisionPlayground.test.tsx` keyboard tests ("reaches every control in order…", "operates the buttons with Enter and Space"); live-region tests ("stays empty for snapshots no action asked for", "skips an in-flight snapshot of the old method…"); "starts paused: no play command…"; "draws a ring around touching bodies only"; "renders a static explanation … and no canvas" (no-worker fallback). [Bilingual smoke](cp7-smoke.md) items 1–7 at 1440 and 390 touch. Touch targets are 44 px, except the shared Slider number field in Look underneath (40 px), which is recorded for the Controls stream | pass; the paused-switch fix is rechecked in [cp7-recheck](cp7-recheck.md) |
| 6 | Lifecycle | `useCollisionWorker.test.tsx` "leaves no listener, observer or timer after unmount". In the browser, after client-side navigation: 0 worker targets in the page's context and 0 messages in 2 s ([lifecycle](cp7-lifecycle.md)) | pass |
| 7 | Localization | `sl.ts` and `en.ts` collision keys in lockstep (CP6); typecheck and build pass; the smoke found no cross-language leftovers. Terms are recorded in `docs/localization.md` (CP6; sources are repo usage only) | pass |
| 8 | Chapter | [Smoke](cp7-smoke.md): sweep-algorithms blocks in SL and EN at both widths; Bézier chapter draw and inspect blocks work in both languages (item 8). `FamilyChapterPlayground.test.tsx`; the full `just unit src/learning` passed on 2fd33109 | pass |
| 9 | Docs | Capabilities, UI functionality and the sweep spec (CP6); ADR 0042 accepted; the performance plan links the results (CP7) | pass |

## Findings fixed during CP7

- Paused baseline was mislabelled (it was playing). Fixed in the script.
- Mobile 4× scroll p95 sat at the 100 ms line while playing. Fixed with adaptive draw pacing (spec decision).
- Live region could announce an in-flight snapshot from the old method. Fixed: it announces only a matching snapshot.
- Paused method switch posted no snapshot, so the readout and live region kept the old method (smoke item 3). Fixed: the worker re-measures the current positions with the new method (`measureWorld`, which `stepWorld` now ends with) and posts one snapshot without stepping. Tests: `world.test.ts` `measureWorld` cases (both methods agree, naive gives n(n-1)/2, measuring is idempotent and leaves positions unchanged, and matches `stepWorld`); `collisionLoop.test.ts` "posts one snapshot with the new method and its counters when paused, without stepping"; `CollisionPlayground.test.tsx` "announces the new method and updates the readout without Step or Play".
- The slider output read 299 for a count of 300 (round trip through the log position). Fixed: "shows the count at first render, not a rounded-trip neighbour".

## Open

- Hidden-tab pause has unit evidence only.
- No physical phone measurement; headless uses the software compositor.
- Reduced motion and screen readers were not smoke-tested in a browser (unit tests cover reduced motion).
