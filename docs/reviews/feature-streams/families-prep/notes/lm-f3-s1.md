# lm-f3 slice 1 (L3 and L4 lesson content): PARTIAL handoff

## Written
- `src/learning/content/linearMapsChapterLessons.ts`: helpers `mode` (widened to four modes), `testVector`, `conic`, `worked`, `framedStep`; `linearMapEigenLesson` (`linear-map-eigen-directions`, 7 steps) and `linearMapEllipseLesson` (`linear-map-singular-ellipse`, 7 steps), sl + en, explicit frames, answers only in `expectedObservations`.
- Probe (deleted afterwards): `.command-logs/lm-f3/probe.txt` holds the real readouts and statuses of 25 opening states in sl and en.
- `just`-free checks run: `npx tsc --noEmit` clean (`s1-tsc.log`, 0 lines), CR count of the lesson file 0.

## Not done (still to do)
- Tests in `linearMapsChapter.test.ts` (L3/L4 expectations per step, recomputed numbers, synchronous scenes, sl/en readouts). The existing "every step has an expectation" test only covers the two registry lessons, so slice 2 or the follow-up must extend it.
- Red evidence `s1-red.log`; `just unit` run (`s1-unit.log`); backslash count script (`s1-backslash.txt`); a check that the `\\\\` pmatrix row separators survive.
- Not run at all: `just unit`, the lessonMathNotation heuristics on the new text (the new lessons are not in its `lessonSets`; slice 2 should add them), review.

## Per step (opening state; what readouts show; prediction)
L3: 1 `eigen-keep` basis+E (a1 (4,2), a2 (1,3), probe (5,5)); how many eigen-directions. 2 `eigen-parallel` eigen+E, 0 deg (eigenvalues 5 and 2 and both lines shown at once, v=(1,0), Av=(4,2), sine 0,4472, between 26,57, status not-parallel + two); sign changes of the sine over a half turn. 3 `eigen-second` eigen+E, 20 deg (sine 0,2642); find (1,k), lambda; snap; perpendicularity. 4 `eigen-polynomial` basis+C (a1 (1,0,5), a2 (2,1), status collapse-line); eigenvalues of C by hand (check in eigen mode: 2 and 0, status kernel). 5 `eigen-rotation` basis+R (probe (-1,1)); Delta, none (eigen: Delta -4, 0 +- 1i, between 90). 6 `eigen-shear-scalar` basis+S (probe (2,1)); S one direction (1,0), 2I all. 7 explore eigen+A, 0 deg (Delta -3).
L4: 1 `ellipse-image` basis+S_y (probe (3,3)); long axis direction and length (45 deg, 3, 1). 2 `ellipse-eigen` eigen+S_y, 20 deg (eigenvalues 3 and 1 shown); predict sigma and axis. 3 `ellipse-conic` ellipse+S_y, conic off (sigma 3, 1, axes 45); semi-axes 0,5774 along (1,1) and 1 along (1,-1). 4 `ellipse-nonsymmetric` eigen+N, 20 deg (lambda 2 and 1); long axis 13,28 deg, v1 31,72 deg. 5 `ellipse-product` basis+N (probe (3,1)); sigma1 sigma2 = 2. 6 `ellipse-circle` basis+R; circle, sigma 1, 1, axes not unique. 7 explore ellipse+A, conic off (sigma 2,3028, 1,3028).

## Numbers to verify in the test (all from the probe or spec)
E tau 7, delta 10, Delta 9; E(1,1)=(5,5), E(1,-2)=(2,-4); angle 108,43 / 71,57; windows about +-0,95 (45 deg) and +-0,38 (116,57) deg; sine at 0 deg 0,4472, signs +,-,+ over 0..180 with zeros at 45 and 116,57; C tau 2, delta 0, Delta 4, kernel (2,-1), C(2,1)=(4,2); R Delta -4; S Delta 0, 2I Delta 0; [[1,1/4],[0,1]] Delta 0 and not scalar; [[1,0],[0,0]] Delta 1; S_y lambda 3,1, sigma 3,1, conic semi-axes 0,5774 and 1; N lambda 2,1, 45 deg apart, sigma 2,2882 / 0,8740, product 2, axes 13,28 / 31,72, symmetric part [[2,1/2],[1/2,1]] positive definite; F conic hyperbola; [[1,-1],[1,1]] sigma sqrt2 twice; C sigma2 = 0.

## Deviations
- Spec steps merged: L3 spec steps 2 and 3 became `eigen-parallel` and `eigen-second`; steps 5 and 6 (rotation; shear and scalar) kept. L4 spec step 5 (singular directions and sigma1 sigma2 = |det|) is `ellipse-product`; the singular-direction angles sit in `ellipse-nonsymmetric`.
- Steps that predict what a mode reveals at once open in the basis mode and tell the learner to switch the view mode.

## Doubts
- Basis-mode probe readout (5,5) for E and (3,3) for S_y hints at the 45 deg direction; the eigen-mode steps 2 to 4 show the drawn lines and eigenvalues when they open (the prediction there is about sign changes, a second integer vector, sigma).
- The snap button and the conic toggle are quoted by their real label (the label contains the letter v or the symbols xTSx outside math).
- The 0,38 / 0,95 windows are quoted from the spec and not yet recomputed by a test.

## Slice 1b: tests
- `src/learning/content/linearMapsChapter.test.ts:285` L3/L4 scene tests (per step, sl and en, from a dragged state in another mode: matrix, mode, test angle, conic flag, readouts, statuses; frames shape; pmatrix `\` separators at runtime); `:361` numbers in the prose recomputed from `classifyEigen`, `singular`, `deriveEigen`, `deriveEllipse`, `deriveConic` (windows +-0,95 and +-0,38 by scan; sine at 44, 44,9, 117 and 116,57; E, C, R, S, 2I, S_y, N, F, general A).
- `lessonMathNotation.test.ts`: both lessons added to `lessonSets` (`linearMapsChapterLessons`) and two `'linear-map'` entries to the module-scan expectation (that test checks the demonstration-id list, so it failed until added). It reports no notation findings on the new text.
- Fake board has no container; the L3/L4 tests give it a host element (the eigen and ellipse modes fit the view).
- Results: `just unit src/learning/content src/graphs/linear` 114 files / 1835 tests green (`s1-unit.log`); red in `s1-red.log` (2 expected failures); `tsc` clean (`s1-tsc.log`, empty); `s1-backslash.txt` 0 single-backslash delimiters, 12 pmatrix blocks with `\\` separators; all written files LF (`tr -cd '\r'` count 0).
- Prose numbers or scenes found wrong: none. Correction to my test only: the N eigenvectors are 45 degrees apart as vectors (1,0),(1,-1); the prose "lines at 0 and 135 degrees" is also true.
- Not done: the old "every step has an expectation" test still covers only the L1/L2 registry lessons (L3/L4 have their own); no smoke or review.

## Slice 2: chapter join and wiring

### Written
- Registry `src/learning/content/linearMapsChapterRegistry.ts`: sections `eigen-directions` (L3) and `singular-ellipse` (L4) after the first two. Chapter `linearMapsChapter.ts`: two sections (`withExample`, prompt, formula, four paragraphs, sl and en) and a wider `purpose`. Chapter examples avoid the lessons' answers: L3 uses `M` with columns (3,1),(0,1) (eigenvalues 3 and 1, eigenvectors (2,1) and (0,1), not perpendicular; exact parallelism for v=(2,1)); L4 uses `diag(3,2)` and the shear `S` (singular values (1±sqrt5)/2 style, product 1, eigen-direction (1,0) is not an axis). Neither E, S_y, N, C, R nor the lesson shear results are stated as the section's example. Slovenian terms: strig, vrtez as in the lessons.
- Preview rows in `linearMapsPreviewCopy.ts` (opening scene is basis mode with E or S_y; captions do not name directions, axes or the circle image).
- Test lists: `guidedExamplePreviews.test.ts` (ids), `authoredChapterCoverage.test.ts` (173 to 175), `familyChapters.test.ts` (linear-maps minimum 4, comment), `lessonLookup.characterization.test.ts`, `lessonLookup.isolation.test.ts` (owners 2 to 4), `linearMapsChapter.test.ts` (structure assertions only), `LinearMapIteration.host.test.tsx` (L3/L4 added to the preset-acceptance loop), `tests/unified-learning.smoke.spec.cjs` (minimum 4), comment in `chapterOwnedLessons.ts`.
- Outside the owned list, needed by the preview tests: `scripts/generate-guided-example-inventory.cjs` (`linearMapExampleMatrices` gains `eigen-default` and `symmetric`; the first-frame expectation of both new lessons is the basis-mode 8 curves and 8 points); regenerated `docs/reviews/linear-maps/guided-example-inventory.json`; captured two PNGs and `manifest.json` under `src/images/learning/examples/linear-maps/` (build served on port 4316, stopped afterwards; both PNGs viewed: grid, square, curve and images, a1/a2 readout, nothing cropped); a comment-only edit in `src/learning/chapter/guidedExamplePreviews.ts` (see Outcome).
- Docs: `docs/localization.md` (new row for sled, jedro, skalarni produkt, singularni razcep, spektralni izrek, stoznica, handler-unreviewed; a stray TAB that had replaced `\t` in `\tau` in the L3 row repaired), task 08 status line and README row 08.

### Outcome
- `npx tsc --noEmit`: 0 lines (`s2-tsc.log`). `just unit src/learning src/graphs/linear`: green, 585 s (`s2-unit.log`). `just build` passed (`s2-build.log`). `just smoke-lesson linear-map`: 2 tests passed (`s2-smoke.log`). Single-backslash delimiters 0 in chapter and preview files (`s2-backslash.txt`); written files LF.
- Red evidence: first run after the test-list edits gave 7 failures in 5 files (all expected count/list changes, then missing PNGs). The source edits came before the test-list edits, so no separate `s2-red.log`.
- Local test cache trap: `node_modules/.vitest-cache` is keyed by file content, so `guidedExamplePreviews.ts` kept its stale `import.meta.glob` result (new PNGs invisible) until its content changed. I made a one-comment edit there for that reason; a fresh checkout or CI is unaffected, and reverting the edit locally brings the failure back.

### Not verified
- Smoke ran only the 2 `linear-map` rows the existing smoke file has; I do not know whether L3/L4 steps are covered by them. The full `tests/unified-learning.smoke.spec.cjs` chapter row (minimum 4) was not run. `node --test scripts/generate-guided-example-inventory.test.cjs` not run (no test added for the two new matrices). `just build` took 4.9 s and the smoke run reports it reused a build of the same revision; build freshness not independently checked. No review of the chapter prose by a mathematician.
