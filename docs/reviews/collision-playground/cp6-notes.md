# CP6 notes

## Part 1 (shared runtime) files
- src/learning/chapter/orderedContent.ts: `PlaygroundContent` is a union of `bezier-drawing` (draw|inspect) and `collisions` (run|inspect).
- src/learning/content/bezierChapter.ts: four blocks gain `playground: 'bezier-drawing'`; `ChapterPlayground` is narrowed to the bezier pair, so ChapterPage.tsx needed no change.
- src/learning/content/familyChapters.ts: `orderedContent` type accepts `PlaygroundContent`.
- src/learning/FamilyChapterPage.tsx: lazy CollisionPlayground / CollisionInspect behind Suspense with `chapter-playground-loading`.
- src/learning/FamilyChapterPlayground.test.tsx (new).

## Part 2 (content, terms, docs) files
- src/learning/content/sweepChapter.ts and sweepChapter.test.ts (need Part 1 types to compile).
- src/localization/sl.ts (collision_* strings: škatel -> pravokotnikov), CollisionPlayground.test.tsx and CollisionInspect.test.tsx (string updates).
- docs: localization.md, specs/collision-playground.md (Terms; the file already had uncommitted handler edits), specs/sweep-algorithms-lessons.md, capabilities.md, ui-functionality.md.

## Mutation log
- Removed the `block.kind === 'playground'` line from FamilyChapterPage.tsx: `FamilyChapterPlayground.test.tsx` failed (1 failed); restored, test passes.

## Terms
Changed the proposal "očrtani pravokotnik (škatla)" to "očrtani pravokotnik" because *škatla* is the probability chapter's box. External sources (UL pages, RUL, Termania) were not consulted.
