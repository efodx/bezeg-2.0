# Brief 22c (handoff-v12), geometry handler 51, 2026-11-05

- **Role:** test and fix worker, edit permission in the stream worktree `C:\Users\1337Hacker\Desktop\bezeg-2.0\.claude\worktrees\stream-geometry` (branch `stream-geometry`). Do not commit, push or delegate.
- **Goal:** finish task 22 from [handoff 22b](22b-handoff.md). Its "Remaining" list is your work list. The lesson, wiring and chapter section are written but have never been checked, so expect to fix what the first run shows.
- **Change since that note:** the handler added the lesson action `{operation:'set-panel', panel:'inexact'|'exact'}` (`HullRobustnessGraph.tsx`, `lessonCatalog.ts`, `model.ts`). Steps 5 and 6 now set their panel in the scene, and step 6's text no longer tells the learner to choose Exact. So the first flag in the note is closed. Test it:
  - in `compgeoHullRobustnessLesson.test.ts`: step 5 shows panel `inexact`, step 6 shows `exact`, and Back from 6 returns to `inexact`;
  - in `HullRobustnessLessonActions.host.test.tsx`: add `set-panel` to the `edits` table, a refusal for a bad panel, and a `lessonCatalog` validation case next to the `set-duplicates` one.
  - Leave `PointInPolygonGraph.tsx` alone: that change is the handler's.
- **Scope:** `src/learning/content/compgeoHullRobustnessLesson.test.ts` (new), `HullRobustnessLessonActions.host.test.tsx`, the `lessonCatalog` test, and repairs to the `hullRobustness` lesson text and section in `compgeoGuidedLessons.ts` and `convexityChapter.ts`, including the "nenatančen/inexact" wording the note lists. Flag a graph defect rather than fixing it. Never weaken or skip `lessonMathNotation.test.ts`.
- **Lesson text:** do not write prose through a bash heredoc or inline Python: backslashes get lost. Use the Edit tool. Files are CRLF.
- **Checks, in this order:**
  1. Within your first 8 turns, with a first version of the test: `just unit src/learning/content/compgeoHullRobustnessLesson.test.ts > docs/reviews/convexity-hulls/22c-host.log 2>&1`.
  2. Complete the coverage in the note, then two mutations (step 5 cell moved by one; step 3 wrong rule) with failing test names, then revert.
  3. `npx tsc --noEmit --pretty false > docs/reviews/convexity-hulls/22c-tsc.log 2>&1`; `just lint src/learning src/demonstrations.ts src/graphs/compgeo > docs/reviews/convexity-hulls/22c-lint.log 2>&1`.
  4. `just unit src/learning/content src/learning/chapter src/learning/runtime src/demonstrations.test.ts src/Routes.test.tsx --maxWorkers=2 > docs/reviews/convexity-hulls/22c-unit.log 2>&1`: it exceeds 600 s, so start it with `run_in_background`. If you cannot wait for it within budget, say so and the handler will run it. A `guidedExamplePreviews` or other `import.meta.glob` failure is usually a stale cache: clear `node_modules/.vite/vitest` and `node_modules/.vitest-cache` and rerun.
  Extract only failures. Expected counts: `guidedExamplePreviewCopy.test.ts` 109 and 116, `authoredChapterCoverage.test.ts` 123, no-lesson list `[]`.
- **Return:** ≤200 words: changes (`file:line`), test counts, mutation names + failing tests, log paths, unverified cases, spec contradictions.
- **Budget:** about 30 turns. Locate with `grep`, read at most ~150 lines per call, never a whole file over ~300 lines, all test output to log files. On a `HANDOFF` message or past ~30 turns, stop at a consistent point, write `docs/reviews/convexity-hulls/22c-handoff.md` and return it as partial.
