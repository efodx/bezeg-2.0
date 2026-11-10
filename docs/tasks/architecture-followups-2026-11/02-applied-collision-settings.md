# 02 — Confirm applied collision settings

Status: planned, 2026-11-10. Source: [applied collision settings specification](../../specs/architecture-followups-2026-11.md#2-applied-collision-settings), acceptance C1–C5. Independent of tasks 01 and 03.

## Outcome and scope

A reader action is applied once by the worker and confirmed by an identifiable result carrying the actual settings. The Run view no longer sends a compensating count command or guesses completion from matching snapshot values.

Own `src/learning/playground/collisions/CollisionPlayground.tsx`, `useCollisionWorker.ts`, `collisionProtocol.ts`, `collisionLoop.ts`, the thin worker entry if needed, and focused tests. Preserve the pure collision model, canvas pacing, shape/method limits and master's shared controls, settled live readout and pause-before-edit policy. Update selectors in the existing containment harness if needed to exercise those current controls; keep its measurement definitions and limits. The existing real worker and test worker remain adapters at the same seam; no new simulation framework.

## Work

1. Reproduce the paused polygon sweep-to-naive clamp through the real worker loop and view. Establish a failing assertion for the duplicate rebuild/command before changing it; checking only the final count would miss the defect.
2. Define an applied-action result at the existing worker seam. Keep worker clamping authoritative. Distinguish requested values from confirmed values and correlate completion even when a stale snapshot has identical settings.
3. Remove the redundant count command and view-owned `pendingAnnounce` value matching. Preserve localized announcements in the view; the session supplies confirmation, not translated text. Document the latest-pending-action policy and which existing controls request announcements.
4. Preserve existing pause/disposal behavior and snapshots without per-frame React renders. Update the collision architecture/protocol guidance to describe requested versus applied state.

## Verification and completion

- C1: paused polygons at 3,500 sweep bodies switch to 3,000 naive bodies with one rebuild and one confirmed announcement. Check the clamp explanation, controls, counters and drawn snapshot together.
- C2–C3: deliver queued older snapshots before confirmation, including equal method/count and rapid switch-back actions. Check that only the latest pending action is announced once. Also test an in-limit paused switch without a step or rebuild, count changes, reset, Step, coverage and bounce. Editing method/count/coverage or creating a new arrangement while playing must pause first and stay paused after confirmation.
- C4: retain the existing hook lifecycle, idle, hidden/offscreen, reduced-motion, unavailable-worker and no-per-snapshot-render tests. New confirmation state must not make a raw frame look like a user action.
- Run `just unit src/learning/playground/collisions` and the applicable pure-model tests only if that code changes, then `just check-changed` against the agreed base. If localization changes, run the required typecheck and production build.
- Obtain engineering and control/accessibility review. Use `$smoke-tester` for circle and polygon Run blocks in the sweep chapter: keyboard method/count controls, paused switching, playing switching and announcements. Re-run the existing containment/switch-latency procedure from `scripts/collision-containment/README.md` on a fresh production build for C5. Compare with retained default-setting evidence; do not claim high-coverage/bounce performance was already certified.
- Close C1–C5 with the tested revision, failing-before evidence, containment results and any coverage gaps.
