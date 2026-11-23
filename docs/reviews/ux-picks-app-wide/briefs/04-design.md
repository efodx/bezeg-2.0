# Brief: task 04 design note (read-only research, one document)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium. You write **one file only**: `docs/reviews/ux-picks-app-wide/04-design.md`. No source edits, no commit. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`; cwd, no `cd`. Send independent reads and searches in one message; read files by range.

## Goal

Task 04 ([task](../../../tasks/ux-picks-app-wide/04-tools-and-lesson-cards.md), read whole) removes the tools column: Orodja and the Guided lesson become board cards in the task 03 layer. Write the implementation plan the handler will review and split into worker slices. Settled inputs: `docs/reviews/ux-picks-app-wide/03-layout-design.md` (card ids `tools` and `lesson` already exist in `CardInput`; lesson priority Infinity), `src/workspace/presenter/BoardCards.tsx` and `cardSpecs.tsx` (how cards are built now), spec `docs/specs/ux-picks-app-wide.md` (sections on Orodja, lesson card, card budget, A9; search them), ADR 0063.

## The note must answer (cite `file:line` in the present code)

1. **Today's structure:** how `src/graphs/base/DemonstrationWorkspace.tsx` lays out the inspector (`workspace-inspector`, `.inspector-tabs` edit/display/save), the lesson panel (`GuidedLesson`, lesson modes, `closeLesson`, `lessonActive`), the playback slot, Presentation (`fullScreen`, `inspectorVisible`), chapter activity context row, Uredi mode. Which CSS defines the 310 px column.
2. **Target:** which React tree renders Orodja and the lesson card inside the card layer, without remounting `GuidedLesson` on a move (keyed portal or stable parent: propose one and say why), how the Uredi/Prikaz/Shrani tabs become head icons, how undeclared graphs put their present panels in an Orodja card that starts open (slice 7), how the playback slot and Presentation's tools switch map (slice 8).
3. **Layout inputs:** what `BoardCards` must pass to `layoutBoard` for these two cards (frame `open`/`usesTools`, budget per slice 4, Povrni pill and "Več" bar as part of the lesson card's measured size per slice 2). Name any needed change to `boardLayout.ts` types or rules: the handler owns those; propose, do not assume.
4. **Frame plumbing:** how the active lesson frame (and its `FrameDeclaration`: highlights, `uses`, opens) can reach `BoardCards` (this also fills the `TODO(task 07)` highlight prop). Today the host has no path; propose the smallest one.
5. **Undeclared graphs in a lesson** and below 1200 px (slice 7 rule).
6. **Test migration list** (slice 9): every file under `tests/` that addresses the inspector or tools column (search `inspector`, `inspector-tabs`, `workspace-inspector`, tab names), and unit tests asserting the column; one line each with what it asserts.
7. **Proposed slices** for workers: 3 to 6 bounded slices with owned paths that do not overlap (one owner per shared file), their order, and checks per slice. Note that another worker is building pucks in `src/workspace/pucks/**` (do not plan edits there).
8. **Risks and taste choices for the owner** (slice 5: whether a frame's Orodja action shows on the lesson card or on the board).

Keep the note under about 12 KB. Return ≤250 words: the proposed slices and the open decisions.
