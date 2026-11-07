# Feature stream closeout

**Status:** scheduled 2026-11-06. The owner delegated every open stream decision ("You decide, I approve"). Source: the final notes of the six [feature streams](../tasks/feature-streams/README.md).

## Decisions

| Item | Decision | Reason |
| --- | --- | --- |
| Classroom device check | Removed from every gate (owner, `de8d8ced`) | [Guardrails](../guardrails.md) already make device checks optional |
| Worked examples that never show (17 lessons) | Show them: add a `calculation` frame | The examples are authored and reviewed; students lose them only through a missing frame |
| `expectedObservations` | Show them as a collapsed self-check on observation frames | Deleting discards reviewed bilingual text. Collapsed, it does not give the answer before the student looks |
| `investigationPrompts` in chapters with their own lessons | Keep | `readFamilyInvestigation` validates hand-typed `?explore=` links against them, and deleting needs a new ownership gate plus edits to about 12 tests, too much for text no student sees |
| Lesson L6, step 6 | Reword so it does not promise the note on a narrow board | The text claimed something a narrow board omits |
| D10, D4, D6, D12 card choices | Keep | Reviewed, and nothing found against them |
| Learn strand *Ploskve in napredne teme* | Keep, including the `?example=` break recorded in [AB-A-4](../reviews/advanced-bezier/ab-a-4-chapter.md#breaking-change) | Already released; a rename back would break links again |
| Example card images in the seven chapters without any | Capture, if the chapter has guided example cards. **Done** 2026-11-07: 37 cards on `master`, deployed from `39084ff0` | Other chapters have them, so the gap is inconsistent |
| English card images | Defer | Images carry little text; the cost is a second capture of every card |
| Weak-device performance budget | Defer | Nothing to measure on now that the device check is gone |
| Phone-only lesson view, board-visible first frame | Reject for now | Shared layout changes for a small gain; [handoff 74](../reviews/feature-streams/curves/handler-handoff-74.md) records the workarounds |

## Acceptance

1. `WORKED_EXAMPLE_NOT_SHOWN` is gone, and the test requires every step with a worked example to have a frame that shows it. Each changed lesson's smoke row `minFrames` matches.
2. An observation frame of a step with `expectedObservations` shows a closed disclosure in both languages. Opening it shows the text with math typeset; steps without the field show nothing. It is keyboard operable.
3. Family investigation links still work; `investigationPrompts` are unchanged.
4. L6 step 6 no longer depends on a board width, in both languages.
5. `scripts/demonstration-preview-motion-runner.test.cjs` passes, and a `just` recipe or package script runs it.
6. T5 step 7's prompt matches its scene (X starts at C).
7. `docs/tasks/fourier-series/06-batch-c.md` step 2 has valid math.
8. `sl.ts` and `en.ts` stay in lockstep; `npx tsc --noEmit --pretty false`, the production build and `just check` pass.

## User impact

Lessons gain frames and a disclosure. No route or stored Preset changes.
