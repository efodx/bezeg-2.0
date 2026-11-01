# Geometry stream — handler handoff 18

Written 2026-11-01 by handler 18 (Opus 5.5, permission mode auto, effort medium). The supervisor relaunched this handler after handler 17 ended without a note. It stopped on a rebase conflict ([handoff 17](handler-handoff-17.md)), and the owner then told it to resolve the conflict and continue. Stream file: [geometry](../../../tasks/feature-streams/geometry.md).

## Where things are

- Worktree `.claude/worktrees/stream-geometry`, branch `stream-geometry`. Everything below is on `origin/master`. Push only fast-forwards to `master`.
- `node_modules` is a junction to the main checkout: delete the junction before removing the worktree. Untracked `docs/reviews/**` logs stay uncommitted.
- No worker or preview is running.
- **Memory:** the machine ran out of memory once this run, and Claude Code killed background checks. `just` now gates heavy commands on free memory (`d38a6ad5`). Run one heavy check at a time and use one worker.

## Done this run

| Item | Commits | Notes |
| --- | --- | --- |
| Triangulation 09, ear-clipping lesson B1 | `90819aac`, `e3c27e58`, `17934fc7` | **Rebase conflict:** with Maps' `linear-map` lesson; resolved as list unions on owner instruction. The preview-copy count is now 56 lessons (63 items), a semantic conflict git did not flag. **Smoke fix:** the lesson smoke found the comb outside the view at step 7. Every ear scene now has `view: earView(list)` (polygon box plus 1.5), and a test fails without it. **Checks:** full unit, build, and `smoke-lesson ear-clipping linear-map` all passed. |
| Convexity 15, chapter `convexity-hulls` | the two commits after `d38a6ad5` | **Worker:** Sonnet medium, brief `c15-brief.md`. **Ownership:** moves through one `chapterOwnedLessons` entry. The lessons stay in `compgeoGuidedLessons.ts` and are read lazily through `getCatalogLessonForDemonstration`, which breaks an import cycle. **Learn page:** the `computational-geometry` strand was added to `LearningPage.tsx`. **Breaking:** the interim `lesson.bezier-curves.geometric-properties.<id>` example ids no longer resolve (recorded in the task file). **Review:** a Sonnet review found nothing; math recomputed. **Mutation:** reverting an owner fails `convexityChapter.test.ts`. **Smoke:** `smoke-lesson orientation polygon-area convex-hull` passed; `unified-learning.smoke.spec.cjs` (all 13 rows) passed after adding `linear-maps` (missing since Maps `d3183f3f`) and `convexity-hulls`, with per-chapter section minimums. |

## Next, in order

1. **C1 and C2 lessons** (`interval-sweep`, `segment-intersections`). Task files are not written yet; use [triangulation 09](../../../tasks/triangulation-voronoi/09-ear-clipping-lesson.md) as the template. Carry-overs from handoff 16:
   - `applyPointSetAction` `set-points` must pass `this.allowsIntervals()` or segments.
   - Adopt `set-trace-step`.
   - The C2 summary must not claim fewer tests: 9 neighbour tests vs 6 pairs.
   - Each lesson removes its `lesson: false` and updates `lessonCatalog.test.ts` (`['interval-sweep', 'segment-intersections']`), the preview-copy counts in `guidedExamplePreviewCopy.test.ts`, and the smoke `LESSONS` list.
   - Give every scene a `view` that frames its geometry. The smoke checks board points against the lesson view.
2. **Triangulation T1 chapter** (F4): `ear-clipping` still has the interim owner `bezier-curves/geometric-properties`. If its chapter is created, `familyChapters.test.ts` exempts unreleased compgeo demos per chapter.
3. **F5 media:** posters for the six compgeo ids in `POSTER_PENDING`; the `convexity-hulls` Learn thumbnail waits on the `convex-hull` poster. Then F6 (`just check`, bilingual smoke, CI).

## Open risks

- Lesson card covers the point cluster at 1366×768 in A2 and A4 (handoff 14).
- Deferred from 13: focus to body after Remove; re-lettering not announced; `orientation-predict` hides `turn` while the text names line \(pq\); `checkAuthoredAction` uses global `isFinite`.
- SL prompt wording of the compgeo Demonstrations has not been read by a native speaker.

## Lessons from this run

- A rebase can merge cleanly and still break enumerating counts (preview copy, Learn smoke chapter list). Rerun the full unit suite and the affected smoke specs after every rebase that brings in another stream's lesson or chapter.
- A Python rewrite of a CRLF working copy must keep line endings; normalize to LF (the repo stores LF).
- `just smoke-lesson` row checks include "board points inside the lesson view", so give scenes explicit views when an example leaves the default box.

## Settings to keep

Opus handler, permission mode auto, effort medium. Workers: `bezeg-worker` Sonnet medium. Reviews: `bezeg-reviewer` Sonnet.
