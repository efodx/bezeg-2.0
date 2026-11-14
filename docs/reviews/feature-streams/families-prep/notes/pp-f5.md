# pp-f5 note: phase-portraits example cards (PARTIAL, blocked on PP5)

Status: generator, capture family, recipes and script test done; three of four cards capture (PP1, PP2, PP4); PP5 (bifurcation) fails the capture and needs a decision outside the owned paths. No manifest, PNGs, preview copy, unit registration or docs status were produced (a full capture run fails on PP5, so no manifest is written).

## Blocker
`phase-portraits.bifurcation.logistic-map` opens at r = 2.9 with step 0. `LogisticMapGraph.tsx` (buildScene, cobweb curve) then draws a curve with one data point (`x = [iterates[0]]`, no segments), and JSXGraph evaluates `X(t)` of a one-point curve as NaN. The capture's `verifyEvidence` (guided-example-preview-api.cjs:233) requires three finite samples per visible curve: "curve evidence must contain three finite [x,y] samples per curve". Confirmed by probe: that curve has n = 1 and samples [null, null]; all other six curves are finite.
Options for the handler (both outside my owned paths):
1. Graph: let the cobweb curve at step 0 carry two identical points (`x = [x0, x0]`, `y = [x0, x0]`); draws nothing visible.
2. Lesson: PP5 first scene sets `step` (e.g. `PP5_BRANCH = {R: 290, step: 1}` changes the lesson, so not preferred).
After the fix: rerun steps 1-5 of the brief; the PP5 expectation in the generator assumes step 0 (curve 7, point 2); with option 1 it stays valid.

## Done
- `scripts/generate-guided-example-inventory.cjs`: `chapterInventories['phase-portraits']` (new optional `lessonExport` for a registry that exports section rows plus a per-section lesson function), `phasePortraitsExpectedFor` and four independent authors; exported. The lesson scenes carry the prepared scene twice (the adapter's plus the scene's own `phasePlaneSceneActions` one); the generator accepts one or two identical default scenes.
- `scripts/generate-guided-example-inventory.test.cjs`: new test (28 of 28 pass, `.command-logs/pp-a/f5/f5-scripts.log`).
- `scripts/capture-guided-example-previews.cjs`: `chapterFamilies['phase-portraits']` with the `identities` form (`dynamicsDemonstrationRows`).
- `scripts/demonstration-preview-recipes.cjs` (not in the brief's owned list, but the capture refuses a Demonstration without a recipe): rows for `phase-portrait` (window [-5.8, 4.4, 5.8, -4.4]) and `logistic-map` (window [-0.1, 1.15, 2.9, -1.3], room under the axis for the caption column; the default fit cropped a wrapped caption). `scripts/demonstration-preview-capture.test.cjs` "registry exhaustively matches the live catalog" failed before this change and still fails (other Demonstrations lack recipes); not touched.
- `docs/reviews/phase-portraits/guided-example-inventory.json` generated (4 entries, passes validation).
- `just build` passed (`f5-build.log`). Preview on 4471 was used and stopped (port closed).

## What the three captured frames showed (viewed; PNGs deleted again so no half set remains)
- PP1: matrix E = (4 1; 2 3), seed (1,0): thick green forward orbit leaving the frame box upper right, two dashed brown eigen-lines (slopes -2 and 1), column handles at (4,2) and (1,3) with dashed segments, equilibrium x at the origin. Crowded: board texts (legend rows, captions) overlap the axis labels and the equilibrium caption at 420x260.
- PP2: centre (0 1; -1 0), seed (1,0): closed green circle of radius 1, column handles at (0,-1) and (1,0), no eigen-lines; the two column captions and the equilibrium caption overlap.
- PP4: r = 2.9, x0 = 0.2, step 20: parabola, diagonal, cobweb staircase ending at the fixed point square, orange start dot (0.2, 0.2), bifurcation panel with cursor at r = 2.8985 and the marks at 3, 1+sqrt6 and 3.56995; readable, caption column below the axis.
- PP5: not captured.

## Not done / not verified
Preview copy for the four cards (`phasePortraitsPreviewCopy.ts`, bilingual alt and caption; the chapter needs it because `CHAPTER_GUIDED_EXAMPLE_PREVIEWS` is per example), registration in `guidedExamplePreviews.ts` and `.test.ts`, `docs/commands.md` family list, `docs/reviews/feature-streams/closeout-card-images.md`, the `07-batch-c-lessons.md` status line, the unit, scope and tsc checks. If the phase-portrait cards read as too crowded, the cause is the graph's pixel-sized captions on the 420x260 card, not the recipes.

## Continuation (handler 17, worker f5b): COMPLETE
- After the handler's `LogisticMapGraph.tsx` fix, `just build` passed, all four cards captured (840x520) with `--family phase-portraits` on port 4471 (closed afterwards). Output directory is `src/images/learning/examples/phase-portraits/` (four PNGs plus `manifest.json`), the chapter pattern.
- Viewed frames: PP1 = A = (4 1; 2 3), seed (1,0): green orbit toward the column handles (4,2), (1,3), two dashed eigen-lines, legend rows overlapping axis labels. PP2 = A = (0 1; -1 0): green unit circle, handles (1,0) and (0,-1), overlapping captions. PP4 = r 2.9, x0 0.2, step 20: parabola, diagonal, cobweb closing on the fixed point, bifurcation panel with cursor, caption column under the axis. PP5 = same without cobweb (step 0): blue fixed-point square, orange start dot, no staircase.
- Crowding: the recipe offers only the coordinate window and the point-name treatment; no option hides captions or legend rows, so the PP1/PP2 frames are kept (pixel-sized board texts). Alt text does not rely on them.
- Added: `phasePortraitsPreviewCopy.ts`, registrations in `guidedExamplePreviews.ts` (import line 28, entry 70) and `.test.ts` (import 24, row ~277, counts [[7,2],[3,5],[7,3],[3,5]]), `docs/commands.md` line 70, closeout-card-images.md section 7, 07-batch-c status line.
- Checks (logs in `.command-logs/pp-a/f5/`): inventory test green; `just unit` chapter + familyChapters + dynamics green; scope tests green; tsc clean; lint green. `demonstration-preview-capture.test.cjs` still fails the one test "Recipes must exhaustively match shipped IDs" (36 of 37 pass); phase-portrait and logistic-map are no longer among the missing ids.
- Not verified: Slovenian wording of the copy not reviewed; no smoke test; node_modules/.vitest-cache could not be fully removed (not needed, tests saw the PNGs).

## PP3 card (handler 18)
- Inventory: `phaseLinearizationExpectedFor` in `scripts/generate-guided-example-inventory.cjs` (opening is the Demonstration default, no phase action; two eigen-lines, handles (-4,-2), (-1,-3)); inventory JSON now 5 entries. Port 4471 was held by another dev server, so the capture used 4483 (closed afterwards).
- PNG `phase-portraits.linearization.phase-portrait.png` (840x520): orange start dot (1,0), short thick green orbit to the origin with a dashed green backward part up right, blue diamonds at (-4,-2) and (-1,-3) with dashed segments, two brown dashed eigen-lines; overlapping pixel-sized texts as for PP1/PP2. Matches the first scene (-E, start (1,0), stable node). The other four PNGs did not change (git status).
- Copy row added in `phasePortraitsPreviewCopy.ts`; pending entry removed from `guidedExamplePreviews.test.ts`, counts [3,5]. Slovenian wording not reviewed.

## Layout pass (handler 18)
- `PhasePortraitGraph.tsx`: the two matrix-column captions are now a second pixel-anchored stack in the bottom left corner (the legend stays top left); tick numbers that either stack would cover are not written (`defaultAxesAttributes`, `stackBoxes`, the pattern of `LogisticMapGraph.defaultAxesAttributes`); the seed caption treats both stacks as obstacles; the equilibrium caption moved from -14 to -38 px (`EQUILIBRIUM_CAPTION_DY`), below the x axis numbers. Texts and ids unchanged.
- `LogisticMapGraph.tsx`: the x axis writes no numbers right of 1 (the r panel's own marks stand there).
- Before/after: legend/axis numbers, column captions overlapping each other and the equilibrium caption (all fixed on the five cards); r-panel ticks 1,5-3 (gone). Remaining on the cards: the legend rows cross the plot and the stop row sits on the x axis, so the x numbers left of x~6 are hidden there; PP1 equilibrium caption wraps to two lines.
- Screenshots (desktop, before the -38 px move): `.command-logs/pp-b/layout/linear.png`, `logistic.png`. Pendulum and weak-spiral desktop screenshots were not taken.
- Checks: tsc, lint, `just unit` dynamics + guided lessons, `just unit src/learning/chapter` green; five cards recaptured and viewed.
- Handler 18 follow-up: the stop-count row moved from the top legend to the head of the bottom stack (as a fifth top row it fell on the x axis of the card board and hid every x number); the narrow-board legend test now expects four top rows and checks the stop row is bottom-anchored. Cards recaptured and viewed: x numbers back on PP1/PP3; y numbers under the two stacks stay hidden by design.

## 390 px pass (handler 19)
- `PhasePortraitGraph.tsx`: a board narrower than 500 px (decided once per build, `compactLegend`) sets the legend at 12 px and 18 px a line with a 6,5 px letter estimate (`NARROW_BOARD_PX`, `legendFontPx`, `legendPitchPx`, `legendCharPx`, `linesOf`); the pendulum's eleven wrapped lines no longer reach the x axis. The equilibrium caption moves left where it would pass the right edge (`equilibriumCaptionDx`, shared with the seed-caption obstacles). Axis numbers under the equilibrium caption (`equilibriumBox`) or a seed caption (`seedBoxes`, cached per frame) are not written, as under the legend stacks.
- `LogisticMapGraph.tsx`: the opening window widens to the left until the y axis stands 34 px from the board edge (`AXIS_NUMBER_PAD_PX`; numbers were clipped); the cursor caption wraps by words with `<br>` to the width from that padding to the right edge (`wrapWords`, `cursorChars`); the caption column starts at the board's left edge.
- Tests (placement only): legend row gap uses the 18 px pitch at 390 (`PhasePortraitGraph.test.tsx`); the logistic opening-window test allows a left edge at or beyond `VIEW_BOX[0]`.
- Smoke `.command-logs/pp-b/layout390/` (scripts, 10 screenshots, `rects.cjs` DOM box dump, logs): at 390 no text overlaps text, tick number or marker and no number is clipped on all five rows; known limit: tick numbers under the seed or equilibrium caption are omitted (pendulum at (pi,0): 1 to 3; weak spiral: -1 on the y axis). 1366 unchanged apart from the same rule.
- Five card PNGs and `manifest.json` recaptured (cards are 840 wide, so the legend stays 14 px; the logistic cards' cursor caption now wraps by words and the y numbers keep room); viewed, no overlaps.
- Not covered: a board that crosses 500 px after the build keeps its build-time legend size (until the scene rebuilds); no real-touch or resize test.
