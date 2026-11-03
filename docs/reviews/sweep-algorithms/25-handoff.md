# Task 25 handoff (partial, worker)

## State
No checks were run on the final code. No mutation is active. Nothing is committed.

## Done
- `src/graphs/compgeo/FortuneGraph.tsx`: `applyPointSetAction` handles `set-trace-step` (clamped, `'end'`, pauses via the setState step path), and `registerLessonActions` calls `registerTraceCommands`. Edited with Python, ASCII only.
- `src/learning/content/compgeoGuidedLessons.ts`: `FORTUNE_SITES`, `FORTUNE_VIEW = [-9,9,9,-7]`, `FORTUNE_TRACE_STEPS`, `fortuneScene`, the lesson `fortune` (7 steps, 2 formula blocks, 3 worked examples), appended to `compgeoGuidedLessons` (13 lessons).
- Interim owner entry in `src/learning/chapter/guidedLessonOwnership.ts` (bezier-curves/geometric-properties).
- `src/demonstrations.ts`: `lesson: false` dropped for fortune.
- `src/learning/content/guidedExamplePreviewCopy.ts`: `fortune` entry added.

## Steps and trace indices (readout "Korak k od 8", k = index+1)
1. idx 0, queue A, B, C, D.
2. idx 0, predict.
3. idx 2, beach A,B,A, y=3.
4. idx 3, beach A,B,A,C,A, circle (B,A,C), centre (0,0), R=5, y=-5.
5. idx 4, D at y=-3, cancelled (B,A,C), 3<5.
6. idx 6, y = 1 - sqrt(65/4) ≈ -3,031, beach A,B,D,C,A, vertices 2 of 2, centres (∓1/2, 1).
7. idx 7 ('end'), 2 vertices, 1 finite edge, 4 rays, counts 2 and 5.
The readout values above were dumped from the real graph in SL (dump file `25-dump.txt`, scratch).

## Remaining
1. `tests/guided-lessons.smoke.spec.cjs`: the edit was NOT applied. Add a `fortune` entry before the `LESSONS` line (about line 2205) and put it first in the list. `FORTUNE_STEPS = ['1','1','3','4','5','7','8']`, probe `[data-fortune="step"]`, minFrames 17, titles 'Fortunov algoritem' / "Fortune's algorithm". Anchor on `const LESSONS = [voronoi,`, not `monotoneTriangulation`.
2. Count tests: `compgeoGuidedLessons.test.ts` lines 44-45 (add 'fortune' and a step count of 7), `guidedExamplePreviewCopy.test.ts` (two counts +1), `lessonMathNotation.test.ts` (add 'fortune'), `lessonCatalog.test.ts` (the opt-out comment).
3. New `src/graphs/compgeo/FortuneLessonActions.host.test.tsx`, modelled on `MonotoneTriangulationLessonActions.host.test.tsx`:
   - synchronous scene sequence per step, readouts and kernel values;
   - the dual equality (`voronoiFromDelaunay` against the Fortune diagram; the local `sameVoronoiDiagram` in `fortune.test.ts` can be copied);
   - Back, scene change and unmount leave no callbacks;
   - item 2: override the shim sizes to 1280x720, apply each scene's `sceneActions`, check that the `voronoi-continues` markers lie inside the board with the 16 px inset (copy `VoronoiGraph.host.test.tsx` lines 414-445), at the 'end' step for every scene view.
4. Mutations, `git diff` restore checks, then tsc, eslint, `just unit` (focused, then full) and `just build`. Do not run smoke.
5. Check `lessonMathNotation.test.ts` against the bare digits in the prose ("korak 4 od 8").
