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
