# Brief: move a family's main-board view sites to the view adapter (task 01b, design slice 3)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (branch `board-workspace`). Do not commit. Your dispatch names your batch (a list of directories or files); you own only the non-test files of that batch and their own test files. Another worker may be editing a different batch at the same time: never touch a file outside yours, and never run `git checkout`, `git stash` or anything that changes files you do not own.

## Goal

Every `board.setBoundingBox(`, `zoomIn(`, `zoomOut(` call on a graph's **main board** in your batch goes through the graph's view adapter, `this.boardView` (a `ViewAdapter`, `src/graphs/base/writes/viewAdapter.ts`; read its doc comments). No behaviour change: the box each site computes, its keep-aspect flag and its zoom mode stay exactly as they are. Secondary boards (PH hodograph, `AuxiliaryBoardLifetime`, `parameterInset`, `jsxSurfaceView`) are not yours: leave them and list them.

## Worked example (BaseGraph and the pilots, commit `d8bcbb5f`; read `git show d8bcbb5f -- src/graphs/base/BaseGraph.tsx src/graphs/dynamics/PhasePortraitGraph.tsx src/graphs/functions/TaylorGraph.tsx`)

| Site class (from `docs/reviews/ux-picks-app-wide/view-sites.md`, your rows only) | Replacement |
| --- | --- |
| initial, reset, preset, lesson, fit, export, other (buttons), and a view set inside a parameter setter | `this.boardView.setIntent(box, {keepAspectRatio: keep})`; add `zoom: mode` only when the old call passed a third argument |
| follows: a key-gated view sync that runs from `onStateChange`/`syncBoard`/`applyFrame`/`showFrame` after the host commit (derived from scene state) | `this.boardView.following(() => this.boardView.setIntent(box, {keepAspectRatio: keep}))` |
| resize: a handler reacting to a container size change (`reframeToSize`, a settle timer after a resize) | wrap the whole handler body that changes the view in `this.boardView.resizing(() => ...)`, with its `setIntent` calls inside |
| `board.zoomIn()` / `board.zoomOut()` | `this.boardView.zoom("in" / "out")` |

When a site is a shared helper called from several classes (for example a `showFrame` called by both `syncBoard` and `reframeToSize`), wrap at the callers: `following` at the sync caller, `resizing` at the resize caller, a plain `setIntent` in the helper. A spread copy (`[...box]`) is no longer needed: `setIntent` copies. Keep each site's comment; do not reword unrelated code.

## Checks

- `grep -nE "\.setBoundingBox\(|\.zoomIn\(|\.zoomOut\(" <your non-test files>` finds no main-board call (list any secondary-board call left, with `file:line`).
- `just unit <your batch directories>` in the foreground (timeout 600000): every test passes. A test that spies on `board.setBoundingBox` with exact arguments must still pass as written: the adapter calls `setBoundingBox(box, keep)` with two arguments, or three when `zoom` is given. If a test cannot pass without changing its assertion, stop and report it with `file:line` and the error; do not weaken it.
- `npx tsc --noEmit --pretty false` shows no error in your files; `just lint` passes.

Send independent reads in one message. Create files with Write, not heredocs; start commands from the working directory.

## Return (at most 300 words)

Files changed, each with its classes moved (counts); secondary-board sites left (`file:line`); test result counts; anything you could not classify, with `file:line`. Handoff note if you stop early: `docs/reviews/ux-picks-app-wide/notes/01b-move-sites-<batch>.md`.
