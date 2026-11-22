# Parameter writes: one store, one arbiter, previews that never touch live state

Status: draft (2026-11-22), first part of the app-wide plan for the UX picks (`docs/reviews/ux-picks/state.md`). Owner chose this direction on 2026-11-22 ("c": fuzzer now, this design as a requirement for the app-wide implementation).

## Why

On the `ux-picks` prototype the owner found, by a "weird combination of presses" (play ∿, select, drag, play again, hover), a parameter whose value flickered between several values, and concluded that "these pucks are architecturally a bit weak". He is right. A parameter value has about six writers and nothing decides between them:

| Writer | Prototype path | How it writes |
| --- | --- | --- |
| The tools control | `src/inputs/Slider.tsx`, `CountSetter.tsx` | the control's `onChange` into the graph's state |
| Puck drag, typing, track jump, arrow keys, undo | `src/uxPicks/a1/ParamPucks.tsx` | registry `set` → the control's `onChange` |
| Hover previews (ghost, overview fan, the sweep's range check) | `src/uxPicks/a19/ghost.ts`, `a29/fan.ts`, `a3/oscillators.ts` | registry `setRaw` on the **live** graph, read the board, restore the value read first |
| Sweep (∿) | `src/uxPicks/a3/oscillators.ts` | registry `set` every frame |
| Lesson scenes, Povrni, Back/Next morph | `src/learning/runtime/**`, `src/uxPicks/b1/morph.ts` | the graph's `SceneStore` |
| Registry read-back | `src/uxPicks/a1/paramRegistry.ts` | publishes the value on the control's next render, so every reader is a write or two late |

The two prototype fixes (R21 ecc31c94: learner input stops the sweep; R22 c617da8b: no preview probes while something sweeps) work, but they are patches. One is a global flag. The other infers ownership from values ("one of the sweep's last eight writes within half a step") because reads lag writes. Every new writer reopens the problem. The app-wide implementation must not port these paths as they are.

## Scope

All on-graph parameter controls that the kept picks bring app-wide (pucks a1, previews a19/a29, sweep a3, morph b1) and the existing tools controls, lessons and Presentation mode that write the same parameters. Out of scope: graph geometry itself, except where a preview needs geometry evaluated from a state that is not the live one (see "Previews").

## Requirements

1. **One synchronous store per graph scene.** Parameter values live in the graph's `SceneStore` (`src/graphs/base/SceneStore.ts`), which already applies writes immediately (the lesson runtime relies on it). Controls, pucks, readouts and previews read from it directly; there is no second published copy (no registry mirror of values).
2. **Every write names its source.** `write(key, value, source)` with `source` one of `learner`, `lesson`, `animation`. There is no anonymous write path.
3. **A fixed priority decides: learner > lesson > animation.** An animation (sweep, morph glide) holds a *lease* on the keys it moves. Any higher-priority write to a leased key ends the lease at once, and the animation's UI shows that it stopped. A lower-priority write to a key a higher writer holds is refused. A lesson frame change ends every animation lease.
4. **Previews never write live state.** A preview computes what the graph would look like at a value without changing the scene: from a copy of the state (see "Previews"). A preview is therefore safe at any time, including during a sweep, a drag or a morph, and needs no restore.
5. **Ownership is stated where a writer is defined.** Each writer's module says which keys it writes, with which source, and what ends it. Review checks that the statement exists.
6. **Interrupt what moves.** Every moving state (sweep, morph, view glide, preview) is tested against every input that writes the same state (`docs/smoke-tests.md`, "Interrupt what moves").

## Previews (options; decide in an ADR before implementation)

- **A. Geometry from state.** Graphs expose a pure function from a state to the curves and points the preview draws, independent of the board. Cleanest, and it is the existing direction ("geometry independent of React, JSXGraph"), but it is per-graph work for every graph with a previewed parameter.
- **B. Shadow board.** The preview builds the graph once more on a hidden board with a copied state and reads its paths. Generic and quick, but it doubles the board cost for previewed graphs and must be measured (docs/performance-plan.md).
- **C. Keep probing the live board under the arbiter.** A probe takes a short `preview` lease and holds every other writer off for its duration. Smallest change, but a probe still shows on the live board if it spans a frame, and it blocks the learner for that moment, which breaks requirement 3.

Recommendation: B first for the generic previews, with A for graphs whose geometry is already separable. C is listed only to be rejected explicitly.

## Acceptance criteria

1. No module writes a parameter except through `write(key, value, source)`; a search for the prototype's `setRaw`/registry `set` paths finds none.
2. Unit tests, in one synchronous sequence per case: a learner write during an animation lease ends the lease and the value is the learner's; an animation write to a learner-held key is refused; a lesson frame change ends all leases; reads right after a write return the written value.
3. Previews: a preview taken during a sweep, a drag and a morph leaves the scene's state object unchanged, compared by reference (unit test), and the board shows no probed value in any frame (browser check with frame sampling).
4. The randomized interaction fuzzer (`night/fuzz/` on `ux-picks` today; ported into the repo's browser checks with the implementation) passes 50 seeds per kept-pick route with invariants I1-I5: learner wins; no A→B→A flicker; Esc stills everything; no page errors; untouched parameters stay.
5. The prototype's known failures found by the fuzzer are listed below and each has a test.

## Fuzzer findings feeding this spec

To be filled from `C:/Users/1337Hacker/Desktop/bezeg-ux-picks/night/fuzz/RESULTS.md` (run started 2026-11-22).

## Consequences

- Breaking change for graph code: controls stop owning parameter values in React state; they read and write the scene store. Route and preset formats are unaffected (the stored state is the same object).
- The registry becomes an index of parameters (label, range, step, format, lock), not a store of values.
- Lessons keep writing through the scene store with source `lesson`; Presentation mode and phone layouts need no special case.
- Decided (owner, 2026-11-22): a learner write during a lesson's Back/Next morph ends the morph at once and the learner's value takes over (requirement 3 as written). "If a user wanted to watch, he wouldn't be pressing." Rejected: let the morph finish, then apply the learner's value.
