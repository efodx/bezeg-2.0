# F3 waves Batch A (WV1, WV2): worker note, PARTIAL (budget handoff after steps 1 to 3)

## Written
- `src/learning/model.ts`: LessonAction kind `waves` (`set-mode`, `set-components` a1 p1 a2 p2 f1 f2 halfWaves showPhasors showEnvelope, `set-sampling` fs extra showAlias showJoin showSinc, `set-time`).
- `src/graphs/functions/WavesGraph.tsx`: `applyWavesAction` (exhaustive `never`), `editStored` (merged state through `parseWavesState` before any write, unknown fields refused, throws), `registerLessonActions`; every write halts playback (an unchanged `set-components`/`set-sampling` also halts).
- Label fixes in the same file: wheel names `NAME_GAP_PX = 24` (was 8) and `NAME_ROW_PX = 20` (was 16); y title bottom at `max(1.1 yPeak, yPeak + 14 px) + 2 px` (was `1.1 yPeak + 2 px`), `Y_TITLE_PX` 22 to 32. `WavesGraph.test.tsx` strengthened: first name at least 20 px under the circle, rows at least 20 px apart, title at least 14 px above the top tick number (was 14 and 6). Not checked in a browser (jsdom only); the arrowhead overshoot of about 10 px is my estimate.
- `src/graphs/functions/WavesLessonActions.host.test.tsx` (8 tests, mirrors the descent host test: each action vs the matching control, one synchronous sequence, halts playback, checkpoint restore, invalid data changes nothing).
- `src/learning/content/wavesGuidedLessons.ts`: WV1 (7 steps) and WV2 (7 steps), exports `wavesSuperpositionLesson`, `wavesBeatsLesson`, `wavesSceneActions`. One-shot sl/en text written; NOT yet run through `lessonMathNotation.test.ts` (not wired in the list) and not reviewed.

## Observed
- tsc clean after each step (`.command-logs/f3-waves-a/tsc1.log`, `tsc2.log`, both empty).
- `just unit src/graphs/functions/WavesGraph.test.tsx` passed (`graph-unit1.log`); `WavesLessonActions.host.test.tsx` passed, 8 tests (`host2.log`; first run failed only because the "extra samples" field exists only with the sinc switch on, test order fixed).
- Probe test deleted; its output is `.command-logs/f3-waves-a/probe.txt` (sl and en readouts of all 25 scenes).

## Numbers per step (real readouts, probe.txt; sl decimal comma)
- WV1 (3 Hz, A 1 and 1, p1 0 unless stated): one wave (a2 0, t 0): amplitude 1, range 1 to 1 (phase-difference readout still says 120, unexplained in the text). p2 0: 2; p2 60: 1,732, phase 30; p2 120: 1, phase 60, t 0 sum 0,5; p2 180: "0 (izničenje)", phase "ni določeno". t 0,1: wave 1 -0,309, wave 2 -0,669, sum -0,978. A 3 and 2: p2 90: 3,606, 33,69, range 1 to 5; p2 60: 4,359, 23,41; p2 0: 5; p2 180: 1, phase 0. f1 5: amplitude 1, phase 60.
- WV2 (beats, A 1): 10/12: beat 2 Hz, mean 11 Hz, period 0,5 s; envelope 2 at t 0 and 0,5, 0 at 0,25; sum 0 at 0,25; t 0,1: sum 1,309, envelope 1,618. 10/13: 3 Hz, 11,5 Hz, 0,333 s. 10/14: 4 Hz, 12 Hz, 0,25 s. 10/11: 1 Hz, 10,5 Hz, 1 s; envelope 0 at 0,5 and 2 at 1. 10/10: "ni utripanja", amplitude 2. Time readout has 2 decimals, so t 0,125 shows 0,13 (not used).

## Learner actions the text asks for
WV1: type phase of wave 2 = 0, 60, 120 (step 2), 0 (step 3), 60, 0, 180 with A 3 and 2 (step 6); move time slider or Play (step 5). WV2: slider/Play (step 2), slider to 0 and 0,5 (step 3), frequency of wave 2 = 14 (step 4), slider to 1 s (step 5).

## Slice 1b done (skeleton, wiring, tests, docs)
- Written: `wavesChapterRegistry.ts`, `wavesChapter.ts` (ids `waves`; sections `superposition-and-phase`, `beats`; prerequisite links trigonometry#radian-sine-cosine and fourier-series#fourier-series); wired in chapterOwnedLessons, familyChapters (after fourier, before combinatorics), guidedLessonOwnership, LearningPage (topicPreviews, strand after fourier-series), registration.ts (`lesson: false` removed), guidedExamplePreviewCopy; test lists updated (counts 32 chapters, 151 references, fourierChapter at(-4)); both smoke specs; localization.md terms.
- Checks: tsc clean (`.command-logs/f3-waves-a/tsc3.log`); unit run `unit3.log`.

## Still to do
1. Content test `src/learning/content/wavesGuidedLessons.test.ts` (mirror `mechanicalCurvesGuidedLessons.test.ts`): recompute each quoted number from `phasorSum`/`envelope`, actions valid through `parseWavesState`.
2. Task docs 04 status; review of prose; browser smoke of `?example=lesson.waves.superposition-and-phase.waves` not run.

## Doubts
- Label fix distances are estimates, unverified visually. `Y_TITLE_PX` 32 only matters on narrow boards.
- WV1 step 1 shows phase-difference 120 while wave 2 is absent; acceptable but could use a note.
- Prose has not had a mathematical or Slovenian review; "kazalec" and "ovojnica" follow the README term table.
- Spec's step 3 for WV1 ("in phase and opposite phase") and the unequal case are both covered; the "phasor construction as argument" is stated in step 5.

## Outcome (slice 2)
Review fixes applied (`wavesGuidedLessons.ts`, `WavesGraph.tsx`):
- WV1 step 1: the scene now sets wave 2 to amplitude 0 and phase 0, so the readout phase difference is 0 degrees and no stray 120 shows; the text says both waves have phase 0 and the prediction (same frequency and amplitude, phase stays 0) has one answer, amplitude 2, which step 2 onward shows.
- WV1 step 7 (sl and en): "izraza za A in phi ne vsebujeta f" / "the expressions for A and phi do not contain f"; the prompt sl reads "kdaj je amplituda vsote največja in kdaj najmanjša".
- WV2 `wv2-identity-check` resultLatex: no words, `1+0{,}3090=1{,}309,\qquad 2|\cos(0{,}2\pi)|=1{,}618`.
- `editStored`: cast-free `allowed.some(field => field === key)`.
- WV2 step 7: scene is now 10 and 16 Hz (envelope shown); observation gives beat 6 Hz (more often than 5 per second), mean 13 Hz, period 0,167 s, and names the no-beat pair.
Content test `src/learning/content/wavesGuidedLessons.test.ts` (closed forms, quotes per step in sl and en, no unquoted English decimals, scenes out of order and twice, learner actions, restore returns the free state). Red evidence `.command-logs/f3-waves-a/content-red.log` (one quoted 1,732 changed), green `content-green.log`.

## Handler review (handler 11)
- Sonnet mathematical and engineering review: no blocking finding; amplitudes, phases, beat, mean and envelope values recomputed. The non-blocking findings (step 1 phase, formula wording, no words in `resultLatex`, Slovenian plural, one cast, step 7 prompt and observation) were fixed in slice 2.
- Owed to F6 of this batch: at 390×844 the sticky Play bar covers the lower wheel label at the fold (`labels-390x844.png`); a shared layout question, not changed here.
