# Bézier patches interaction smoke — 2026-10-29

- Preview: `http://127.0.0.1:4396/bezeg-2.0` (handler-owned production preview, HTTP 200); checkout: `.claude/worktrees/bezier-patches-r2`; HEAD `e917d2caac4962e96e9129773c46c83d8eeba1b9`, dirty. Handler rebuilt the production preview before the final run; no app source changes were made by this worker.
- Browser: Playwright with Chromium, isolated contexts. Desktop 1440×1000 and direct-route checks 1280×900; mobile emulation 390×844 with `isMobile` and `hasTouch`. Elapsed: about 10 minutes including setup.

| Check | Result and evidence |
| --- | --- |
| Canonical tensor lesson observation animation | **Passed.** `v` changed 0.50→0.67 and the canvas SHA-256 prefix changed `2d4bb98120de4590`→`e1f34fa9e3e80353`; Play/Pause/Replay were visible. Screenshot: `.claude/scratch/patch-interactions-h26/03-observation-playing.png`. |
| Pause / Replay / Previous | **Passed.** Pause held 0.77; Replay moved it to 0.13; Previous returned to frame 1. |
| Exit cancel and confirm | **Passed.** Cancel kept the lesson and paused `v=0.57`; confirm closed the lesson and restored the entry graph (`u=v=0.5`). The prompt is `Zapustiti vodeni primer?`. |
| Direct `?learn=1` | **Passed** on tensor, de Casteljau, derivatives, subdivision, joins, and triangular routes; each opened its expected chapter-owned lesson. Screenshots: `learn-<route>.png` in scratch. |
| Chapter prerequisite | **Passed.** Clicking “Bézierjeve krivulje” opened `/learn/bezier-curves`. |
| Activity entry and return | **Passed.** Keyboard Enter opened the section example; the lesson section received visible focus, and “Nazaj v poglavje” remained in the viewport after settling (y≈233). Returning placed `#curve-to-patch` at y≈535, within the viewport. Screenshots: `chapter-activity-settled.png`, `chapter-return-settled.png`. |
| 390px layout and keyboard | **Passed.** No horizontal overflow; canvas 364px wide. The focused surface responded to ArrowRight (azimuth −52→−46); keyboard Tab reached “Zgoraj” with visible focus and Enter activated it. |
| SL→EN scene retention | **Passed.** On the 390px touch-emulated page, keyboard changed `u` 0.50→0.51; changing language to EN retained 0.51 and translated the app labels. |
| Browser console/page errors | **Passed.** None observed. |
| Edited camera/net before lesson entry | **Skipped.** Direct-query exit restored its default entry scene; editing the camera/net first and then entering the lesson was outside this run’s time budget. |

Coverage limits: touch was emulated in Chromium, not tested on physical hardware. This run does not establish mathematical correctness, performance, exhaustive accessibility, or hosted Pages behavior. Evidence screenshots and scripts are under `.claude/scratch/patch-interactions-h26/`.
