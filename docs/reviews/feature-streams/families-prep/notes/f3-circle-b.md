# F3 circle geometry batch B, slice 1 (CG3, CG4 actions and content)

## Written

- `src/learning/model.ts` (circle action comment and union): new operation `set-apollonius` with optional `a`, `b`, `p` (`{x, y}`) and `k`; at least one required; does not change the mode.
- `src/graphs/compgeo/CircleConstructionGraph.tsx` (`applyCircleAction`, case `set-apollonius`): every field validated first (points through `exactCoordinate`, `k` through `snapRatioInput` and refused when adjusted), only changed fields collected, one `setState` of the changed fields, none when nothing changed.
- `src/graphs/compgeo/CircleConstructionLessonActions.host.test.tsx`: four tests (control equivalence, only-changed writes via a `setState` spy, one synchronous sequence with restore, invalid data including a valid earlier field leaves state unchanged).
- `src/learning/content/circleGeometryGuidedLessons.ts`: `circleApolloniusLesson` (7 steps), `circleCommonTangentsLesson` (7 steps), scene helpers `apolloniusScene` and `commonScene`, header comment. No chapter, registry, ownership, test list or smoke edits.

## Observed

- Host test green (9 tests): `.command-logs/f3-circle-b/host.log`. Red evidence (case renamed, then restored): 3 of the 4 new tests fail, the invalid-data test still passes because the default branch throws: `host-red.log`.
- `npx tsc --noEmit --pretty false` clean: `tsc.log`.
- Single-backslash delimiters in the lesson file: 0 (`backslash.txt`).
- Probe of the real scene readouts and status per step, sl and en: `probe.txt` (temporary probe test deleted). Not run: `lessonMathNotation.test.ts` (the lessons are not registered until slice 2).

## Numbers per step (all agree with the probe)

CG3 (A=(0,0), B=(6,0)): s1 k=1: set row `12x=36`, ratio at P=(8,4) is 2; k=2 status names a circle. s2 k=1, P=(5,0): ratio 5, P not on set; P=(3,3): ratio 1, on set; P=B: not defined. s3 k=2: N=(4,0), Z=(12,0). s4: centre (8,0), squared radius 16. s5: P=(8,4), (8,-4), (4,0), (12,0): ratio 2, on set; (5,0): ratio 5, not on set. s6: inverse of A is (6,0). s7: k=1/2: centre (-2,0), squared radius 16; A=B: set not defined.
CG4: s1 radii 5, 3, d=13: 4. s2 d=8: 3, d=7: 2, d=2: 1, d=1: 0. s3 radii 3, 1, d=10: external centre (15,0), 4 tangents. s4 internal centre (15/2,0). s5 radii 3, 3, d=10: no external centre, internal (5,0), 4. s6 d=4: 3 tangents, internal centre (3,0), external (6,0); d=2: 1 tangent, external centre (3,0). s7 concentric: 0, coincident: infinitely many, none drawn.
Arithmetic only (not readouts, checked in node): arcsin(1/5)=11.537 deg, arcsin(0.4)=23.578 deg, arcsin(0.6)=36.870 deg, sqrt(96)=9.79796, sqrt(84)=9.16515.

## Deviations

- The graph shows no tangent lines' contact points, angles or contact distances as readouts in common mode; the text gives those as stated arithmetic, rounded and marked approximate.
- CG3 uses the spec's 7 steps with no merge; CG3 step 2 is at k=1 so the circle is not drawn before step 3 to 4. CG4 uses 7 steps.
- Only step 1 of each lesson has a prediction; the worked examples sit on CG3 step 4 and CG4 step 3.

## Still to do

Slice 2: chapter, registry, ownership, test lists, smoke; run `lessonMathNotation.test.ts` and the lesson structure tests once registered.

## Doubts

- The lesson title Apolonijeva krožnica names the circle for k not equal to 1; the title is the spec's term, so the CG3 step 1 prediction is only the shape for k=1 versus k=2 as framed.
- Formula block `common-tangent-count` states the whole count rule; a reviewer may want it only after step 2 (it is listed on step 2, not step 1).
- `set-apollonius` allows A=B (the fields allow it); no lesson scene uses it.

## Slice 2: chapter join and wiring

### Written

- `circleGeometryChapterRegistry.ts`: sections `apollonius-circle` and `common-tangents` on `circle-construction`; lesson ids follow the CG1/CG2 pattern (`circle-construction-apollonius`, `circle-construction-common-tangents`), not the brief's `circle-geometry-*` names.
- `circleGeometryChapter.ts`: two sections (paragraphs, formula, example, investigation prompt), sl and en. No answer to a step-1 prediction (shape of the set; count of common tangents) is stated in the chapter. Rounded numbers marked approximate; no step numbers.
- Tests and lists: `familyChapters.test.ts` (circle-geometry minimum 4), `authoredChapterCoverage.test.ts` (165 to 167), `lessonMathNotation.test.ts` (lessons and owner ids), `tests/unified-learning.smoke.spec.cjs` (minimum 4). No change needed in ownership, preview copy (row `circle-construction` exists), lookup/catalog lists (Demonstration already owned), or `tests/guided-lessons.smoke.spec.cjs`.
- `docs/localization.md`: 4 rows (Apolonijeva krožnica, delilna točka, skupna tangenta, središče raztega), handler-unreviewed. Task 05 status and README row: "F3 in progress".

### Outcome

- tsc clean (`s2-tsc.log`); `just unit src/learning src/graphs/compgeo` passed (`s2-unit.log`); `just build` passed; `just smoke-lesson circle-construction` passed (`s2-smoke.log`); single-backslash delimiters 0 (`s2-bs.txt`).

### Not verified

- The count edits were made after the source edit, so no red-before run; the counts (167, minimum 4) are what the unit run confirms green. `unified-learning.smoke.spec.cjs` itself not run. Spotted, not edited (not owned): sl title of CG3 step 4 says `NZ`, en says `IE` (`circleGeometryGuidedLessons.ts:561`).

## Slice 3: review fixes and tests

### Written

- `circleGeometryGuidedLessons.ts`: CG3 step 1 asks for the side of A and B (prompt, observation); step 2 says the on-set test is exact and the readout ratio is rounded when not an integer; step 3 and step 6 explanations ask, derivation moved to `expectedObservations`; CG4 step 1 asks external and internal touching separately (five predictions); step 5 and step 6 ask, answers (X=(30,0) at r2=2, parallel tangents, contact point (3,0)) moved to `expectedObservations`. No formula block of these steps states an answer. Summaries re-read: no answer.
- `circleGeometryGuidedLessons.test.ts`: structure, ownership and lesson ids, backslash and delimiter balance, sl/en number parity, CG3 and CG4 scenes on the real graph (both languages, in order, reversed, twice) against exact rational recomputation (Apollonius centre, rho^2, inverse, division points, on-set test, tangent counts, similarity centres), quoted angles and contact distances, prediction ordering patterns.

### Observed

- tsc clean (`s3-tsc.log`); `just unit` on the three paths passed (`s3-unit.log`); single-backslash delimiters 0 (`s3-bs.txt`). Red: sl `23{,}59` for `23{,}58` fails 2 tests (`s3-content-red.log`), restored.

### Not verified

- No smoke, build or sweep. The en readout text for "no external centre" and the P=B ratio were asserted as run, not independently derived. The shell tool mangles single backslashes in heredocs and python strings; the first edit pass wrote single-backslash delimiters, fixed by `s3-fix.cjs` (the final unit run is after the fix).

## Handler review (handler 14)
- Sonnet review of slice 1 (`.command-logs/f3-circle-b/review.md`, `check.js`): every number confirmed, no blocking finding; the handler treated the later-step predictions (finding 3) as required by the spec ("predicts before it reveals") and slice 3 applied them with the other fixes. Lesson `edgeCases` are not rendered, so their k = 1 sentence does not answer step 1.
- Handler read of the reworked explanations (CG3 division, inverse; CG4 equal radii, touching): each asks before the observation reveals.
- Checks (`.command-logs/f3-circle-b/h-*.log`): `just unit src/learning src/graphs/compgeo`, the six sweeps set to `circle-construction` with `just unit src/graphs/base src/learning/runtime`, `just check-changed` (with build) and `just smoke-lesson circle-construction` all passed.
- Spec deviations recorded as F3 Batch B decisions in the spec.
