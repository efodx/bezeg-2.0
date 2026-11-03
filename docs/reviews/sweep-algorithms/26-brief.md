# Brief (handoff-v12): sweep task 26, Fortune chapter section

- **Role:** implementation in the handler's worktree `C:\Users\1337Hacker\Desktop\bezeg-2.0\.claude\worktrees\stream-geometry` (branch `stream-geometry`, HEAD `22b5a6f9` = `origin/master`). The handler makes no `src` edits while you work. Do not commit, push or delegate. Pass `--no-fsModuleCache` to every Vitest run. If a preview test reports a missing image `src` (`import.meta.glob`), clear `node_modules/.vite/vitest` and `node_modules/.vitest-cache` and rerun; that is a stale cache.
- **Goal:** all of [sweep task 26](../../tasks/sweep-algorithms/26-fortune-chapter-section.md), items 1 and 2. The handler does item 3 (browser check). Read by line range first:
  - task 21 (`docs/tasks/sweep-algorithms/21-s2-chapter-sections.md`) as the template, and its record `docs/reviews/sweep-algorithms/21-acceptance.md`;
  - spec placement (`docs/specs/sweep-algorithms-lessons.md` from line 31) and C5 (from line 113);
  - `src/learning/content/sweepChapter.ts` (89 lines; the `monotone-triangulation` section from line 76) and `sweepChapterRegistry.ts`;
  - lesson C5 in `src/learning/content/compgeoGuidedLessons.ts` (from line 2503), for the facts the section may state.

  Acceptance:
  1. **Section** `fortune` after `monotone-triangulation` in the `sweep-algorithms` chapter.
     - It has a learning outcome and key facts taken from the spec and lesson C5 only: the beach line of parabolic arcs, site and circle events, false alarms, the result equals the Delaunay dual, and \(O(n\log n)\).
     - It has a chapter-owned activity link and an example card, as the S2 sections do.
     - It has a prerequisite link to the triangulation chapter's Voronoi section (`/bezeg-2.0/learn/triangulations-voronoi#voronoi`; the section id is `voronoi`, `triangulationChapter.ts:79`).
  2. **Back link.** The triangulation chapter's `voronoi` section links to the new section as "another way to the same diagram" (SL wording: decide it under the one-shot rule). `triangulationChapter.test.ts:43` forbids Voronoi words in other sections; keep that test meaningful, and adjust only what the new link legitimately needs.
  3. **Ownership.** Move `fortune` from the interim owner (`src/learning/chapter/guidedLessonOwnership.ts:124`) to the new section through the sweep chapter's `chapterOwnedLessons`, as task 21 did. Remove `'fortune'` from `CHAPTER_LINK_PENDING` (`familyChapters.test.ts:34`), and keep `'patch-coons'`.
     - Record the breaking change of the interim example id `lesson.bezier-curves.geometric-properties.fortune` and its replacement, where task 21 recorded its own, with the user impact. Return-to-chapter links land on the owning section.
  4. **One-shot bilingual text.**
     - Wrap every symbol in `\(...\)` (doubled backslashes in TS), and use `{,}` for decimal commas. `lessonMathNotation.test.ts` must pass unchanged.
     - Keep `sl.ts` and `en.ts` in lockstep if you add keys.
     - Write with Edit/Write, never heredocs, and keep each file's line endings.
- **Tests:**
  - Extend `sweepChapter.test.ts`: section order, activity identity, the prerequisite link, both languages, and no unreleased lesson advertised.
  - Extend `triangulationChapter.test.ts` for the back link.
  - Update the `familyChapters`, `authoredChapterCoverage`, `guidedLessonOwnership`, `lessonCatalog`, Learn page and preview tests. Recompute the counts from their test failures on the current files, never by guessing.
  - Observe a mutation failure for the ownership entry and for the back link, and record each in a log.
- **Checks (worker):** run these one at a time:
  - `npx tsc --noEmit --pretty false`;
  - `npx eslint` on the touched files;
  - `just unit src/learning --no-fsModuleCache`;
  - `just build`.

  Do not run the full suite or smoke.
- **Return (≤250 words):** the files changed; the broken example id and its replacement; check results with the test totals; the mutation evidence. Logs go to `docs/reviews/sweep-algorithms/26-*.log`.
- **Budget:** locate with `grep -n` first. Read at most 150 lines per call, and never a whole file over 300 lines. Send command output to logs. On `HANDOFF`, or past about 35 turns, stop at a consistent point, write `docs/reviews/sweep-algorithms/26-handoff.md`, and return partial.
