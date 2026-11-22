# Brief: unit tests for the parameter arbiter core (task 01, slices 1-2)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium. You may create and edit only the owned paths below.

## Goal

Unit tests that pin the arbiter's rules, one synchronous sequence per case. Source: `docs/tasks/ux-picks-app-wide/01-scene-store-and-fuzzer.md` (Acceptance, first bullet; slice 2) and `docs/specs/parameter-writes.md` requirements 2-3. The design is settled and handler-owned: read the doc comments at the top of the two modules and test what they say. Do not change the modules; if a rule seems wrong or a test cannot pass, stop and report it with `file:line`.

## Entry files (read whole, they are short)

- `src/graphs/base/writes/writeSource.ts`
- `src/graphs/base/writes/parameterArbiter.ts`
- For style only: `src/graphs/base/SceneStore.test.ts`.

## Owned paths

- `src/graphs/base/writes/parameterArbiter.test.ts` (new)
- `src/graphs/base/writes/writeSource.test.ts` (new)

## Fixture

A tiny fake graph: a `SceneStore` (`src/graphs/base/SceneStore.ts`) holding `{a, b}`, setters that throw a local `class FakeDomainError extends Error` for negative values, bindings `{read: () => store.getState().a, apply: v => setA(v)}`, and `store.subscribe(() => arbiter.observe())` (that is how graphs will wire it). `isDomainError: e => e instanceof FakeDomainError`, `strict: true`. Dispose the arbiter in `afterEach` and assert `writeSourcesIdle()`.

## Cases (each a test; acceptance criteria are the first five)

1. A learner write during a lease ends the lease (`onEnd` called once with `"learner"`) and the value is the learner's; a later `lease.write` returns `refused-arbiter` / `lease-ended`.
2. An animation write to a held key is refused: with `hold("a")` open, `lease(["a"])` returns `undefined`; with a lease started before the hold, the hold ends it and `lease.write` is refused. Also: a lesson write to a held key returns `refused-arbiter` / `held`.
3. A domain refusal (learner writes -1) returns `refused-domain` with the error, leaves the value unchanged and the lease active.
4. `endAllLeases()` ends every lease with reason `"frame"`.
5. A read right after an applied write returns the written value (`arbiter.read` and `store.getState()`).
6. Gesture holds: inside `beginLearnerGesture()`, a setter call with no scope (simulated board drag: call `setA(5)` directly) is attributed to the learner: it ends a lease on `a`, does not throw, and `a` is held (lesson write refused) until the gesture's end function runs; after that a lesson write applies.
7. Untagged write: `setA(3)` with no scope and no gesture throws `UntaggedWriteError` naming `"a"`; with `strict: false` it does not throw. Inside `runAs("lesson", ...)` it does not throw.
8. An animation scope (`lease.run`) that changes `b` while leasing only `a` throws `UntaggedWriteError`; `lease.run` on an ended lease returns `false` and does not run.
9. A new lease on an overlapping key ends the older one with `"replaced"`; `release()` ends with `"released"`; `onEnd` is never called twice.
10. A lease's `onEnd` that writes another bound key (as `lesson`, via `runAs`) settles without throwing, and the change is observed (its `last` value is updated, so a later no-op observe does not throw).
11. `writeSource`: `runAs` nests and restores after a throw; `animation` without a lease throws; two overlapping gestures keep one id until both end; end functions are idempotent.

## Checks

- `just unit src/graphs/base/writes` in the foreground (timeout 600000). Every test passes.
- For each of cases 1, 2, 3 and 7: temporarily break the module behaviour the test pins (for example comment out the `endLeasesOn` call in `write`), run, record that the test fails, then restore the module byte for byte (`git diff --stat src/graphs/base/writes/*.ts` must show no change to the two modules at the end).
- `npx tsc --noEmit --pretty false` shows no error in your files.

Send independent reads in one message. Create files with Write, not shell heredocs; start commands from the working directory.

## Return (at most 300 words)

Test names with pass status; the four observed failures (case, what you broke, failing assertion); any rule you think is wrong, with `file:line`. Handoff note if you stop early: `docs/reviews/ux-picks-app-wide/notes/01-arbiter-tests.md`.
