# F3 analytic lines, batch B slice 1: lessons L3 and L4

## Written
- `src/learning/content/analyticLinesGuidedLessons.ts`: `lineAngleLesson` (L3, const `l3` at line 673, steps `l3Steps`) and `lineDistanceLesson` (L4, const `l4` at line 705, steps `l4Steps`), sl + en, 5 steps each, one worked example each, ending in free exploration.
- `LineSceneSpec` widened (`mode` also `angle`, `distance`; optional `T`); `lineSceneActions` writes `T` when given. No new action kind; `set-mode` and `set-points` were enough.
- Nothing wired (chapter, registry, ownership, tests, smoke untouched).

## Observed
- Probe (temporary vitest file, deleted) mounted the real graph, applied each step's `lines` actions in sl and en: `.command-logs/f3-lines-b/probe.txt`. Every quoted number appears there.
- `npx tsc --noEmit --pretty false`: exit 0, log empty (`tsc.log`).
- Single-backslash `\(` / `\)` count: 0 / 0 (`backslash.txt`, script `count.cjs`).
- `just unit src/learning/content/lessonMathNotation.test.ts` passed, but it probably does not cover these lessons until slice 2 registers them.

## Numbers per step (probe)
L3 (mode angle; u = P to Q, v = R to S):
1. P(-2,1) Q(0,2) R(0,2) S(1,5): u(2,1) v(1,3), dot 5, cross 5, 45 deg, `5 = 5 + 10 - 2 * 5`, meet at (0,2).
2. Q(2,2) R(-2,1) S(-1,4): u(4,1) v(1,3), dot 7, cross 11, 57,5288 deg, `13 = 17 + 10 - 2 * 7`.
3. swap: R(1,5) S(0,2): v(-1,-3), dot -5, cross -5, 45 deg, `25 = 5 + 10 - 2 * -5`.
4. S(-1,4), R(0,2): v(-1,2), dot 0, cross 5, 90 deg, perpendicular status, `10 = 5 + 5`.
5. free = step 1 position.
L4 (mode distance, line x-2y=-4):
1. T(3,-2): value 11, a2+b2 5, d2 121/5, d ~ 4,9193, F (4/5,12/5), PT (5,-3), PT.n 11, projection (11/5,-22/5).
2. T(-3,4): value -7, d2 49/5, d ~ 3,1305, F (-8/5,6/5), PT (-1,3), projection (-7/5,14/5).
3. = step 1 (worked example).
4. T(2,3): value 0, d2 0, F = T, "T lies on the line".
5. free = step 1 position; extra check P(-2,1) Q(4,1) T(3,4): d2 9, d ~ 3, F (3,1).

## Deviations
- Spec L3 step (3) "swap the shown angle (acute versus supplement)": replaced by swapping R and S (reverse v); dot changes sign, angle stays acute (45 deg). As the brief decided.
- Spec L3 step (2) "drag to confirm" is a second direction pair (4,1),(1,3) with the worked example, since the example would otherwise give away the step-1 prediction.
- L3 step 5 / L4 step 5 are free exploration with one prompt each (no exercises).

## Still to do
- Slice 2: chapter, registry, ownership, tests (readout checks of the quoted numbers), smoke, `lesson` flag.
- sl/en prose is one-shot; no native review.

## Doubts
- Cosine-rule readout prints `2 · −5` without parentheses; the lesson text writes `2\cdot(-5)`.
- `u × v` is called "izraz u×v" / "determinanta" in sl (no standard 2D term decided); a reviewer may want a term.
- The L3 prerequisite and L4 formula-sheet citation (page 40, from the spec) were not re-checked against the PDF.

## Slice 2: chapter join and wiring
Written: sections `angle-between-lines` and `distance-point-line` in `analyticLinesChapter.ts` (sl+en; examples differ from the lesson predictions: u=(3,1), v=(1,-2), about 81.87 degrees; T=(0,0) to x-2y=-4, d about 1.7889); registry rows (`line-geometry-angle`, `line-geometry-distance`) in `analyticLinesChapterRegistry.ts`; test lists (`familyChapters.test.ts` minimum 4, `authoredChapterCoverage.test.ts` 162 to 164, `lessonMathNotation.test.ts` set and ids, `unified-learning.smoke.spec.cjs` minimum 4); four term rows in `docs/localization.md`; task 05 status and README row. Not needed: `chapterOwnedLessons.ts`, `guidedExamplePreviewCopy.ts` (one row per Demonstration, `line-geometry` exists), `lessonLookup.characterization.test.ts`, `lessonCatalog.test.ts` (line-geometry already had a lesson), `guidedLessonOwnership.ts`.
Test lists failed before the registry/chapter edit (s2-pre.log): coverage 162 vs 164, chapter sections 2 vs 4.
Outcome: tsc clean; single-backslash delimiters in chapter 0. `just unit src/learning src/graphs/lines`: 2462 pass, 1 fail (s2-unit.log): `lessonMathNotation.test.ts` flags 8 English strings of `analyticLinesGuidedLessons.ts` (L3 57{,}5288, L4 4{,}9193 and 3{,}1305; en must use a point, sl keeps `{,}`). This file was off limits in this slice: slice 3 must change those en decimals to points.
Not verified: see build and smoke lines below.
Build: passed (s2-build.log). `just smoke-lesson line-geometry`: passed (s2-smoke.log; the build was reused). Not run: the unified-learning smoke (minimum 4 edit only unit-checked by reading), full chapter smoke, browser view of the new chapter sections.

## Slice 3: review fixes and tests

- Fixes in `src/learning/content/analyticLinesGuidedLessons.ts`: L3 step 4 (`l3-perpendicular`) title, purpose and explanation no longer state dot 0 or 90 degrees (learner computes the dot product); L4 step 4 (`l4-on-line`) asks whether T lies on the line, neutral purpose, and says the readout "≈ 0" is rounded while the exact decision is the value (and d²); neutral purposes at L3 step 3 and L4 step 2; L3 step 3 observation names the 135 degree angle between the vectors (cos = -5/(sqrt5 sqrt10) = -1/sqrt2) and the 45 degree acute angle; the tan formula notation states u·v ≠ 0 (perpendicular at u·v = 0), sl and en; Slovenian u×v is "determinanta" throughout (also in `analyticLinesChapter.ts` L3 investigation prompt); "Postavi Q=(2,2)" became "Premakni Q v (2,2)" (L3 step 2); the 8 English `{,}` strings now use a decimal point (Slovenian keeps `{,}`; shared `resultLatex` unchanged).
- Tests: `analyticLinesGuidedLessons.test.ts` extended for L3 and L4 in sl and en (real graph, scenes in order/reversed/twice, readout rows incl. printed `2 · −5` and `≈ 0`, independent integer/fraction recomputation, foot on line and FT perpendicular exactly, quoted numbers, sl/en number parity, prediction ordering, delimiter scan, ownership). Green: `s3-unit.log` (notation, content, graphs/lines, familyChapters passed); red: `s3-content-red.log` (one quoted dot product changed, 2 tests fail, restored); `s3-tsc.log` empty.
- Not run: build, smoke, sweeps (handler).

## Handler review (handler 14)
- Sonnet review of slice 1 (`.command-logs/f3-lines-b/review.md`): every number recomputed and matched to the probe; 2 blocking (answers before the prediction in L3 step 4 and L4 step 4), 6 non-blocking. Slice 3 fixed all; the step `purpose` and the scene `expectedState` text are not rendered in the app, so the purpose findings were cosmetic.
- Handler fix: the L4 step 4 explanation still quoted the readout ("shows ≈ 0") before the prediction; that sentence moved into the expected observation.
- Handler fix: the analytic-lines README row 06 (Batch C) had been set to "F3 in progress" by mistake; restored to "not started".
- Checks (`.command-logs/f3-lines-b/h-*.log`): `just unit src/learning src/graphs/lines` passed; the six sweeps set to `line-geometry` with `just unit src/graphs/base src/learning/runtime` passed; `just check-changed` passed (with build); `just smoke-lesson line-geometry` passed; after the handler fix, the content and notation tests rerun green (`h-unit2.log`).
- Spec deviations recorded as F3 Batch B decisions in the spec. Owed to F4–F6: no browser look at the new chapter sections or at the angle and distance modes during the lessons; the Slovenian prose has no second reader.
