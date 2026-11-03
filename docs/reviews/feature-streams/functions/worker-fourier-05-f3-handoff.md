# Worker handoff: Fourier 05 F3 (partial)

State: lesson, test and registration written; `npx tsc --noEmit` passed (exit 0). Not yet observed: the wide `just unit` run (still running in background, log `C:/Users/1337Hacker/.claude/jobs/5dae2c87/tmp/f3/unit2.log`; check `grep "FAIL\|Tests " unit2.log`). Earlier single-file run of the new test: 6 of 7 passed; the 7th (supSquare(101) > 0.99, grid value 0.97960) was fixed by changing text and test to quote 0,97960; re-run not yet seen.

Files: new `src/learning/content/fourierCoefficientsGuidedLessons.ts` (14 steps: F2 x7 `coef-*`, F4 x7 `decay-*`) and `.test.ts`; edited `src/demonstrations.ts` (dropped `lesson: false`), `guidedLessons.ts`, `guidedLessonOwnership.ts` (owner `fourier-series`/`fourier-idea`, since no section of its own; chapter link stays pending), `guidedExamplePreviewCopy.ts` (+ test counts 73/80), `lessonMathNotation.test.ts` (set + id list), `lessonCatalog.test.ts` (removed fourier-coefficients), `tests/guided-lessons.smoke.spec.cjs` (row, 14 steps, 28 frames).

Remaining: confirm unit run green (watch the id-list order in lessonMathNotation.test and chapter/ownership tests); do the deliberate mutations (one observed failure per assertion, none done); smoke row unverified (no browser run).
