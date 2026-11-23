# Brief: task 04 slice 3b, the lesson card on the board

Handoff-v13. Role: `bezeg-worker`, Sonnet medium, edits allowed in owned paths. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`; cwd, no `cd`, Write not heredocs, do not commit. Send independent reads in one message; read large files by range. Handoff note: `docs/reviews/ux-picks-app-wide/briefs/notes/04-slice3b.md`.

## Goal

Task 04 slices 2, 4 and 5 ([task](../../../tasks/ux-picks-app-wide/04-tools-and-lesson-cards.md)): the Guided lesson is a board card. Plan `04-design.md` §2-4, §9. Slice 3a (`81433389`) prepared the lesson side: read its commit message, `briefs/notes/04-slice3a.md` ("For slice 3b") and `src/workspace/presenter/cardHost.ts` (`host.lesson: {slot, active, mode, foldRequest}`, `host.frame`).

## Items

1. Lesson card spec in `cardSpecs.tsx`: id `lesson`, priority `Infinity`, anchor `tl`, order -1, present only while `host.lesson.active`. Its body (`LessonCardBody`, new or existing in `src/workspace/cards/`) appends `host.lesson.slot` in an effect; the workspace stops appending it elsewhere once connected. Pass the `lessonCard` prop from `GraphHost` so the lesson uses `presentation: 'card'`. `GuidedLesson` must never remount on a move, fold, or relayout (test: a mount counter or the frame index survives a drag and a fold).
2. Live measure like Orodja (`live` item, first-commit render, `data-card-blocks` or `data-card-row` markers on the lesson's paragraphs so a cut ends on whole lines), `reserve` = Povrni row + Več bar. The lesson card's text is never cut while there is free board below it (acceptance: "the frame's task text is never hidden behind Več with free board below").
3. `host.lesson.foldRequest` (`{folded, seq}`) folds/unfolds the card (explore = folded chip); folding and reopening keeps the frame and edited graph values.
4. Frame wiring (slice 4/5, design §4): `host.frame` → `BoardCards`' `highlight` (fills `TODO(task 07)`; memoise on the frame), and `layoutInput.frame = {open: frame.open ?? [], usesTools}`, where `usesTools` is true when a used control/action lives in Orodja (for an undeclared graph: true while its lesson is active, also below 1200 px). Budget order lesson, readouts, tools (already in place). Default for slice 5's taste choice: Orodja opens (it is frame-opened) at its section; scrolling Orodja's body to the section of the used control is enough.
5. Presentation mode keeps the frame when entered (acceptance).

## Owned paths

`src/workspace/presenter/**`, `src/workspace/cards/**`, `src/graphs/base/GraphHost.tsx`, `src/graphs/base/DemonstrationWorkspace.tsx` (only the slot hand-over and the `lessonCard` prop), `src/learning/runtime/GuidedLesson.tsx` (only markers for row breaks, if needed), their tests. Not `boardLayout.ts` (report a needed rule change), `tests/**`, lesson content, pucks.

## Checks

Unit tests per item, each observed failing once. `just unit src/workspace src/graphs/base src/learning/runtime` (foreground, timeout 600000), `npx tsc --noEmit --pretty false`, eslint on changed files (no new errors versus HEAD), `just build`. Browser (dev server `http://127.0.0.1:4483/bezeg-2.0/`, running; do not start/stop servers; clear localStorage `bezeg-2.0:board-layout`): open the Taylor guided lesson (find its URL from the chapter page `/learn/...` or `?learn` routes in `src/learning`), walk 3 frames, drag and fold the lesson card, check the frame survives, no page errors, all cards inside the viewport at 1440x900 and 1024x768. Report numbers.

## Return (≤300 words)

Per item: change (`file:line`), test and observed failure; checks; browser results; open issues.
