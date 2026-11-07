# CP7 containment investigation: why the "paused" mobile baseline was slow

Date 2026-11-07, worktree stream-collision, commit 2fd33109 plus uncommitted changes (harness flag, run.cjs fix). Mobile profile 390x844, touch, DPR 2, CDP CPU throttle 4. Raw outputs in `logs/inv/` (not committed).

## Finding

The baseline mode `COLLISION_CP7_MODE=paused` never paused. `useCollisionWorker.ts:41` sets `wantPlay = !reducedMotion`, and the worker starts playing once the canvas is in view; the idle pause is 120 s (`IDLE_PAUSE_MS`, line 6). `run.cjs` `setup()` chose naive at its limit through the UI and only slept, so the "paused" cell was naive at its limit playing. Probe: the harness page with the canvas in view received 179 worker messages in 3 s idle and the button read "Premor" (pause).

Trace (4x, 20 touch scrolls, ~6 s): with the playground playing, main thread 604 BeginMainFrame (3745 ms), of which Commit 2637 ms and DoUpdateLayers 2390 ms; script (FireAnimationFrame) only 540 ms. Without the playground: 173 BeginMainFrame, 222 ms. So the cost is continuous frame production (canvas commit/layer update, software renderer in headless) while the simulation plays, not scroll handling, listeners or CSS.

## Numbers (mobile 4x, p95 ms scroll / link; 2 runs each unless noted)

| page | state | scroll | link |
|---|---|---|---|
| harness, playground=0 | none | 31.7, 31.1 | 32, 32 |
| /learn | none | 28.4, 30.2 | 24, 32 |
| harness | "paused" (really naive at limit playing), old script | 107.7, 135.2 | 112, 168 |
| sweep-algorithms | "paused" (really playing), old script | 83.5, 103.6 | 32, 48 |
| harness | truly paused (fixed script) | 30.7, 30.7 | 32, 32 |
| sweep-algorithms | truly paused | 27.9, 28.3 | 32, 32 |
| sweep-algorithms | full run, naive at limit playing | 76.9 | 32 |

Desktop all pass (scroll p95 15 to 35 ms, link 16 to 24 ms).

## Reading

- Paused: the playground costs nothing measurable (28 vs 28 to 32 ms). Acceptance 2 holds paused.
- Playing naive at its limit on the chapter page: scroll p95 77 to 104 ms across three runs, so it sits at the 100 ms line; link passes. The harness page is worse (108 to 135 scroll, 112 to 168 link): it has no chapter chrome, so the canvas fills the viewport during gestures and the link target is the app header over it. The chapter figure is the one that counts.
- The method in run.cjs is fair across pages (same event-to-next-task stand-in, same gesture), but the paused label was wrong.

## Not fixed

No code fix to the playground: the residual cost is the throttled main thread committing a DPR-2 canvas at the snapshot rate while playing. Options for the handler (visual change, not done): cap the draw rate to 30 Hz under heavy load, or lower canvas backing resolution at DPR 2 when count is large. Headless uses the software compositor; real mobile GPU compositing may differ (not verified).

## Result of adaptive draw pacing (2026-11-07)

`drawPacing.ts`: enter loaded when the EMA (alpha 0.2) of rAF intervals exceeds 20 ms (above a 60 Hz frame of 16.7 ms plus jitter), then at most one draw per 33 ms; leave when EMA is below 17.5 ms and 1.5 s have passed. Full runs on `/bezeg-2.0/learn/sweep-algorithms` (production build, sequential):

| run | scroll p95 mobile-4x (p50 / max) | link p95 mobile | desktop scroll / link p95 | mobile draw callback median (p95, n) | desktop draw median | switch latency mobile median | LoAF > 50 ms |
|---|---|---|---|---|---|---|---|
| 1 | 52.7 (30.4 / 197.8) | 32 | 37.7 / 16 | 4.7 (6.5, 179) | 1 ms (n=594) | 51.6 ms | none |
| 2 | 54.2 (34.1 / 117.9) | 40 | 39.2 / 16 | 4.6 (6.9, 175) | trace error (flake) | 46.9 ms | none |
| 3 | 51.6 (36.9 / 144.8) | 40 | 39.6 / 16 | 4.7 (6.9, 166) | 1 ms (n=595) | 45.4 ms | none |

Paused mode (`COLLISION_CP7_MODE=paused`): scroll p95 29.8 ms mobile, 19.7 desktop; link 32 / 16.

Before pacing the same page measured 77, 83.5 and 103.6 ms. Mobile draw count fell to about 17 per second (166 to 179 in 10 s), against about 60 snapshots per second.
