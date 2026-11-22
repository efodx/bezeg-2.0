# 01 Source-tagged parameter writes

Source: [parameter writes](../../specs/parameter-writes.md); [board workspace spec](../../specs/ux-picks-app-wide.md) requirement A2; [ADR 0064](../../adr/0064-source-tagged-scene-writes.md). Companion tasks: [01b view adapter](01b-view-adapter.md), [01c check tooling](01c-check-tooling.md).

## How master writes parameters today (verified 2026-11-22 on `origin/master`)

- Shared inputs are already controlled; they hold no value of their own (`src/inputs/Slider.tsx`).
- Each graph changes a parameter through its own validated setter, which may refuse with a `DomainError` and may do more than store a number (`src/graphs/functions/TaylorGraph.tsx` `setCenter`, `setDegree`; the example setter also sets the view). The tools control, lesson scene actions and board-dragged points all call these setters.
- 392 `this.setState(` calls in 87 graph files; 68 graph files attach board drag, down or up handlers. A point dragged on the board is a learner writer.
- Existing motion: 13 graph files use `AnimationDriver`, and playback controls are wider still. De Casteljau keeps a per-frame `liveParameter` beside a `publishedParameter` so that a playing animation does not re-render the workspace every frame.
- `src/learning/model.ts` `FUNCTION_PARAMETER_NAMES` is already a closed vocabulary of parameter names that lesson scenes write.

## Goal

Every change of a declared parameter runs inside a named source, an arbiter decides between sources, and the graph's own setters stay the only code that validates and applies a value.

## Slices

1. **Arbiter core** (handler-owned design, pure, no React or JSXGraph): `write(key, value, source)` asks the arbiter, then calls the parameter's setter inside that source's scope. The result separates three outcomes: applied, refused by the arbiter (a higher source holds the key), refused by the domain (the setter's `DomainError`, with its message). Leases for animations; a lesson frame change ends every lease.
2. **What "holds" means:** the learner holds a key from pointer down or key down on its control or its board element until release, and while a typed entry is being edited. Outside a hold, priority matters only against leases. Written into the core's doc comment and unit tested.
3. **Parameter binding:** a graph binds each parameter key to its reader and its existing setter (the first piece of the declaration of task 02; lesson parameter names from `FUNCTION_PARAMETER_NAMES` are reused as keys where they exist). No setter is rewritten.
4. **Writers tagged:** shared inputs write as `learner`; lesson scene actions as `lesson`; board pointer interaction opens a `learner` scope at the base graph (one hook around the board's down/drag/up, not 68 edits); `AnimationDriver` and playback write as `animation` under a lease, so a learner write to a playing key ends the playback the same way it ends a sweep.
5. **Untagged-write check:** in tests and development, a commit that changes a bound parameter outside a source scope throws. This replaces "a search finds no write outside `write`", which cannot be checked by search on 392 call sites. The all-graph contract suites exercise it.
6. **One value, selector reads:** a key has one authoritative value. A graph may keep a per-frame live value out of React rendering (De Casteljau), but readers reach it through the binding's reader, and subscribers select a key so a per-frame write re-renders only that key's readers. Measure a playing De Casteljau and a dragged Taylor slider before and after ([performance plan](../../performance-plan.md)); master's per-frame saving must not be lost. This measurement gates task 05.
7. **Board listener rule:** a listener on a JSXGraph board event never unsubscribes from inside that event (fuzzer finding F3). One "listen once" helper defers removal; listeners have an owner and are disposed with it.

## Acceptance

- Unit tests, one synchronous sequence per case: a learner write during a lease ends the lease and the value is the learner's; an animation write to a held key is refused; a domain refusal leaves the value and any lease unchanged; a lesson frame change ends all leases; a read right after an applied write returns the written value.
- The untagged-write check passes across the all-graph suites; a seeded untagged write fails it (observed failure recorded). The check covers bound parameters only: task 01 binds the pilots (Taylor, transformations, De Casteljau, phase portrait, linear map), so for every other graph it proves nothing until task 08 binds them, and "touching a playing parameter stops its playback" holds only on the pilots until then (handler and planner, 2026-11-22).
- No behaviour change for a learner, with one intended exception: touching a control of a playing parameter stops its playback. That exception is checked on De Casteljau and listed for the owner.
- Before/after frame numbers for slice 6 recorded.

## Not in this task

The view (01b). Pucks, previews, sweeps, morph (05 to 07). Fuzzer and probe (01c).
