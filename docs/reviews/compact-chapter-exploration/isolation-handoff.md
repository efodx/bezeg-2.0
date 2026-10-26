# Compact chapter exploration isolation handoff

Base: `f2f628e61e51412901245b206e2009ab3d688d24` in the managed worktree `C:/Users/NonFriedMotherBoard/.codex/worktrees/compact-chapter-exploration/bezeg`.

Migrated the Bézier prepared activity card and family free-exploration cards to the already-present `ChapterExploration` contract. Preserved Bézier launch state, return context, assets, prompts and bilingual labels. Preserved family section anchor updates, original free-exploration URLs, per-demo optional guided links, prompts and figures. Added family contract assertions for card count, unique title-bearing accessible labels, Slovenian primary-action wording, and English accessible labels. No `ChapterGuidedLessons` references were introduced. Corrected the family wrapper to `learning-investigation-list` containing cards directly.

Checks at the final source state: `just typecheck` passed; scoped `just lint src/learning/ChapterPage.tsx src/learning/FamilyChapterPage.tsx src/learning/LearningPage.test.tsx` passed; focused reader/content/navigation/notation suite passed (`LearningPage.test.tsx`, `ChapterPage.test.tsx`, `familyChapters.test.ts`, `bezierChapter.test.ts`, `lessonMathNotation.test.ts`, `familyInvestigation.test.ts`, `ChapterActivityVisit.test.ts`). Logs are in this worktree's `.command-logs/`.

No build or browser smoke was run in this slice; the handler owns integrated build and browser acceptance. The worker sandbox could not access Git metadata in this managed worktree. The handler used escalated Git inspection to review the actual diff against the specified base commit and confirmed that unrelated guided-learning changes were excluded.
