# Brief: tests for the arbiter wiring, and the board listener rule (task 01, slices 4 and 7)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium. Edit only the owned paths. Do not edit any other file under `src/`; if a module seems wrong, stop and report with `file:line` (the handler owns these modules and commits them; never restore or overwrite a file you do not own).

## Goal

Source: `docs/tasks/ux-picks-app-wide/01-scene-store-and-fuzzer.md` slices 4 and 7; `docs/specs/parameter-writes.md` (F3 under "Fuzzer findings"). The wiring is committed (`71bb7bce`); read the doc comments, test what they say.

### Part A: tests (owned, new files)

1. `src/graphs/base/writes/learnerInputTagging.test.ts` (jsdom): after `installLearnerInputTagging(window)`, (a) inside a `pointerdown` dispatched on an element, `currentWrite()` is `learner` with a gesture id; it stays open until `pointerup` and closes after the next timer tick (fake timers allowed; say which); (b) a `click` or `input` event's handler sees `learner` and the gesture is closed after the event when it bubbled to window; (c) with `stopPropagation()` in an inner handler, the gesture still closes on the next tick; (d) `keydown`/`keyup` of the same `code` open and close; (e) window `blur` closes everything; (f) installing twice adds no second listener set (gesture ids do not double-count). Assert `writeSourcesIdle()` after each test.
2. `src/graphs/base/SceneReplacement.source.test.ts`: with a fake host whose methods record `currentWrite()?.source`, a sync plan with `source: "lesson"` runs every host and plan step as `lesson`; a deferred plan with `source: "learner"` runs `next`, the after-commit callback, `initialize`, `syncReplacedScene` and `finish` as `learner` even when the host calls them later (simulate the host deferring `afterCommit` with a stored callback invoked after `replaceScene` returned); a plan without `source` records `undefined`.
3. `src/learning/runtime/animation.lease.test.ts`: with a manual `AnimationScheduler` and a `ParameterArbiter` over a `SceneStore` fixture (as in `src/graphs/base/writes/parameterArbiter.test.ts`): frames run as `animation` and may change the leased key; a learner write to the key stops the driver and calls `onInterrupted("learner")` once, and no further frame runs; `endAllLeases()` gives `"frame"`; `play()` while the key is held does not start; `pause()` and `stop()` release the lease without calling `onInterrupted`; without a spec or arbiter, frames run untagged as before.

### Part B: board listener rule (slice 7)

`GraphSession.on` (`src/graphs/base/GraphSession.ts:119`) returns an unsubscribe that calls `board.off` at once. JSXGraph's `trigger` loop caches the handler count, so removing a handler from inside that event's dispatch breaks the loop (prototype finding F3, `reading 'handler'`). Make it safe and add a helper:

- The subscribed listener is wrapped: the wrapper does nothing once unsubscribed, and while any listener of this session is running (count dispatch depth in the wrapper), `unsubscribe` defers `board.off` to a microtask; otherwise it removes at once. Keep the existing idempotence and cleanup tracking.
- Add `once(event, listener)` on `GraphSession`: runs the listener on the first event, then unsubscribes through the same safe path. Doc comment states the rule: a board event listener never removes a handler synchronously inside that event.
- Tests in `src/graphs/base/GraphSession.listeners.test.ts` (new) with a real JSXGraph board if `GraphSession.test.ts` shows how to make one, else a fake board whose `trigger` mimics JSXGraph's cached-length loop (`for (i = 0, len = handlers.length; i < len; i++) handlers[i].handler(...)`): a listener that unsubscribes itself inside the event does not throw and does not run again; `once` runs exactly once even if the event fires twice in one dispatch chain; removal outside a dispatch is immediate.
- Observed failure: run the self-unsubscribe test against the old behaviour (temporarily make unsubscribe call `board.off` at once; keep a copy of `GraphSession.ts` first with `cp`, restore it with `cp` and confirm with `git diff` that only your intended change remains) and record the failure.

## Owned paths

- `src/graphs/base/writes/learnerInputTagging.test.ts`, `src/graphs/base/SceneReplacement.source.test.ts`, `src/learning/runtime/animation.lease.test.ts`, `src/graphs/base/GraphSession.listeners.test.ts` (new)
- `src/graphs/base/GraphSession.ts` (Part B only)

## Checks

- `just unit <each new test file>` and `just unit src/graphs/base/GraphSession.test.ts`, in the foreground, timeout 600000. All pass.
- `npx tsc --noEmit --pretty false` clean; `npx eslint <your files>` clean.
- For each Part A file, break one rule in a copy-backed module (copy with `cp` first, restore with `cp`, verify with `git diff --stat src/` that only `GraphSession.ts` differs at the end) and record the failing assertion.

Send independent reads in one message. Create files with Write; start commands from the working directory. Do not commit.

## Return (at most 400 words)

Tests per file with pass status; the observed failures; the `GraphSession.ts` change in 3 lines with `file:line`; anything in the wiring you think is wrong. Handoff note if stopped early: `docs/reviews/ux-picks-app-wide/notes/01-wiring-tests.md`.
