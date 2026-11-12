# F3 recursion Batch A (RG1, RG3): worker note, slice 1 (actions, host test, lessons), budget handoff after the content file

## Written
- `src/learning/model.ts`: `LessonAction` entry `recursion` with `set-map` (`panel?`, `sequence?`), `set-params` (`a1?, d?, q?, n?`; q stored x10) and `set-interest` (`capital?, rate?, years?, parts?`; rate stored x200/100, i.e. twice the percent).
- `src/graphs/recursion/GrowthGraph.tsx`: `applyRecursionAction`, `editStored` (unknown fields refused, merged state through `parseGrowthState` before any write, only changed fields written in one `edit`, exhaustive `never` switch), `registerLessonActions`. `set-map` maps `sequence` to the stored `kind`.
- `src/graphs/recursion/GrowthLessonActions.host.test.tsx`: 6 tests (each action equals typing in the control; one synchronous sequence; checkpoint restore; supports + about 30 invalid actions change nothing).
- `src/learning/content/recursionGuidedLessons.ts`: exports `recursionSequenceLesson` (RG1, 7 steps), `recursionInterestLesson` (RG3, 7 steps), `recursionSceneActions`, scene constants `RG1_*`, `RG3_*`. No readout was added to the graph.

## Observed
- `just unit src/graphs/recursion/GrowthLessonActions.host.test.tsx`: passed (`.command-logs/f3-rec-a/host.log`).
- Red evidence: with `registry.on("recursion", ...)` commented out, 6 of 6 tests failed, 15 "Unsupported" errors (`host-red.log`); line restored (GrowthGraph.tsx:452).
- `npx tsc --noEmit --pretty false`: no output, clean (`tsc.log`), run after the content file.
- Probe (temporary test, deleted): `.command-logs/f3-rec-a/probe.txt`, sl and en readouts of 21 scenes.
- NOT run: `just unit src/graphs/recursion` as a whole, the notation test (the file is not in its list yet), content test, sweeps, build.

## Numbers per step (readout source: probe.txt, sl decimal comma)
RG1 (sequence panel). 1: A(3,2,n6) terms 3;5;7;9;11;13, a6=13 (readout); a10=21 after learner types n=10. 2: A n10 a10=21, S10=120. 3: G(3,q2,n3) terms 3;6;12 (NOT probed at n3; follows the n4 and n6 probes: 3;6;12;24 / ...96); learner n=10 gives 1536. 4: G n10 a10=1536; arithmetic 21 after learner switches kind. 5: G n10 S10=3069. 6: G(3,q1/2,n10) a10=0,005859, S10=5,994141, limit 6 (readout "6 (zaprta oblika)"); n3 S3=5,25. 7: G(2,q1,5,n12) a12=172,995117, S12=514,985352, no limit; examples G n10 S=3069, A(10,d-3,n8) a8=-11, S8=-4.
RG3 (interest panel). 1: years 1, m1: simple 1050, compound 1050; learner years 10: 1500, 1628,89. 2: m1 y10: 1500, 1628,89. 3: m12 y10: relative 1647,01, continuous 1648,72; learner m=1,2,4,12,365: 1628,89; 1638,62; 1643,62; 1647,01; 1648,66. 4: m12: conformal 0,407412 %, 120 periods 1628,89; m4: 1,227223 %, 40 periods 1628,89; relative monthly 0,416667 % is a formula value (0,05/12), not a readout. 5: m365 y10: 1648,66, 1648,72; e table 2; 2,593742; 2,704814; 2,716924; 2,71828 (readout trims the zero; spec writes 2,718280); e 2,718282. 6: m1 y14: 1979,93; learner y15 2078,93; doubling 14,2067, rule 72 14,4; rate 10 %: 7,2725 and 7,2 (probe "I free r10"). 7: 2000, 3 %, y20, m4: 3200; 3612,22; 3636,09; 3644,24; conformal 0,741707 %; learner example 10 % y10 m1: 2593,74.

## Learner actions the text asks for
RG1: type n=10 (steps 1, 3); switch Vrsta zaporedja to Aritmetično and back (4); change q to 3 (5, no number quoted); n=3 then 10 (6). RG3: type Čas 10 (1), 20 (2), 15 (6); choose the five Obdobij v letu (3), m=4 (4); rate 10 % and Čas 10 (6).

## Still to do (slice 2 and later)
Chapter file and registry, wiring, `lesson: false` removal, `chapterOwnedLessons`, notation-test list, content test, smoke rows, previews, F4 to F6. Registry id for the lessons: Demonstration `recursion-growth`.

## Doubts
- Step 3 scene (n=3) was not probed; verify when the content test runs.
- No `\\(` notation check was run; label quotes avoid unicode subscripts, math symbols are wrapped by hand.
- Graph text "1 obdobij na leto" (grammar of the existing readout) and `a30 = 0` display at n=30, q=1/2 (6 decimals) are pre-existing graph behaviours, unchanged; text avoids n=30.
- RG3 step 2 claims the compound curve lies above the line for t>1 at every positive rate (Bernoulli); stated without proof.
- Mathematics review is owed: RG3 step 5 argument sketch (n=m/p) and the "at least as large as the previous" claim in step 7.

## Slice 2: chapter skeleton and wiring (worker, handoff-v13)

### Written
- New `src/learning/content/recursionChapterRegistry.ts` (id `recursion`, sections `sequences` -> RG1 and `compound-interest` -> RG3, both on `recursion-growth`; lesson ids `recursion-sequences`, `recursion-interest`) and `recursionChapter.ts` (family `analysis`, two sections with intro, formula, example at the end; prerequisite links `analysis#convergence` and `functions-and-calculus#function-rules`; section minimum for the `sequence-definition` lesson is the convergence section of the analysis chapter).
- Wiring: `chapterOwnedLessons.ts` (import and `[RECURSION_CHAPTER_ID]` entry), `familyChapters.ts` (`recursionChapter` placed before `numericalChapter`, so after `analysis`; no `at(-N)` index test shifts, the fourier `at(-4)` is unchanged), `guidedLessonOwnership.ts` (`'recursion-growth'` owned by `recursion/sequences`; RG3 derived from the chapter), `LearningPage.tsx` strand `functions` (`analysis`, `recursion`, `numerical-methods`), `guidedExamplePreviewCopy.ts` (`recursion-growth` copy; no PNG and no `topicPreviews` entry).
- `src/graphs/recursion/registration.ts`: `lesson: false` removed from the growth row (cobweb keeps it), doc comment updated. `registrationComposition.test.ts`: the cobweb row is the only opt-out.
- `docs/localization.md`: three rows after the waves/mechanics rows (sequence terms; closed form and limit of the sum; interest terms).
- Smoke: `tests/guided-lessons.smoke.spec.cjs` row `recursionGrowth` (7 steps, minFrames 17 = 14 + 3 calculation frames; only RG1 as default row, RG3 shares the Demonstration). `tests/unified-learning.smoke.spec.cjs`: chapter list gains `recursion` after `analysis`, section minimum `'recursion': 2` (the chapter-list spec the waves commit touched; guided-lessons has no chapter list).

### Test-list counts (old -> new)
- `LearningPage.test.tsx`: `.learning-family` and `.learning-topic-heading` 32 -> 33 (thumbnail count 24 unchanged; comment names recursion as thumbnail-less).
- `authoredChapterCoverage.test.ts`: chapters 32 -> 33; allReferences and unique 151 -> 153 (new reference form `recursion.<section>.recursion-growth`).
- `lessonLookup.characterization.test.ts`: lessonless list drops `recursion-growth`; two new table rows for `?example=lesson.recursion.sequences.recursion-growth` (RG1, lesson `recursion-sequences`) and `...compound-interest...` (RG3, `recursion-interest`).
- `familyChapters.test.ts`: `CHAPTER_LINK_PENDING` drops `recursion-growth`; chapter-order list gains `recursion` after `analysis`; section minimum list gains `recursion` (2).
- `lessonOwnerIntegrity.test.ts` and `lessonCatalog.test.ts`: lessonless lists drop `recursion-growth`; `AUTHORED_CHAPTER_IDS` gains `recursion`.
- `lessonMathNotation.test.ts`: imports, `lessonSets` entry `recursionGuidedLessons`, scan list `'recursion-growth', 'recursion-growth'`.

### Also changed (found by the first full run)
- `LearningPage.tsx` `topicPreviews`: entry `recursion` (demonstration `recursion-growth`, alt text, no PNG): the page reads it for every chapter (TypeError at `LearningPage.tsx:116` without it).
- `numericalChapter.test.ts:25`: the numerical chapter now follows `analysis` by two positions (recursion between), `+ 1` -> `+ 2`.
- `guidedExamplePreviewCopy.ts:128` first held single backslashes; the notation test caught it, fixed to doubled.

### Notation fixes in `recursionGuidedLessons.ts`
None needed: `lessonMathNotation.test.ts` passes with the lesson file in its list.

### Observed
- `npx tsc --noEmit --pretty false`: clean (`tsc2.log`; re-run after all edits: `tsc3.log`, empty).
- First `just unit src/learning src/graphs/recursion` (`unit2.log`): 5 failures, the three items above. Re-run of five affected files (`unit2b.log`): passed. Full re-run (`unit2c.log`): passed, 762 s.
- Probe: the lookup rows `?example=lesson.recursion.sequences.recursion-growth` and `...compound-interest...` resolve to lessons `recursion-sequences` / `recursion-interest` and pass in `lessonLookup.characterization.test.ts`. Step-1 readouts were probed in slice 1 (`probe.txt`); not re-probed.
- NOT run: `just smoke-lesson recursion-growth` (refuses: build inputs changed, needs `just build`; `smoke.log`), `just build`, browser check of the chapter page, content test (slice 3).

## Outcome (slice 3): content test, review fixes, checks (worker, handoff-v13)

### Review fixes (`recursionGuidedLessons.ts`, sl and en together)
1. RG3 step 7 explanation (:459-460): the ordering claim holds "for a whole number of years, at least 1 (the range of the graph)"; amounts rounded to the cent.
2. RG3 step 5 (:428-429) and the `euler-limit` block (:309-310): clause that the limit also holds as n runs through real numbers, and n = m/p is real.
3. `\mathrm{simple}`/`\mathrm{compound}` replaced by K_1 (simple), K_2 (compound), K_3 (relative, m periods); named in the `interest-models` notation, in the rg3-compound check and in step 2 prose.
4. `sources.implementationCorrespondence` (:477) left unchanged: no `.tsx` reads the field (only content files and tests), so it does not reach learners.
5. RG3 steps 1, 3, 7: "rounded to the cent" added (step 2 already had it).
6. RG1 step 3: "(ponazoritev)" for 3; 6; 12 and "Argument:" for the closed form a_n = a_1 q^(n-1).
7. `just lint` on the recursion graph and content files: passed; the `_kind`/`_operation` destructures are not reported, no change to `GrowthGraph.tsx`.

### Content test `src/learning/content/recursionGuidedLessons.test.ts` (10 tests)
Closed forms written in the test (not the graph); one test cross-checks them against `src/recursion/` and the quoted reference values. Per step: quotes in sl and en state text and prose, sl has no English decimals, no unaccounted English decimal; scenes run out of order and twice in one `act`, state and readouts compared; restore returns the free state; learner actions the text asks for (n=10, kind switch, q=3, n=3 then 10, years 10/20/15, m in 1,2,4,12,365, m=4, rate 10 %) give the quoted readouts; chain simple <= compound <= relative <= continuous checked on a grid for whole t 1..40 and shown to fail at t=0.5. Step-3 scene (n=3, terms 3; 6; 12) confirmed. Step 7 conformal 0,741707 is quoted in the explanation, not the expected-state text.

### Observed
- Red: sl scene text of rg3-curves 1628,89 -> 1628,88 failed `RG3 ... numbers each step quotes` (`content-red.log`: inState false for "1628,89"); restored.
- `npx tsc --noEmit --pretty false`: clean (`tsc5.log`, empty).
- `just unit src/learning/content/recursionGuidedLessons.test.ts`: passed (`content2.log`).
- `just unit src/learning/content/recursion src/learning/content/lessonMathNotation.test.ts src/graphs/recursion`: passed (`unit3.log`).
- Sweeps (six BEZEG_* variables = recursion-growth) with `just unit src/graphs/base src/learning/runtime`: passed, 172 s (`sweeps.log`).
- `just build`: passed (`build.log`, warnings present). `just smoke-lesson recursion-growth`: passed (`smoke.log`); build reused from this revision.
- Task 04 Status line set to done.
- NOT run: smoke of the chapter page / other routes, full `just unit`, visual check of the new prose.

## Handler review (handler 12)
- Sonnet mathematical and engineering review (`.command-logs/f3-rec-a/review.md`): no blocking finding; every quoted number recomputed. The six non-blocking findings (whole-year condition on the ordering claim, real n in the limit sketch, language-neutral K_1 to K_3 in latex fields, rounding to the cent, the RG1 step 3 label) were fixed in slice 3; `implementationCorrespondence` is not shown to learners and stays unwrapped.
- Placement checked: chapter `recursion` directly after `analysis` in `familyChapters.ts` and the `functions` strand; only the growth row lost `lesson: false`.
- Owed to F4–F6 of task 04: chapter page not walked in a browser; RG3 only covered by host and content tests (one smoke row per Demonstration); the readout label "1 obdobij na leto" (plural after 1) is a graph wording item for F6.
