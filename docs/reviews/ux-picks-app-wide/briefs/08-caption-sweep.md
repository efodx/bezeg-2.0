# Dispatch: task 08 caption sweep (stream A), batch `<B>`

You are a `bezeg-worker` (Sonnet).
- Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (branch `board-workspace-2`).
- Stay in the worktree, never create a worktree, never commit or push.
- Preserve other uncommitted changes in the tree: another lane may be in progress there.

## Goal

Apply the owner's 2026-11-27 decision to the graphs listed for your batch. The decision is the "Board captions" bullet in `docs/tasks/ux-picks-app-wide/08-convert-all-graphs.md`. Read it, then follow the pattern of the Taylor removal: `git show e0bfe3576`.

- Remove every board-drawn caption line that only repeats a legend entry or a readout row the graph declares.
- A line that carries information no card shows stays (a function's rule, for example, if no row shows it). If a lesson step names such a line, it must be clear of the cards at 1440x900 and 1280x720.
- First-pass inventory: `docs/reviews/ux-picks-app-wide/briefs/notes/08-caption-sweep-inventory.md`. Its verdicts are unverified.

Verify every line yourself against the graph's `declaration()`: its `legend` and `rows`, and the readout rows the panel renders. Record your verdict per line in the notes.

## Also update

- **Lesson prose** that tells the learner to read a removed board caption: point it at the Odčitki card or the legend instead, in sl and en. Search the graph's lesson files for the caption's words.
- **Catalog keys** used only by removed lines: grep before deleting anything.
  - Keys in the graph's own fragment (`src/localization/fragments/<id>.ts`): delete them in lockstep.
  - Keys in `sl.ts`/`en.ts`: do NOT delete them. Another worker edits those files concurrently. List them in the notes; the handler deletes them.
- **Tests** that assert removed captions: switch them to assert the row or legend entry carrying the same information. Never drop an assertion without that replacement.
- **Golden:** report the diff with `BEZEG_PARITY_GOLDEN_CHECK=1 just unit src/graphs/base/declare/parityGolden.test.tsx -t <id>`. The diff must be captions only. Do not re-record; the handler does that.

## Checks per graph

1. tsc.
2. Lint on the changed files.
3. `just unit <graph dir> src/learning/content/<lesson prefix> src/learning/content/declarationContract src/localization`.
4. The golden diff summary.
5. One browser shot per graph at 1440x900 on its lesson's first step: `just shot`, dev server `http://127.0.0.1:4483/bezeg-2.0/`. Look at the shot and state what board text remains.

Once per batch: `just unit FirstTask`. Run everything in the foreground, one heavy command at a time.

## Return

- At most 300 words, with `file:line`.
- Notes, per graph, kept as you go, in `docs/reviews/ux-picks-app-wide/briefs/notes/08-caption-sweep.md`.
- At the `HANDOFF` budget signal, write done/next in the notes and return partial.
- Delete scratch files by explicit name, never with globs.
