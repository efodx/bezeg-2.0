# Collision playground — batch C acceptance (CP10)

Source: [spec acceptance criteria](../../specs/collision-playground.md#acceptance-criteria) 1–8 for polygons ([release batches](../../specs/collision-playground.md#release-batches)). [Task CP10](../../tasks/collision-playground/10-batch-c-acceptance.md). Handler 4, 2026-11-08. Measurements: [performance results](../../bezier-performance-results.md#collision-playground-polygon-containment-and-sprite-drawing--2026-11-08), raw JSON in [cp10/](cp10/).

| # | Criterion | Evidence | Result |
| --- | --- | --- | --- |
| 1 | Mathematics (batch C) | `src/compgeo/collisions/polygonModel.test.ts`: "has a hull containing every template vertex (exact orient >= 0 against each hull edge)", "has strictly convex pieces whose doubled areas sum exactly to the template area", "agrees with an independent integer SAT for every template pair over a grid of offsets", "both broad phases and the direct piece test agree" (seeds and sizes in [CP8 notes](cp8-notes.md)), shared-edge, shared-vertex and notch cases. Mathematical review in CP8 | pass |
| 2 | Containment | Polygon block on `/bezeg-2.0/learn/convexity-hulls`, both overlays (boxes, pieces), limits 3 000 / 3 500: naive at its limit no frame over 50 ms on either profile; scroll p95 39–41 ms desktop, 66–73 ms mobile 4×; link-click p95 16 ms desktop, 32 ms mobile 4×; naive → sweep median 15–23 ms desktop, 79–90 ms mobile 4× | pass after fix |
| 3 | Bounded cost | Step limits by the CP3 rule (CP9), lowered for drawing cost in CP10 and recorded in the spec. Off-screen: 0 snapshots in 2 s on both profiles, resumes when scrolled back. Hidden tab and idle: unit evidence only (`useCollisionWorker.test.tsx`), as for batch B; headless Chromium kept `document.hidden` false | pass (hidden tab unit-only) |
| 4 | Smoothness | Sweep at its limit (3 500): draw median 2.6–2.8 ms desktop, 15.7–15.9 ms mobile 4× (p95 21–25 ms) | pass after fix |
| 5 | Interaction and accessibility | [Smoke](cp10-smoke.md): keyboard on desktop and touch at 390×844 in SL and EN, targets ≥ 44 px, no overflow, named readouts, live region silent during Play and speaking after method, count, Step and New, nonzero box tests after a paused count change, rings centred on touching bodies. `CollisionPlayground.test.tsx` polygon tests: stage radio group and tab order, removed-pair readouts, "speaks only after a reader action…", per-stage drawing, touching sprite and alpha, sprite rebuild on remount | pass |
| 6 | Lifecycle | After client-side navigation from the chapter: 0 worker targets, 1 of 1 page workers terminated, 0 messages in 2 s, both profiles and overlays. `useCollisionWorker.test.tsx` "leaves no listener, observer or timer after unmount"; the sprite cache is component-owned and reset on unmount | pass |
| 7 | Localization | `sl.ts` and `en.ts` polygon keys in lockstep (CP9); `just check` (typecheck, lint, full unit suite, build) passed on the CP10 tree; smoke: live language switch updates legends and readouts | pass |
| 8 | Chapter | [Smoke](cp10-smoke.md) covers `/bezeg-2.0/learn/convexity-hulls` in both languages at both widths; sweep-algorithms circle and inspector blocks still work (circle limits 4 000 / 5 000 unchanged). D1 link from the Bézier hulls section rechecked in [CP9 smoke](cp9-browser.md) | pass |

## Findings fixed during CP10

- **Polygon drawing missed criteria 2 and 4** as pushed in CP9. Per-frame Path2D drawing of every vertex took 85 ms (desktop) and 365 ms (mobile 4×) per frame at 5 000 boxes, and 2 144 ms throttled with pieces. The task routes a miss to the owner before release; batch C was already live, so the handler fixed it and recorded the decision in the spec instead. Fix: per-template sprites, plus polygon limits lowered from 4 500 / 5 000 to 3 000 / 3 500 because the throttled draw still grew with the body count. Moving drawing into the worker with `OffscreenCanvas` was not tried; that is a separate migration.
- Review: stale limits in `docs/capabilities.md`; missing tests for the touching sprite, cache lifetime and template bounds; ring off-centre by up to half a pixel. All fixed.

## Open

- Hidden-tab pause has unit evidence only. No physical phone was measured; headless uses the software compositor.
- The smoke checked overlay line styles visually on English desktop only. Sweep-algorithms was not rechecked at mobile size.
