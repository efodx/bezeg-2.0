# Complex maps 04 F3+F4 brief (handler 9, 2026-11-01)

Two workers in one worktree (`.claude/worktrees/stream-maps`, branch `worktree-stream-maps`), in parallel. Task: [04](../../tasks/complex-maps/04-batch-a-release.md). Spec: [complex-maps-lessons.md](../../specs/complex-maps-lessons.md) sections M1, M2, Batch-wide acceptance gate, Correctness Notes. One-shot lesson text: [new-lesson-families.md](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). Follow AGENTS.md (lesson prose math notation, localization lockstep, synchronous scene actions).

**Mirror the Linear maps chapter**, the most recent chapter-owned family: `src/learning/content/linearMapsChapter.ts`, `linearMapsChapterLessons.ts`, `linearMapsChapterRegistry.ts`, `linearMapsChapter.test.ts`, and its row in `chapterOwnedLessons.ts`.

## Fixed names (both workers code against these)

- Chapter id `complex-maps`; section ids `reciprocal-inversion` (M1, Demonstration `complex-reciprocal`) and `roots` (M2, `complex-roots`), as already in `src/learning/chapter/guidedLessonOwnership.ts`.
- `src/learning/content/complexMapsChapterRegistry.ts` exports `COMPLEX_MAPS_CHAPTER_ID`, `complexMapsGuidedExampleRegistry` (keys in that order), `ComplexMapsSectionId`, `complexMapsGuidedExamplePath(sectionId)`, shaped like the linear registry.
- Lessons `complexReciprocalLesson` (id `complex-reciprocal-inversion`) and `complexRootsLesson` (id `complex-roots-polygon`) in `src/learning/content/complexMapsChapterLessons.ts`.
- Chapter `complexMapsChapter` in `src/learning/content/complexMapsChapter.ts`, title *Kompleksne preslikave / Complex maps*, family `maps`.

## W1: F3 lessons

1. **First**, before anything else, create the registry and lesson file as a compiling skeleton (lessons with one step each) and add the `chapterOwnedLessons` row, so W2 can import them. Then fill them in.
2. M1 and M2 follow the spec's Steps, default examples and acceptance. Use the graphs' existing state/actions (look at how `ComplexMultiplicationGraph` lessons drive state, and at `LessonAction` in `src/learning/model.ts`). Add an action kind only if no existing one can set the needed state; keep it typed, synchronous, and covered by a test.
3. Tests in `complexMapsChapter.test.ts` (own the lesson half): every number in the lesson prose recomputed from the kernel (`src/analysis/complex.ts` and the graphs' math), the M1 checked values, the M2 roots for `w = 2i, n = 3` and the branch-cut ordering, and every authored scene applied in one synchronous sequence to the graph model.
4. Do not edit `src/demonstrations.ts` `lesson` flags or the lessonless exemptions; the handler does that.

## W2: F4 chapter

1. Bilingual chapter with two sections (`reciprocal-inversion`, `roots`) using `withExample` like the linear chapter: purpose, prerequisites (link the complex multiplication material that exists), theorem, checked example, "how to use it", ≥ 450 words per language. M1: \(1/z=\bar z/|z|^2\), reflection plus unit-circle inversion, division, circle inversion as involution reversing orientation. M2: regular \(n\)-gon of radius \(|w|^{1/n}\), principal-root labelling and its jump at the negative real axis, FTA cited not proved, Vieta cited. Only M1 and M2 advertised.
2. Register it in `familyChapters.ts` after `linearMapsChapter`. Change the test `links every existing demonstration from its matching family chapter` in `familyChapters.test.ts` so the **union** of a family's chapters links every Demonstration of the family, and each chapter links only its family's ones; then delete `CHAPTER_LINK_PENDING`. Fix any other test that assumed one chapter per family (search `familyChapters` in tests).
3. New Slovenian terms: decide by [choosing new terms](../../localization.md#choosing-new-terms) and add rows there; the spec's Terms section has proposals.
4. Chapter tests (word count, math notation, links) in `complexMapsChapter.test.ts` alongside W1's (you own a separate `describe` block; W1 owns the lesson block; coordinate by appending, never rewriting the other's block).

## Both

- Checks: `npx tsc --noEmit --pretty false`, `npx eslint <your files>`, `just unit src/learning src/graphs/complex src/localization`. Do not run `just build`, full `just unit`, or smoke; the handler does.
- Do not commit, push, or spawn agents. Preserve the other worker's edits.
- Report ≤ 30 lines: files changed, decisions (terms, any new action kind), checks with results, open risks. Put anything longer in `docs/reviews/complex-maps/04-f3-f4-<w1|w2>-notes.md`.
