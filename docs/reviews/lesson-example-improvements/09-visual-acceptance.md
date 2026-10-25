# 09 Visual acceptance (browser smoke, handoff-v10)

Revision ad7ab7a (src clean; only docs/capabilities.md and docs/current-architecture.md dirty). Target: handler-owned production preview http://127.0.0.1:4392/bezeg-2.0 (reachable, HTTP 200). Browser: Playwright Chromium, fresh context per run, `reducedMotion: reduce`. Viewports 1440x900 and 390x844. Languages SL and EN. Scripts and screenshots: `C:/Users/NonFriedMotherBoard/.claude/jobs/b31ef815/tmp/visual/` (`shots/`, contact `sheets/`). Not classroom validation.

## A. Starting views
Every frame (card visible, and board after "Observe"/Hide instructions) of 12 lessons walked in 2 languages x 2 viewports (48 runs, all completed; shots `shots/<lesson>-<lang>-<d|m>-NN-{card,obs}.png`).
- No horizontal page overflow in any of the 48 runs (scrollWidth check per frame). Passed.
- Desktop EN observation views inspected for all 12 lessons (sheets `sheets/obs-*.png`, plus `sheets/bezier-en-d.png`). SL desktop and 390 px views were captured but only mobile `rational-extrapolation` and `spline-g1` were inspected by eye; the rest are unreviewed (coverage limit).
- Passed (legible, curve, points and labels/weights/offsets inside the board): bezier, affine, elevation, rational (weights w0..w3 shown), circle (n=2..12), spline-c1, spline-parameterization, trigonometric-functions, sequence.
- Passed with notes:
  - ph-cubic: offset curve (steps 8-12) leaves the view at the lower left, which is inherent to an offset line. At frame 6 the `B(1/2)` label sits on P2/P1 labels.
  - spline-g1 step 8 (b1=0.25, desktop and 390): joint labels `p2(1)`, `p0(2)` and neighbours overlap near the origin and are hard to read (`obs-spline-g1`, `mobobs-spline-g1`). Minor.
  - circle n=12: P0/P1 labels crowd, expected at that density.
  - 1440x900: the graph card extends below the fold (page scrolls); lower readouts (sequence text, bottom axis) are partly below the fold in the screenshot.
- **Failed: rational-extrapolation, step 4 ("t=3/2", frame 9).** Evidence `shots/rational-extrapolation-en-d-09-obs.png`, `shots/rational-extrapolation-sl-m-09-obs.png`. Expected (03b-evidence) widened view `[-34,9,6,-6]` showing all control points and the extended curve. Actual (1440x900): x range about -27..-1 is visible, P0 and the right-hand points sit at or beyond the right edge, the curve is cut off and `w3` is clipped; at 390 px the board shows only the empty left axis. Step 3 (t=6/5, view `[-7,8,17,-6]`) also clips: right-hand points are at the board edge on desktop and clipped at both sides at 390 px (`shots/rational-extrapolation-sl-m-07-obs.png`). Likely cause: the box is wider than the board aspect and the view does not fit it, so the intended extent is not shown. The automated rows pass because they check state, not the framed view.

## B. Lesson-runtime controls (desktop, `b.log`)
bezier (SL), spline-g1 (EN), rational-extrapolation (SL), circle (EN), after dragging a point first:
- Hide instructions + reopen at every observation frame: points, curve count and board view unchanged. Passed (bezier 5 frames, spline-g1 4, rational-extrapolation 3, circle 4).
- Forward walk then Back walk across every step boundary: board signature (points + curves) and view match each forward frame. Passed on all four.
- Language switch mid-lesson (header select): heading re-titled, scene unchanged. Passed on all four. Board label re-rendering visible in `shots/B-*-langswitch.png`; not reviewed individually.
- Exit and restore: the dragged scene returns exactly; re-entry restarts at step 1 with the same first-frame scene. Passed.

## C. Reset and preset restore (bezier, EN)
Edited p1 and saved `smoke-visual-<timestamp>`; fixture at step 3 differed from the edit; Exit returned the edited scene; selecting Default gave the default curve; reopening the preset returned the saved geometry; no-preset edit restored on Exit; inspector Reset after a lesson Exit equals the free-exploration default. Passed. After completing the lesson the scene equalled the default (last step is free exploration), so "Reset after completion" is not distinguishable. Cleanup: a fresh context per run, so nothing persisted in a shared profile; my explicit delete step timed out (selector problem on the Delete flow while the lesson card was still open), so the preset was removed only by discarding the isolated context.

## D. Animation control (decasteljau, EN)
Observation frame (step 1, frame 2): t stayed 0.5 over 1.2 s (no autoplay). Play moved t (0.5 to 0.62 to 0.71). Pause stopped it (0.75 to 0.75 over 1 s). Play then Continue lesson: next frame starts at t=0.5 and stays. Play then Exit lesson: t=0.5 and stable after exit. Passed. The controls are separate Play, Pause and Replay buttons.

## E. Console
No `pageerror` or `console.error` in any run (48 walks, B, C, D).

Elapsed about 45 minutes.

## Handler recheck after the view fix (d020abc)

The rational-extrapolation failure was a runtime defect, not content: with equal axis units JSXGraph keeps the left/top edges of a box whose aspect differs from the canvas. Fixed in d020abc (`BaseGraph.applyLessonView` widens lesson views to the canvas aspect around their centre via `fitBoundingBox`; wide/tall view tests in `lessonFixtureScene.test.tsx` fail without it). Afterwards: `just check` passed (165 files, 3426 tests, build), full guided-lesson smoke 164 passed, and the 48 capture walks (`a.cjs`) were rerun against the d020abc build on the same preview: all completed, no console/page errors, no page overflow.

Reviewed by eye on the new captures: rational-extrapolation EN desktop step 4 (whole view -35..6, all four points, weights and extended curve visible) and SL 390 px all frames (all objects in view, small); SL 390 px sheets of bezier, spline-g1, ph-cubic, circle, spline-parameterization and trigonometric-functions: legible, scene objects inside the board.

Minor (legible, no change made): rational-extrapolation w0/w3 labels overlap because P0 and P3 are close in the fixture; spline-parameterization 390 px labels P0..P3 crowd at the left; circle n=12 labels crowd; some calculation rows (bezier frames 8 and 11, PH normal formula) extend past their box at 390 px and need horizontal scrolling inside the box.

Still unreviewed by eye: SL desktop sheets of all 12 lessons, 390 px sheets of affine, elevation, rational, spline-c1 and sequence (both languages), EN 390 px sheets except rational-extrapolation, and the `B-*-langswitch`/`B-*-exit` shots. Checks B-D ran on ad7ab7a; d020abc changes only lesson-view framing, which B's Back-walk view comparison and the 164 automated rows cover.
