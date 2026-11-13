# lm-c F3 slice 2: L5 lesson content (composition and affine maps)

## Written
- `src/learning/content/linearMapsChapterLessons.ts`: helpers (`mode` widened with `'composition'`; `matrix` takes an optional `target`; new `chooseElement`, `translation`, `pivot`; `translation` is unused so far, kept for the tests worker or removal) and `linearMapCompositionLesson` (`linear-map-composition-affine`, 7 framed steps, sl + en) between the ellipse lesson and the L6 comment. Not registered anywhere (chapter, registry, test lists untouched).
- Steps (ids): `comp-order`, `comp-reflections`, `comp-translation`, `comp-pivot`, `comp-bezier`, `comp-affine-link`, `comp-explore`.
- Probe (temporary test, deleted): `.command-logs/lm-c/probe-l5b.txt`.

## Per step (opening, prediction, change)
1. `comp-order`: opening R then F (default; BA = FR shown, mirror line 135). Worked example: FR. Prediction: RF, its determinant and mirror line. Change: A source Reflection + angle k=0, B source Rotation + angle k=6.
2. `comp-reflections`: opening A and B both reflections at k=3 (BA is a rotation by 0 degrees). Prediction: kind, angle and determinant of BA when B is at k=1; then the swapped lines. Change: B angle k=1; then A k=1 and B k=3.
3. `comp-translation`: opening default. Prediction: T(P0), T(P1) for b=(2,1) and whether rows and determinant change. Change: the two translation fields.
4. `comp-pivot`: opening A = R, B = free identity (BA = R, no pivot). Prediction: the four images and t for c=(3,1). Change: pivot switch on, c = (3,1).
5. `comp-bezier`: opening step 4 plus pivot (3,1). Worked example: B(1/2). Prediction: T(B(1/2)) two ways, midpoint of P1P2, then the pivot-off position. Change: pivot switch off.
6. `comp-affine-link`: same opening. Prediction: mean of the control points (3,1) against c. No scene change; text links to the Demonstration "Afine Transformacije" lesson step "Četrtinski obrat okoli središča" (no link field exists in the model, so it is prose).
7. `comp-explore`: both slots free identity. Prompt: pair with BA != AB, commuting pair, inverse pair, then translation and centre.

## Numbers per step with source
| Step | Quoted | Source |
|---|---|---|
| 1 | FR = [[0,-1],[-1,0]], det -1, line 135 deg (k=18) | probe-l5 scenario 1 |
| 1 | RF = [[0,1],[1,0]], line 45 deg (k=6) | probe-l5 scenario 2; arithmetic of the product |
| 1 | det(BA) = det B det A = 1*(-1) | theorem |
| 1 | swap controls: source choosers keep the angle index; A reflection k=0, B rotation k=6 reach the swap | probe-l5b (A open ... B rot k6): intermediate states differ, final = 45 deg |
| 2 | opening: rotation by 0 deg for k=3 / k=3 | probe-l5b B open |
| 2 | B k=1: rotation by 330 deg (k=22), "približno 1", T(P0) approx (0,866; -0,5) | probe-l5b / probe-l5 5c |
| 2 | swapped: 30 deg (k=2), T(P0) approx (0,866; 0,5) | probe-l5b B swapped |
| 2 | 2(7,5-22,5) = -30 = 330 mod 360 | arithmetic; theorem |
| 3 | T(P0) = (2,0), T(P1) = (-1,-1); det -1 and BA rows unchanged | probe-l5 scenario 1 / probe-l5b C |
| 4 | opening images (0,1),(-3,2),(-2,4),(1,5) (not quoted in text) | probe-l5b D open |
| 4 | images (4,-1),(1,0),(2,2),(5,3); t = (4,-2); the toggle starts the pivot at (0,0) | probe-l5b D pivot; spec |
| 5 | B(1/2) = (3,7/4); T(B(1/2)) = (9/4,1); midpoint (3,5/2) -> (3/2,1); pivot off -> (-7/4,3) | arithmetic (weights 1/8,3/8,3/8,1/8), spec; pivot-off images = probe-l5b D pivot toggled off |
| 6 | mean (3,1), bounding rectangle x 1..5, y -1..3, centre (3,1) | arithmetic; `expansionGuidedLessons.ts:277` states both are (3,1) |
| 7 | shears [[1,1],[0,1]] and [[1,2],[0,1]] -> [[1,3],[0,1]] both orders; [[1,1],[0,1]] with [[1,-1],[0,1]] -> I; RR = -I | arithmetic |

## Deviations
- Seven steps but the spec's steps (2) and (3) are merged into step 1 (RF is both the reveal and its mirror line); the spec's "reflection and rotation compose" is covered in step 2 (two reflections). RR = -I (spec acceptance 1) is named only in the exploration answer, not as a stepped prediction (the test row for RR belongs to the kernel tests).
- The swap changes the two source choosers and two angle controls (the chooser keeps the angle index), so step 1 and step 2 name the angle values.
- Step 2 opening already shows "BA je: vrtež za 0°" for equal lines, so the reader sees that two equal reflections give a rotation (by 0). The prediction asked is the angle for the new line.
- The B(1/2) point is stated as arithmetic (no readout); worked example in step 5 shows it.
- Sources: Farin cited in prose in the step-5 observation, as in `expansionGuidedLessons.ts`; no `sources` field exists in this file.

## Test design (for the tests worker)
- Scene mechanics: each step starts with `defaultScene('linear-map-<id>')`, then the listed actions; read model with `modelNow()` as in `LinearMapCompositionLessonActions.host.test.tsx`; readout ids `product-det`, `product-orientation`, `product-element`, `image-0..3`, `t` (only with a pivot); the rows `A/B source`, `A/B row` are filtered in this note.
- Openings:
  - comp-order, comp-translation: A rotation k=6, B reflection k=0; det -1, `product-element` "zrcaljenje čez premico pod kotom 135° (k = 18)"; images (0,-1),(-3,-2),(-2,-4),(1,-5).
  - comp-reflections: reflection k=3 in both; det 1, rotation by 0 deg (k=0); images = the control points (1,0),(2,3),(4,2),(5,-1).
  - comp-pivot: A rotation k=6, B free identity (`secondMatrix` [[1,0],[0,1]], no `secondElement`); det 1; no `product-element` row; no `t`; images (0,1),(-3,2),(-2,4),(1,5).
  - comp-bezier, comp-affine-link: as comp-pivot with pivot [3,1]; `t` = (4, -2); images (4,-1),(1,0),(2,2),(5,3).
  - comp-explore: both free identity; det 1; images = the control points.
- Post-change states (via controls, like the host test): swap = A reflection k0, B rotation k6 -> `product-element` 45 deg (k=6), images (0,1),(3,2),(2,4),(-1,5); comp-reflections B k1 -> "približno 1", rotation 330 deg (k=22); A k1, B k3 -> rotation 30 deg (k=2); translation (2,1) -> images (2,0),(-1,-1),(0,-3),(3,-4); pivot toggle on starts at (0,0) with t = (0,0); pivot off -> pivot undefined.
- Quote list: every number in the table above; the kernel recomputation can check T(B(1/2)) = (9/4,1) and (-7/4,3), the midpoint, the mean, and that BA of the two shear pairs is as stated.
- Not covered here: registration, chapter count, preview copy, `lessonMathNotation.test.ts` list; I ran a temporary copy of the notation test over the new lesson (two lesson-scan tests passed; the module-coverage test fails only because the copy lists one lesson).

## Still to do
- Registration in the chapter registry, test lists, preview copy, smoke specs (other workers).
- Review of the Slovenian wording by the owner or reviewer.

## Doubts
- Step 2's opening shows the rotation-kind row, a partial hint.
- The unused helper `translation`.
- Labels quoted from keys, not read from a rendered English probe (en rows for slice 1 exist in probe-l5).
- No browser check.

## Tests
- `src/learning/content/linearMapsChapter.test.ts` (end of file): `describe('L5: scenes in one synchronous tick, read in sl and en')` (all seven steps, sl and en, dragged start, reverse order, repeated actions, restore, label presence, no-already-done openings, post-change states) and `describe('the numbers in the L5 prose')` (independent integer and cos/sin recomputation, de Casteljau, quoted-snippet check). Post-change states use `choose-element`/`set-translation`/`set-pivot` actions, which the host test proves equal to the controls.
- Green: `just unit` (log `.command-logs/lm-c/f3t-unit.log`), tsc and lint clean. Red: `(\tfrac94,1)` changed to `95` in the sl text, failing "the quoted numbers appear" (`f3t-red.log`), then restored.
- Observed against the prose: comp-reflections opening (A reflection k=3, B free identity) shows NO "BA je" row (product-element undefined), det "približno −1"; prose says the readout names the reflection at 22,5 degrees (false). Images read "približno (0,7071, −0,7071)" (not "0,707").

## Handler review integration (handler 19)
Sonnet review `.command-logs/lm-c/f3-review.md`: maths correct; applied: step 2 no longer quotes cos 30°; step 2 opens on A = reflection k=3 with B the free identity (no "BA je" row there; the row appears only when both slots are elements), B's chooser starts at k = 0, so the results are 315° (k=21) and, swapped, 45° (k=3); the graph note `linear_map_comp_note` drops "(the order matters)", which answered step 1 from the first frame; step 1 check path sets B first so no intermediate state shows RF; step 1 names k·15° and k·7.5°; "proti urinemu kazalcu"; title "ena za drugo"; step 5 says the point is read off the grid; step 6 says the affine buttons turn by 18° and the lesson turns by a quarter. Kept: step 6 opens with the pivot (3,1) shown (the prediction is the mean, a computation).

## Slice 3: chapter join

Written: section `composition-affine` between `singular-ellipse` and `power-method` (registry, `linearMapsChapter.ts` section and purpose sentence, `linearMapsPreviewCopy.ts` opening-scene copy, `chapterOwnedLessons.ts` comment); count and id lists in the seven test files that the L6/L7 join touched, plus `lessonSmokeCoverage.test.ts` (extra row `linear-map-composition`); smoke row `linear-map-composition` (7 steps, 16 frames) and `linear-maps: 7` in `unified-learning.smoke.spec.cjs`; task status line. The chapter example is the general formula `t = b + c - Mc` with `c=(2,0)`, `b=(1,1)` and two commuting rotations; it gives no lesson prediction (no RF/FR, two-reflection angles, fixture images, (9/4,1) or mean (3,1)), and the product-type statement only says the determinant decides.

Outcome: tsc clean; red run (`s3-red.log`) 10 failed before the source edits; `just unit src/learning src/graphs/linear` (`s3-unit.log`) 3 failed, all card-related or fixed since: two need the example card image and manifest entry (later slice: `guidedExamplePreviews.test.ts` card list, `mathAltText.test.ts`), one (`lessonSmokeCoverage`) was fixed and passes (`s3-cov.log`); lint clean; build passed; `just smoke-lesson linear-map linear-map-composition` 4 passed (`s3-smoke.log`).

Not verified: the missing card (PNG, `manifest.json`, `guided-example-inventory.json`) so the two card tests stay red; `scripts/generate-guided-example-inventory.cjs` not touched; full `just unit` and the other smoke rows not re-run.

L5 card: `scripts/generate-guided-example-inventory.cjs` gained `linearMapsCompositionExpectedFor` (composition mode on its defaults: 5 visible curves, the fixture's 4 control points and their images under FR = [[0,-1],[-1,0]]; the fifth curve is the shared source grid `jxgBoardG27`, visible in composition mode) with a test; inventory entry, `linear-maps.composition-affine.linear-map.png` and manifest captured; the other six PNGs unchanged (manifest only changes revision and port stamps). Open: the card framing shows the board at the capture size with the origin lower-left, the source curve and grid but the image curve and most `T(P_i)` cropped at the bottom (the app itself shows the fitted view \[-14.9, 14.9\] x \[-9, 9\]); the gate should decide on reframing.

## Handler 19: card framing, smoke
- The card was cropped (the linear-map poster window frames the basis mode). `captureRecipeForEntry` now fits the composition card's own finite scene, as for the worked parabola and the curve-geometry cards; recaptured with `--family linear-maps` on port 4519 (4471 is held by another process): both curves and all points on the card; the six other PNGs byte-identical. The power-method and eigen-directions cards were already byte-identical in HEAD (both open in the basis mode): owed.
- Smoke (Sonnet, `.command-logs/lm-c/smoke-l5/report.md`): checks 1–7 pass in sl/en at 1366 and 390; pivot drag snaps to the quarter grid; keyboard on the angle slider works; `/bezier/affine` rotate/reflect work. Cosmetic: T(P_i) labels crowd each other (step 4 with the pivot: T(P_2) over "c" and P_3; at 390 px T(P_1..3) overlap). Not covered: English value flows of steps 3–5, 390 px in English.
