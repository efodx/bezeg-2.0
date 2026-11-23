# Slice 3a handoff (partial, budget)

Done: all five items implemented. Not done: re-run of `just unit src/learning src/graphs/base` after the last two fixes, eslint, `just build`, and a re-check of `npx tsc`.

- Last unit run (before fixes): 2 failed / 3134 passed. Both fixed since, unverified: chapterGuidedWorkspace.test.tsx:65 (Povrni baseline adds a second captureState; now counts `capture:ordinary`), GuidedLessonCard.test.tsx portal test (dropped captureState count, asserts restoreState not called).
- tsc was clean before those test edits.
- sl.ts/en.ts: the two new keys were moved to `src/localization/fragments/workspace.ts` (sl.ts/en.ts may still show CRLF-only modifications from a Python rewrite; no content change).
- LessonSession.reset() now uses applyScene(step, true) (scene-less step restores checkpoint).
