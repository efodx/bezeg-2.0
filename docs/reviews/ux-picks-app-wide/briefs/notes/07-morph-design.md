# Task 07 slice 3: lesson morph design (handler 7, 2026-11-25)

Source: [task 07](../../../../tasks/ux-picks-app-wide/07-morph-and-view-director.md) slice 3 and its acceptance; director design `07-view-director-design.md`; prototype behaviour (not code) `git show ux-picks:src/uxPicks/b1/morph.ts`, `sceneReveal.ts`, `useLessonMorph.ts`. Writes: `src/graphs/base/writes/parameterArbiter.ts`, `writeSource.ts`. Lesson runtime: `src/learning/runtime/LessonSession.ts` (`next` :94, `back` :120, `applyScene` :188, `applyActions` :205), `GuidedLesson.tsx:708-711`, `BaseGraph.tsx:221-233` (`lessonCapabilityAdapter`), `:751` (`applyLessonAction`).

## Split

- **3a (this note's core):** numeric parameters glide from the old step's values to the new step's on the director's clock; discrete state jumps; a learner press ends it and is kept; one view glide per step.
- **3b (after 3a is accepted; feel item):** board elements that appear draw in, removed ones fade out as a ghost (prototype `sceneReveal`). Needs its own note; not in 3a.

## Where it runs

- Only across steps: Back, Next and a jump to a step. Actions inside one step (`applyCurrentScene`) never morph.
- Only on keys bound to the arbiter whose declaration is `kind: 'range'` (the pilots today). `count`, `choice`, `toggle` and every unbound state field take the new step's value at once. No bound range key changes: no morph.
- Not under reduced motion (`prefersReducedMotion` from `src/graphs/base/controls/reducedMotion.ts`): the step applies as today.
- Not on a surface demonstration's camera (no view glide there); its range keys still morph.

## Shape

- `src/workspace/view/lessonMorph.ts`: framework-free class `LessonMorph`, deps injectable for tests: the `ParameterArbiter`, `rangeKeys()` (key, min, max, step), `now()`, `requestFrame`/`cancelFrame`, `reducedMotion()`. `dispose()` cancels the frame, ends its lease and is idempotent.
- `src/workspace/view/motion.ts`: `GLIDE_MS` (250) and `easeOutCubic` move here from `viewDirector.ts`; both the director and the morph import them. One clock: both read the same injected `now` default (`performance.now`) and start in the same tick.
- API: `morph.step(apply: () => void)`. It reads the from-values (`arbiter.read`) of the range keys, runs `apply()` synchronously (the step, as today, attributed `lesson`), reads the to-values, then: keys whose value changed by more than 1e-9 of their range get `arbiter.lease(keys, onEnd)`; if the lease is refused (learner holds a key), drop that key and retry the rest once, else no morph. It writes the from-values as `animation` in the same tick (so the first painted frame is the old numeric state with the new discrete state), then one write per key per animation frame: `from + (to - from) * easeOutCubic(t)`, snapped to the declared `step` and clamped to `[min, max]`; at `t >= 1` it writes the exact to-values and ends its lease.
- A write result other than `applied` on any key, or a frame later than 120 ms after the previous (slow redraw): finish at once (write every to-value, end the lease).
- Wiring: an optional lesson capability `morphStep(apply)` on `BaseGraph.lessonCapabilityAdapter`, which owns one `LessonMorph` per graph session (created with the arbiter, disposed with the graph). `GuidedLesson` wraps `session.back()`/`session.next()` (and step jumps) in it when present; without it the call runs as today.

## Interruptions

- **Learner press on a morphing key:** the arbiter ends the lease (`endLeasesOn`, reason learner). `onEnd` writes the to-value of every other morphing key with source `lesson` (refused if the learner holds it, which is fine) and stops. The learner's key keeps the learner's value (owner decision: the press is kept).
- **Learner press on another key or the board:** the morph keeps running; only the keys the learner touches leave it (the arbiter ends the whole lease, so `onEnd` above finishes the rest at once). Accepted: a press anywhere that writes a leased key ends the morph.
- **Back/Next during a morph:** the new step's `stopAnimations` ends all leases with reason `frame`; `onEnd` with `frame` writes nothing (the new step's scene wins) and the new `step()` reads its from-values from the shown (interpolated) state, so the next morph starts where the eye is.
- **Unmount or graph change:** `dispose()`.

## State, checkpoints and export

- Morph writes are `animation`: they must not mark the step as changed by the learner (no "Povrni", no checkpoint overwrite). The lesson checkpoint for Back is taken by the step itself before the morph starts, at the target values; check it.
- Preset export during a morph: the worker reports what `exportPreset` reads today. Required: an export taken mid-morph equals the export after the morph (export the to-values, for example by calling `morph.finish()` first or by exporting from the lease's targets). A preview (task 06) during a morph changes neither.

## One glide per step (director change)

- Today a card rectangle that changes during a frame glide starts a second glide. Change: while a glide started by `frameChanged()` runs, a geometry trigger retargets it (new target, same start time and duration, from the box shown at its start); after it ends, triggers behave as before. Resize still jumps.
- Probe acceptance: at most one glide per lesson step on the pilots and bisection at 1280x720 and 1440x900; Back returns to the step's view within 2 %.

## Tests (unit, fake clock and fake arbiter or the real arbiter)

- Next on a step that changes one range key and one toggle: the toggle is at its new value after `step()` returns; the range key is at the from-value, then strictly between, then exactly the to-value at 250 ms; the lease is gone after.
- Learner write mid-morph: that key keeps the learner's value; other keys are at their to-values the same tick; no later frame writes.
- Back during a morph: no write with the old morph's targets after the new step.
- Reduced motion: no animation write, values at target after `step()`.
- No changed range key: no lease, no frame requested.
- A refused write finishes at once.
- Director: a geometry change during a frame glide yields one glide ending at the new target at the original end time.
- Disposal: no frame callback or lease survives `dispose()`.
