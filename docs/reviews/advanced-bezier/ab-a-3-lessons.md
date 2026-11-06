# AB-A-3a, AB-A-3b: D1 and D3 guided lessons

Curves handler 59, 2026-11-06. Spec: [advanced-bezier-lessons.md](../../specs/advanced-bezier-lessons.md) D1 and D3. Lesson text is [one-shot](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). **Status: tests and browser walks pass; review pending.**

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

## Open items

- No engineering or mathematics review yet.
- D1 step 2 is a prediction, but the board caption already says *Ni nižljiva*. The caption has no off switch.
- D1's number check is "contains": changing one of several copies of `0{,}069007` in a step failed no test. D3 added a whitelist test for the same gap; D1 has none.
- Neither test runs the real wired adapter: D1 builds a minimal `LessonDefinition`, and D3's close test uses `restoreState`, because the lessons were unwired when written.
- Preview copy was written by the handler, without a poster to compare against (AB-A-5).
