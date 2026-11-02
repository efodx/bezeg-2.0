# Handoff: projective 06 F3a (K1 cross-ratio lesson)

State: implementation complete; final confirmation run still in progress at handoff.

Files: model.ts (projective action kind), CrossRatioGraph.tsx (applyProjectiveAction, registerLessonActions), new CrossRatioLessonActions.host.test.tsx, new projectiveConicsGuidedLessons.ts + .test.ts, registration in demonstrations.ts, guidedLessons.ts, guidedLessonOwnership.ts (interim owner rational-curves/worked-conic), guidedExamplePreviewCopy.ts(+test 73/80), lessonMathNotation.test.ts, lessonCatalog.test.ts, tests/guided-lessons.smoke.spec.cjs.

Checks: just typecheck passed (twice, after final edits). Earlier wide unit run (learning, projective, localization, demonstrations): only my 2 new lesson tests failed (direction text), then fixed; narrow rerun of lesson test + notation + host test passed. Mutation run (5 mutations: swapped x/y, removed integer check, load-example forced default, moved centre in scene, changed 0,73 to 0,74) failed 8 tests as expected; files restored. A final run (`just unit` on content, runtime, chapter, projective, demonstrations.test.ts; log tmp/proj-f3a/final.log) was still running; result unverified.

Not done: browser smoke, build (handler).
Deviation: the graph shows the ideal image direction reduced as (2,1), not the spec's (-40,-20,0); text quotes ray direction (-10,-5) and shown (2,1). No select-handle action added (focus steal).
