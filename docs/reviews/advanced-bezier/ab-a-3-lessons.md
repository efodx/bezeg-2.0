# AB-A-3a, AB-A-3b: D1 and D3 guided lessons

Curves handler 59, 2026-11-06. Spec: [advanced-bezier-lessons.md](../../specs/advanced-bezier-lessons.md) D1 and D3. Lesson text is [one-shot](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). **Status: accepted (curves handler 60).**

## Changes

- `degreeReductionGuidedLessons.ts`: seven steps, 16 frames, two formula blocks, two worked examples (steps 3 and 4). Scene view `[-1.5, 9.5, 5.5, -1.5]` keeps the curve below the lesson panel. Readouts beyond the two board lines are quoted from the inspector list, and the prose sends the student there.
- `arcLengthGuidedLessons.ts`: seven steps, 15 frames, one worked example (step 5, \(s(1)=31/3\)). No scene plays; each ends with `arc-pause`.
- Wiring: `guidedLessons.ts`, `lesson: false` removed, notation scan, preview copy (counts 117 and 124), catalog opt-out empty, smoke rows `reduction` and `arc-length-param`.
- **Owner.** Interim `bezier-curves/geometric-properties`, as `patch-coons`, until AB-A-4. Both ids stay in `CHAPTER_LINK_PENDING`.

## Checks

| Check | Result |
| --- | --- |
| `degreeReductionGuidedLessons.test.tsx` (worker) | 14 passed; 3 mutations failed tests (step 5 mode, view top, step 2 visibility) |
| `arcLengthGuidedLessons.test.tsx` (worker) | 18 passed; 4 mutations failed tests (mover position, PH step, `arc-play` in scenes, a mistyped ratio) |
| Handler, final tree | `just typecheck`; `just unit` on preview copy, notation, catalog, `src/learning/chapter`, chapters and both lesson tests; lint on the five touched files |
| `SMOKE_PORT=4314 just smoke-lesson reduction arc-length-param` | 4 of 4: Slovenian walk and 390×844 English walk of each lesson |

The smoke rows assert D1's mode per step and that D3's Play stays unpressed. They did not look at the board; [handoff 59](../feature-streams/curves/handler-handoff-59.md#next-steps-in-order) step 3 does.

`just check` did not run on this commit; hosted CI covers the push.

## Review (curves handler 60)

Engineering and mathematics review (`bezeg-reviewer` Sonnet) of `d2d86252`: no blocker. Every quoted number was recomputed and holds, as do the PH claims and the straight-line proof.

- **Fixed, mathematics.** "No arc-length parametrization" became "no polynomial one". "The optimum is never exact" now excepts a zero third difference. The chord ratio is attributed to arcs bending differently, not to chords being shorter. "Only case" is scoped to the lesson.
- **Fixed, tests.** D1 has a decimal whitelist (one mistyped copy now fails, in both languages). D3 has four real-`LessonSession` playback tests: frame moves, close, the jump to PH, and re-applied actions. Each failed under mutation of `ArcLengthParametrizationGraph.tsx`; the stops are redundant, so only removing several together fails a test.
- **Left.** `arc-pause` is behaviourally redundant, so the "pauses last" test reads the action list only. D1 step 2 still has the caption *Ni nižljiva* beside its prediction; the caption has no off switch. Preview copy waits for AB-A-5.

## Browser (`d2d86252`, both viewports, Slovenian)

| Check | Result |
| --- | --- |
| D1's two lines and details list, 390 px | Passed; curve clear of the lines |
| D3 slider during Play, 390 and 1440 px | Passed; 0 to 0,169, held after Pause |
| D3 input inside its panel, 1440 px | Passed |
| All frames, after *Opazuj na grafu* | Passed: curve in view and uncovered on all 16 and 15 frames; the panel returns by its tab |
| Console, horizontal scroll | Clean |

**The handoff's question does not hold on phones.** The lesson panel covers the board at 390 px for every lesson, compact frames included, so no view can keep the curve clear; *Opazuj na grafu* is the way to the board.

**D1's tall view is kept.** On desktop it holds the curve below the compact panel at 180×90 to 180×135 px in a 1002×594 board (18% of the width). A tighter view gains about 20% and risks the taller panels. At 390 px the same view leaves the curve 86 px wide after Observe: small but readable, on the polish list.

The smoke's "covered before Observe" results were a false alarm: the hit element is the transparent `guided-lesson-graph-catcher`, and the screenshots show the curve clear on desktop.
