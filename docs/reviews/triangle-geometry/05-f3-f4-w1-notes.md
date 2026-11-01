# W1 (F3 lessons) notes

Done: registry, lessons (T1 7 steps, T2 7 steps, SL+EN), chapterOwnedLessons row, tests (lesson describe block appended to triangleGeometryChapter.test.ts).
No new action kind. Changes to existing vocabulary: POINT_SET_OVERLAY_NAMES (src/compgeo/pointSetModel.ts) extended with triangle, centroid, circumcentre, incentre, orthocentre, radii, angles; InscribedAngleGraph registers `parameter` name `t` (glider, degrees) via registerLessonActions.
Checks: tsc 0 errors; just unit triangleGeometryChapter.test.ts see .command-logs/t05-f3f4/w1-unit1.log.
Not run: eslint on my files, `just unit src/learning src/graphs/compgeo src/localization`, lessonMathNotation/sceneContentAgainstGraphs tests.
Risks: scenes set vertices by set-points so the panel example chip shows "custom" for right/obtuse/Thales; board widens requested views to its aspect (tests assert containment); source citations are author/title and Euclid book numbers only; Slovenian prose not browser-checked.
