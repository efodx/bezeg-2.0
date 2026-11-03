# 26 — Fortune chapter section (C5)

Status: accepted 2026-11-03 (geometry handler 47, [record](../../reviews/sweep-algorithms/26-acceptance.md)); planned 2026-11-03 (geometry handler 43). Source: [spec placement](../../specs/sweep-algorithms-lessons.md#placement), [13 sweep chapter](13-sweep-chapter.md), [21 S2 sections](21-s2-chapter-sections.md). Kind: F4, engineering review. Depends on 25.

## Scope

1. Add a `fortune` section to the `sweep-algorithms` chapter, with SL/EN prose, an activity link to the lesson and an example card. Link it from the triangulation chapter's Voronoi section as "another way to the same diagram".
2. Remove `fortune` from `CHAPTER_LINK_PENDING` and move the lesson off its interim owner. Recount the chapter and preview-copy totals from their test failures.
3. Browser check: the chapter at 1440×900 and 390×844 in SL and EN, and focus return from the lesson to the section link.

Checks: chapter and catalog unit tests, `lessonMathNotation.test.ts`, `npx tsc --noEmit --pretty false`, the production build.

## Batch acceptance (F6, after 26)

The S3 F6 record lives in `docs/reviews/feature-streams/geometry/f6-s3-acceptance.md`. It holds the criterion-to-test matrix for C5 acceptance 1–6, `just check`, the bilingual smoke, the performance record from 23, and the poster capture.

Implemented 2026-11-03 (geometry handler 47, worker; acceptance by the handler).

Breaking change: the interim example id `lesson.bezier-curves.geometric-properties.fortune` no longer resolves; the new id is `lesson.sweep-algorithms.fortune.fortune`. An old `?example=` link to the interim section opens the lesson route without a guided example; an old `?learn=1&learnChapter=bezier-curves&learnSection=geometric-properties` launch opens the sweep chapter section. The plain lesson route (`/compgeo/fortune?learn=1`), stored Presets and `learnChapter`/`learnSection` launches keep working. Return-to-chapter links land on `/bezeg-2.0/learn/sweep-algorithms#fortune`.

Back link: the triangulation chapter's Voronoi section gains a paragraph ("Another way to the same diagram") with an in-text link to the new section. Paragraph blocks of the family chapter renderer now support localized in-text links (`links` on a paragraph block, label per language), previously used only by the Bézier chapter.
