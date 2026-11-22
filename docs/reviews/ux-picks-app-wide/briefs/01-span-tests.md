# Brief: tests for the learner source/span split (task 01 follow-up)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium. Edit only the owned paths. Never create, remove or modify a worktree or `node_modules`; never restore or overwrite a file you do not own.

## Goal

The handler split the learner's ambient source from its hold span (uncommitted working-tree change in `src/graphs/base/writes/writeSource.ts` and `learnerInputTagging.ts`; read both doc comments first). Now: the ambient `learner` source is open only during the dispatch of a learner input event (pointer down/move/up, key down/up, click, input, change, wheel...); a span (pointer or key down until release) only holds the keys the learner's input changed. Three tests in `learnerInputTagging.test.ts` assert the old semantics (source open between events) and fail.

Rewrite those tests to the new semantics, and add one test per planner condition (each with an observed failure, see Checks):

- **a.** An explicit source overrides the ambient one: inside a trusted-like pointer span (`holdSyntheticInput: true`), during a `pointermove` dispatch a `runAs("animation", ..., lease)` write is attributed `animation` (use a `ParameterArbiter` fixture as in `parameterArbiter.test.ts` with a lease) and a learner-held key refuses it.
- **b.** A `click` handler that runs `runAs("lesson", ...)` (stand-in for lesson Next) writes as `lesson`; a plain setter call in the same click handler writes as `learner`.
- **c.** Work after the gesture has no ambient source: during an open pointer span (pointer down, no up yet), a `setTimeout` callback (fake timers) and a `Promise.then` that change a bound key throw `UntaggedWriteError` in strict mode; the same change inside a `pointermove` dispatch does not.
- **d.** Holds are per key: a pointer span during which no key changed (a press on an unrelated element) leaves every key unheld (a lesson write applies, `lease()` is granted); a span during which a `pointermove` handler changed key `a` holds `a` only (lesson write to `a` refused, to `b` applied) until `pointerup` and the next tick.
- An explicit way for tests to open a learner scope: `beginLearnerGesture()` opens source and span together (already exists); one test shows it.

## Owned paths

- `src/graphs/base/writes/learnerInputTagging.test.ts`, `src/graphs/base/writes/learnerInputTagging.synthetic.test.ts`, `src/graphs/base/writes/writeSource.test.ts`, `src/graphs/base/writes/parameterArbiter.test.ts`, and a new `src/graphs/base/writes/learnerConditions.test.ts` if you prefer to keep a-d together (it then installs tagging with `holdSyntheticInput: true` itself).

## Checks

- `just unit src/graphs/base/writes` in the foreground (timeout 600000): all pass. `npx tsc --noEmit --pretty false` and `npx eslint src/graphs/base/writes` clean.
- Observed failure per condition: c fails if `currentWrite()` falls back to the span (temporarily change the `openInputs > 0` test in `writeSource.ts` to `currentSpanId !== undefined`); a fails if `currentWrite()` checks the ambient source before the scope stack. Make these mutations on a `cp` copy of `writeSource.ts` taken first, restore with `cp`, and confirm with `diff` against your copy that the file is back byte for byte (it is uncommitted handler work: a wrong restore loses it).

Send independent reads in one message. Create files with Write. Do not commit.

## Return (at most 300 words)

Tests per condition with pass status and the observed failures; anything in the split you think is wrong, with `file:line`. Handoff note if stopped early: `docs/reviews/ux-picks-app-wide/notes/01-span-tests.md`.
