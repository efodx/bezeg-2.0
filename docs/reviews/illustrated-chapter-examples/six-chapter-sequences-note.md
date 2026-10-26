# Six family chapter sequences

Implemented the authored bilingual reading sequence for rational curves, splines, PH curves, parametrization, functions and calculus, and analysis in `src/learning/content/familyChapterSequences.ts`. Each section names example IDs directly; prose-only sections remain explicit prose/formula/figure sequences without registry fallbacks. Existing paragraph, formula, and figure content is selected explicitly. New bilingual bridges separate related cards, including the distinct continuity levels, PH degree comparisons, function rules, derivative results, and convergence topics.

The sequence test records the audit-approved card IDs independently and checks order, duplicate/dangling references, prose before and between multiple cards, audit anchors, and preservation of every existing section paragraph, formula, and figure. The analysis convergence sequence example now precedes the uniform-convergence definition and its bounds, matching the audit's concept order. The worked-parabola join remains a separate card between the worked explanation and parameter-scaling reflection.

Evidence on the assigned worktree:

- `npx vitest run src/learning/content/familyChapterSequences.test.ts --reporter=dot` — passed (4 tests).
- `npx vitest run src/learning/content/familyChapterSequences.test.ts src/learning/content/lessonMathNotation.test.ts --reporter=dot` — passed (8 tests after anchor coverage).
- `npx tsc --noEmit --pretty false` — passed.
- Deliberately changed the homogeneous-section card ID; the independent expected-order test failed on that ID, then restored the implementation.

Build, browser smoke, integration-wide coverage, audit matrix updates, and commit remain with the handler.
