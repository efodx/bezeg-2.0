# Triangle geometry 05 F3+F4 brief (maps handler 12, 2026-11-01)

Two workers in one worktree (`.claude/worktrees/stream-maps`, branch `worktree-stream-maps`), in parallel. Task: [05](../../tasks/triangle-geometry/05-batch-a-release.md). Spec: [triangle-geometry-lessons.md](../../specs/triangle-geometry-lessons.md) sections T1, T2, Batch-wide acceptance gate, Correctness Notes. One-shot lesson text: [new-lesson-families.md](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). Follow AGENTS.md (lesson prose math notation, localization lockstep, synchronous scene actions). F2b (registration of `triangle-centres` and `inscribed-angle` in family `plane-geometry`) is already in the working tree; its brief is `05-f2b-brief.md`.

**Mirror the Complex maps chapter**, the most recent chapter-owned family: `src/learning/content/complexMapsChapter.ts`, `complexMapsChapterLessons.ts`, `complexMapsChapterRegistry.ts`, `complexMapsChapter.test.ts`, its row in `chapterOwnedLessons.ts`, and commit `caa51161` (`git show --stat caa51161`) for every other file a new chapter touched (Learn page, preview copy, catalog and smoke tests).

## Fixed names (both workers code against these)

- Chapter id `triangle-geometry`; section ids `notable-points` (T1, Demonstration `triangle-centres`) and `inscribed-angle` (T2, `inscribed-angle`), as in `src/learning/chapter/guidedLessonOwnership.ts`.
- `src/learning/content/triangleGeometryChapterRegistry.ts` exports `TRIANGLE_GEOMETRY_CHAPTER_ID`, `triangleGeometryGuidedExampleRegistry` (keys in that order), `TriangleGeometrySectionId`, `triangleGeometryGuidedExamplePath(sectionId)`, shaped like the complex registry.
- Lessons `triangleCentresLesson` (id `triangle-notable-points`) and `inscribedAngleLesson` (id `inscribed-angle-thales`) in `src/learning/content/triangleGeometryChapterLessons.ts`.
- Chapter `triangleGeometryChapter` in `src/learning/content/triangleGeometryChapter.ts`, title *Geometrija trikotnika in inverzija / Triangle geometry and inversion*, family `plane-geometry`.

## W1: F3 lessons

1. **First**, create the registry and lesson file as a compiling skeleton (lessons with one step each) and add the `chapterOwnedLessons` row, so W2 can import them. Then fill them in.
2. T1 and T2 follow the spec's Steps, default examples and acceptance. Drive the graphs' existing state (`NotablePointsGraph`, `InscribedAngleGraph`, their Preset collections and panels in `src/graphs/compgeo/`) through existing `LessonAction` kinds (`src/learning/model.ts`). Add an action kind only if no existing one can set the needed state; keep it typed, synchronous, and covered by a test. T1 step 6 is the obtuse example \((0,0),(7,0),(1,1)\); its orthocentre \(H=(1,6)\) and circumcentre \((7/2,-5/2)\) must both be inside the scene's view (set the view explicitly if the default does not show them). T2 step 6 is the Thales lattice instance: diameter \((0,0)\)–\((8,6)\), \(P=(1,7)\).
3. Theorems are stated with a source and drags are called illustrations: T1 "circumcentre inside iff acute, at the hypotenuse midpoint iff right", centroid two-thirds ratio, concurrency of altitudes (cite author and title only, e.g. H. S. M. Coxeter, *Introduction to Geometry*; no section or page numbers, since the book was not opened); T2 inscribed angle theorem, Thales and the supplement on the other arc (Euclid, *Elements* III.20, III.21, III.22, III.31). The glider is the only inexact object: never say "exactly equal" about glider angles, only "equal to the displayed precision". Board vertices are named P1–P3 by `PointSetGraph` (Geometry's hook request is open); prose calls them \(A, B, C\) as the panels do ("A (P1)").
4. Tests in `triangleGeometryChapter.test.ts` (own the lesson half): every number in the lesson prose recomputed from the kernel (`src/compgeo/triangle.ts`, `circle.ts`, `rational.ts`) or the graph models, the T1 default, obtuse and right examples, the T2 angles and Thales dot product, and every authored scene applied in one synchronous sequence to the graph model.
5. Do not edit `src/demonstrations.ts` `lesson` flags or lessonless exemptions; the handler does that.

## W2: F4 chapter

1. Bilingual chapter with two sections (`notable-points`, `inscribed-angle`) using `withExample` like the complex chapter: purpose, prerequisites, theorem with source, checked example, "how to use it", meeting the word minimum the coverage tests enforce (≥ 450 words per language as in the complex chapter). Only T1 and T2 advertised; later batches (Euler line, Simson, inversion) are not promised.
2. Register it in `familyChapters.ts` and remove `triangle-centres` and `inscribed-angle` from any chapter-link pending/exemption list F2b added. Add the family to the Learn page (strand, topic preview, chapter order) and to `tests/unified-learning.smoke.spec.cjs` chapter order and `tests/guided-lessons.smoke.spec.cjs` rows, as `caa51161` and `b3db5be9` did; check the Learn deep-link smoke minimum sections against the chapter (see `514dce5c`).
3. Terms: the README table in `docs/tasks/triangle-geometry/README.md`; add rows to `docs/localization.md` for terms first shipped here.
4. Chapter tests (word count, math notation, links) in `triangleGeometryChapter.test.ts` in a separate `describe` block; W1 owns the lesson block. Append, never rewrite the other's block.

## Both

- Checks: `npx tsc --noEmit --pretty false`, `npx eslint <your files>`, `just unit src/learning src/graphs/compgeo src/localization` (log to `.command-logs/t05-f3f4/`). Do not run `just build`, full `just unit`, or smoke; the handler does.
- Do not commit, push, or spawn agents. Preserve the other worker's edits.
- Budget: locate with `grep` before reading; read ≤ 150 lines per call; on `HANDOFF` or after about 30 turns, stop at a consistent point, write notes, return partial.
- Report ≤ 30 lines: files changed, decisions (terms, any new action kind), checks with results, open risks. Put anything longer in `docs/reviews/triangle-geometry/05-f3-f4-<w1|w2>-notes.md`.
