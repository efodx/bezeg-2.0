# lm-c-f2a: Batch C F2a slice 1 (model and kernel)

Nothing committed. Decisions: spec bullet "F2a Batch C decisions" after the F3 Batch D bullet in `docs/specs/linear-maps-lessons.md`.

## Written

- `src/linear/composition2.ts` (new, pure): `rotationMatrix(k)`, `reflectionMatrix(k)` (k 0..23, exact at multiples of 6, no `-0`), `elementMatrix`, `composeElements(second, first)` (index arithmetic), `slotMatrix`, `firstMap`, `secondMap`, `productMatrix` (B A), `productElement`, `productOrientation`, `affineImage(M, c, b, P)`, `affineTranslationForm`, `stateAffineImage`, `affineControlPoints`, `COMPOSITION_FIXTURE`, `deCasteljau`, `applyThenApply`.
- `src/linear/linearMapModel.ts`: optional `element`, `secondElement`, `translation`, `pivot` in `LinearMapState`, `parseElement`, parse and serialize; new error reason `not-an-element`. `secondMatrix` and the `composition` mode already existed.
- Tests: `src/linear/composition2.test.ts` (new), a describe "Batch C" in `linearMapModel.test.ts`.
- `docs/tasks/linear-maps/09-batch-c.md` status line.

## Tests and mutations

Checks: `just unit src/linear src/graphs/linear` passed (log `.command-logs/lm-c/s1-unit.log`); `npx tsc --noEmit --pretty false` empty output; `just lint src/linear` passed.
Defects found by the first run: `-0` in negated entries (fixed in the kernel; tests compare with `+0`); my own wrong expectation for the reflection index (tests compare with the matrix product, so the formula was confirmed).
Mutations (failing tests of the two files, 42 tests, each restored, cmp identical): product order swapped 5; reflection sign 2; composeElements index sign 1; pivot ignored 3; accept k = 24 1; exact table at multiples of 12 instead of 6 3; pivot not serialized 1. Logs `.command-logs/lm-c/mut-*.log`.
Covered: RF, FR, RR and determinants exact; product readout vs. applying A then B on 300 random points to 1e-12 (grid and element slots); rotation orthogonal, det 1, R_k R_m = R_(k+m) to 1e-12 for all 576 pairs; reflection det -1 and square I; fixture images (4,-1),(1,0),(2,2),(5,3); T(B(1/2)) = (9/4, 1) = B_T(1/2) with an independent hand formula and de Casteljau; invariance for several t with translation, pivot and 30 degrees; old examples x six older modes byte-identical.

## Not verified

Lesson scenes (`linearMapsChapterLessons.ts`) were not scanned one by one; they use `set-matrix` etc., whose validators are unchanged. Every example in every older mode round-trips instead. `-0` is not normalised in `multiply` (shared kernel).

## Slice 2 inputs

- State fields: `matrix` (A), `secondMatrix` (B), `element`, `secondElement`, `translation`, `pivot` (all optional). Effective matrices: `firstMap(state)`, `secondMap(state)`; readout `productMatrix(state)`; with both elements `productElement(state)` names the product exactly (rotation or reflection, k); orientation and the determinant sign from `productOrientation`, never from the float.
- Not yet in the model: editing helpers (`editMatrixEntry` edits the stored entries only; choosing or clearing an element, setting translation/pivot need actions and `validateSet*` payloads and `LessonAction` union entries, shared files), the mode list in `linearMapScene.ts` (`LINEAR_MAP_GRAPH_MODES` lacks `composition`), Reset behaviour, and `exampleId` handling (an element does not change `exampleId`; decide in slice 2).
- Draw: source grid, the image of A, the combined image (B A), the Bezier fixture and its image `affineControlPoints(state)` (the curve of the image points is the image of the curve), the pivot and translation handles on the 1/4 grid. Read out: A, B (entries rounded; "rotation by k*15 degrees" for an element), the product B A, its determinant and orientation, `t` from `affineTranslationForm` when a pivot is set.

## Slice 2 (partial, handoff at the worker budget; tree compiles)

Written (unrun, untested): model helpers in `src/linear/linearMapModel.ts` (end of file: `compositionDefaults`, `isCompositionDefault`, `hasCompositionFields`, `setSlotSource`, `chooseElement`, `setElementIndex`, `editSlotEntry`, `editVectorCoordinate`, `setVectorField`, `setPivotUsed`, `validateChooseElement`, `validateSetVector`, apply helpers); `src/graphs/linear/compositionScene.ts` (pure view: A, B, BA, det, orientation, product element, t, images, grids, view scale) and `compositionBoard.ts` (curves, control points, pivot handle); `LinearMapGraph.tsx` wiring (mode `composition` in `LINEAR_MAP_GRAPH_MODES`, setMode installs the lesson example only when nothing composition-related is stored, controls `compositionControls`, legend, statuses, readout `compositionRows`, view fit by `viewScale`, pivot handle with refit on release); Preset collection allows the four new scene-state fields; ~50 `linear_map_comp_*`/`linear_map_legend_comp_*` keys in sl and en.
Checks run: `npx tsc --noEmit --pretty false` empty (`.command-logs/lm-c/s2-tsc.log`).
Left: all tests (model helper tests, `compositionScene.test.ts`, host test with the brief's check 1 and mutations), `just unit`, lint, build, localization.md term rows (kompozitum, vrtež, zrcaljenje, premik, središče vrtenja; no research done), task 09 status, graph-level Preset import test, locale lockstep test run.

## Slice 2b (tests and checks)

Added: model helper tests (`src/linear/linearMapModel.test.ts`, describe "Batch C slice 2"), `src/graphs/linear/compositionScene.test.ts` (spec products, pivot (3,1) fixture images, view fit), `src/graphs/linear/LinearMapComposition.host.test.tsx` (mode switch both ways, element choice and readout, keyboard on the angle control, pivot and translation fields, Reset, Preset round trip and older Presets, listener and object ownership).
Defects: none in slice-2 code. Stale tests of the mode list fixed: `LinearMapEigen.host.test.tsx`, `LinearMapEllipse.host.test.tsx`, `LinearMapGraph.test.ts` used `composition` as the unsupported example; they now use `spiral`, and the mode select must offer `composition`.
Spec note: with A = R and B = F the product B A is [[0,-1],[-1,0]] (the brief's "FR"); A = F, B = R gives [[0,1],[1,0]]. `multiply` leaves -0 (shared kernel), so tests compare through `x + 0`.
Mutations seen failing, then restored: `fitScale` margin 1 to 0; `setPivotUsed` origin to (1,1); `isCompositionDefault` without the pivot test; slider `bigStep` 6 to 5; `compositionDefaults` keeping pivot/translation; `hasCompositionFields` always false; `pivot` dropped from the Preset field list. Each failed 1 to 4 of the new tests.

## Review (handler 18)
Sonnet review (`.command-logs/lm-c/review.md`): no blocking finding. Applied: Slovenian translation strings say *vzporedni premik* (bare *premik* means a rigid motion in `docs/localization.md`); a term row for kompozitum, sestavljanje, vzporedni premik, središče; the readout marks t, the image points and the determinant "približno" exactly when the product matrix is off the quarter grid (pivot, translation and fixture are on it). Deferred to the lesson slice (F3): `validateChooseElement`/`validateSetVector`/`applyChooseElement` are not yet wired into `applyLinearMapAction`, and a lesson `set-mode composition` does not add the default R and F that the UI mode switch adds (`LinearMapGraph.tsx` `setMode`): the lesson slice must either set elements explicitly or share that default.
- Smoke (Sonnet, sl/en, 1366 and 390 px; `.command-logs/lm-c/smoke/report.md`): spec products, keyboard angle control, pivot (3,1) fixture images and translation, mode switches, `/bezier/affine` regression all pass. Fixed by the handler: Reset composition set the shared matrix to the identity (the basis mode lost its matrix); `compositionDefaults` now leaves `matrix` and `exampleId`, and the model test asserts it (it failed on the old code). Image-point labels moved below right, opposite the source labels, because images land on or next to source points (the quarter turn about (3,1)); not rechecked in a browser.
