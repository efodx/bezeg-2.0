# Brief: wire the view adapter into the session, BaseGraph and the pilots (task 01b, design slice 2)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (branch `board-workspace`). Edit only the owned paths. Do not commit.

## Goal

Every main board gets a `ViewAdapter` from its `GraphSession`; BaseGraph's own view sites and the five pilots' sites write through it; a graph with an arbiter (the pilots) binds its view as `view`. No visible change for a learner. Sources: `docs/tasks/ux-picks-app-wide/01b-view-adapter.md`, `docs/reviews/ux-picks-app-wide/01b-design.md` (read whole, short), site table `docs/reviews/ux-picks-app-wide/view-sites.md` (rows for the files you own only).

## Entry files

- `src/graphs/base/writes/viewAdapter.ts` (settled core; do not change it; report a needed change with `file:line`)
- `src/graphs/base/GraphSession.ts` (whole)
- `src/graphs/base/BaseGraph.tsx` by range: `bindParameters` (~241), `reloadSelectedScene` (~464-490), lesson view (~874, ~905), `fitToVisiblePoints`/`navigateBoard` (~912-935), `createMainView` (~1014), `importPreset`/`showInitialView` (~1160-1190), `exportPreset*` and `importBoardState` (~1340-1401). Find exact lines by search.
- Pilot sites: `TaylorGraph.tsx:144`, `PhasePortraitGraph.tsx:441`, `LinearMapGraph.tsx:934`; `DecasteljauGraph.tsx` and `FunctionTransformationGraph.tsx` have none of their own (confirm by search).

## Owned paths

`src/graphs/base/GraphSession.ts`, `src/graphs/base/BaseGraph.tsx`, `src/graphs/functions/TaylorGraph.tsx`, `src/graphs/dynamics/PhasePortraitGraph.tsx`, `src/graphs/linear/LinearMapGraph.tsx`, new `src/graphs/base/viewAdapterWiring.test.ts(x)`, and additions (not rewrites) to `src/graphs/base/GraphSession.test.ts`. The all-graph suites (`PresetRoundTrip.contract`, `graphTeardownContract`, `GraphTransientState*`, `controlsSignature`) are handler-owned: never edit them; they must pass unchanged.

## Settled decisions

1. `GraphSession.createBoard` creates the adapter over a `ViewBoard` wrapper whose `on`/`off` for `boundingbox` go through the session's safe `on` (no removal during dispatch); exposes it as `session.view` (throws when no board). Disposed in `dispose` before the board is freed.
2. The session's `ResizeObserver` callback runs `board.resizeContainer(...)` inside `view.resizing(...)`.
3. BaseGraph gets `protected get view(): ViewAdapter`. Each BaseGraph `board.setBoundingBox(box, keep)` becomes `this.view.setIntent(box, {keepAspectRatio: keep})`; the zoom buttons call `this.view.zoom("in" | "out")`; the pan buttons `setIntent` the shifted box. Keep each site's box computation unchanged.
4. `bindParameters`: when an arbiter is created, `session.view.bindTo(arbiter)` (key `view`), unbound in `releaseParameterArbiter`. Graphs without parameter bindings get no arbiter (unchanged from task 01).
5. Presets store the intent: export reads `this.view.intent().box` where it read `board.getBoundingBox()`; `importBoardState` and the stored-`boardState` restores call `setIntent`. Existing Presets load unchanged.
6. Sources need no new scopes where the caller is already inside one (Reset, preset select and import run inside the `learner` scene replacement; lesson actions inside `lesson`; buttons are learner input). Where a pilot test shows an `UntaggedWriteError` for `view`, find the caller: if it is a learner command outside a scope (figure export, for example) wrap it in `runAs("learner", ...)`; if it is a view that follows a state change and runs in `onStateChange` after the host commit, report it with `file:line` instead of wrapping (handler decides).

## Checks

- `just unit src/graphs/base src/graphs/functions src/graphs/dynamics src/graphs/linear src/graphs/curves/bezier` in the foreground (timeout 600000); every test passes. Then `npx tsc --noEmit --pretty false` and `just lint` clean for your files.
- New tests (each observed failing before its wiring exists or with the wiring broken, then restored): a session's adapter follows a resize without changing the intent; on a pilot (Taylor via the real-graph harness, `src/graphs/base/realGraphTestHarness.tsx`), a learner Reset ends a lease on `view`; a preset exported while a fitted box is shown (`lease(["view"])` + `setFitted`) stores and restores the intent box, not the fitted one.
- Search: `grep -n "setBoundingBox(\|zoomIn\|zoomOut" ` over your owned non-test files finds only `viewAdapter.ts` callers (none left in BaseGraph and the three pilots).

Send independent reads in one message. Create files with Write, not heredocs; start commands from the working directory.

## Return (at most 400 words)

Files changed with one line each; test names and pass status; observed failures for the three new tests; every `file:line` you reported under decision 6; anything left. Handoff note if you stop early: `docs/reviews/ux-picks-app-wide/notes/01b-session-wiring.md`.
