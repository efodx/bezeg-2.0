# CG-B2-3: L3 lesson for `curve-comb`

Spec: `docs/specs/curve-geometry-lessons.md` lines 64-70. Lesson `combLesson` in `src/learning/content/curveGeometryGuidedLessons.ts`; chapter section `curve-comb` (withExample); owned by curve-geometry in `guidedLessonOwnership.ts`; `lesson: false` removed in `src/demonstrations.ts`. No stored Preset or route change.

## Scenes and readouts (the readout is the source; text quotes these)

| Step | Curve | Comb | Gain | Readout / quoted values |
| --- | --- | --- | --- | --- |
| comb-predict | cubic | hidden | 1,4 | no readout; first tooth 0,9333, last 0,0835, kappa(1) = 0,0596 |
| comb-gain | cubic | shown | 2 | first tooth 1,3333, last 0,1193, ratio 11,18 |
| comb-c1 | c1 | shown | 1,4 | Stik 1: kappa left 1,3333, right 0,6667, skok -0,6667 |
| comb-c2 | c2 | shown | 1,4 | Stik 1: 0,598 / 0,598, skok 0 (all jumps ~1e-16) |
| comb-g1 | g1, b2 = 0,5 | shown | 1,4 | Stik 2: left 0,1217, right -0,5635, skok -0,6852; Stik 1 jump -0,0427 |
| comb-explore | g1, default b | shown | 1,4 | Stik 2: 0,1217 / -0,1409, skok -0,2625; Stik 1 -0,0427 |

b2 = 2 gives right -0,0352, skok -0,1569.

## C1 join locations and jumps

(-2,5; -3): -0,6667; (-1; 0): -0,1944; (1; 3): -0,375. The readout names the join with the largest jump, so Stik 1 is the one at (-2,5; -3). The lesson text names no location.

## Checks (src/learning/content/curveGeometryGuidedLessons.test.ts, real graph)

- Every scene: curve kind, comb flag and gain, readout line equals what the text quotes (sl and en prose); shown comb has three board curves with finite teeth and tip-line geometry, none visible=false, clippedCount 0; hidden comb has three curves with empty data.
- Kernel values: tooth lengths (64 teeth), gain ratio, join jumps, English readout, b2 = 2 values.
- Every "C2 implies G2" sentence is labelled for regular curves, both languages.
- One synchronous multi-action scene ending on g1 keeps shown, gain 3, count 32.
- Cycling cubic, c1, c2, g1 three times keeps the board object count stable and leaves no stale overlay element.
- `guidedExamplePreviews.test.ts`: `pending` is a typed optional field; asserts each pending id is an owned home.

## Mutations (observed, restored)

- Lesson action `visible: shown` -> `true` (lesson.ts:469): scene check failed "comb-predict: expected [true, 1.4] to deeply equal [false, 1.4]". With the state assertion also skipped, the board check failed "expected [+0, +0, NaN, ...] to deeply equal []".
- spline-beta value + 0.1 (lesson.ts:470): "comb-g1: Stik 2 ... desno -0,5635, skok -0,6852" not contained in the readout.

## Open

Card image for `curve-geometry.curve-comb.curve-comb` is not captured (PNG, manifest, inventory); `curve-comb` stays in POSTER_PENDING. With no image, `resolveGuidedExamplePreview` returns undefined (`guidedExamplePreviews.ts:129`) and `ChapterExploration.tsx:32-33` renders the card without a figure: graceful fallback.

## Handler integration (handler 48)

- **Views.** The first draft set no scene `view`, so the 3-unit cubic sat small in the default window of about 17 units, under the lesson panel at 1280 by 720. Scenes now use L2's `cubicView` for the cubic and `COMB_SPLINE_VIEW` `[-6.5, 5.5, 6.5, -5.5]` for the splines. The prepared scene applies the view before `comb-curve` replaces the scene; a real-graph test proves the view survives. Mutation: resetting the box in `setCurveKind`'s `afterImport` failed it with "comb-predict box 0: expected -8 to be close to -5.5625".
- **Tick labels.** With views, the raw board count moved from 50 to 54 between rounds of the cycling test. Counting everything except axis tick labels is stable over three rounds, so the difference is JSXGraph's tick label pool and not a leak of comb elements.
- **Text.** The chapter said the comb "cannot be continuous" at a zero-speed point, which is false in general: the text now says continuity is not guaranteed there. The summary, learning goal 3, the C2 step and the chapter now say "regular join" (acceptance 4).
- **Registration lists the focused set missed.** `just check` found `lessonSmokeCoverage.test.ts` (no smoke row) and `guidedExamplePreviewCopy.test.ts` (counts 109 and 116). A smoke row `curvatureComb` now exists; the counts are 110 and 117.
- **Engineering review.** No blocking defect. Finding 1 (`pending` could stay after capture) did not hold: `guidedExamplePreviews.test.ts` compares inventory, manifest and PNG lists exactly with the ids outside `pending`, so a captured card fails until `pending` is removed. Finding 2 (vacuous tooth assertions) fixed: halving the gain must halve every tooth. Finding 3 (`combCount` kept across kinds) is by design; no lesson text quotes a value that depends on it.

## Not covered

- A full browser walk of the lesson at 1920 by 1080, with control interaction on the observation frames. The smoke row covers the steps at the Playwright default size.
- The lesson panel still overlaps the board centre at 1280 by 720, as in every lesson. It can be moved or hidden.
- Which curves make up the 3 visible in the smoke row at step 2. The expected set is the cubic, the teeth and the tip line, with the empty cross-bar curve not counted: confirm it in the walk.
