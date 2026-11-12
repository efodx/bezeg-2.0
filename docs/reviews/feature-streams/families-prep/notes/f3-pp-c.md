# F3 phase portraits, Batch C (PP4, PP5): slice 1 note (worker)

## Written
- `src/learning/model.ts`: `LessonAction` union entries `phase`: `set-r` (`R`, stored r*100, 250..400), `set-seed` (`X`, x0*100, 1..99), `set-step` (`step`, 0..60). No `set-zoom` (the bifurcation window is not scene state; the graph has no zoom field) and no mode switch (the graph has none). `set-matrix`/`set-system` join with the phase-portrait graph.
- `src/graphs/dynamics/LogisticMapGraph.tsx`: `applyPhaseAction`, `refuseUnknown`, `commitLogistic`, `registerLessonActions` (`registry.on("phase", ...)`). Merged state through `parseLogisticState`, throws `phase <op>: <field> <reason>.`, unknown top-level fields refused, exhaustive `never` switch, a valid action pauses playback (also when nothing changes), only changed fields written.
- `src/graphs/dynamics/LogisticMapLessonActions.host.test.tsx` (7 tests): each action equals the control input (type r, type x0, Next step), one synchronous multi-action sequence, checkpoint restore, playback pause, `supportsLessonAction`, 21 invalid actions change nothing, message matches.
- `src/graphs/dynamics/LogisticMapGraph.test.tsx`: one test added, "no y tick number reaches into the caption rows".
- `src/learning/content/phasePortraitsGuidedLessons.ts`: `logisticMapLesson` (PP4, 7 steps), `bifurcationLesson` (PP5, 5 steps), `phasePortraitsSceneActions`, scene constants. Text is written once with `{,}` and the English copy gets `.` by a local `text()` helper.

## Observed
- Label fix: ALREADY DONE in commit 93d9eba9 (F2b fix pass: `defaultAxesAttributes` suppresses y tick numbers below 0, captions start 26 px below the axis; existing test "the y axis writes no number below 0"). The task-04 "owed" line is stale. I added a gap test. Red evidence: with the suppression disabled, 2 tests fail (the old one and the new one), `.command-logs/f3-pp-c/gap-red.log`; restored, green `gap-green.log`. No browser look at the real picture was done.
- Host test red: `registry.on('phase')` commented out, 7 of 7 fail (`host-red.log`); restored; green `host2.log`.
- `npx tsc --noEmit --pretty false` clean after the content file (`tsc2.log`). `just unit src/graphs/dynamics`: passed, 0 failures (`unit-dynamics.log`). Probe test deleted; probe output `.command-logs/f3-pp-c/probe.txt`, `probe2.txt`.
- Not run: `lessonMathNotation.test.ts` (the new module is not in its list; adding it is slice 2), no content test, no chapter, no smoke.

## Numbers per step (all probed readouts, sl; start 0,2 unless stated)
PP4: 1 r=2,9 step 20: x20 0,66383, x*=0,655172, mult -0,9, period 1, x60 0,655302. 2 r=3 step 20: x20 0,709631, x* 0,666667, mult -1, no period to 64, x60 0,694147. 3 r=3,1 step 59: x59 0,558014, x60 0,764567, x* 0,677419 (-1,1), 2-cycle 0,558014/0,764567, mult 0,59, period 2. 4 r=3,5 step 56: x56 0,826941, x57..x60 0,500884 0,874997 0,38282 0,826941, 2-cycle mult -1,25, period 4; r=3,46: mult -1,0516, period 4. 5 r=3,55 step 52: x52 0,812682, x60 0,812668, period 8; r=3,54 period 4; r=3,57 no claim. 6 r=4 step 5: x5 0,585421 (x0 0,2), 0,209062 (x0 0,21); x1 0,64/0,6636; x2 0,9216/0,89294; x8 0,401974/0,37345. Multipliers -2 and -4.
PP5: 1 r=2,9: column 2,8985 (107 of 400). 2 r=3 column 3 (134); r=3,1 column 3,1015. 3 r=3,44: mult -0,9536, period 2, column 3,4398; r=3,45: -1,0025, period 4, column 3,4511. 4 r=3,83 step 54: x54..x60 = 0,504667 0,957417 0,156149 repeating; start 0,8 gives x60 0,504667; r=3,82: x57 0,8626, x60 0,193532. 5 r=3,9: column 3,8985.
Numeric, outside the app (Newton on cycle multiplier = -1, script /tmp/fe.js, not kept): r2 3,44948974 (= 1+sqrt6), r3 3,54409036, r4 3,56440727; ratios 4,7514 and 4,6563; the limit 4,669 is cited.

## Learner actions
Type r in "Parameter r", type x0 in "Začetek x0"/"Start x0", Next step, Play, Reset.

## Still to do (not started)
- Content test recomputing every quoted number and the r3, r4, ratios independently of the graph; add `logistic-map` to `DECIMAL_COMMA_LATEX_LESSONS` and the lesson list in `lessonMathNotation.test.ts`, run it (the new file is untested by it).
- Chapter skeleton, registry, ownership, `lesson: false` removal on the logistic-map row, test lists, smoke rows (slice 2). Both lessons share `demonstrationId: 'logistic-map'`.
- Review pass on the text.

## Doubts
- The numeric r3, r4 and the cited 3,56995 / 4,669 are quoted in prose; the brief's "readout" rule is met only for the graph values.
- PP5 step 4 states what repeats at r=3,83 for starts 0,2 and 0,8 only; period 3 as a claim is deliberately not made (the graph makes none past 3,56995). The spec's window opening 1+sqrt8 is not quoted.
- The two-close-starts step uses starts 0,01 apart (grid), not the spec's 1e-10.
- PP4 step 7 asks to find the smallest r with period 16: unprobed, not verified that the readout shows 16 on the 0,01 grid (R356 shows 8, R357 is no claim); likely there is NO grid r with period 16. Fix the wording before review.
- `pp4-eight-cycle` expectedObservations and others were not reread for Slovenian grammar.

## Slice 2: chapter skeleton and wiring (worker)

### Written
- New `src/learning/content/phasePortraitsChapterRegistry.ts` (id `phase-portraits`; sections `logistic-map` and `bifurcation`, both on `logistic-map`; lesson ids `phase-portraits-logistic-map`, `phase-portraits-bifurcation`) and `phasePortraitsChapter.ts` (family `analysis`, *Fazni portreti in dinamični sistemi* / *Phase portraits and dynamical systems*, two sections of four paragraphs plus formula and example, prerequisite link `recursion#sequences`). Prose does not mention the PP1-PP3 sections (no existing chapter says so in prose; the doc comment does).
- Wiring: `chapterOwnedLessons.ts` (+2), `familyChapters.ts` (+2: import and entry directly after `recursionChapter`, before `numericalChapter`), `guidedLessonOwnership.ts` (`'logistic-map'` -> phase-portraits/logistic-map; PP5 derived), `LearningPage.tsx` (topicPreviews entry text alt only; strand `functions` now `... recursion, phase-portraits, numerical-methods ...`), `guidedExamplePreviewCopy.ts` (`'logistic-map'`), `graphs/dynamics/registration.ts` (`lesson: false` removed from `logistic-map` only; `phase-portrait` keeps it) and `registrationComposition.test.ts` (expects exactly `['phase-portrait']` to opt out).
- Tests: `familyChapters.test.ts` (id list, minimum 2 for the chapter, `CHAPTER_LINK_PENDING` without `logistic-map`), `numericalChapter.test.ts` (numerical index = analysis + 2 -> + 3), `LearningPage.test.tsx` (chapters 35 -> 36), `authoredChapterCoverage.test.ts` (chapters 35 -> 36, references 156 -> 158, expected `phase-portraits.<section>.logistic-map`), `lessonLookup.characterization.test.ts` and `runtime/lessonCatalog.test.ts` (lessonless list without `logistic-map`; two canonical-example rows PP4, PP5), `lessonOwnerIntegrity.test.ts` (+`phase-portraits`), `lessonMathNotation.test.ts` (set entry for both lessons, `'logistic-map'` in the expected-id list). `fourierChapter.test.ts` needed no edit (counts from numerical).
- Smoke: `tests/guided-lessons.smoke.spec.cjs` row `logisticMap` (7 steps, minFrames 15 = 7 x 2 + 1 worked example, route `/analysis/logistic-map`, added to LESSONS; PP5 has no row); `tests/unified-learning.smoke.spec.cjs` chapter list + minimum `'phase-portraits': 2`.
- `docs/localization.md`: two rows (README-table terms; plain words handler-unreviewed).

### Notation fix in `phasePortraitsGuidedLessons.ts` (allowed exception)
Slice 1 left single backslashes (`\(`, `\)`, `\sqrt`) in lines 410-446 (edge-case lines, both lesson titles and summaries; the tool channel halves backslashes). Doubled by script `.command-logs/f3-pp-c/fixbs.py`; 11 lines plus 4 `\sqrt6` occurrences (440, 441, 446). No other change.

### Observed
See Outcome below.

### Outcome (slice 2)
- `npx tsc --noEmit --pretty false`: clean (`tsc4.log`).
- `just unit src/learning src/graphs/dynamics` (`unit2.log`): 153 files passed, 1 failed (`lessonMathNotation.test.ts`, 2 tests), 1 skipped; two causes, both mine: (a) the chapter's English copy had decimal commas in math (fixed: the chapter's local `text()` helper converts `{,}` to `.` in English, as in the lessons file), (b) the expected-id list needs `'logistic-map'` twice (two lessons on one Demonstration; fixed). Re-run of `lessonMathNotation`, `familyChapters`, `lessonOwnerIntegrity`, `src/learning/chapter`, `registrationComposition` passed (`unit3.log`). The full set was not re-run after these two fixes.
- `just build` passed (`build.log`). `just smoke-lesson logistic-map` passed, 2 tests (sl walk, en 390x844) (`smoke3.log`). The first two runs failed only on the heading text: the title `Logistična preslikava za \(r>3\)` renders as "r>3" or "r > 3" depending on timing (`smoke.log`, `smoke2.log`), so the smoke row's `titles` are regular expressions (`r ?> ?3`, `r ?= ?3`); the helper's `toHaveText` branch accepts them (the `innerText` fallback branch would not, not exercised).
- Counts: chapters 35 -> 36; authored references 156 -> 158; lessonless Demonstrations 9 -> 8 (`logistic-map` out; list now `complex-power, complex-euler, triangle-solver, recursion-cobweb, phase-portrait, solids, contour-map`); numerical index analysis + 2 -> + 3.
- Not verified: full smoke checklist, the Learn page in a browser, `just check`, the Slovenian chapter prose by a native reader, `phasePortraitsGuidedLessons.ts` content (slice 1 doubts stand, notably the PP4 step 7 period 16).

### Outcome (slice 3)
- Fixes in `phasePortraitsGuidedLessons.ts`: PP4 step 7 (explanation, prompt, expectedObservation) now asks to read Period at 3,55, 3,56, 3,57, find the largest grid r with a number (3,56) and explain why 16 never shows (r4 = 3,564407 lies between the grid points); step 6 says the pair 0,2/0,21 alone does not show sensitive dependence (1e-10 not settable on the 0,01 grid); the step 6 prompt now matches the graph (typing a start or r keeps the drawn step, Reset sets 0: Reset, Next step twice, type the start again); terms dvocikel/štiricikel/osemcikel in sl; four single `\sqrt` backslashes (lines 440, 441, 446 x2) doubled; found by the node counter (`.command-logs/f3-pp-c/bscheck.cjs`), now 0 singles in both files (the chapter's only single backslashes are inside `String.raw`). New finding by the content test: r3 - r2 = 0,094601 (was quoted 0,094600 in the PP5 worked example, rounding error); fixed in calculationLatex and resultLatex.
- Tests: new `phasePortraitsGuidedLessons.test.ts` (11 tests: both-language scene sweep out of order and twice in one act, independent math incl. Newton r3/r4, no grid r with period 16, learner actions, quoted numbers sl/en, worked examples, chapter prose, source backslash scan, ownership); host test +1 (start/r keep the step, Reset zeroes it). Red evidence: sl text x57 0,500884 -> 0,500885 fails the sl quote test (`content-red.log`); restored, green.
- Checks: tsc clean (`tsc5.log`); `just lint` on 4 files passed (`lint.log`); targeted unit passed (`unit-targeted.log`); full `just unit src/learning` passed (`unit-learning.log`); six sweeps env `logistic-map` + `src/graphs/base src/learning/runtime` passed (`sweeps.log`; the log does not show which sweep tests ran, not separately verified they were not skipped); `just build` passed (`build5.log`); `just smoke-lesson logistic-map` passed (`smoke5.log`, 7 s, reused the build).
- Not verified: browser look, Slovenian prose by a native reader, full smoke checklist.

## Handler review (handler 12)
- Sonnet mathematical and engineering review (`.command-logs/f3-pp-c/review.md`): every number recomputed (r3 and r4 as period-doubling points with cycle multiplier −1; ratios 4,7514 and 4,6563). Two blocking findings fixed: single-backslash delimiters in the lesson metadata (slices 2 and 3), and the false period-16 prompt (no grid r shows 16; the step now asks why). Non-blocking fixes applied: the 0,01 start pair called no proof of sensitivity, the Reset instruction matched to the graph, the cycle terms. The content test found r3 − r2 = 0,094601 (was 0,094600).
- Spec deviations recorded as F3 Batch C decisions in the spec: Batch C before A and B, `set-zoom` deferred, the start pair 0,01 apart, the period-16 prompt.
- Owed to F4–F6 of task 07: the chapter page and the tick labels not seen in a browser; PP5 covered by host and content tests only; the Slovenian prose has no second reader.
