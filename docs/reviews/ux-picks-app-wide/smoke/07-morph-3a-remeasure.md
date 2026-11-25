# 07 morph 3a remeasure (fixed build, preview 127.0.0.1:4472)

Desktop only. Scripts: `07-morph-3a-remeasure.cjs` (Next, then Back then Next after each step), `07-morph-3a-phasecrash.cjs` (crash probe). Full per-step data: `07-remeasure-<lesson>-<WxH>.json`; console summary: `07-remeasure-run.log`.

Method: rAF sampler on the board bounding box. A glide is a run of frames where the box moves more than 0.05 % of its width per frame, closed after 3 static frames. Jump = largest single-frame move as a share of box width (flag above 30 %). Zoom reversal = box width changes direction by more than 1 % of start width and back (hysteresis).

## Results

| Lesson | Viewport | Next steps | Glides per Next (max) | Largest frame jump | Zoom reversals | Back within 2 % | Notes |
|---|---|---|---|---|---|---|---|
| Taylor | 1280x720 | 22 | 0 or 1 (max 1) | 24.2 % | 0 | FAIL at step 6: 2.5 % (no glide seen) | Back 21/21 measured |
| Taylor | 1440x900 | 22 | 0 or 1 (max 1) | 14.4 % | 0 | FAIL at step 6: 3.51 % (no glide seen) | Back 21/21 measured |
| Transformations | 1280x720 | 15 | 0 or 1 | 2.8 % | 0 | pass (max 0.98 %) | Back 14/14 |
| Transformations | 1440x900 | 15 | 0 or 1 | 3.4 % | 0 | pass | Back 14/14 |
| De Casteljau | 1280x720 | 19 | 0 or 1 | 1 % | 0 | pass | Back 18/18 |
| De Casteljau | 1440x900 | 19 | 0 or 1 | 0.6 % | 0 | pass | Back 18/18 |
| Phase portrait | 1440x900 | 15 | 0 or 1 | 6.5 % | 0 | NOT TESTED (crash) | Next-only run; see crash |
| Bisection | 1440x900 | 15 | 0 or 1 | 52.9 % at step 13 (FAIL) | 0 | pass | Back 14/14 |

- Glides: every Next step has 0 or 1 glide in all eight walks. Pass.
- Taylor Next 1: no glide at either viewport (box unchanged), so the earlier zoom-in to about ±3.5 and back does not reproduce.
- Morph (transformations): Next 2 pucks pass intermediate values (puck 3 shows 6 and 7 intermediates). No Povrni button at any step (during or after motion). Back values match the settled values at every step where Back was measured. Pass.
- Errors: no page errors or console errors in any walk.

## Failures and gaps

1. Taylor step 6 Back returns 2.5 % (1280x720) and 3.51 % (1440x900) away from the step 6 view. Puck values match, but no glide was detected in the sampler, so the box change is not explained by animation. Not investigated.
2. Bisection step 13 has a single-frame box jump of 52.9 % (over the 30 % limit). Not investigated.
3. Phase portrait at 1440x900: the renderer crashes ("Target crashed") during a Next, Back, Next walk, around step 12 to 13. Reproduced 3 of 3 times with that pattern. A Next-only walk completes (15 steps, no crash). Phase Back coverage and phase smoothness under Back are therefore incomplete.
4. Back from the final step cannot be tested: the navigation buttons are not rendered on the last frame. Back was checked on steps 1 to 14 (up to the step before last) per lesson.
5. Phase 1280x720 and the first-pass checks were not run (the brief asked for 1440x900 only).
