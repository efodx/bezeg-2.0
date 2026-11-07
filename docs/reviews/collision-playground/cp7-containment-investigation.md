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
