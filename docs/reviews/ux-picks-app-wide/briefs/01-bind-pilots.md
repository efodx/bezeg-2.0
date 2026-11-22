# Brief: bind a pilot graph's parameters to the arbiter (task 01, slices 3-4)

Handoff-v13, shared by every pilot dispatch; the dispatch names your graphs. Role: `bezeg-worker`, Sonnet medium. Edit only the owned paths.

## Goal

Source: `docs/tasks/ux-picks-app-wide/01-scene-store-and-fuzzer.md` slices 3-4 and acceptance; ADR `docs/adr/0064-source-tagged-scene-writes.md`. Each named graph binds every numeric, count and choice parameter that a learner control, a board point or a lesson action changes, so every change of it runs inside a write source and the development check throws on an untagged one. **No setter is rewritten; no behaviour a learner sees changes** (one exception: touching a control of a playing parameter stops its playback, already true where a graph pauses on seek).

## Worked example (read it first)

`git show 015c05a4` — Taylor: `parameterBindings()` returns `{key: {read, apply}}` with the graph's existing setter as `apply`; keys reuse lesson names from `FUNCTION_PARAMETER_NAMES` (`src/learning/model.ts:55`) where the graph's `lessonFunctionActions()` already names them, else `<graph>-<param>` in kebab case; the doc comment above it states the writers, their source, and what animates the keys (ADR 0064, "Each writer's module states its keys, its source and what ends it"). The seeded-untagged-write host test at the end of `src/graphs/functions/TaylorGraph.host.test.tsx` is the test pattern.

Mechanics you rely on (do not edit): `src/graphs/base/writes/parameterArbiter.ts`, `writeSource.ts`, `learnerInputTagging.ts` (input events are `learner`, synthetic test events too, per dispatch), `BaseGraph.parameterBindings`/`parameters` (`src/graphs/base/BaseGraph.tsx`), lesson actions and scenes already run as `lesson`, Preset/Reset/import as `learner`, `AnimationDriver.useLease` (`src/learning/runtime/animation.ts`).

## Per graph

1. Find every writer of each parameter: tools controls, board point drags (`on('drag')`, `ModelPointBinding`, declarative controls), lesson actions, playback/`AnimationDriver`, timers. Bind each parameter key.
2. A per-frame value kept out of React rendering (De Casteljau's `parameter`) is read through the binding: `read` returns the drawn value.
3. Playback: give the driver `useLease({arbiter: () => this.parameters, keys: [...], onInterrupted})`; `onInterrupted` puts the playback control in its paused state the way the graph's own pause does (for De Casteljau: `setParameter(this.parameter, "paused")` if it was playing). Writes inside frames are then `animation`.
4. A writer that runs outside an input event, a lesson action or a scene replacement (a timer, a promise continuation, a `requestAnimationFrame` that is not an `AnimationDriver`, a ResizeObserver) and changes a bound key will now throw in tests: wrap it in `runAs(source, ...)` with the source that caused it and say why in a comment, or report it if the source is unclear. Never call `adoptCurrentValues()` to silence a throw.
5. Add one host test per graph (in its existing host or graph test file, or a new `<Graph>.writes.test.tsx`): the seeded untagged write throws `UntaggedWriteError`; a tools-control change applies; a lesson write through `parameters.write(key, v, 'lesson')` applies and a held key refuses it. For playback graphs also: playing, then a learner write of the played key (`parameters.write(..., 'learner')` or the tools control) stops playback and the control shows paused; a lesson frame change (`graph.getLessonCapabilities().stopAnimations()`) ends the lease. Record one observed failure per graph (bindings returning `{}` makes the seeded test fail).

## Owned paths

Only the named graph files, their own test files, and new `<Graph>.writes.test.tsx` beside them. Not the all-graph suites (`PresetRoundTrip.contract`, `graphTeardownContract`, `controlsSignature`, `GraphTransientState*`, lesson restoration contracts): run them, do not edit them; report a failure with the failing test name and the thrown message. Do not edit `src/graphs/base/**` or `src/learning/runtime/**`. Never create, remove or modify a worktree or `node_modules` (it is a junction shared by every checkout; an earlier worker wiped it). Keep a `cp` backup before any temporary mutation and restore with `cp`; verify with `git diff --stat` at the end.

## Checks

- `just unit <graph dir or files>` in the foreground (timeout 600000), then the all-graph suites filtered to your graphs if they support a filter, else whole: `just unit src/graphs/PresetRoundTrip.contract.test.tsx src/graphs/base/graphTeardownContract.test.tsx src/graphs/base/controlsSignature.test.tsx src/graphs/base/GraphTransientState` and any lesson test of your graph's lessons (`grep -rl <GraphClass> src/learning`).
- `npx tsc --noEmit --pretty false`; `npx eslint <your files>`.

Send independent reads and searches in one message. Create files with Write; start commands from the working directory. Do not commit.

## Return (at most 400 words)

Per graph: keys bound (key → setter, `file:line`), writers found and how each is tagged, any `runAs` you added and why, tests added with pass status and the observed failure, all-graph suite results. Anything the plan says that the code contradicts. Handoff note if stopped early: `docs/reviews/ux-picks-app-wide/notes/01-bind-<graph>.md`.
