# lm-b E1: eigen mode in LinearMapGraph (PARTIAL, budget handoff)

## Written
- `src/graphs/linear/eigenScene.ts` (new): pure `deriveEigen`, `eigenSnapAngle`, `angleOfPoint`, `normalizeTestAngle` (0,01 degree grid, `EIGEN_ANGLE_GRID`), `unitVector` (exact at multiples of 90). Uses kernel `classifyEigen`, `parallelSine`, `isApproximatelyParallel`, `exactlyParallel` unchanged.
- `src/graphs/linear/eigenBoard.ts` (new): unit circle, up to two eigen lines, arrows v and Av, tip of Av, draggable tip of v (`EIGEN_COLORS`).
- `src/graphs/linear/linearMapScene.ts:5`: `eigen` added to `LINEAR_MAP_GRAPH_MODES` (ellipse and composition stay rejected).
- `src/graphs/linear/LinearMapGraph.tsx`: imports; `eigenOf` memo; `setTestAngle`, `dragEigenTip`, `snapToEigen`; example offers E, R, S, C, 2I (ids already existed in `matrix2.ts`, none added); mode label; `createScene` creates eigen curves right after the iteration curves and the tip after the iteration points; `syncSceneToModel`, `onSceneRemoved`; inspector group (gloss with the tolerance, `AngleSlider`, snap `UnavailableButton` with a reason for complex and scalar); legend; `eigenStatuses` (ids eigen-approx-parallel, eigen-exact-parallel, eigen-not-parallel, eigen-two/one/all/none/kernel); readouts (tau, delta, discriminant, eigenvalues, test-angle, v, av, sine, between).
- `src/localization/en.ts` and `sl.ts`: 31 new `linear_map_*` keys in lockstep after `linear_map_status_td_range`.
- Tests: `eigenScene.test.ts`, `LinearMapEigen.host.test.tsx` (new); `LinearMapGraph.test.ts` updated (eigen no longer in the rejection tests; ellipse used instead).

## Checks (observed)
- `npx tsc --noEmit --pretty false`: clean after the last edit (`.command-logs/lm-b/e1-tsc.log`, empty).
- `just unit src/graphs/linear src/linear` (before the last edit): 221 passed, 6 failed (`e1-unit.log`). Causes: (a) the existing Bezier-curve test takes the last curve and my eigen curves were created after it; fixed by moving `createEigenCurves` up to just after `createIterationCurves` (not re-run); (b) the 5 per-class host tests report 3 drawn lines instead of 2 for E and C (filter by `strokecolor` equals the iterate mode's green, `ITERATION_COLORS.dominant`; probably also counting its curve) and presumably wrong counts for the others. Not diagnosed: change `EIGEN_COLORS.line` to a distinct colour or identify the curves differently in `drawnLines`.

## Drag feel
NOT measured (no build, no Playwright run).

## Deviations
- (Corrected in E3) The snap rounds the computed direction to the 0,01 degree grid like the slider and the drag (`normalizeTestAngle`); E snaps to exactly 45 and 225 degrees.
- (Corrected in E3) "Exactly parallel" appears at every multiple of 45 degrees where the kernel's integer test holds for the quarter-grid vector of that direction (for E at 45 and 225, not at 90); elsewhere only the approximate wording. No kernel gap.
- Mode order in the select: basis, determinant, eigen, iterate, tracedet.

## Doubts
- Auto-created centre and point2 of the board `circle` are not `own`ed separately (other graphs do the same).
- `docs/localization.md` terms not yet added.

## Still to do
1. Re-run `just unit src/graphs/linear src/linear`; fix `drawnLines` and any remaining failures.
2. Red evidence (`e1-red.log`): the tests were written after the code and passed on first run; red evidence needs targeted mutations (for example remove `eigen` from the mode list, flip the tolerance comparison, drop the snap).
3. `just lint` if present, `just build`, and the six-variable sweep (`BEZEG_*=linear-map just unit src/graphs/base src/learning/runtime`) to `e1-sweeps.log`.
4. Drag-feel measurement at 1366x768 and 1920x1080 from the production build.
5. `docs/localization.md`: lastna vrednost, lastni vektor, lastna smer, karakteristični polinom, diskriminanta, strig, vrtež za 90° (handler-unreviewed).

## Slice E2 (continuation, worker 2)

### Written
- `eigenScene.ts`: `quarterGridDirection`, `exactlyParallelAt` (exact claim at multiples of 45 degrees through the kernel's integer test on the grid vector, so E at 45 and 225 is exactly parallel; 116,57 only approximately); `eigenSnapAngle` now rounds to the 0,01 grid (E: 30 -> 45, 100 -> 116,57, 280 -> 296,57), so a snapped Preset round-trips.
- `eigenBoard.ts`: `EIGEN_COLORS.line` is the eigen-only `#0e8f8f`; `LinearMapEigen.host.test.tsx` counts lines by it (per-class tests green).
- Tests updated in `eigenScene.test.ts` and `LinearMapEigen.host.test.tsx` (45/225/90/116,57 exactness; snap on grid and parses/round-trips).
- `docs/localization.md`: row for lastna vrednost, lastni vektor, lastna smer, karakteristični polinom, diskriminanta, strig, vrtež za 90° (handler-unreviewed).

### Drag feel (production build, headless Chromium, default view, E, 1-px pointer steps along the circle)
- 1366x768: unit circle radius 28,2 px, 0,49 px/deg; the +-0,95 deg window around 45 deg is 0,93 px wide; the scripted drag from 30 deg landed 0 readings in [44,05; 45,95] (9 distinct readings, jumps of 1 to 3 deg).
- 1920x1080: radius 37,8 px, 0,66 px/deg; window 1,25 px; 1 landing (44,8).
- Slider: min 0, max 360, step 1; 45 is exactly reachable, 116,57 -> 117 and 296,57 -> 297 (0,43 deg off, inside the window). Dragging cannot reliably hit the window; snap or slider is needed.

### Checks (observed, `.command-logs/lm-b/`)
- `e2-unit.log`: `just unit src/graphs/linear src/linear` passed (includes the Bezier-curve test).
- `e2-red.log`: mutations (mode removed: 15 failed; approx flipped: 9; exact always false: 2; snap unrounded: 2; drag unprojected: 2), all restored.
- `e2-tsc.log` empty (clean); `just lint` passed; `just build` passed (warnings present, as before); `e2-sweeps.log` six `linear-map` sweeps passed.

### Deviations / doubts
- Red evidence not recorded for the colour-based line count and the English/Slovenian catalog tests.
- Drag measurement used a coarse loop; readouts may lag a pointer move, numbers indicative.

## Slice E3 (review and smoke fixes)
- Kernel wording: `deriveEigen` (`eigenScene.ts`) sets Av = (0, 0), sine 0 and approximately-parallel when A maps the quarter-grid vector of a multiple of 45 degrees exactly to 0 (floating cos/sin left 1e-16 and "not parallel"); `eigenStatuses` (`LinearMapGraph.tsx`) then shows `eigen-v-kernel` ("Av = 0 ... eigenvalue 0") instead of "exactly parallel". New key `linear_map_status_eigen_v_kernel` (sl, en). Test: [[1,-1],[-1,1]] at 45 and 135 degrees.
- Hidden objects: host test `leaving the eigen mode hides every eigen object` (circle, both lines, arrows of v and Av, both tips) over basis, eigen, iterate, eigen, tracedet, eigen.
- Own view: `eigenViewBox`/`eigenHalfExtent` (`eigenScene.ts`): centred, half-extent max(2, 1,2 max(1, sigma1, |a1|, |a2|)) on the shorter side. `LinearMapGraph.refitView` (key per plane, per matrix in eigen mode) runs from `syncSceneToModel` (entering, example, field, scene) and on the handles' `up` event; never during a drag. Leaving restores the plane view.
- Labels: `eigenLabelPlacements`: v and Av labels sit beyond their tips (outward along the vector) and step aside near a1/a2.
- Circle radius in px (production build, circle bounding box / 2): E 1366x768: 41 (was about 28); 2I 1366x768: 106; E 390x844: 24 (was 17); 2I 390x844: 61. Screenshots in `.command-logs/lm-b/smoke-e3/`. v label no longer meets the a2 label (v at 0 degrees; not checked at other angles in the browser).
- Red evidence (`e3-red.log`): circle left visible, kernel branch off, refit off: 3 targeted tests failed.
- Not run: browser check at angles other than 0, R at 390 px.

## Handler review (handler 15)
- Slice E1 stopped at its budget; E2 continued from this note with two handler decisions: exact parallel only at multiples of 45° (the kernel's integer test on the grid vector), and the snap rounded to the stored 0,01° grid.
- Sonnet engineering and mathematics review (`.command-logs/lm-b/e-review.md`): no blocking finding; E3 fixed the zero-image status, added the mode-switch hiding test and corrected this note.
- Sonnet browser smoke (`.command-logs/lm-b/smoke-e/report.md`): seven of eight checks passed. D2 was not a defect: at 117° the sine for E is 0,0115, because the window around the second direction is only about ±0,38° (handler computation `.command-logs/lm-b/window.cjs`); ADR 0060 and the spec's L3 acceptance 2 are corrected. D1 (the snap's unavailable reason sits in the shared control's tooltip and `aria-describedby`) is accepted as the shared pattern; the status line states the reason. D3 (label overlap) and the small circle were fixed in E3 by a view fitted to the matrix; the radius for E grew from 28 to 41 px at 1366×768. The handler looked at `smoke-e3/eigen-default-1366.png`.
- Owed: touch drag; the a₂ label overlapping the y-axis tick "4" in E's default view; the label placement was checked in the browser at 0° only.
