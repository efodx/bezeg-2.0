# Handoff: numerical 06 F3+F4 (partial, no checks run yet)

## Done (files touched)
- NEW src/learning/content/numericalQuadratureGuidedLesson.ts (N4, 7 steps, sibling file because numericalMethodsGuidedLessons.ts passed 600 lines; exports quadratureGuidedLessons, appended in numericalMethodsGuidedLessons.ts).
- src/demonstrations.ts (dropped lesson:false), guidedLessonOwnership.ts (quadrature -> numerical-methods/quadrature), guidedExamplePreviewCopy.ts (+test counts 88/95), lessonMathNotation.test.ts (register 'quadrature'), lessonCatalog.test.ts (opt-out list), tests/guided-lessons.smoke.spec.cjs (row).
- numericalChapterRegistry.ts, numericalChapter.ts (section quadrature, widened purpose/prerequisites), numericalChapter.test.ts (updated + new describe block).
- scripts/generate-guided-example-inventory.cjs (quadratureExpectedFor, types {point:2}, curveCount 2, points [a,0],[b,0]; unverified against a capture), scripts/capture-guided-example-previews.cjs (family regex).

## Remaining
1. NEW src/learning/content/numericalQuadratureGuidedLesson.test.ts: real-graph test (copy numericalMethodsGuidedLessons.test.ts pattern, createGraph('quadrature')), all 7 scenes out of order and twice, assert rule/fn/a/b/n and quoted readouts, own trapezoid/Simpson loop, ratio = quotient of displayed errors; also n=8 trapezoid and n=16 values quoted in steps 2 and 4.
2. Tests in scripts/generate-guided-example-inventory.test.cjs and capture-guided-example-previews.test.cjs (add quadrature entry/path, rejected neighbours).
3. Run just typecheck, lint, just unit, node tests (none run).
4. numericalPreviewCopy.ts entry and guidedExamplePreviews.test.ts (line 211 ids) await F5 capture; that test will fail until then.
5. Mutations not listed yet.

## Notes
- Spec "ratio 16.2" at n=16 is the Simpson ratio (n=8 to 16), not trapezoid/Simpson.
- No cubic function exists; exactness shown with x^2 only.
- Tool layer halves backslashes in bash heredocs/python; use Write/Edit for TS with `\(`.
