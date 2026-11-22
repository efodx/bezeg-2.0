# Parameters and the view are written through one source-tagged store

Accepted on 2026-11-22 (owner: "these pucks are architecturally a bit weak"; he chose the design in [parameter writes](../specs/parameter-writes.md) as a requirement for the app-wide work, and decided that learner input ends a Back/Next morph at once).

## Context

On the prototype a parameter value had about six writers (tools control, puck, hover previews, sweep, lesson scenes and morph, and a registry that republished the value a render late) and nothing decided between them. The owner found a value flickering between a sweep and a preview's restore, and a sweep that ignored his drag. The two fixes were a global flag and a guess at ownership from recent values. The fuzzer then found a typed value replaced by a stale one and a JSXGraph page error after undo, sweep and Esc in sequence. The view had the same shape of problem: director, graph fit, lesson, morph and learner pan all wrote it, which produced drift and double glides.

## Decision

- A graph keeps its own validated setters (they refuse bad values with a `DomainError` and may do more than store a number). Each declared parameter is bound to its reader and setter, and every call runs through `write(key, value, source)`, which asks an arbiter first. The result tells an arbiter refusal from a domain refusal. A key has one authoritative value; a per-frame live value kept out of React rendering is read through the same binding.
- Every write names its source: `learner`, `lesson` or `animation`. Priority is fixed in that order. Board-dragged points and typed entries are `learner`; existing playback (`AnimationDriver`) is `animation`, like a sweep.
- The learner holds a key from pointer or key down on its control or board element until release.
- The view goes through an adapter, because JSXGraph owns the bounding box: the adapter is the only caller of `setBoundingBox`, tags a learner pan or zoom by its gesture, and treats Reset, preset restore and fit-to-points as learner commands.
- In tests and development, a change to a bound parameter or the view outside a source scope is an error.
- An animation (sweep, morph, view glide) holds a lease on the keys it moves. A higher-priority write to a leased key ends the lease at once and the animation's control shows that it stopped. A lower-priority write to a key a higher writer holds is refused. A lesson frame change ends every lease.
- A preview never writes live state.
- The intended view (from the graph or the lesson) and the fitted view are separate values; a fit reads only the intent.
- Each writer's module states its keys, its source and what ends it.

## Alternatives

- **Keep the prototype's paths and add guards per bug.** Smallest change. Rejected: every new writer reopens the problem, and ownership inferred from values is wrong whenever two writers agree by chance.
- **Pause and resume: an animation yields while the learner holds a control, then continues from the new value** (Desmos-like). Rejected by the owner for sweeps: a typed value would drift away again, and stopping is predictable.
- **Let a morph finish, then apply the learner's write.** Rejected by the owner: "if a user wanted to watch, he wouldn't be pressing."
- **A general event-sourced history with undo.** Would also give Ctrl+Z. Rejected for now: it spans every graph's own state and is a separate decision; the track-jump undo stays a single visible action.

## Consequences

- Graph code binds each parameter to its setter; setters are not rewritten. Route and preset formats do not change; a preset stores the intended view, not a fitted one.
- Touching a control of a playing parameter stops the playback.
- Alternative considered after the second review and rejected: **move every parameter into one generic store and delete the per-graph setters.** It matches the first draft's wording but would rewrite 392 `setState` call sites in 87 graph files and lose the setters' validation and side effects.
- The parameter registry becomes an index of declared parameters, not a store of values.
- The preview mechanism is a separate decision, taken by measurement before previews are built.
- The fuzzer and the "interrupt what moves" checklist become part of the repository's checks.
