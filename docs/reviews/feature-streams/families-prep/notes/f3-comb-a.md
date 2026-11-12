# F3 combinatorics Batch A, slice 1 (worker note) - PARTIAL (budget signal)

## Written
- `src/learning/model.ts`: LessonAction kind `combinatorics`: `set-target {a,b}`, `set-lattice-display {view: 'paths'|'triangle', showCounts}` (new, narrow: CB1 step 4 needs the count labels switch, which is stored state with no other action), `set-counting-mode` (two members: view `choices` with n,k,ordered,repetition; view `multiset` with counts). `set-expansion`/`set-row` stay for batches B/C.
- `LatticePathGraph.tsx` and `CountingTreeGraph.tsx`: `applyCombinatoricsAction` (exhaustive `never` default, no casts/any; whole new state goes through `parseLatticeState`/`parseCountingState` before any write, throws otherwise; each graph throws on the other graph's operation) and `registerLessonActions`.
- `src/learning/content/combinatoricsGuidedLessons.ts`: exports `latticePathsLesson` (CB1, 7 steps) and `countingTreeLesson` (CB2, 7 steps), sl+en, scene helpers `latticeSceneActions`/`countingSceneActions`. Not yet imported anywhere.

## Observed
- `npx tsc --noEmit --pretty false`: clean, 0 lines (`.command-logs/f3-comb-a/tsc.log`), run after the graphs and the content file were in place. No unit test run yet.
- Cyrillic "e" typos in "prestejes" fixed (node check).

## Numbers per step (not yet traced against a running graph; derived from the kernel and the graph source)
CB1: s1/s2 target (2,2): 6 routes, route 1 = GGDD (en UURR), list GGDD GDGD GDDG DGGD DGDG DDGG (en U/R), readout "(4 nad 2) = 6". s3 (5,3): 56, readout is C(8,5)=56 (not C(8,3)); LEARNER sets (6,6): 924. s4 (5,3) paths + counts: diagonal sum 3 = 1,3,3,1; (4,3)=35, (5,2)=21; LEARNER switches Vsebina to triangle: row 8, place 5, "56 = 35 + 21". s5 C(8,3)=336/6=56 (calc). s6 (10,10): 184 756 (not drawn); LEARNER sets (20,20): 137 846 528 820. s7 LEARNER (3,5): 56, a or b = 0: 1 route.
CB2: s1 n3 k2 ordered: 6 leaves, product 3 · 2 = 6. s2 n4 k3: 24, 4 · 3 · 2. s3 n4 k4: 24; LEARNER n=k=5: 120 (table, >64 leaves). s4 n6 k3 ordered no rep: 120 (6 · 5 · 4), table row with repetition 216; LEARNER switches repetition on: 216 (6 · 6 · 6); LEARNER n4 k3 rep: 64 leaves. s5 n6 k3 unordered: 20, 3! = 6, "120 / 6 = 20", caption "x 20 groups = 120 / 6". s6 multiset [1,4,4,2]: 11 letters, 34 650, 11! = 39 916 800, 1!4!4!2! = 1152 (calc). s7 default 120. Thousands separators are in math as `\,`; readout uses U+00A0-style space in sl (check what `formatCount` emits).

## Slice 1b (done)
- Written: combinatoricsChapterRegistry.ts, combinatoricsChapter.ts (2 sections, ids lattice-paths-and-pascal -> lattice-paths, counting-and-choices -> counting-tree; links to foundations#why-weights and probability#binomial-normal as prerequisiteLinks), wiring in chapterOwnedLessons.ts, familyChapters.ts (before probability), guidedLessonOwnership.ts (two direct rows), LearningPage.tsx (topicPreviews row, strand functions: ..., fourier-series, combinatorics, probability), registration.ts (both lesson: false dropped), guidedExamplePreviewCopy.ts. Test lists updated (see git diff); fourierChapter.test.ts and probabilityChapter.test.ts assumed probability directly after fourier-series and now expect combinatorics between.
- Doubts resolved: (1) GGDD outside math: lessonMathNotation does not flag route words, left as plain text. (2) Slovenian thousands: formatCount emits U+00A0 (en: comma); prose uses \, inside math. lessonMathNotation rejects {,} in English math ("decimal comma"), so en prose keeps \, (a thin space) while the en readout shows commas; accepted. (3) n=6,k=3 table does list all four kinds (table() in CountingTreeGraph), so 216 is shown; the table appears since the ordered count 120 exceeds the 64-leaf limit. (4) Lattice readout is binomText(a+b, a) = C(8,5) for (5,3), the lesson text already says so. (5) Step 5 of CB2 quoted the caption "x 20 groups = 120 / 6" as bare math; now reworded with the numbers in math.

## Still to do
1. Slice 2: host tests for both graphs (lesson actions), content test recomputing the numbers listed above (apply the learner actions), docs/localization.md terms, task README/04-batch-a status, media slice (poster) later.
2. Not verified: smoke specs (guided-lessons, unified-learning) not run; setup hook uses boardStats().points >= 1 for both graphs (unverified for the counting tree).

## Doubts
- Step 2 of CB1 reuses the (2,2) scene of step 1 (no set-route action); step 4 asks the learner to switch to the triangle view.
- Slovenian "pot po mreži" wording and term use unreviewed; plain-text route words (GGDD) outside math are not wrapped in `\(...\)`; lessonMathNotation.test.ts may object.
- "pod odcitkom" (route list location) is true (routeList follows the readout group). CB2 step 4 asserts the n=6 k=3 table shows 216: verify on the board (table has all four kinds).

## Outcome (slice 2)
- New tests: `src/graphs/combinatorics/LatticePathLessonActions.host.test.tsx` and `CountingTreeLessonActions.host.test.tsx` (11 tests; action = matching input for state, readouts, status, drawn figure; strict rejection leaves state and readouts unchanged), `src/learning/content/combinatoricsGuidedLessons.test.ts` (22 tests: scenes out of order and twice from a restored checkpoint, BigInt recomputation, learner actions CB1 steps 3/4/6/7 and CB2 steps 3/4 applied as actions, sl and en separators, restore on exit).
- Red first: with `registry.on("combinatorics", ...)` commented out in both graphs, all 11 host tests failed (UnsupportedLessonActionError; `host-red.log`). Content: two scene texts temporarily changed (`184,756` to `184,765` at line 206, `34,650` to `34,560` at line 380), 2 tests failed (`content-red.log`); content file restored, verified by diff against a backup.
- No number in the lesson content was wrong; the content file is unchanged by this slice.
- Green: unit on `src/learning/content`, `src/learning/chapter`, `src/graphs/combinatorics`, LearningPage and lessonCatalog tests: 123 files, 1802 tests (`unit.log`); `tsc --noEmit` 0 lines (`tsc.log`); `just lint` passed (`lint.log`); sweeps (transient state, preset round trip, teardown, lesson restoration, scene content, scene replacement, all `lattice-paths,counting-tree`): 10 files passed, 7 skipped, 131 tests (`sweeps.log`); `vite build --outDir` and `just build` ok; `just smoke-lesson lattice-paths counting-tree` 4 passed (port 4452; the counting-tree setup hook works unchanged); `just smoke-lesson bernstein prob-binomial-normal` 7 passed (`smoke-bernstein-binomial.log`). Not walked by eye in a browser; `just check-changed` not run (as instructed).
- Docs: five term rows in `docs/localization.md`; task 04 status and README row 04 say F3 done.
- Doubts: the host test treats `supportsLessonAction` as true for the other graph's operation (registered by kind; the graph throws), which is how the registry works. The en lesson math keeps `\,` while the en readout shows commas (as noted in slice 1b).

## Handler review (handler 11)
- Sonnet mathematical and engineering review: every number recomputed with BigInt; row/place convention, limits, route order, definitions and argument/illustration labels cleared.
- Fixed after review: the symbols \(a\), \(b\), \(n\), \(k\) in prose and one step title wrapped in math; Slovenian grammar (*Pot ima*, *Število je še vedno točno*, *s štirimi*, *Prešteti*, *števila*).
- Decision: route words (GGDD, UURR), the route letters D/G and R/U, and the word MISSISSIPPI with its letter counts stay plain text. They are letter strings and labels, as on the board, not mathematical symbols; `lessonMathNotation.test.ts` accepts them.
- Accepted: the English prose writes large numbers with a thin space in math, while the English readout uses commas; the digits agree and the content test normalizes both.
