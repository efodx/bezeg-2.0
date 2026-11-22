# Brief: move the secondary boards' view sites to their adapters (task 01b, design slice 3, secondary boards)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`. Do not commit. Read the shared brief `docs/reviews/ux-picks-app-wide/briefs/01b-move-sites.md` first: its rules, class table and checks hold, except that your boards are secondary, not `this.boardView`. Other workers may be editing other files at the same time: touch only your owned paths.

## Owned paths

`src/graphs/curves/ph/AuxiliaryBoardLifetime.ts`, `src/graphs/curves/ph/BasePhBezierCurveGraph.tsx`, `src/graphs/patches/parameterInset.ts`, `src/graphs/patches/surface-view/jsxSurfaceView.ts`, and their own test files.

## Settled (handler)

- `GraphSession.createAuxiliaryBoard` now returns `{board, view, release}`: `view` is that board's `ViewAdapter`, disposed by `release`. It is not bound to an arbiter (secondary views bind as `view:<board>` in task 08).
- `AuxiliaryBoardLifetime` (~113-115) and `parameterInset` (~50-51): the resize handler becomes `view.resizing(() => { board.resizeContainer(...); view.setIntent(box, {keepAspectRatio: true}); })`. Expose the lifetime's adapter to its owner (for example a `view` field next to `board`) so the PH graph can use it.
- `BasePhBezierCurveGraph` (147, 168, 255, 258): every hodograph view change goes through the hodograph board's adapter. 255 and 258 are in the resize handler: inside `resizing`. 147 and 168: classify by the shared table (a fit of the hodograph to the curve that follows a curve change is `following` when it runs after the host commit; a preset or lesson restore is a plain `setIntent`).
- `jsxSurfaceView` (876-877) creates its own board with `JSXGraph.initBoard` (a pixel frame for a 3D camera, not a mathematical view). Give that board its own adapter, `new ViewAdapter(viewBoardOver(board, undefined, {on, off}))` (import `viewBoardOver` from `src/graphs/base/GraphSession.ts`; `on`/`off` call the board's own, as `createAuxiliaryBoard` does), dispose it where the board is freed, and wrap the resize in `resizing`.
- Afterwards `grep -rnE "\.setBoundingBox\(|\.zoomIn\(|\.zoomOut\(" src --include=*.ts --include=*.tsx` over non-test files outside `viewAdapter.ts` and `GraphSession.ts` must find none in your files.

## Checks

`just unit src/graphs/curves/ph src/graphs/patches src/graphs/base/GraphSession` in the foreground (timeout 600000); `npx tsc --noEmit --pretty false`; `just lint`. A test that spies on `setBoundingBox` arguments must pass as written; otherwise stop and report.

## Return (at most 300 words)

Per site: class and replacement, `file:line`; test counts; anything left. Handoff note if you stop early: `docs/reviews/ux-picks-app-wide/notes/01b-secondary-boards.md`.
