# Task 28 handoff (partial; all slices written, one wide check not read)

State: scene, lesson A6, chapter section and wiring are written. tsc (`just typecheck`), `just unit` on the 5 named files, `just build` and `just smoke-lesson bezier-hulls` pass. Logs: `28-tsc.log`, `28-host.log`, `28-unit.log`, `28-build.log`, `28-smoke.log`. Scratch evidence: `28-scratch.txt` (readouts, distance 0.010777), `28-scratch2.txt` (near miss keeps 1 pair at depth 4 and 0 at depth 5).

Remaining: read the wide run `28-unit-wide.log` (`just unit src/learning src/demonstrations.test.ts src/graphs/compgeo --maxWorkers=2`, started in the background, result not read; use only the unit log tail).

Files: `BezierHullsGraph.tsx` (`applyPointSetAction` with `set-trace-step`), `compgeoGuidedLessons.ts` (`bezierHulls`, 7 steps, appended to the list), `convexityChapter.ts` (section `bezier-hulls`), `convexityChapterRegistry.ts`, `guidedLessonOwnership.ts` (new `bezier-hulls` entry: the section must be owned or the lesson cannot open), `guidedExamplePreviewCopy.ts`, `demonstrations.ts` (`lesson: false` removed), `tests/guided-lessons.smoke.spec.cjs` (new `bezierHulls` row: `just smoke-lesson` knows only lessons listed there), and the five test lists.

Scenes (set-points, control+hull on, pieces overlay, then set-trace-step) and readouts: bh-hull step 0 (depth 0/4, kept 1 of 1); bh-split step 1 (depth 1, 4 pairs to test, no verdict); bh-predict step 1 (same); bh-discard step 2 (kept 2 of 4, tested 4, discarded 2); bh-depth4 `end`=8 (kept 8 of 256, tested 32, discarded 24); bh-near-miss `end` on the near-miss pair (kept 1 of 256, tested 4, discarded 3); bh-explore step 0.

Half-grid: `set-points` forces `gridStepExponent` 0, so half-unit points are unreachable. The shifted pair is quoted in the text as its doubled-grid twin (2 of 256, verified in scratch); no scene loads it.

Notes: English math uses `0.01` (the notation test requires a point). The `set-trace-step` doc comment in `model.ts` still says EarClippingGraph only (not my scope).
