# CP7 — Batch B acceptance

Source: spec [Acceptance criteria](../../specs/collision-playground.md#acceptance-criteria) 1–9 for circles. Batch B. Kind: handler (F6).

1. **Matrix.** One row per criterion with its evidence (test name, measurement or smoke record) in `docs/reviews/collision-playground/batch-b-acceptance.md`.
2. **Containment** (criterion 2): Playwright on the production build in Chromium, desktop and 4× throttled 390×844.
   - Run naive at its limit for 10 s and collect Long Animation Frames entries (`PerformanceObserver` type `long-animation-frame`). The script attribution must show no frame over 50 ms in playground code.
   - Measure the p95 of input-to-next-paint for scrolling and for a link click outside the playground, against a ≤ 100 ms target.
   - Time the switch from naive to sweep.
3. **Smoothness** (criterion 4): draw-callback median at the sweep limit. A miss of 2 or 4 goes to the owner before the chapter blocks are pushed.
4. **Pause and lifecycle** (criteria 3 and 6) in a real browser:
   - after a hidden tab, scrolling the canvas off-screen or a shortened idle timeout, zero steps over 2 s;
   - after leaving the chapter, the worker's message traffic stops (instrument the hook in a test build, or check CDP `Target.getTargets` for no remaining worker target).
5. `just check`, then a bilingual smoke of `/bezeg-2.0/learn/sweep-algorithms` and of the Bézier chapter's playground blocks, using `bezeg-smoke` (Sonnet for the first pass).
6. Record the measurements in the performance results and link them from the performance plan. Hosted CI must be green after the push.
