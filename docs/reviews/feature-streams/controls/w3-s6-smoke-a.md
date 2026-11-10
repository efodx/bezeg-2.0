# Step 6 smoke, Group A: route matrix

Preview: production build of 64e2c0c2 at http://localhost:4327/bezeg-2.0/ (handler-served, not started/stopped by me). Chromium (Playwright, repo install), Chromium emulation only (isMobile, hasTouch, DPR 2, locale sl-SI); no physical device. Worktree has unrelated dirty files (docs/ui-functionality.md, ph.png, r.png); no source edited. Scripts, raw JSON, screenshots: `.command-logs/w3-s6-smoke-a/` (`run2.cjs` final script, `results2.json`, `summary2.txt`, `*-after-play.png`; `run.cjs`/`results.json` was a first pass that pressed Next step first and is superseded).

## Failures and open findings (repro first)

1. **Voronoi and voronoi-degenerate: playback buttons cannot be pressed (blocked, not shown to be slot-related).** Route `/compgeo/voronoi` (and `/voronoi-degenerate`), 390x844 and 360x640: all four buttons in the slot carry `aria-disabled="true"`, title and status text "Trenutni podatki ne dajo korakov." Playwright tap waits forever. Same on 1280x800 in the inspector, and switching the degenerate mode to four-point does not enable them. So the disabled state is independent of the slot; I did not find the scene that gives steps. Checks 1, 2, 4, 5 pass; check 3 is not exercised. Also note the before table recorded a "press" on voronoi that was likely a no-op on a disabled button.
2. Parametric 360x640 after Play (`parametric__360x640-after-play.png`): the on-board readout text ("Hitrost r' ...", "Dolžina loka: 8", "Ploščina") overlaps the axis tick labels at the board top. Cosmetic, probably pre-existing; not compared with before.
3. `/bezier/subdivision-2`, `/bezier/subdivision`, `/rational/rational-subdivision`: no `.inspector-playback` anywhere, slot empty (slot is present after `#jgbox`). I took "subdivision (curves)" in s6b to mean interp-subdivision; these three evidently have no playback control, so they are n/a, not failures. Confirm with the handler that they are not meant to have one.

No page errors or console errors on any route/viewport (errs empty in results2.json).

## Matrix (30 routes x 2 viewports)

Checks: (1) one group, in slot, directly after #jgbox; (2) board and all buttons in viewport together; (3) press Play (Next step where no Play) then Pause: board changed, scrollY unchanged, button state toggled; (4) every button >=44x44; (5) no horizontal overflow.
Result for every route below, both viewports, unless noted: (1) pass, (4) pass (min 44), (5) pass, (3) pass (scrollY delta 0 after Play and after Pause; board SVG markup changed; label Predvajaj to Premor and back; Pause toggled).

Routes tested with all checks passing: fixed-point, bisection, sequence, root-finding, geometric-series, clt, deboor, interp-subdivision, arc-length-param (bezier/arc-length), epicycles, parametric, decasteljau, decasteljau2, rational-decasteljau, convex-hull, hull-robustness, bezier-hulls, bezier-clipping, ear-clipping, delaunay, interval-sweep, segment-intersections, monotone-partition, monotone-triangulation, fortune.

Check 2 detail (board = `.workspace-graph svg`), after (this run) vs before (docs/tasks/mobile-graph-playback/graph-adjacent-controls.screenshots.md, 41-run table):
| Viewport | After, scroll 0 | After, board top at viewport top | Before |
|---|---|---|---|
| 390x844 | board 396-495 px visible (47-59 %), all buttons visible: yes, on all 25 playback routes | same (no scroll needed) | no on 11 of 13 measured routes (board overlap 0-82 px at button view); yes only convex-hull, interval-sweep |
| 360x640 | board 200-235 px (31-37 %); buttons all visible at scroll 0 only on arc-length-param, epicycles, decasteljau, decasteljau2, rational-decasteljau (the last row, Reset, falls just below the fold on the other 20) | all buttons and the full board visible together on all 25 | no on 11 of 13 (overlap 0) |
360x640 therefore needs one scroll to bring the board top to the viewport top; the board then shows 200 px (31 %) with the full button group. Board at 360x640 is 200 px tall, smaller than the 260 px recorded before; flag if that shrink is intended.
Not numerically comparable at button level to "before": I measured 3-4 buttons (Next, Play, Reset, Back) per group.

Voronoi / voronoi-degenerate: (1) pass, (2) pass at 390 (all four buttons and 47-53 % board at scroll 0) and pass at 360 after scrolling, (4) pass, (5) pass, (3) not exercised (disabled, see failure 1).

Screenshots after Play at 390x844 exist per route as `<route>__390x844-after-play.png` (not opened except one 360x640 sample; voronoi routes have none because the press never fired, `voronoi-diag.png` shows the disabled state).

## Coverage gaps
- Pause toggled was asserted from button label/disabled state; the playing state itself was not checked beyond board markup change after 1.2 s (convex-hull and hull-robustness boards changed in the second pass with Play).
- Play was pressed on every route that has it (not only Next step); Next step alone was not separately asserted in the final pass (first pass: board changed on all but convex-hull and hull-robustness).
- Screenshots were not visually reviewed for 28 of 30 routes.
- Chromium emulation only; no real rotation, no WebKit.
