# AB-B-3 worker handoff (partial)

Done (uncommitted): new src/learning/content/bezierClippingGuidedLessons.ts (8 steps, sl+en, scenes via CLIPPING_SCENES: load-model, set-clip-tolerance, 5 set-overlay, set-trace-step last) and bezierClippingGuidedLessons.test.tsx (12 tests); wiring in guidedLessons.ts, demonstrations.ts (lesson:false removed), guidedLessonOwnership.ts (interim bezier-curves/geometric-properties, line ~148), lessonMathNotation.test.ts, guidedExamplePreviewCopy.ts(+test 118/125), lessonCatalog.test.ts (opt-out list []), tests/guided-lessons.smoke.spec.cjs row (not run).

Scenes -> graph.step (0-based; counter shows +1): hulls 0, fat-line 0, clip-a 4, swap 5, repeat end (25 of 26 index; clips 21), tangent end at 1e-10 (limit, 200, 28 unresolved), offset end (empty, 17), explore 0. Brief numbers (17,21,53,113,200/28,17) all matched the graph.

First test run: 8 pass, 4 fail (log .command-logs/ab-b-3-unit.log):
1. prose test: "bézierovo rezanje" not in summary/explanations (lesson text never uses the phrase; add it to summary sl, or test the title).
2. scene test: stepView is undefined at step 'end' (target check at line "clipping-repeat target"); skip view checks when step===null.
3. step 3/4 test: needs inspection (stepView/events accessor, `run().events` shape may differ).
4. numbers test: unresolved tangent ranges are not all >0.45 (some at 0); loosen to check the results range near 0.5 only, or inspect ranges.
Not done: fix these, mutations (>=3), just typecheck, lint, the other unit runs (lessonMathNotation, guidedExamplePreviewCopy, lessonCatalog, src/learning/chapter, src/demonstrations). Possible further issue: lessonMathNotation may flag the sl text; unverified.
Graph code untouched. Spec nuance: steps 3/4 land on A-clip at step 4 then B-clip at 5 (first A clip keeps all, then split).
