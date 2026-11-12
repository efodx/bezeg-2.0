# F3 randomness batch A, slice 1 (actions, host test, content) - worker note

Status: partial (budget handoff). Slice 2 (chapter, wiring, content test, smoke row, localization terms) not started.

## Written
- `src/learning/model.ts`: `LessonAction` union gains four entries, kind `random` (after the `waves` entries): `set-mode {mode}`, `set-run {seed?, n?, rows?, pPercent?}`, `set-overlay {overlay: boolean, seed2?}`, `set-position {shown}`.
- `src/graphs/random/SimulationGraph.tsx`: `applyRandomAction`, `refuseUnknown`, `commitRandom`, `registerLessonActions` (`registry.on("random", ...)`), after `editSampleSize`; imports `playbackStops`, `LessonAction`, `LessonActionRegistry`.
  - Every action merges into `serializeRandomState(this.state)`, goes through `parseRandomState` before any write, refuses unknown fields, throws on invalid data, exhaustive `never` default; a valid write calls `pausePlayback()` then one `edit` of the changed fields.
  - `set-mode` = `withMode` (default n, all shown, as the mode list). `set-run` with `n` also sets `shown = n` (as typing n does). `set-overlay` throws for a mode outside `OVERLAY_MODES` when switching on, and for a non-boolean. `set-position` accepts only a playback stop of the current n (reachable by Replay and Next).
- `src/graphs/random/SimulationLessonActions.host.test.tsx`: 8 tests (each action equals the control path: state, readouts, status, drawing; one synchronous 5-action sequence compared with control input; playback halted; checkpoint restore; 30 invalid actions change nothing; supportsLessonAction).
- `src/learning/content/randomnessGuidedLessons.ts`: `randomnessGaltonLesson` (RS1, 7 steps), `randomnessLargeNumbersLesson` (RS2, 6 steps), `randomnessSceneActions`, scene constants `RS1_*`, `RS2_*`. One-shot sl and en text.

## Observed
- tsc clean: `.command-logs/f3-rand-a/tsc2.log` (empty) after the content file and the text fixes.
- Host test green on first run: 8 passed (`host1.log`, inner log 2026-11-12T10-38-20...).
- Red evidence: with `registry.on("random", ...)` commented out, 8 of 8 failed with UnsupportedLessonActionError (`host-red.log`); restored (line 601 of the graph).
- Probe (temporary test, deleted): `.command-logs/f3-rand-a/probe.txt` holds sl and en readouts and statuses for 23 scenes (galton: pos 1, 10, 100, seeds, p 30/35/70, n 100/10000/100000; frequency: n 10/100/1000/10000, seeds 7/43, overlays).
- Exact values recomputed by BigInt in node: P(|h-50|>=10)=0.056888, P(|h-500|>=100)=2.728e-10, band coverages 0.9785 (n=10, w=6), 0.9648 (100, w=20), 0.9537 (1000, w=62), 0.9512 (10000, w=196).
- NOT run: `just unit` on the whole `src/graphs/random` folder, notation test (`lessonMathNotation.test.ts`, content not yet in its list), no content test.

## Numbers per step (seed 42 unless stated; all from the probe)
RS1 (galton, 10 rows, p 50): 1 ball (position 1): slot 1, largest 0.9902. 10 balls: counts 0;1;0;3;0;3;1;2;0;0;0, largest 0.2051. 100 balls: 0;1;2;12;27;25;18;11;2;2;0, expected 0.1;1;4.4;11.7;20.5;24.6;20.5;11.7;4.4;1;0.1, middle 0.25 vs 0.2461, largest 0.0649. 1000: 0;12;38;118;218;229;207;125;42;11;0, middle 0.229 / 0.2461 / +-0.0136, largest 0.0171. n=10000 largest 0.0079, n=100000 largest 0.0011 (counts 102;1009;4439;11765;20395;24547;20586;11636;4422;1003;96, middle 0.2455). Seed 43: 1;12;49;126;220;241;211;97;33;10;0, middle 0.241, largest 0.0202. p=30: 31;121;223;273;206;104;28;14;0;0;0, expected 28.2;121.1;233.5;266.8;200.1;102.9;36.8;9;1.4;0.1;0, middle slot 3 0.273 / 0.2668, largest 0.0105; p=35 slot 3 0.258/0.2522; p=70 slot 7 0.266/0.2668.
RS2 (frequency): n=10 h=1 f=0.1 d=-4 band 2..8 (+-3); n=100 h=45 f=0.45 d=-5 band 40..60 (+-10), sd 0.05; n=1000 h=493 f=0.493 d=-7 band 469..531 (+-31), sd 0.0158; n=10000 h=5011 f=0.5011 d=11 band 4902..5098 (+-98), sd 0.005. Seed 7 n=10000: 5037, 0.5037, d=37. Seed 43 n=10000: 4872, 0.4872, d=-128 (outside the band). Overlay seed 43: n=10 h=3, n=100 h=53, n=1000 h=462, n=10000 h=4872 (the n=10000 overlay row itself was not probed; its value is the single run of seed 43).

## Learner actions the text asks for
RS1: Replay + Next step (step 1); three Next step presses (step 2); Play to 1000 (step 4); type n = 100, 10000, 100000, 1000 (step 4); Replay + Play, then seed 42 (step 5); p in steps of 5 %, e.g. 35 and 70 (step 6); free change (step 7). RS2: type n = 10, 100, 1000 (step 3); seeds 7 and 43 (step 4); other second seeds (step 5); free (step 6). Read-outs named by their sl and en labels.

## Still to do (slice 2)
- Content test recomputing every quoted number from the real readouts of each scene (including the RS2 step 5 overlay at n=10000, not probed) and the exact values above; add the lessons to `lessonMathNotation.test.ts` lists; run it (bare-math heuristics not yet checked).
- Chapter file and registry, wiring, owner row, smoke row, `lesson: false` removal, `docs/localization.md` terms (grb, met, predal, klin, seme, relativna frekvenca, pas 95 %).

## Doubts
- The graph overlays only one second seed, so RS2 step 5 is two runs, not the spec's up to five.
- The exact bars are drawn from the first ball (the spec says visible from step 3); step 1 and 3 text accommodate it.
- RS2 step 4 uses seed 42, whose d stays small (-4, -5, -7, 11); the text says the band is what grows, and uses seed 43 (-128) as the learner action.
- Step texts were not reviewed by a second agent; Slovenian wording (grb, met, predal, klin, seme) follows the graph's own labels, not a settled term decision.
- The fix script `.command-logs/f3-rand-a/fix.py` applied nine small text edits; the file was not re-read after.

## Slice 2: chapter skeleton and wiring (worker, handoff-v13)

### Written
- New `src/learning/content/randomnessChapterRegistry.ts` (id `randomness`, sections `galton-board` -> RS1 and `law-of-large-numbers` -> RS2, both on `prob-simulation`; lesson ids `randomness-galton`, `randomness-large-numbers`) and `randomnessChapter.ts` (family `/bezeg-2.0/probability`, title Naključje in simulacija / Randomness and simulation, two sections each with intro paragraphs, formula and example at the end; prerequisite links `learn/probability#binomial-normal` and `learn/probability#clt`). Prose written by Write (doubled backslashes literal).
- Wiring: `chapterOwnedLessons.ts`, `familyChapters.ts` (after `probabilityChapter`, now last), `guidedLessonOwnership.ts` (`'prob-simulation'` -> `randomness/galton-board`; RS2 derived), `LearningPage.tsx` strand `functions` (`randomness` after `probability`) and `topicPreviews.randomness` (alt text, no PNG), `guidedExamplePreviewCopy.ts` (`prob-simulation`).
- `src/graphs/random/registration.ts`: `lesson: false` removed, comment updated; `registrationComposition.test.ts`: no row opts out.
- `docs/localization.md`: two rows (seme/grb/predal/klin/relativna frekvenca in the README table; `met`, `pas 95 %` not in it: handler-unreviewed).
- Smoke: `guided-lessons.smoke.spec.cjs` row `randomnessGalton` (7 steps, minFrames 16 = 14 + 2 calculation frames; in LESSONS); `unified-learning.smoke.spec.cjs` chapter list gains `randomness` after `probability`, minimum `'randomness': 2`.

### Test-list counts (old -> new)
- `LearningPage.test.tsx`: `.learning-family` and heading 33 -> 34.
- `authoredChapterCoverage.test.ts`: chapters 33 -> 34; references and unique 153 -> 155 (form `randomness.<section>.prob-simulation`).
- `lessonLookup.characterization.test.ts`: lessonless list drops `prob-simulation`; two new rows (`?example=lesson.randomness.galton-board.prob-simulation` -> `randomness-galton`; `...law-of-large-numbers...` -> `randomness-large-numbers`).
- `familyChapters.test.ts`: `CHAPTER_LINK_PENDING` drops `prob-simulation`; order list gains `randomness` after `probability`; section minimum list gains `randomness` (2).
- `lessonCatalog.test.ts`: lessonless list drops `prob-simulation`. `lessonOwnerIntegrity.test.ts`: `AUTHORED_CHAPTER_IDS` gains `randomness`.
- Shifted index tests: `fourierChapter.test.ts:32` `at(-4)` -> `at(-5)`; `probabilityChapter.test.ts:35` `familyChapters.at(-1)` -> `at(-2)` and `:40` strand `chapters.at(-1)` -> `at(-2)`; test title "ends the functions strand" -> "closes the probability part of".
- `lessonMathNotation.test.ts`: import, `lessonSets` entry `randomnessGuidedLessons`, scan list `'prob-simulation', 'prob-simulation'`.

### Notation fixes in `randomnessGuidedLessons.ts`
None needed: `lessonMathNotation.test.ts` passed with the lesson file in its list.

### Observed
- `npx tsc --noEmit --pretty false`: clean (`tsc3.log`, empty), run before the unit run.
- `just unit src/learning src/graphs/random`: 152 files, 2421 tests passed, 940 s (first run, no failures; inner log `.command-logs/2026-11-12T10-54-11-361Z-30512-7504afc4.log`; `unit2.log` is empty because `just` writes the inner log).
- `just build`: passed (`build.log`, warnings present, see the inner log). `just smoke-lesson prob-simulation`: passed in 9.1 s (`smoke.log`); only the 9 s duration was seen, the number of tests it ran was not checked.
- NOT run: browser check of the chapter page, content test (slice 3), smoke in `unified-learning` spec.
- Doubts: chapter prose word count measured only roughly (`wc -w` of the file 2210, so about 1000 per language including prompts and macros; well above 450); the `met` and `pas 95 %` terms are handler-unreviewed; chapter prose quotes numbers (0.229, 0.0171, 0.0136, 493, 469..531, 5011, 4902..5098, 4872) from the slice-1 probe, not recomputed here.

## Outcome (slice 3, partial: budget handoff)

### Done
- Fix 1: `randomnessGuidedLessons.ts` RS2 step 5 sl/en: second run changeable in the field Second seed (a new one replaces it); "at most about 1 in 20 ends outside the band"; learning goal says "at most about one run in twenty". Fix 2: seed glossed in RS1 step 1 and RS2 step 1 (sl and en). Fix 5: `randomnessChapter.ts`: `\approx 0,2461`, "at most about one run in twenty" (sl/en), "at least 95 %" in the band definition, "grbi in cifre" for "glave in grbi".
- Fix 3: `SimulationGraph.tsx` `commitRandom` compares against a `Map` of `serializeRandomState(this.state)` (no cast); `set-run` destructures `{n, seed, rows, pPercent}` from the action (no `_k`). Fix 4: host test `toThrow(/^random[ :]/)` and `toThrow(/random set-overlay: the mode area has no second run/)`.
- New `randomnessGuidedLessons.test.ts`: 12 tests (exact BigInt values, quoted numbers per step in sl and en, scenes in one synchronous act twice and out of order, learner actions, restore, chapter prose numbers, wording). Includes the RS2 step 5 overlay row at n=10000 (seed 43: 4872 heads, matches).
- Observed: `tsc4.log` empty (run before the content test and the host edits were finished? run after the SimulationGraph edit, before the content test file); content test 12 of 12 passed (`content9.log`).

### NOT done
- Red evidence (change one quoted tally, record failure, restore). Not run: tsc after the content test file was written, `just lint`, the host test rerun after the SimulationGraph/host-test edits, the `just unit` list, the six sweeps, `just unit src/graphs/base src/learning/runtime`, `just build`, `just smoke-lesson prob-simulation`, task 05 Status line.
- Doubt: the test's strictness on the `toThrow` regex for the first host check is loose (`^random[ :]`).

## Outcome (verification)
Logs in `.command-logs/f3-rand-a/`. No fixes were needed.
- `tsc5.log`: `npx tsc --noEmit --pretty false` exit 0, empty.
- `lint.log`: `just lint` on the six changed files, passed.
- `content-red.log`: with 4872 changed to 4873 in both languages (lines 361-362 of `randomnessGuidedLessons.ts`), 1 of 12 failed (RS2 "the numbers each step quotes are those of its scene"). Restored exactly; `content-green.log` 12 of 12 passed.
- `unit3.log`: randomness content, lessonMathNotation, familyChapters and `src/graphs/random` passed.
- `sweeps.log`: the six `BEZEG_*` sweeps set to `prob-simulation`; `src/graphs/base` and `src/learning/runtime` passed.
- `build.log`: `just build` passed (warnings present, see its log). `smoke.log`: `just smoke-lesson prob-simulation` passed.
- Not verified: the wider smoke checklist; `just` prints only summary lines, so per-file counts are not recorded except for the content test.
- Task 05 Status line set to done.

## Handler review (handler 12)
- Sonnet mathematical and engineering review (`.command-logs/f3-rand-a/review.md`): no blocking finding; masses, bands (exact coverage 0,9785 at n = 10 down to 0,9512 at n = 10000), tails and every simulated tally checked against the probe. Non-blocking findings fixed in slice 3: the second-seed wording, the seed gloss, the cast in `commitRandom`, the host-test error match, "at most about one run in twenty", chapter numbers tied to scenes.
- Spec deviations recorded as F3 decisions in the spec: exact bars from the first ball, one overlay seed instead of up to five.
- Owed to F4–F6 of task 05: the chapter page not walked in a browser; RS2 covered by host and content tests only (one smoke row per Demonstration); the galton \(10^5\) phone-profile measurement; terms *met* and *pas 95 %* unreviewed by a second reader.
