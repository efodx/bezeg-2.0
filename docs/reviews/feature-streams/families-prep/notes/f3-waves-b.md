# F3 waves Batch B, slice 1: WV3 standing waves (content)

## Written
- `src/learning/content/wavesGuidedLessons.ts`: WV3 block (constants `WV3_DEFAULT/THREE/EXPLORE`, formula `standing-identity`, worked example `wv3-product-check`, 6 steps, lesson `wv3`), export `wavesStandingLesson`. `WavesSceneSpec.mode` widened to include `'standing'`, `WavesSceneComponents` got `halfWaves` (both in the same file; no new action, no edit of `WavesGraph.tsx` or `model.ts`).
- Nothing wired (chapter, registry, ownership, test lists, smoke are slice 2).

## Observed
- `probe.txt`: real readouts and status per step, sl and en, applied through `getLessonCapabilities().apply` (temporary probe test, deleted).
- `just unit src/graphs/functions/Waves`: passed (`host.log`). `npx tsc --noEmit --pretty false`: empty log. Single-backslash count in the WV3 text: 0 (`backslash.txt`).
- Closed forms (probe): max |sum| on 2049 grid points at t=0.25 is 1.2e-16 and at t=0.75 3.7e-16; diamond at x=0.5, t=0.5 is -2; identity residual at t=0.37 is 6.7e-16.

## Numbers per step (readouts of the graph)
1. m=2, t=0: wavelength 2, nodes 0; 1; 2, antinodes 0,5; 1,5, antinode amplitude 2, period 1 s.
2. t=0.25: same readouts; the curve is flat (computed 1e-16).
3. t=0.5: diamond at x=0.5 at -2 (formula); flat at t=0.25 and 0.75 (cos 2 pi t = 0).
4. t=0.1: nodes 0; 1; 2, antinodes 0,5; 1,5, amplitude 2.
5. m=3: wavelength 1,333, nodes 0; 0,667; 1,333; 2, antinodes 0,333; 1; 1,667, amplitude 2; status "4 nodes".
6. m=4, a1=1.5: wavelength 1, nodes 0; 0,5; 1; 1,5; 2, antinodes 0,25; 0,75; 1,25; 1,75, amplitude 3.

## Deviations
- Spec steps (1) one wave and (2) add the left wave merge: the graph always draws both waves, so a single wave cannot be shown. Step 1 asks for the sum at t=0 of two coinciding waves instead.
- Spec step (3) "play" becomes step 2 with `set-time` 0.25 (playback is never part of a scene); the slider or Play is named in the text.
- The spec's step (4)/(5)/(6) stay; the identity and the one worked example (step 3, x=1/2, t=1/2) are added, so 6 steps in total.
- Slovenian: "vozel/hrbet" per the spec; the graph's own labels say "Vozli valovanja" and "Hrbti"; the text quotes them as "Vozle valovanja", "Hrbte".

## Still to do (slice 2)
Chapter section, registry entry, ownership, test lists (`lessonMathNotation.test.ts` does not yet cover WV3, so the notation check has not run on it), smoke.

## Doubts
- After `set-mode standing` the status line still carries the stale notice "Prikaz je spremenjen, čas je vrnjen na 0" even when the scene then sets t=0.25 (visible in `probe.txt`); a graph matter, not changed.
- The diamond height at t=0.5 is drawn, not a readout; the text states it as arithmetic and "on the graph".
- Mathematics and wording of the one-shot Slovenian text not reviewed by anyone else.

## Slice 2: chapter join and wiring

### Written
- `src/learning/content/wavesChapterRegistry.ts`: section `standing-waves` -> Demonstration `waves`, lesson id `waves-standing` (`wavesStandingLesson`).
- `src/learning/content/wavesChapter.ts`: section `standing-waves` (identity formula, definition/argument/example/limits, sl and en). The example uses x=1/4, t=1/3 (not the lesson's x=1/2, t=1/2); no node count, wavelength or flat-time answer is stated before the lesson's predictions. Doc comment updated.
- `src/learning/content/familyChapters.ts` comment only. Tests: `familyChapters.test.ts` (waves min 3), `authoredChapterCoverage.test.ts` (169 -> 170; failed before the edit, `s2-pre.log`), `lessonMathNotation.test.ts` (WV3 import, set, expected ids), `tests/unified-learning.smoke.spec.cjs` (waves 3).
- No change needed: `guidedLessonOwnership.ts` (second owner derived from the chapter), `guidedExamplePreviewCopy.ts` (one row per Demonstration), `lessonLookup.characterization.test.ts`, `runtime/lessonCatalog.test.ts` (kinematics template did not touch them).
- `docs/localization.md` row "stoječe valovanje; vozel; hrbet" (handler-unreviewed); `docs/tasks/waves/05-batch-b-lessons.md` status and README row 05: F3 in progress.

### Outcome
- `s2-tsc.log` empty. `s2-unit.log`: passed (`just unit src/learning src/graphs/functions/Waves`, 860 s). `s2-build.log`: passed. `s2-smoke.log`: `just smoke-lesson waves` passed. Single-backslash count in the chapter file (outside String.raw lines): 0.
- The familyChapters and smoke minimum edits were not shown failing first (a minimum of 3 passes with 3 sections as well as with 2).

### Not verified
- `just smoke-lesson` does not open the new chapter section; the unified-learning smoke spec was edited but not run. The Slovenian prose has no second reader. `src/graphs/functions/Waves/registration.ts:6` comment still says "WV1 and WV2" (not owned).

## Slice 3: review fixes and tests

### Fixes (`src/learning/content/wavesGuidedLessons.ts`)
- Step 1: sentence "Ob času 0 se oba vala prekrivata" and its English twin removed.
- Step 2 scene: t = 0 (was 0,25); expected-state text says the sum is zero after the slider moves to 0,25.
- Step 4 (`wv3-nodes`): title "Vozli in hrbti" / "Nodes and antinodes"; the node definition "zero at every time" removed from the explanation; the prediction is now the heights of the two antinodes at t = 0,1 s (2 cos 0,2π ≈ 1,618 and -1,618, verified in the test) and whether the nodes move; the learner sets the time, the scene is at t = 0; node and antinode positions refer back to step 1.
- Step 5 and 6 scenes: the default (m = 2, a = 1, t = 0); the learner types 3, or sets 4 and 1,5. `WV3_THREE` and `WV3_EXPLORE` stay exported but are no longer used by a scene.
- Summary: neutral (nodes and antinodes met step by step), no "ne potuje" or "mirujoče".

### Notice (item 5, observed, graph not changed)
Scenes applied in sequence without a restore (step 1 to 6) keep the status sentence "... Prikaz je spremenjen, čas je vrnjen na 0." at every step, also at t = 0,5 (step 3), because each scene applies `set-mode`. The text of no step says the time is 0 or restarts, so it does not contradict the notice; step 3 quotes the time as 0,5 s and the status line starts "Čas 0,5 s". Not seen in a browser.

### Tests (`wavesGuidedLessons.test.ts`, WV3 block)
Ownership and ids, scenes on the real graph (in order, reversed, twice, restored), learner changes (time slider, typing m = 1..6, a = 1,5) against closed forms, identity on a grid for m = 1..6, nodes, antinodes, wavelength, amplitude, flat times exactly 0,25 and 0,75, worked example, quoted numbers in sl and en, sl/en number parity, prediction ordering (explanation, worked example, formula, summary, title), control-character scan. Green `s3-unit.log`; red `s3-content-red.log` (one sl number changed 0,667 -> 0,668, restored). `s3-tsc.log` empty, `s3-backslash.txt` 0.

### Not run
Build, smoke, sweeps; browser view. The `just unit` run also covered `lessonMathNotation` and `src/graphs/functions/Waves`.

## Handler review (handler 14)
- Sonnet review of slice 1 (`.command-logs/f3-waves-b/review.md`, `check.js`): every number confirmed; 4 blocking. Three scenes were already in the state the text asked the learner to produce (t = 0,25 in the play step, m = 3, and the free step at m = 4, A = 1,5), and the summary and the nodes title gave answers. Slice 3 fixed all of them and retargeted the nodes prediction to the antinode heights at t = 0,1 (2 cos 0,2π ≈ 1,618).
- Seen, owed to the graph: after a mode change the status keeps "čas je vrnjen na 0" while the time slider moves (`WavesGraph`); no step text claims t = 0.
- Handler fix: the `registration.ts` comment now names WV1 to WV3.
- Checks (`.command-logs/f3-waves-b/h-*.log`): `just unit src/learning src/graphs/functions/Waves`, the six sweeps set to `waves` with `just unit src/graphs/base src/learning/runtime`, `just check-changed` (with build) and `just smoke-lesson waves` all passed.
- Spec deviations recorded as F3 Batch B decisions in the spec.
