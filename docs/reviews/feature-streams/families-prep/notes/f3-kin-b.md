# F3 kinematics Batch B, slice 1 (content): KN3 and KN4

## Written
- `src/learning/content/kinematicsGuidedLessons.ts`: KN3 (`kinematicsProjectileLesson`, six steps) and KN4 (`kinematicsCircularLesson`, seven steps), sl + en, one worked example each, both ending in free exploration. No new action; scenes use `set-motion`, `set-params`, `set-time` through `kinematicsSceneActions`. Exports `KN4_PARAMS`. No chapter, registry, ownership, test list or smoke edit (slice 2).

## Observed
- Probe of every step scene and the quoted extra readouts, sl and en: `.command-logs/f3-kin-b/probe.txt` (0 errors). Probe test deleted.
- `just unit src/graphs/curves/kinematics`: passed (`host.log`). `npx tsc --noEmit --pretty false`: empty log (`tsc.log`). Single-backslash delimiters in the content file: 0 (`backslash.txt`).

## Numbers per step (readouts show three decimals, so values are quoted with the approximate sign)
KN3, v0 = 20 m/s, alpha = 45 unless stated:
1. Flight time 2,883 s, range 40,775 m, height 10,194 m; at t = 1,44 s position (20,365; 10,194).
2. t = 0: v (14,142; 14,142); t = 1: (14,142; 4,332); t = 1,44: (14,142; 0,016); t = 2: (14,142; -5,478); t = 2,88: (14,142; -14,111), speed 19,978.
3. a = (0; -9,81) at t = 0, 1,44, 2,88.
4. Position at t = 1: (14,142; 9,237); y = x - 0,024525 x^2 gives 9,237 at x = 14,142.
5. 30 and 60 degrees: range 35,312 m, heights 5,097 and 15,291 m, flight times 2,039 and 3,531 s; 40 and 50 degrees: 40,155 m; 45 degrees: 40,775 m.
6. Worked example T 2,883 s, R 40,775 m, H 10,194 m; v0 = 30: 45 degrees R 91,743 m, 30 degrees R 79,452 m.

KN4, R = 2 m, omega = 1,5 rad/s (the spec's pi/2 is off the 0,25 grid; the grid pair gives v = 3, a = 4,5, T = 4,189 s):
1. v = 3 m/s, T = 4,189 s, v(0) = (0; 3).
2. v = (0; 3) at t = 0, (-3; 0) at t = pi/3 (position (0; 2)), approximately (-0,02; -3) at t = 2,09.
3. a = (0; -4,5) at t = pi/3, (-4,5; 0) at t = 0, a_T = 0, a_N = 4,5.
4. omega = 3: v = 6, a = 18, T = 2,094 s.
5. R = 4, omega = 1,5: v = 6, a = 9, T = 4,189 s.
6. R = 4, omega = 0,75: v = 3, a = 2,25, T = 8,378 s.
7. R = 3, omega = 2 at t = pi/4: r (0; 3), v (-6; 0), a (0; -12), speed 6, T = 3,142 s. The worked example is the lesson's own R = 2, omega = 1,5 case.

## Deviations
- KN3 has six steps: the spec's steps 1 and 2 (launch angle, play the flight) are merged, as a scene never starts playback; the learner moves the time slider to find the top. Spec steps 5, 6, 7 became steps 4, 5, 6.
- KN3 step 5 also asks which of 40, 45, 50 degrees gives the largest range, so the 45-degree maximum is predicted before the formula (step 6).
- KN4 uses omega = 1,5 rad/s (grid value), not pi/2.
- KN4 step 6: the graph has no hold choice, so the learner sets R = 4 and finds omega = 0,75 so that the speed stays 3 m/s; recorded in the step text and an edge case.
- The worked example of each lesson sits in the final step, whose prediction is the learner's own parameter pair, so the example does not answer it. Formula `projectile-equations` sits in KN3 step 4, `projectile-range` in step 6, `uniform-circle` in KN4 step 7.

## Still to do
- Slice 2: chapter section, registry/ownership, test lists, `lessonMathNotation` set, smoke, `lesson: false` flip.
- Run `lessonMathNotation.test.ts` (and the sl/en pair check) once the lessons are in the sets.

## Doubts
- The graph caption "Težni pospešek je povsod enak: g = 9,81 m/s2" is visible with projectile motion and pre-answers KN3 step 3's prediction; not fixable in content.
- The status line of the projectile at t = 0 reads "slowing down", true (a_T < 0) but may surprise; quoted nowhere.
- KN4 step 7 refers to the next lesson in the chapter (tangential and normal acceleration, KN5) by description, not title; revise if the chapter order differs.
- KN3 step 6 names the follow-up by the catalog title "Ukrivljenost in krivinska krožnica" / "Curvature and the osculating circle" (key `curvature_circle_title`).

## Slice 2: chapter join and wiring

### Written
- `src/learning/content/kinematicsChapterRegistry.ts`: sections `projectile-motion` (lesson id `curve-kinematics-projectile`) and `circular-motion` (`curve-kinematics-circular`) on `curve-kinematics`.
- `src/learning/content/kinematicsChapter.ts`: two sections (sl + en, formula, example at the end); the chapter quotes no step numbers and does not state the 45-degree maximum or the scaling with omega and R that the lessons ask the learner to predict (it states the general formulas as the theorem, like TR3/TR4).
- Test lists: `familyChapters.test.ts` (kinematics minimum 4), `authoredChapterCoverage.test.ts` (167 to 169), `lessonMathNotation.test.ts` (set and expected ids), `tests/unified-learning.smoke.spec.cjs` (kinematics 4).
- `docs/localization.md`: two rows (domet, cas leta, najvecja visina, izstrelni kot; obhodni cas, centripetalni pospesek), handler-unreviewed. Task 05 status and README row 05: "F3 in progress".
- Not needed: `chapterOwnedLessons.ts`, `guidedLessonOwnership.ts` and `guidedExamplePreviewCopy.ts` (same Demonstration, rows exist), `lessonLookup.characterization.test.ts` and `runtime/lessonCatalog.test.ts` (no lesson-less list change; curve-kinematics already has lessons).

### Outcome
- tsc: empty (`s2-tsc.log`). `just unit src/learning src/graphs/curves/kinematics`: passed (`s2-unit.log`, 1349 s, mostly queue). `just build`: passed (`s2-build.log`). `just smoke-lesson curve-kinematics`: passed (`s2-smoke.log`). Single-backslash delimiters in the chapter file: 0 (`s2-bs.txt`).

### Not verified
- Fail-before for each test-list edit was not shown: the registry edit preceded the list edits and the unit run is 20+ minutes under the queue; the counts are a direct consequence (two sections, two examples, two lessons added).
- Smoke reused a build from a dirty revision; the chapter page of the new sections was not opened in a browser. No browser check of the new sections beyond the existing smoke.
- Chapter math was not rechecked by a probe beyond the slice 1 numbers.

## Slice 3: review fixes and tests
- Fixes in `src/learning/content/kinematicsGuidedLessons.ts`: KN3 step 3 title "Pospešek med letom" (line 448); step 4 title "Enačba poti" with the prediction now the sign of the leading coefficient and the vertex position, and the vertex sentence (x = R/2 = 20,387 m) in the observation (466-476); KN4 step 7 worked-example observation uses t of about 0,79 and "približno" / "approximately" (680-681); "Takšnemu gibanju rečemo enakomerno kroženje." (565). Lesson title kept.
- Bug found by the new test and fixed: the `kn3-angles` scene did not set `alpha` (text said 30 degrees, state stayed 45). Now `{...noArrows, alpha: 30}` (496).
- Tests in `kinematicsGuidedLessons.test.ts` (KN3, KN4, both languages): scenes on the real graph (in order, reversed, twice), quoted numbers against recomputed values and readouts, allowed-number set, sl/en number parity (sorted), prediction-leak patterns, delimiters, source backslash scan, ownership and lesson ids, worked example used, learner changes (time, alpha, v0, omega, radius).
- Logs: `s3-tsc.log` (empty), `s3-unit.log` (passed), `s3-content-red.log` (red with one quoted number changed to 40,776, then restored), `s3-bs.txt` (0).
- Not run: build, smoke, sweeps. Not verified in a browser: the new step 4 wording and the changed angles scene.

## Handler review (handler 14)
- Sonnet review of slice 1 (`.command-logs/f3-kin-b/review.md`, `check.js`): every number confirmed, no blocking finding; slice 3 applied the five fixes (two titles that named their step's answer, the path prediction moved to the sign and vertex, t ≈ 0,79 called approximate, one Slovenian sentence). Lesson `learningGoals` and `edgeCases` are not rendered.
- The slice 3 content test found a real scene bug: the KN3 angles scene did not set α = 30°, so the text and the state disagreed; fixed.
- Checks (`.command-logs/f3-kin-b/h-*.log`): `just unit src/learning src/graphs/curves/kinematics`, the six sweeps set to `curve-kinematics` with `just unit src/graphs/base src/learning/runtime`, `just check-changed` (with build) and `just smoke-lesson curve-kinematics` all passed.
- Spec deviations recorded as F3 Batch B decisions in the spec.
