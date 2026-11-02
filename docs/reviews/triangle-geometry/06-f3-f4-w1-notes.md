# 06 F3+F4 worker W1 handoff notes (partial)

## State
Implementation complete; one self-authored assertion failing; mutations and BEZEG_TRANSIENT_STATE run not done.

## Files touched (uncommitted)
- src/compgeo/pointSetModel.ts: POINT_SET_OVERLAY_NAMES gains centres, line, circle, ninepoints, circumcircle.
- src/learning/content/triangleGeometryChapterLessons.ts: eulerLineLesson (7 steps), NEAR_EQUILATERAL_TRIANGLE, NEAR_EQUILATERAL_VIEW [-2,9,10,-3].
- src/learning/content/triangleGeometryChapterRegistry.ts: 'euler-line' section.
- src/learning/content/triangleGeometryChapter.ts: section euler-line appended; purpose/prerequisites mention it.
- src/learning/content/guidedExamplePreviewCopy.ts (+ test counts 73 / 80).
- src/demonstrations.ts: lesson:false removed for euler-line.
- src/learning/content/familyChapters.test.ts (euler-line out of CHAPTER_LINK_PENDING), src/learning/runtime/lessonCatalog.test.ts, src/learning/chapter/authoredChapterCoverage.test.ts (84, mapping).
- src/learning/content/triangleGeometryChapter.test.ts: existing assertions updated (section lists, no Euler-mention regexp, euler filter removed) and new describe block for T3.
- tests/guided-lessons.smoke.spec.cjs: eulerLine row, added to list.

## Decisions
- No new action kind; only overlay names added. NO_SYNCHRONOUS_SCENE_CHANGE keeps euler-line (sceneActions has no point-set or parameter action for it). Contract run not done.
- No new Slovenian terms (all from F2a keys), so no localization.md / README rows.
- Smoke counts: unified-learning minimum for triangle-geometry (2) left unchanged.

## Checks
- tsc: pass (.command-logs/t06-f3f4/tsc.log). eslint on changed .ts files: pass (eslint.log, before last test edits).
- just unit (learning, compgeo, localization, demonstrations): 1766 passed, 3 failed (unit.log); two fixed. Latest triangleGeometryChapter.test.ts run (unit2.log): 19 pass, 1 fail.
- Remaining failure: the test 'distinct counts' expects SL special-step text 'le 5 od 9'; actual prose is 'le \(5\) od \(9\)' which plain() turns into 'le (5) od (9)'. Fix the assertion to 'le (5) od (9)' and '(8) različnih točk' (the SL snippet '8 različnih točk' is also likely wrong in the same way).

## Remaining
1. Fix that assertion, rerun the file; rerun the wider just unit and eslint on the test file.
2. BEZEG_TRANSIENT_STATE=euler-line just unit src/graphs/base/GraphTransientState.part.
3. Report one deliberate mutation per new assertion (none done).
4. Handler: build, smoke (guided-lessons euler-line, SL/EN).
