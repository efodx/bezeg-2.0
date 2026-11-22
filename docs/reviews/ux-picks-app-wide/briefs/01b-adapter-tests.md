# Brief: unit tests for the view adapter core (task 01b, design slice 1)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium. Work in the worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (branch `board-workspace`). You may create and edit only the owned paths below. Do not commit.

## Goal

Unit tests that pin the view adapter's rules, one synchronous sequence per case. Sources: `docs/tasks/ux-picks-app-wide/01b-view-adapter.md` (Acceptance, first bullet) and `docs/reviews/ux-picks-app-wide/01b-design.md` (Shape). The design is settled and handler-owned: read the doc comments of `viewAdapter.ts` and test what they say. Do not change the modules; if a rule seems wrong or a test cannot pass, stop and report it with `file:line`.

## Entry files (read whole, they are short)

- `src/graphs/base/writes/viewAdapter.ts` (new, the module under test)
- `src/graphs/base/writes/parameterArbiter.ts` (the arbiter it binds to; `adoptCurrentValue` is new)
- `src/graphs/base/writes/writeSource.ts`
- For style and fixture habits only: `src/graphs/base/writes/parameterArbiter.test.ts`.

## Owned paths

- `src/graphs/base/writes/viewAdapter.test.ts` (new)

## Fixture

A fake board implementing `ViewBoard`, no JSXGraph: it stores a box; `setBoundingBox(box, keep)` stores it (when `keep` is true, widen the x range so that width/height equals a fixed container aspect, e.g. 2, to mimic JSXGraph) and then fires its `boundingbox` handlers synchronously, as JSXGraph does; `zoomIn`/`zoomOut` scale the box about its centre by 1.25 and fire; a test helper `pan(dx, dy)` and `resize(aspect)` change the box and fire without the adapter (that is the library reacting to learner input or a container resize). Arbiter: `new ParameterArbiter({isDomainError: () => false, strict: true})`, adapter bound with `adapter.bindTo(arbiter)`. Dispose adapter and arbiter in `afterEach` and assert `writeSourcesIdle()`.

## Cases (each a test; the first four are the task's acceptance)

1. A learner gesture ends a fitted-view lease and its box becomes the intent: `lease(["view"])`, `setFitted(boxF, lease)` returns `true` and the board shows boxF; then inside `beginLearnerGesture()` call `pan(...)`: `onEnd` is called once with `"learner"`, `intent().box` equals the panned box, `fitted()` is `undefined`, and a later `setFitted` with that lease returns `false` and leaves the board unchanged.
2. A fit never changes the intent: after `setFitted`, `intent()` is the same object/value as before, and `arbiter.read("view")` too.
3. Fitting an unchanged state twice gives the same box: two `setFitted(boxF, lease)` leave the board at boxF and the intent unchanged; no listener-driven violation is thrown.
4. Reset and preset restore win over a running glide: with a lease on `view` and a fitted box shown, `runAs("learner", () => adapter.setIntent(boxR))` ends the lease with `"learner"` and the board shows boxR; repeat with boxR equal to the current intent (unchanged box) and check the lease still ends (the arbiter's deliberate-write rule).
5. Lesson against a held view: inside an open `beginLearnerGesture()` after a `pan`, `runAs("lesson", () => adapter.setIntent(boxL))` returns `refused-arbiter` / `held` and the board is unchanged; after the gesture ends, it applies.
6. Untagged: `pan(...)` with no scope and no gesture throws `UntaggedWriteError` naming `"view"`; `adapter.setIntent(box)` outside any scope throws too.
7. Resize is not a write: `adapter.resizing(() => { board.resize(3); adapter.setIntent(boxS); })` outside any scope throws nothing, sets the intent to boxS, and a later no-op `arbiter.observe()` throws nothing; a `resize` fired inside `resizing` without `setIntent` leaves the intent unchanged.
8. Mount: before `bindTo`, `setIntent` outside any scope throws nothing; `bindTo` takes the intent as the baseline.
9. Zoom: `runAs("learner", () => adapter.zoom("in"))` makes the zoomed box the intent with `keepAspectRatio: false`; the zoom's own `boundingbox` event does not count twice (one listener notification; check with a spy on a second `arbiter`-independent path, e.g. that `onEnd` of a lease fires once).
10. `keepAspectRatio` is kept: `setIntent(box, {keepAspectRatio: true})` stores the requested box (not the widened one) in `intent()` and passes `true` to the board.
11. `setFitted` refuses a lease that does not lease the view key and an ended lease (returns `false`, board unchanged); an animation `lease.write("view", intent)` applies through the arbiter.
12. Dispose removes the board listener (a later `pan` changes nothing and throws nothing); a second `bindTo` without unbinding throws; after unbind, `bindTo` works again.
13. `viewBoxesEqual`: equal within 1e-9 of the box size; different beyond it.

## Checks

- `just unit src/graphs/base/writes` in the foreground (timeout 600000). Every test passes, including the existing ones.
- For each of cases 1, 4, 5 and 7: temporarily break the module behaviour the test pins (for example drop the `arbiter.write` routing in `setIntent`, or the `resizingDepth` guard in `boardChanged`), run, record that the test fails, then restore the module byte for byte (`git diff --stat src/graphs/base/writes/viewAdapter.ts src/graphs/base/writes/parameterArbiter.ts` must show only the handler's changes, which exist before you start: record that stat first).
- `npx tsc --noEmit --pretty false` shows no error in your file.

Send independent reads in one message. Create files with Write, not shell heredocs; start commands from the working directory.

## Return (at most 300 words)

Test names with pass status; the four observed failures (case, what you broke, failing assertion); any rule you think is wrong, with `file:line`. Handoff note if you stop early: `docs/reviews/ux-picks-app-wide/notes/01b-adapter-tests.md`.
