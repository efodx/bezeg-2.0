# F3 mechanical curves Batch B, slice 1 (MC3 content)

## Written
- `src/learning/content/mechanicalCurvesGuidedLessons.ts`: `DescentSceneParams` gained theta1..3 and showArc, `DescentSceneSpec.mode` gained `tautochrone`; MC3 block (formulas, one worked example, 7 steps, lesson `mc3`), export `mechanicalTautochroneLesson`; constants `MC3_END` = 1,01 and `MC3_END_ARC` = 1,08. No new action; no host file touched.

## Observed (logs in .command-logs/f3-mech-b/)
- `probe.txt`: every scene and learner change, sl and en, real readouts (probe test deleted). `host.log`: `just unit src/graphs/mechanics` passed. `tsc.log`: empty, exit 0. `backslash.txt`: 0.

## Numbers per step
1. t=0, angles 0,3; 1; 2, all times 1,003 s; depths 0,04; 0,46; 1,42 m (arithmetic).
2. t=0,5; slider end 1,01 s (set-time 1,02 throws).
3. t=1,01: beads 1,003 s each, closed form 1,003 s.
4. Worked example pi*sqrt(1/9,81)=1,0030; learner r=0,25: 0,5015 s x3 and closed form.
5. Arc shown, t=1,08 (slider end with arc): arc 1,0745; 1,0574; 1,0221 s.
6. Angles 0,5; 1,5; 2,5: cycloid 1,003, arc 1,0712; 1,0394; 1,0094; theta 0: 1,003 (arc 1,0764 not quoted); theta pi: "že v najnižji točki".
7. Neutral scene; learner r=3: 1,7373 s x3 and closed form.

## Deviations
- 7 steps, not the spec's 6: a theorem step (4, formula + worked example, predicts the time at r=0,25) was added; spec steps map to 1, 2, 3, 5, 6, 7. No merge was needed: set-time covers the release.

## Still to do (slice 2)
- Registry, chapter, ownership, test lists, smoke; the number-quote tests of the chapter need MC3 entries (numbers in expectedState and expectedObservations).

## Doubts
- The graph's own readouts and status line show 1,003 s for all three beads and "Vse kroglice ... pridejo na dno po istem času" already at t=0 (probe.txt), so step 1/2 predictions can be answered by reading the readouts; the lesson cannot change this.
- Step 4 prediction (r=0,25) uses the formula shown in the same step, answer computed by the learner; step 7's "no start where arc is faster" is limited to "starts you try" (probed 0,05 to 3,1).
- Step 6 tells the learner to reach theta=pi by dragging or the up key from 3,1 (F2a decision text); not exercised through the UI, only by set-params with Math.PI.

## Slice 2: chapter join and wiring

### Written
- `mechanicalCurvesChapterRegistry.ts`: section `tautochrone` -> `mechanics-descent`, lesson id `mechanics-descent-tautochrone`.
- `mechanicalCurvesChapter.ts`: section `tautochrone` (4 paragraphs, cycloid formula, example with approximate depths 0,04; 0,46; 1,42 m, prediction prompt). It states no equal-time result (the lesson's prediction); the theorem is named as cited only.
- Lists/comments: `familyChapters.ts` comment, `familyChapters.test.ts` (mechanical-curves minimum 3), `authoredChapterCoverage.test.ts` (170 -> 171), `lessonMathNotation.test.ts` (set + expected ids), `tests/unified-learning.smoke.spec.cjs` (3), `src/graphs/mechanics/registration.ts` comment, `docs/localization.md` (tavtohrona; krožni lok; handler-unreviewed), task 05 status and README row.
- No change needed: ownership, `chapterOwnedLessons`, preview copy, lookup/catalog tests (waves WV3 changed none of them either).

### Outcome
- tsc clean (`s2-tsc.log` empty). `just unit src/learning src/graphs/mechanics`: passed, 565 s (`s2-unit.log`). `just build` passed (`s2-build.log`). `just smoke-lesson mechanics-descent` passed (`s2-smoke.log`). Single-backslash delimiters in the chapter file: 0 (`bs.cjs`).
- Fail-before: an earlier unit run (`s2-unit-prefix.log`) failed the notation test with 32 problems because my first write of the section had single backslashes; fixed, rerun green. The count/list edits were not run red before the source edit (the lists and the source were edited together); the coverage count would have failed with 170 against the new section.

### Not verified
- The build and smoke reported reuse of an earlier dirty build; whether it contains the new section is unconfirmed. No browser look at the new chapter section; the unified-learning smoke was not run.

## Slice 3: review fixes and tests
- Fixes in `mechanicalCurvesGuidedLessons.ts`: step 5 title "Krožni lok za primerjavo" / "The circular arc for comparison" and a neutral purpose; summary without the theorem sentence; step 1 "Pred branjem odčitkov in stanja grafa napovej" (en twin); step 3 asks only to how many decimal places the three times and the closed form agree; step 5 and 6 field names are the real labels (Kroglica 1: kot θ, Bead 1: angle θ, "čas po krožnem loku (izračunan)"); step 7 "Preveri, ali obstaja začetek" / "Test whether there is a start" in explanation and prompt.
- Tests in `mechanicalCurvesGuidedLessons.test.ts` (MC3): scenes on the real graph in sl and en (in order, reversed, twice), learner changes (r = 0,25, angles 0,5; 1,5; 2,5, theta 0 and pi, r = 3), independent cycloid quadrature and elliptic arc times, slider ends, quoted-number binding per step, sl/en number parity, prediction ordering, backslash scan, worked example, ownership.
- Observed: `s3-tsc.log` empty; `s3-unit.log` passed (mechanicalCurvesGuidedLessons, lessonMathNotation, graphs/mechanics); `s3-backslash.log` 0 for lesson and chapter files; red: `s3-content-red.log` (one sl number changed, parity test failed), restored.
- Not run: sweeps, build, smoke.

## Handler review (handler 14)
- Sonnet review of slice 1 (`.command-logs/f3-mech-b/review.md`, `check.js` with an independent quadrature and an elliptic-integral arc time): every number confirmed, no blocking finding; slice 3 applied the five fixes (step 5 title, the theorem sentence out of the summary, the step 1 and step 3 prompts, the step 7 prompt that had no solution, the quoted field labels).
- Seen, not changed: at t = 0 the graph's readouts and status already show equal times; step 1 asks for the prediction before the readouts are read.
- Checks (`.command-logs/f3-mech-b/h-*.log`): `just unit src/learning src/graphs/mechanics`, the six sweeps set to `mechanics-descent` with `just unit src/graphs/base src/learning/runtime`, `just check-changed` (with build) and `just smoke-lesson mechanics-descent` all passed.
