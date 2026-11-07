# CP7 lifecycle on /bezeg-2.0/learn/sweep-algorithms

Run: `COLLISION_CP7_MODE=lifecycle just collision-containment /bezeg-2.0/learn/sweep-algorithms` (twice, headless) and once with `COLLISION_CP7_HEADED=1`. Raw: `logs/cp7-lc-1.json`, `cp7-lc-2.json`, `cp7-lc-h.json`. Commit c549783b, build/ as present.

| measurement | target | desktop (run 1 / 2 / headed) | mobile-4x (run 1 / 2 / headed) |
|---|---|---|---|
| snapshots 2 s, playing control | > 0 | 120 / 121 / 87 | 123 / 120 / 68 |
| canvas scrolled off-screen | 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| resumed within 1 s after canvas scrolled back | > 0 | 61 / 60 / 34 | 60 / 61 / 35 |
| hidden tab (document.hidden) | 0 | not measured: stayed false in all three | same |
| worker targets, page context, before / after navigation | 1 / 0 | 1 / 0 (all runs) | 1 / 0 (all runs) |
| page workers terminated | 1 of 1 | 1 of 1 | 1 of 1 |
| snapshots in 2 s after client-side navigation | 0 | 0 | 0 |

## Causes and fixes
1. Scroll-back: `scrollTo(0,0)` left the mid-chapter canvas off-screen. Now the canvas is scrolled into view (centre) and `canvasInViewAfterScrollBack` is recorded (true). Playback resumes, as intended: `useCollisionWorker.ts` keeps `wantPlay` true when only the viewport or page hides (play only when `wantPlay && !hidden && inView`).
2. Worker targets: the browser-wide session saw workers of earlier contexts. Targets are now filtered by the page target's `browserContextId`, and before the navigation phase the run waits until no collision worker target exists anywhere (`targetsDrainedBeforeNavigation` true in all runs). After navigation the count is 0.
3. Desktop timeout: setup waited for the Pause button after a count-then-click race with autoplay. It now waits for either button, presses Play only if offered (retry loop), then waits for Pause. No timeouts in 3 runs.
4. Hidden tab: not achievable here. Headless and headed Chromium (Playwright, Windows 11) both keep `document.hidden` false after `bringToFront` on a second tab and after `Browser.setWindowBounds` minimise (no error, no effect); Playwright emulates focus and visibility per page. The hidden branch of `useCollisionWorker` is therefore not exercised by this script; it needs a manual check in a real browser or a unit test of `visibilitychange`.
