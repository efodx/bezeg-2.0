# F3 isometries batch A (L1, L2) - evidence note

Recipe: `f3-trig-a.md`, `f3-lines-a.md`, commit `092ef897`. Logs: `.command-logs/f3-iso-a/`.

## Written
- `src/learning/model.ts`: three `kind: 'isometry'` members, `set-mode {mode}`, `set-mirror-count {count}`, `set-mirrors {mirrors}` (handler correction; the spec names `set-mirrors`/`set-mode`, `set-mirror-count` is the number-of-mirrors field, `set-dilation`/`set-frieze` join in batch B/C).
- `IsometryGraph.tsx`: `applyIsometryAction` (switch with `never` default; all validation before the write; coincident points rejected), `registerLessonActions`. `registration.ts`: `lesson: false` removed.
- Content: `isometriesGuidedLessons.ts` (L1, L2), `isometriesChapterRegistry.ts`, `isometriesChapter.ts` (family `maps`, sections `two-mirrors`, `classifying-a-motion`).
- Wiring: `chapterOwnedLessons.ts`, `familyChapters.ts` (after `complex-maps`), `guidedLessonOwnership.ts`, `LearningPage.tsx` (strand `maps` + `topicPreviews`), `guidedExamplePreviewCopy.ts`.
- Tests: host `IsometryLessonActions.host.test.tsx`, content `isometriesGuidedLessons.test.ts`, lists in familyChapters/lessonOwnerIntegrity/lessonMathNotation/lessonLookup/authoredChapterCoverage (27 chapters, 141 references)/lessonCatalog/LearningPage tests, both smoke specs.
- Docs: `docs/localization.md` terms, task 05 status, README row.

## Observed
- Host test red with `registry.on("isometry")` commented out: 5 of 5 failed, `UnsupportedLessonActionError ... “isometry”` (`host-red.log`); green restored (`new-green.log`, 13 tests with the content file).
- Content test red with one sl quote changed `(1,3)` to `(1,4)` in l1-second-image: "the numbers each scene text quotes" failed with `found: false` (`content-red.log`); text restored.
- First unit run failures (all fixed): English prose used a decimal comma in math; chapter-link pending list still held `isometries`; authored-chapter reference count 139 -> 141.
- Content test recomputes images with exact rational arithmetic; L2 scene 5 (three mirrors through the origin) was not in the earlier probe: the test shows last (1; 3), axis `x − y = 0` (observed through the real graph).
- Typecheck and lint passed after fixes (`tsc2.log`, `lint.log`).

## Doubts
- `half-angle` readout is labelled "Kot med zrcaloma"; the text quotes it as the signed angle between the mirrors.
