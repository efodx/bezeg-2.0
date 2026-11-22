# Parameters and the view are written through one source-tagged store

Accepted on 2026-11-22 (owner: "these pucks are architecturally a bit weak"; he chose the design in [parameter writes](../specs/parameter-writes.md) as a requirement for the app-wide work, and decided that learner input ends a Back/Next morph at once).

## Context

On the prototype a parameter value had about six writers (tools control, puck, hover previews, sweep, lesson scenes and morph, and a registry that republished the value a render late) and nothing decided between them. The owner found a value flickering between a sweep and a preview's restore, and a sweep that ignored his drag. The two fixes were a global flag and a guess at ownership from recent values. The fuzzer then found a typed value replaced by a stale one and a JSXGraph page error after undo, sweep and Esc in sequence. The view had the same shape of problem: director, graph fit, lesson, morph and learner pan all wrote it, which produced drift and double glides.

## Decision

- Parameter values and the view box live in the graph's `SceneStore`, which applies writes synchronously. Readers read the store; there is no second copy.
- Every write names its source: `learner`, `lesson` or `animation`. Priority is fixed in that order.
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

- Graph controls stop owning parameter values in React state. Route and preset formats do not change, because the stored state object is the same.
- The parameter registry becomes an index of declared parameters, not a store of values.
- The preview mechanism is a separate decision, taken by measurement before previews are built.
- The fuzzer and the "interrupt what moves" checklist become part of the repository's checks.
