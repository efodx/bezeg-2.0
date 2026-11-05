# Handoff 22b (partial), geometry handler 51

State: lesson, wiring, chapter section and smoke row are written. NO check has been run on them (no tsc, no unit test, no lint). The host test file does not exist yet.

## Done (uncommitted in the working tree; files are CRLF, keep that)
- `src/learning/content/compgeoGuidedLessons.ts`: new `hullRobustness` lesson (after `pointInPolygon`), `ROBUST_STEPS`, `ROBUST_COLLINEAR`, `ROBUST_DUPLICATE_POINTS`, `ROBUST_CELL`, helpers `robustChain`/`robustKettner`; joined to `compgeoGuidedLessons`. The `„`/`“` quotes were fixed to real characters.
- `src/demonstrations.ts` line 131: `lesson: false` removed.
- `src/learning/chapter/guidedLessonOwnership.ts`: `'hull-robustness'` owner (convexity-hulls / hull-robustness).
- `src/learning/content/convexityChapter.ts`: section `hull-robustness` after `convex-hull`, opening sentence now "next five"; `convexityChapterRegistry.ts`: entry; `convexityChapter.test.ts`: SECTIONS plus word list reduced to `['ear-clipping']`; `familyChapters.test.ts`: `hull-robustness` removed from `CHAPTER_LINK_PENDING`.
- `compgeoGuidedLessons.test.ts` (id list and step counts `..., 7, 7]`), `lessonCatalog.test.ts` (opt-out list now `[]`), `lessonMathNotation.test.ts` (id added), `guidedExamplePreviewCopy.ts` (entry added).
- `tests/guided-lessons.smoke.spec.cjs`: `hullRobustness` row after `pointInPolygon` (`node --check` ok), added to `LESSONS`.
- `src/graphs/compgeo/PointInPolygonGraph.tsx` shows as modified: not mine, leave it.

## Steps (mode, scene, readout values confirmed by a probe of the real graph, Slovenian locale)
1. `robust-collinear`: chain, rule `<` (right), points (0,0),(2,0),(4,0), 11 presses -> "Korak 12 od 12", output 4 entries `P1 (0,0), P2 (2,0), P3 (4,0), P2 (2,0)`, repeated P2, 2 tests.
2. `robust-predict`: chain, `<=`, sample 1, overlays hidden, step 0 (output pending; the rule line stays visible).
3. `robust-pop-rules`: chain, `<=`, sample 1, 55 presses -> 5 entries without (2,0), 23 tests. With `<` and 53 presses (reached by the learner via the control): 6 entries including P8 (2,0), 22 tests.
4. `robust-duplicates`: chain, `<` + keep, sample 1 + copy of (4,0), 57 presses -> 9 entries, repeated P2 (4,0). With merge: 6 entries.
5. `robust-kettner-inexact`: kettner, cell 41/48: exact +, naive -, value "-5,68·10^-14", counts 112 of 4096 and 2052.
6. `robust-kettner-exact`: same scene as 5 (no `set-panel` action exists).
7. `robust-explore`: chain defaults, overlays shown, step 0.

## Remaining
1. Write `src/learning/content/compgeoHullRobustnessLesson.test.ts` (pattern: `compgeoPointInPolygonLesson.test.ts`, mount `HullRobustnessGraph` with `mountGraph`). Cover:
   - the seven scenes in one synchronous sequence (mode, pop, duplicates, step, overlays, `[data-hull-robustness="output"|"repeated"|"cell-title"|"cell-naive-value"|"counts-text"]`, `[data-hull-trace="count"]`);
   - quoted numbers equal the readout and appear in both languages' text; the double value is parsed from the readout (mantissa, superscript exponent); the exact value +9,33e-15 is checked with a BigInt reference (p=(0.5+41*2^-53, 0.5+48*2^-53), q=(12,12), r=(24,24));
   - step 3 hull lacks (2,0), then `set-pop-rule right` + 53 presses contains it;
   - every localized string in the lesson (and the chapter section) that contains "double" also contains `nenatančn` (sl) or `inexact` (en). The summary, the learning goal 3 and the chapter paragraph 2 do not yet say so: add "nenatančen/inexact" to those strings;
   - `captureState`/`restoreState` round trip of set-mode kettner + select-cell + set-pop-rule (mode, cell, pop, step), also one captured at chain step 6;
   - Back (checkpoint) and a scene change restore the scene; the lesson is joined once; prerequisite mentions "convex hull".
2. Run, in this order: `just unit src/learning/content/compgeoHullRobustnessLesson.test.ts > docs/reviews/convexity-hulls/22b-host.log 2>&1`, two mutations (step 5 cell moved by one; step 3 wrong rule) with failing test names, then revert; `npx tsc --noEmit --pretty false > .../22b-tsc.log`; the wide `just unit src/learning/content src/learning/chapter src/learning/runtime src/demonstrations.test.ts src/Routes.test.tsx --maxWorkers=2 > .../22b-unit.log` (590000 ms timeout); `just lint src/learning src/demonstrations.ts > .../22b-lint.log`.
3. Likely failures to look for: `lessonMathNotation.test.ts` on the new prose; a step-title math wrap; the `expectedObservations`/frames conventions; `guidedExamplePreviewCopy.test.ts`; the preview image for `hull-robustness`.

## Flags for the report
- No `set-panel` action: step 6 cannot show the exact map from the scene; the text tells the learner to choose Exact in the "Prikazani zemljevid" field.
- Step 3 shows `<=` only; the `<` half is done by the learner with the control (a step has a single scene).
- The exact value (+9,33e-15) is not rendered anywhere; only the exact sign is. The test uses a BigInt reference.
- Step 2: the deciding rule line cannot be hidden; the step asks before the run with trace and hull hidden and the output pending.
