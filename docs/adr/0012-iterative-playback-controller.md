# Provide iterative lesson playback through a shared iteration controller

Accepted on 2026-10-15. The lesson `animation` action is no longer tied to De Casteljau. Its identifier is the closed union `LessonAnimationId` (`'decasteljau' | 'bisection'`) and its commands are the closed union `LessonAnimationCommand` (`play`, `pause`, `replay`, `stop`, `next-step`, `reset`), both in `src/learning/model.ts` and shared with the lesson content type. A graph registers only the ids it owns and, with the registry's `supports` option, only the commands each id handles; everything else is rejected with `UnsupportedLessonActionError`. De Casteljau registers `play`, `pause`, `replay` and `stop`, so `next-step` and `reset` are now rejected instead of silently ignored. The lesson frame UI still shows only Play, Pause and Replay; iteration controls appear only when a lesson uses them.

Iterative topics (bisection first, then sequence convergence and fixed-point iteration) use `IterationController` (`src/learning/runtime/iterationController.ts`), which a graph owns and builds on `AnimationDriver`. The graph supplies one `transition` callback; `nextStep()` and playback both call it, so `next-step` applied k times and k played steps reach identical state. The controller fixes the step interval (one step per interval, and at most one per frame; there is no elapsed-time catch-up, and the first frame after `play()` reports no elapsed time, so a resumed iteration continues from the paused state), takes a finite iteration limit, stops playback when the limit or a `'complete'` outcome is reached, and is silent after `dispose()`. Pausing discards the unfinished part of the current interval. The graph pauses or resets it on manual edits, function and domain changes, scene replacement, lesson frame transitions, exit, import, capture and disposal; preset loading never starts playback. The iteration index may be saved in configuration when a figure needs it; running status and timing are not preset data.

The alternatives were these:

- Per-graph ad hoc timers. Each iterative graph would write its own `requestAnimationFrame` loop, limit, completion and cleanup, and each would have to rediscover the same ordering bugs (a queued frame firing after a scene was replaced; a large time jump after resume). Rejected for the duplication and the lifecycle risk the spec calls out.
- Extend the existing frame animation. `DecasteljauGraph`'s driver advances a continuous parameter by elapsed time. Reusing it would make iteration depend on frame timing, so playback and Next step would not share a transition and results could vary with frame rate.
- A shared iteration controller, chosen. It is small, testable with the injectable scheduler, and keeps the mathematics in the graph's transition.

Consequences:

- De Casteljau lesson behavior and content are unchanged. `bisection` is a declared id with no graph yet, so no route, lesson or control is visible, and any graph that has not registered it rejects it.
- Lesson content that targets an iterative graph must use only the commands the graph registered; the registry, not the UI, is the enforcement point.
- Adding an animation id or command is a change to the closed unions in `model.ts`, which keeps content, session and registry in lockstep at compile time.
- Playback is time-based at a fixed interval, so a classroom projector at any refresh rate shows the same sequence of steps.
