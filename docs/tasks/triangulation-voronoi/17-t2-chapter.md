# 17 — Triangulations chapter, Batch T2 sections (F4)

Status: accepted 2026-11-02. 17a (the `point-set-triangulation` section) accepted 2026-11-02 (handler 31); 17b (the `delaunay` section) accepted 2026-11-02 (handler 33). The task file was written by handler 25. Source: spec [Solution](../../specs/triangulation-voronoi-lessons.md#solution), [release batches](../../specs/triangulation-voronoi-lessons.md#release-batches), lessons B2 and B3; [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). Kind: F4. Depends on 15 and 16. Template: [10](10-triangulation-chapter.md).

1. **Sections** `point-set-triangulation` and `delaunay` after `ear-clipping` in chapter `triangulations-voronoi` (`triangulationChapter*.ts`), each with its learning outcome, key facts and a chapter-owned activity link. B2: every triangulation has \(2n-2-k\) triangles and \(3n-3-k\) edges, \(k\) counting collinear boundary points; flips keep the counts. B3: an edge is legal when the opposite vertex is not strictly inside the circumcircle; Lawson flips raise the angle vector lexicographically and end at the Delaunay triangulation, which is unique when no four points are cocircular. B4 and B5 stay unmentioned.
2. **Ownership:** both lessons move to their sections through `chapterOwnedLessons`; the ids leave `CHAPTER_LINK_PENDING` if present. Return links land on the owning section and restore focus.
3. **Tests:** the chapter test extended (sections, activity identity, both languages, no unreleased lesson advertised); `familyChapters`, `authoredChapterCoverage`, `guidedLessonOwnership` and `lessonCatalog` tests updated; `lessonMathNotation.test.ts` unchanged. A mutation failure for the ownership move.

Breaking change: none expected (new example ids only); record one if an interim owner's example id stops resolving.

Checks: `just unit src/learning`, `npx tsc --noEmit --pretty false`, `just lint` on touched files, `just build`; handler: the chapter page in both languages with both activity return links, `just smoke-lesson point-set-triangulation delaunay`.

## Evidence (handler 31, 2026-11-02): 17a, the B2 section

- Built early as 17a, because lesson B2 could not open under its interim owner (see [15](15-point-set-triangulation-lesson.md#evidence-handler-31-2026-11-02)). The work was done by a Sonnet `bezeg-worker` under brief `docs/reviews/triangulation-voronoi/17a-brief.md`.
- Section `point-set-triangulation` after `ear-clipping`:
  - learning outcome;
  - \(T=2n-2-k\) and \(E=3n-3-k\), with the angle-sum and edge-incidence derivation, which the handler checked;
  - example \(n=7\), \(k=5\): 7 triangles, 13 edges (8 interior);
  - flips keep the counts;
  - activity link.
- Delaunay is not mentioned. The handler corrected the Slovenian "ne odvisita" to "nista odvisni".
- Ownership: the owner of `point-set-triangulation` is now its own section, and the id left `CHAPTER_LINK_PENDING`.
- Test changes:
  - The "unreleased lessons" scan now covers the chapter prose and B1's lesson, because B2's step 6 names Delaunay by design. The B2 section is checked for "delaunay" on its own.
  - The ownership-move mutation failed the new resolve test (`17a-mut1.log`).
- Breaking change: none. The interim example id never resolved, so no link or stored data changes.
- Checks and smoke: as in task 15's evidence.
- 17b: see the handler 33 evidence below.

## Evidence (handler 33, 2026-11-02): 17b, the B3 section

- Section `delaunay` after `point-set-triangulation` in `triangulationChapter.ts`, owning lesson B3 through `triangulationChapterRegistry.ts` and `guidedLessonOwnership.ts`; `delaunay` left `CHAPTER_LINK_PENDING` (now `['patch-coons']`); counts updated (preview copy, coverage 92, lesson catalog: no lessonless ids remain).
- `triangulationChapter.test.ts`: section order, a `resolveGuidedExample` test for `delaunay`, and the unreleased-lessons scan, which still bans Voronoi words everywhere and Delaunay words in the opening and ear-clipping sections. The chapter id is stripped before the scan because `triangulations-voronoi` contains "voronoi".
- The ownership mutation (section `delaunay` → `ear-clipping`) failed the "B3 opens from its own section" test. Checks and smoke as in task 16's 16b evidence.
