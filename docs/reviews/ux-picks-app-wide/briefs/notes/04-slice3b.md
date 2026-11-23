# Slice 3b handoff (partial, budget)

Items 1-5 implemented; units, tsc, eslint (changed files), build pass. Browser check partly done.

## Changes
- `src/workspace/presenter/cardSpecs.tsx`: `LESSON_ID`, `lessonCardSpec()` (priority Infinity, tl, order -1, live).
- `src/workspace/cards/LessonCardBody.tsx` (new): appends `host.lesson.slot` in a layout effect.
- `src/workspace/presenter/BoardCards.tsx`: lesson spec when `host.lesson.active`; live items/measure for tools+lesson (`isLive`); reserve = Več bar + 32 px Povrni row for the lesson; session-only lesson fold (`lessonFold`, from `host.lesson.foldRequest` seq and the card's fold button, never stored, reset when the lesson ends); `frame.highlight` -> highlight; `layoutInput.frame = {open, usesTools}` (usesTools: undeclared graph while lesson active, else a used param/action with placement `tools`); sets Orodja section from the used control's `section` (edit/display/save); budget order always `lesson, readouts, tools`.
- `src/workspace/presenter/presenter.css`: static lesson width 26rem, slot block.
- `src/graphs/base/GraphHost.tsx`: `lessonCard` prop. `DemonstrationWorkspace.tsx`: with `lessonCard` the workspace never inserts the slot itself.
- `src/learning/runtime/GuidedLesson.tsx`: `data-card-row` markers (controls, summary, h3, p, notation, worked example, observations, animation controls, Povrni row, footer).
- `src/localization/fragments/workspace-shell.ts`: key `shell_card_lesson` (outside owned paths, needed for the card title).
- Tests: new `src/workspace/presenter/LessonCard.test.tsx` (6 tests; mutations observed failing: usesTools undeclared, highlight, foldRequest, lessonCard prop). `UserActionAvailability.test.tsx`: the old hide button is gone in a card; tests now press Escape (fold) and expect writes AND playback stay refused (folding does not change lesson mode). Handler: decide whether folding a card should hand the graph back (previous "hidden card allows playback").

## Observed
- `just unit src/workspace src/graphs/base src/learning/runtime`: before the UserActionAvailability fix 2 failed / 3274 passed; after, that file and src/workspace/presenter pass (12.5 s). Full rerun after the last two edits not done. `npx tsc` clean, eslint clean on `src/workspace`, GraphHost, DemonstrationWorkspace, GuidedLesson, workspace-shell, UserActionAvailability test. `just build` passed.
- Browser (`smoke/04-3b-lesson.cjs <w> <h>`, Taylor `?learn=1`): 1440x900 and 1024x768: all cards inside viewport, 1 `.guided-lesson`, same element and frame after fold/reopen, highlight rendered, no page errors.

## Open issues
1. Mouse drag of any card (readouts too) showed no ghost and no move in my script (`smoke/04-3b-rows.cjs`); probably my pointer script, not verified. Keyboard move passes in unit test. Check with `03-drag4.cjs` style.
2. Cut granularity: rows are paragraph-sized (controls 139 px, p 163 px at 1440). At frame 1, 1440x900 the lesson is cut at 383 px with about 140 px free board below (natural 738, available 524). Acceptance "never hidden behind Več with free board below" needs finer rows (line boxes) or smaller blocks; not done. At 1024x768 the cut leaves about 56 px.
3. `smoke/04-3b-*.cjs/png` are scratch; static lesson card before first layout stacks with Orodja unpositioned (not checked visually). Presentation keeps frame: host.frame unchanged by fullScreen, not browser-checked. No screenshot looked at.
