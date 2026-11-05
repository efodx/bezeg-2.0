# 23 — Chapter sections for A3 and A5 (Batch 2, F4)

Status: A3 section done with task 21 (geometry handler 50, 2026-11-05) and A5 section done with task 22 (geometry handler 51, 2026-11-05), because a lesson cannot launch without its section. Accepted 2026-11-05 with the chapter smoke ([record](../../reviews/feature-streams/geometry/f6-convexity-batch2-acceptance.md)). Planned 2026-11-03 (geometry handler 48). Source: spec [Solution](../../specs/convexity-hulls-lessons.md#solution) (six lessons in order), template [15](15-chapter.md). Kind: F4. Depends on 21 and 22.

1. In `convexityChapter.ts`, add a section for A3 (between A2 and A4) and one for A5 (after A4). Each section owns its lesson through `chapterOwnedLessons`, has short bridging prose (one-shot text) and links to its new Demonstration. Existing section ids and anchors stay unchanged.
2. Tests: the chapter's lesson-ownership and order tests, the chapter-link list, and `lessonMathNotation.test.ts` unchanged. If `CHAPTER_LINK_PENDING` changed concurrently, merge it as a union and recount.

Checks: `just unit src/learning --maxWorkers=2`, tsc, build. Smoke the chapter at 1440×900 and 390×844 in SL and EN, including focus return from both lessons.

After 23 come the F5 posters for both ids (a selective capture, with `POSTER_PENDING` emptied first) and the Batch 2 F6 acceptance (criterion-to-test matrix, bilingual smoke and `just check`).
