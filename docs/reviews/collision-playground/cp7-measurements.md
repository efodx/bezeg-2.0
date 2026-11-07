# CP7 containment, smoothness and lifecycle measurements

TRIAL RUN on the CP4 harness page (Run component only), not the chapter. Produced by `just collision-containment` ([README](../../../scripts/collision-containment/README.md)). The run on `/bezeg-2.0/learn/sweep-algorithms` is still to do.

Page: `/bezeg-2.0/harness/collision-playground?count=4000&method=naive&inspect=0` | commit e8d72ec4 (src dirty: concurrent edits) | Chromium 156.0.8078.4 (Playwright 1.64.0, headless) | AMD Ryzen 5 7600 6-Core Processor (12 logical) | Windows_NT 10.0.26200

CDP CPU throttling applies to the page main thread only, not to the dedicated simulation worker (CP3 finding), so the throttled profile loads the main thread but not the worker.

| measurement | target | desktop | mobile-4x |
|---|---|---|---|
| naive at limit: frames > 50 ms in 10 s | none in playground code | 0 (playground-attributable: no; longest 0 ms) | 0 (playground-attributable: no; longest 0 ms) |
| scroll input to next frame p95 (p50 / max) | <= 100 ms | 25.7 ms (15.8 / 28.9; n=20, wheel) | 135.6 ms (69.5 / 169; n=40, touchstart) |
| link click event duration p95 (upper bound) | <= 100 ms | 16 ms (n=20, 11 >= 16 ms) | 136 ms (n=20, 20 >= 16 ms) |
| naive to sweep: snapshot shown (median / max) | <= 250 ms throttled | 37.4 / 43.1 ms (first frame 47.8 / 54.2) | 58 / 68.5 ms (first frame 77 / 82.7) |
| sweep at limit: draw callback median (p95, frames) | <= 16.7 desktop / 33.3 throttled | 1.3 ms (1.6, n=592) | 6.4 ms (9.2, n=134) |
| snapshots in 2 s, playing (control) | > 0 | 120 | 123 |
| snapshots in 2 s, canvas scrolled off-screen | 0 | 0 | 0 |
| snapshots in 2 s, hidden tab | 0 | not measured | not measured |
| worker targets after client-side navigation (before) | 0 | 0 (1; page terminated 1 of 1); traffic 2 s: 0 | 0 (1; page terminated 1 of 1); traffic 2 s: 0 |

Notes:

- Mobile scroll and link-click p95 (135.6 ms and 136 ms) miss the 100 ms target with the main thread throttled 4x while naive plays at its limit. Desktop passes. Not separated: playground cost versus the throttled page itself (no run without the playground). The touch scroll count is 40 because each synthesized gesture reports two `touchstart` events.
- No long animation frame over 50 ms in either profile; draw callback medians are far under 16.7 / 33.3 ms.
- Switch latency runs from the radio click to the first worker snapshot message with method sweep (init-script listener). The live region is not used: an earlier run showed it still announcing the naive snapshot 15 s after the click (the announcement goes to the first snapshot after the action, which can be an in-flight naive one), so a reader may hear the old method.
- Hidden tab not measured: headless Chromium kept `document.hidden` false after bringToFront and a window-minimise request; a headed run is needed. Off-screen scrolling gave 0 snapshots in 2 s against a 120-snapshot playing control.
- After client-side navigation away, `Target.getTargets` listed no worker target (1 before) and no messages arrived for 2 s.
- Link clicks: the click is real but a capture handler cancels the navigation, so 20 samples could be taken; entries under 16 ms are counted as 16 ms.

## Baseline

Same script with `COLLISION_CP7_MODE=paused|none` (scroll and link click only). Paused: harness page, naive 4000 set through the UI, never played. None: `/bezeg-2.0/learn` (no playground; it may scroll little, so its scroll figure is a floor). p95 in ms.

| state | desktop scroll | desktop link | mobile 4x scroll | mobile 4x link |
|---|---|---|---|---|
| naive playing | 25.7 | 16 | 135.6 | 136 |
| playground paused | 28.7 | 24 | 127.7 | 168 |
| no playground | 17.5 | 16 | 28.2 | 24 |

Reading: on mobile 4x the cost is already there with the playground paused, so it is not the running simulation or worker traffic; it comes from the playground's presence (canvas, controls, slider) on the throttled main thread, or the harness page. Not separated further.
