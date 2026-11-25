# 07 morph 3a: double glides (worker note)

Cause (all listed steps): the lesson re-writes its view intent on a step; the board has a fitted box shown, so
`ViewAdapter.applyIntent` drops the fit and snaps the board to the intent (often with `changed:false`, so no notification).
The director only learns at `frameChanged` (40-100 ms later, React tick), so the board shows the intent for several frames, then the glide
runs from the intent: a snap plus a glide, counted as 2 by the walk method. The Next click is also a learner span, so the
director's `blocked()` guard must not stop the restore. Not a late card measurement, not a morph mark change. It predates 3a
(slower renders under the morph widen the gap past the 3-frame run gap, hence the baseline difference).

Fix: viewAdapter.ts applyIntent emits when a fit was dropped; viewDirector.ts `holdShown` (microtask, before paint) re-shows the last
fitted box under a lease, the fit glides from it; `carried` keeps the remaining time when a lesson write ends a frame glide;
a retarget re-bases from the shown box. Tests: viewDirector.test.ts "a lesson write while a fit is shown" (4) + "a retarget continues".
Measurements: briefs/notes/07-glides-after-*.log. Script: smoke/07-morph-3a-glides-probe.cjs (steps with 0 = view did not need to move).

## Decasteljau export test: pending frame (worker)

Cause: not holdShown or the morph. The only schedule() caller was viewDirector.ts:265 trigger(), from intentChanged (:210): the new viewAdapter emit on a write that drops a shown fit makes the batch scene restore request one fit frame (legitimate, bounded). Fix: no code change; DecasteljauExport.test.tsx flushes that frame (3 advances) before asserting pendingCount 0.
