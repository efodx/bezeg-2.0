# PS-A-F4: the `probability` chapter

Source: [task plan](../../tasks/probability-statistics/README.md), [spec](../../specs/probability-statistics-lessons.md) (chapter title line 13, P1 and P2 contracts), F4 template in [feature streams](../../tasks/feature-streams/README.md). Date 2026-11-03, curves handler 31. Modelled on IA-F4 (`da1877d3`, [note](../interpolation-approximation/ia-f4-chapter.md)).

## What changed

- New Learn chapter `probability` (SL "Verjetnost in statistika na grafu", EN "Distributions, CLT and correlation"), family `/bezeg-2.0/probability`. Sections: `area-and-approximation` (chapter thread: probability as area under a density; a discrete law approximated by a continuous one), `density` (owns P1 `prob-density`), `binomial-normal` (owns P2 `prob-binomial-normal`). Later sections for P3 to P5 are appended when those lessons exist. Prerequisite links: `functions-and-calculus#integrals` (the definite integral) and `analysis` (limit statements). Files `probabilityChapter.ts`, `probabilityChapterId.ts`, `probabilityChapterRegistry.ts`, `probabilityChapter.test.ts`.
- Placement: last chapter of `familyChapters`/`learningChapters` and of the `functions` strand, directly after `fourier-series`. The chapter builds on the definite integral and on the limit language of Analysis, and the strand test requires the strand order to equal the chapter order, so the end of the strand keeps both lists contiguous without moving other chapters. `fourierChapter.test.ts` no longer asserts that Fourier is the last family chapter (it asserts it is second to last).
- `guidedLessonOwnership.ts`: both lessons leave the interim owner `functions-and-calculus/integrals`. `/bezeg-2.0/probability` leaves `FAMILY_CHAPTER_PENDING`. Counts: chapters 21 → 22 (`authoredChapterCoverage.test.ts`), audited references 101 → 103, Learn families/headings/thumbnails 21 → 22, `familyChapters.test.ts` id list one longer ("twenty-one"), minimum sections for `probability` 3 (also in the unified smoke row). The Learn card uses the `prob-density` poster with new SL/EN alt text (standard normal curve, area between \(-1\) and \(1\) shaded, probability readout); `prob-binomial-normal` has no poster.
- Prose quotes only checked numbers: \(P(-1\le Z\le1)=0{,}6827\), \(0{,}9545\), \(0{,}9973\); \(P(85\le X\le130)=0{,}81859\) for \(N(100;15^2)\); \(B(20;\tfrac12)\) \(P(X\le8)\): exact \(0{,}25172\), corrected \(0{,}25117\), uncorrected \(0{,}18555\); \(B(100;0{,}02)\) \(P(X\le2)\): exact \(0{,}67669\), Poisson \(0{,}67668\). English text uses decimal points, Slovenian `{,}`. de Moivre-Laplace is stated as a limit with "no rate of convergence".
- **Breaking:** the interim example ids `lesson.functions-and-calculus.integrals.prob-*` no longer resolve (asserted); the new ids are `lesson.probability.<section>.<demonstration>`. Demonstration routes and stored Presets are unchanged.

## Checks

- `probabilityChapter.test.ts` (7 tests): section owners, placement (family, learning chapters, strand end), prerequisite links resolve to real chapters, registry mapping, example links, old ids gone, every quoted number recomputed from `src/analysis/distributions.ts` and found in both languages. Mutations seen failing, then reverted: wrong owner section (2 tests), wrong EN number `0.18555` (1), wrong SL number `0{,}25117` (1), wrong registry mapping (3), interim owner restored (2), wrong prerequisite link (1), chapter dropped from the list (2), chapter placed before `fourier-series` (1).
- `npx tsc --noEmit --pretty false` clean; `just lint src/learning tests` passed; `just build` passed; `just smoke-built tests/unified-learning.smoke.spec.cjs -g probability` 1/1; `just smoke-lesson prob-density prob-binomial-normal` 4/4 (sl, en).
- `just unit src/learning src/demonstrations` (383 s): 3 failures, two environment (`guidedExamplePreviews.test.ts`, numerical-methods and projective-conics images, passes 8/8 with `--no-fsModuleCache`) and one caused by this change (`fourierChapter.test.ts` asserted Fourier is last; fixed and passing).

## Gaps

- No section figures; the Learn card thumbnail was not inspected by eye against its alt text.
