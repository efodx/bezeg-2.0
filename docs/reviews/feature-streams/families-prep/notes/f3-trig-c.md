# F3 trig Batch C (TR5) slice 1

## Written
- `src/learning/model.ts`: `triangle` union gains `set-data` (type, optional a, b, c, angleA, angleB) and its comment.
- `src/graphs/trig/TriangleSolverGraph.tsx` `applyTriangleAction`: `case "set-data"`. The chooser loads `DEFAULT_SOLVE_DATA[type]` (even for the same type), so omitted fields take the type's defaults, given fields replace them. Wrong-type or unknown fields throw via `refuseUnknown`; values are checked by `parseTriangleState` (nothing snapped); one `setState`; mode unchanged.
- Host tests added in `TriangleSolverLessonActions.host.test.tsx` (equal to chooser + typed fields for four types, chooser alone, sync sequence, checkpoint restore, invalid values).
- Evidence in `.command-logs/trig-c/`: host-red.log (8 failed), host.log, s1-unit.log, s1-tsc.log, s1-lint.log (all green), probe.txt (sl + en).

## Observed
See probe.txt. Status text states the count on the first frame (see Probe summary).

## Probe summary
- Defaults: SSS 5,6,7 gives A 44.4153, B 57.1217, C 78.463, area 14.69694; SAS gives a 6.245, B 43.8979, C 76.1021, area 15.15544; ASA gives a 5.22163, b 7.03508, area 18.08825. Rows: sides, angles, area per solution, plus "Height h" for SSA. No cosine/sine-rule step is shown.
- Status shown at once: SSA a=5 "Two solutions (B1 solid c about 9.9282, B2 dashed c about 3.9282)"; a=4 "One solution ... right angle at B"; a=3.5 "No such triangle: a shorter than h about 4"; a=8, 9 "One solution: ray and arc meet in one point"; a=6, 7.75 two solutions. So step 1, 5, 6 predictions are all answered by the status line on the first frame.
- Height h is a readout row (about 4) and a dashed drawn segment; legend: solid circle about C radius a, dashed height h. B1 solid / B2 dashed, labels B1, B2.
- Impossible: SSS 2,3,6 "sum of two sides must exceed the third"; 3,3,6 "flat triangle"; ASA 100,80 and 120,70 "angle sum at least 180"; no rows, nothing drawn, no legend.
- Board refits to the solved drawing (extent padded by 1). SSA a=3.5 still draws ray, circle and h but no triangle. Reset (lessonDefaultState) goes to mode sides with SSS 5,6,7.

## Doubts
- The Reset button was not found in a plain mount, so reset from solve mode is read from code, not exercised.
- Board bounding boxes are from jsdom dimensions, not a real browser; not smoke tested.

## Slice 2

### Written
- `src/learning/content/trigSolveGuidedLessons.ts`: `triangleSolveLesson` (TR5, 7 steps, sl + en, no worked examples, two formula blocks `cosine-rule-a`, `angle-sum-sine-rule` used by steps 3 and 4), `triangleSolveSceneActions(id, spec)` (prepared-scene demonstration-default, `set-mode solve`, `set-data`), scene constants `TR5_SSS_5_6_7`, `TR5_SSS_2_3_6`, `TR5_SAS_5_7_60`, `TR5_ASA_40_60_8`, `TR5_SSA_30_8_A8`, `TR5_SSA_30_8_A5`. The lesson id `triangle-solve` is a registration matter (GuidedLesson has no id field): slice 3.
- Probe 2: `.command-logs/trig-c/probe2.txt` (sl + en); the temporary host test is deleted.

### Numbers per step with source
| Step | Opening scene | Quoted numbers | Source |
| --- | --- | --- | --- |
| 1 | SSS 5,6,7 | angles 44,4153 / 57,1217 / 78,463 | probe.txt sss default |
| 1 | typed c=6, b=3, a=2 | 5,6,6 and 5,3,6 still triangles; 2,3,6 status "Takega trikotnika ni: vsota dveh stranic ..." | probe2 sss 5,6,6; 5,3,6; probe sss 2,3,6; 2+3=5<6 arithmetic |
| 2 | SSS 2,3,6 | 3,3,6 "sploščen trikotnik"; 4,3,6 "Ena rešitev", C 117,2796 | probe sss 3,3,6; probe2 sss 4,3,6 |
| 3 | SSS 5,6,7 | a^2=39, a approx 6,245, cos B = 9/(2 sqrt 39) approx 0,7206, B 43,8979, C 76,1021 | probe sas default; arithmetic (25+49-35=39; 4,5/6,244998=0,720577; 180-60-43,8979) |
| 4 | SAS 5,7,60 | C=80, a approx 5,22163, b approx 7,03508; B=150 status "vsota kotov bi bila najmanj 180" | probe asa default; probe asa 100,80; probe2 asa 40,150,8; 40+150=190 |
| 5 | SSA 30,8,a=8 | h=8 sin 30=4; B=30, C=120, c approx 13,85641 (opening scene); a=5: c 9,9282 and 3,9282, B 53,1301 and 126,8699 | probe ssa a=8, a=5; 53,1301+126,8699=180 |
| 6 | SSA a=5 | a=4: "pravi kot pri B", B 90, C 60, c 6,9282; a=3,5 status; a=9 status | probe ssa a=4, 3.5, 9; a=3.5 still draws ray, circle, h (slice 1 note) |
| 7 | SSS 5,6,7 | a=4,25 two solutions; 7,75 two; 4, 8, 8,25 one | probe ssa 4, 8, 7.75; probe2 ssa 4.25, 8.25 |

### Deviations
- Chooser default for SSA is a=5 (not a=8), so the step 5 opening uses `set-data` with a=8 explicitly and step 6 opens on the default.
- Step 1 tells the learner to type c, b, a in that order: typing a, b, c shows "no triangle" already after b (2,3,7), before the last field. All of 2,6,7 / 5,3,7 / 5,6,6 / 2,6,6 / 5,3,6 are triangles (probe2).
- Step 2 predicts two states (a=3, then a=4) in one prompt; step 4 two predictions (C and a; then B=150); step 6 three (a=4, 3,5, 9).
- Slovenian quotes of statuses avoid "B₁/B₂" (the notation test flags Unicode subscripts); step 5 paraphrases with math.
- The obtuse/right-A rule is stated in step 6 from the spec and labelled "this scene does not show it".

### Test design (tests worker)
- Mechanics: each scene is `prepared-scene` (demonstration-default), `triangle set-mode solve`, `triangle set-data {type, fields}`; run all actions in one `act`, then read `[data-triangle-status]` and `[data-readout]` rows (`solved-sides-N`, `solved-angles-N`, `solved-area-N`, `height`).
- Openings (expected): step 1 and 3 and 7 SSS 5,6,7 "Ena rešitev." angles 44,4153 / 57,1217 / 78,463, area 14,69694; step 2 SSS 2,3,6 no triangle, no rows; step 4 SAS 5,7,60: a 6,245, B 43,8979, C 76,1021, area 15,15544; step 5 SSA a=8: one solution, c 13,85641, h approx 4; step 6 SSA a=5: two solutions c 9,9282 / 3,9282.
- Post-change states (learner actions): step 1 fields c=6, b=3, a=2 (labels "Stranica c", "Stranica b", "Stranica a"; en "Side ...") -> no triangle; step 2 a=3 -> flat; a=4 -> sides 4,3,6, C 117,2796; step 3 chooser "SKS (dve stranici in kot med njima)" -> SAS 5,7,60; step 4 chooser "KSK (stranica in priležna kota)" -> a 5,22163, b 7,03508, C 80; "Kot B (°)"=150 -> angle-sum status; step 5 a=5 -> two solutions (B1 53,1301, B2 126,8699); step 6 a=4 / 3,5 / 9 -> tangent / none / one; step 7 explore: a=4,25 and 7,75 two, a=4, 8, 8,25 one.
- Quote list: all rows of the table above; status strings quoted in the lesson: sss 2,3,6, sss 3,3,6, asa angle sum, ssa a=4, a=3,5, a=9 (sl and en in probe.txt).
- Not yet asserted anywhere: the quoted statuses against the live graph (slice 3 test).

### Checks
tsc, lint, unit `src/graphs/trig` green (`s2-*.log`); backslash checks 0 singles (`s2-backslash.txt`). The notation test was not run on the file (slice 3 registers it); I only ran an ad hoc regex scan mirroring its heuristics.

### Still to do
Slice 3: register, chapter, preview, tests, notation test list, smoke.

### Doubts
- Step 6 a=4 "krožnica se poltraka le dotakne" and "druga točka na drugi strani A" are geometric arguments, not probe quotes.
- Step 7 observation prompt (smallest/largest a) is a grid fact checked by two probes and the exact rule; 4,25 to 7,75 gives 15 values.
- Free exploration ends on SSS 5,6,7 (scene), as the brief asks; no smoke test run.

### Slice 2d
- `src/learning/content/trigSolveGuidedLessons.test.ts` (tests only; 18 tests, sl and en). Part A: opening sweep on the real graph out of order and twice, restore (`:100-`), controls/labels named by prompts, learner actions through the real controls (typing c, b, a; chooser to SKS/KSK/SSK; B = 150; a = 5, 4, 3,5, 9, 4,25, 7,75, 4, 8, 8,25), no opening equals the state its prompt asks for, no answer before the change (steps 3, 4 and the rest). Part B: independent law of cosines, Heron, law of sines and SSA quadratic; per-step quotes; closed set of decimals; separator per language; whole grid a = 1/4..12: exactly 4,25..7,75 (15 values) have two solutions.
- Checks: `just unit` (file plus `src/graphs/trig`) passed; `just typecheck` 0; `just lint` on the file 0; LF. Red: sl step 4 quote 7,03508 -> 7,03509 fails 3 tests, restored (`s2d-red.log`).
- Finding, not a false claim: step 3 (sl and en) writes `C=180-60-43,8979=76,1021` without an approx marker on the rounded 43,8979; the approx rule exempts exactly that chain.
- Not verified: no browser/smoke run; the `a` typed with a decimal comma in sl relied on the field accepting it (it did in this test).

## Slice 3: chapter join

Written
- TR5 joined as last section `solve-triangle` (lesson `triangle-solve`, Demonstration `triangle-solver`): `trigonometryChapterRegistry.ts`, `trigonometryChapter.ts` (four paragraphs, formula, example; purpose and header comment extended). Chapter example SSA A = 45 deg, b = 10, a = 8: h ~ 7,0711, two triangles, B ~ 62,1144 / 117,8856, C ~ 72,8856 / 17,1144, c ~ 10,81273 / 3,32941 (recomputed by node); none of the lesson's predicted values quoted.
- Counts: `familyChapters.test.ts` trigonometry minimum 5, `authoredChapterCoverage.test.ts` 190 -> 191 and section mapping, `lessonLookup.characterization.test.ts` row, `lessonMathNotation.test.ts` (import, set, scan list), `guidedExamplePreviews.test.ts` pending, smoke `unified-learning` trigonometry 5; comments in `registration.ts`, `guidedLessonOwnership.ts`. `lessonOwnerIntegrity`, `lessonCatalog`, `LearningPage` tests and `chapterOwnedLessons.ts` needed no change. No new guided-lessons smoke row (one row per Demonstration). `docs/localization.md` one row of TR5 terms (handler-unreviewed); task 09 and README status.
- Outside the owned list: `trigTriangleGuidedLessons.test.ts:478` expected the triangle-solver rows `['sine-rule','cosine-rule']`; now includes `solve-triangle`. No change to `trigSolveGuidedLessons.ts` (notation test passed).

Outcome (logs in `.command-logs/trig-c/`)
- Red `s3-red.log`: familyChapters (4 >= 5) and authoredChapterCoverage (190 vs 191) failed before the section existed.
- `s3-tsc.log` clean; `s3-lint.log` clean; `s3-build.log` passed; `s3-smoke.log` smoke-lesson triangle-solver passed.
- `s3-unit.log` (src/learning src/graphs/trig): 1 failed / 2865 passed (the line-478 expectation); rerun of that file `s3-unit-rerun.log` passed.
- Backslash check: 0 outside String.raw; chapter file LF (registry was CRLF in the working tree, now LF).

Not verified: the chapter section in the browser; unified-learning smoke; Slovenian prose has no second reader; the full unit set was not rerun after the line-478 fix.
