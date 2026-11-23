# Brief 05-test-migration (handoff-v13)

Role: `bezeg-worker`, may edit only the test files your dispatch names (plus `src/graphs/base/realGraphTestHarness.tsx` only if your dispatch says you own it). Do not edit product code; if a test reveals a product bug, stop on that file and report it with `file:line` and the observed behaviour. Never push, never stash, never commit.

Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (branch `board-workspace`). Start every command from it; create scripts with Write, no heredocs, no leading `cd`.

## Goal

Task 05 (pucks) moved each declared pilot's parameters out of the Orodja card into a puck strip on the board (WIP commit `3f054a66`). Graph tests that drove the old Orodja sliders, steppers or number inputs now fail. Migrate them so they test the same intent by driving the puck. Never loosen a check: every assertion about mathematics, scene state, write sources or lesson behaviour stays, only the way a control is found or driven changes. Do not delete or skip a test unless it is phone-only (then `test.skip` with a reason naming task 09, and add a line to `docs/tasks/ux-picks-app-wide/09-phone-presenter.md` under the existing skipped-checks list).

Read first: `docs/reviews/ux-picks-app-wide/briefs/notes/05-wire.md` (the previous worker's note: what is done, the lesson, open list). Worked examples already migrated and passing: `DecasteljauGraph.writes`, `DecasteljauPlaybackPublish`, `AnalysisFirstTask`, `PlaybackRoutes` (search with Glob for exact paths).

## How (settled)

- Graph tests need `installBoardShims()` and `vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}))` (adjust the relative path); without the mock the board never becomes ready and the strip stays hidden.
- Then `await waitForPucks(key)`; drive with `puckControl(key)` (role `slider` for ranges, `spinbutton` for counts, with the control's accessible name) and `typePuck(key, value)`. Count pucks have buttons `Povečaj: <label>` / `Zmanjšaj: <label>`. Refusal notices are in `.puck-notice`.
- A test that renders `GraphHost` itself and needs the Orodja card waits for `#board-card-tools [data-card-body]` (see `PlaybackRoutes` `mount`).
- Orodja no longer contains a control whose parameter has a puck (`PuckOwned` in `src/graphs/base/controls/PuckOwnership.tsx`); controls without a puck stay in Orodja.
- Send independent reads and searches in one message; read files by range.

## Checks

- Per file: `just unit <file>` in the foreground with a long timeout (e.g. 600000 ms). For each file record failing-before and passing-after counts.
- At the end: `npx eslint <your changed files>` and `npx tsc --noEmit --pretty false` (report only errors in your files).
- Do not run the full suite; the handler does.

## Return

At most 300 words: per file, before/after test counts and what changed in one line; any product bug with `file:line`; anything you could not migrate and why. Write a handoff note to the path your dispatch names. If you get `BUDGET HANDOFF`, stop, write the note with done/open lists, and return.
