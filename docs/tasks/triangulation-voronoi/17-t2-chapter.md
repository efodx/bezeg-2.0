# 17 — Triangulations chapter, Batch T2 sections (F4)

Status: open (task file written 2026-11-02, geometry handler 25). Source: spec [Solution](../../specs/triangulation-voronoi-lessons.md#solution), [release batches](../../specs/triangulation-voronoi-lessons.md#release-batches), lessons B2 and B3; [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). Kind: F4. Depends on 15 and 16. Template: [10](10-triangulation-chapter.md).

1. **Sections** `point-set-triangulation` and `delaunay` after `ear-clipping` in chapter `triangulations-voronoi` (`triangulationChapter*.ts`), each with its learning outcome, key facts and a chapter-owned activity link. B2: every triangulation has \(2n-2-k\) triangles and \(3n-3-k\) edges, \(k\) counting collinear boundary points; flips keep the counts. B3: an edge is legal when the opposite vertex is not strictly inside the circumcircle; Lawson flips raise the angle vector lexicographically and end at the Delaunay triangulation, which is unique when no four points are cocircular. B4 and B5 stay unmentioned.
2. **Ownership:** both lessons move to their sections through `chapterOwnedLessons`; the ids leave `CHAPTER_LINK_PENDING` if present. Return links land on the owning section and restore focus.
3. **Tests:** the chapter test extended (sections, activity identity, both languages, no unreleased lesson advertised); `familyChapters`, `authoredChapterCoverage`, `guidedLessonOwnership` and `lessonCatalog` tests updated; `lessonMathNotation.test.ts` unchanged. A mutation failure for the ownership move.

Breaking change: none expected (new example ids only); record one if an interim owner's example id stops resolving.

Checks: `just unit src/learning`, `npx tsc --noEmit --pretty false`, `just lint` on touched files, `just build`; handler: the chapter page in both languages with both activity return links, `just smoke-lesson point-set-triangulation delaunay`.
