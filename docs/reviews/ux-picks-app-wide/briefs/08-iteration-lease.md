# Brief: task 08 step 2 — `useLease` passthrough on IterationController

Role: `bezeg-worker` (Sonnet). Worktree root `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`
(branch `board-workspace-2`); never `cd` elsewhere, never create a worktree, never commit or push. Another worker is editing
the curve workspace (`src/graphs/base/BaseCurveGraph.tsx` and curve files, `parity.test.tsx`): do not touch those, and run
only path-filtered `just unit <file>` (no `just check-changed`, no graph-check, no build: one heavy run at a time).

## Goal

Task 08 step 2 (`docs/tasks/ux-picks-app-wide/08-convert-all-graphs.md`): "Include a `useLease` passthrough on
`IterationController` (`src/learning/runtime/iterationController.ts`; its `AnimationDriver` is private, so the linear map
pilot takes its own lease) before any lane uses it." ADR 0064 and `docs/specs/parameter-writes.md` (section on leases, by
heading) define leases: a playing animation holds a lease on the parameters it writes (`graph.parameters.lease(keys, onEnd)`);
a learner write ends the lease and the animation stops. Find how the linear-map pilot takes its own lease
(`src/graphs/linear/`, search `lease(`) and how `PlaybackButtons.tsx:~100` claims one; the AnimationDriver lives near
`src/learning/runtime/` (search `class AnimationDriver`).

Deliver: an `IterationController` option or method (name per existing style, e.g. `useLease(keys)` or a constructor option)
so a graph that drives playback through it gets a lease on the named keys while playing, released when it pauses, finishes or is
disposed, and whose `onEnd` (learner write, lesson write) pauses the controller. Then switch the linear-map pilot to it if that
removes its hand-rolled lease without behaviour change; otherwise leave the pilot and say why. Do not convert the 9 graphs
with their own AnimationDriver (triage list); those are lane work. List in your notes, per those 9 graphs
(arc-length-param, contour-map, curve-kinematics, curve-parametric, decasteljau-alternative, epicycles, mechanics-descent,
prob-simulation, waves), whether they use IterationController or a bare AnimationDriver (file:line), so the lanes know which path applies.

## Acceptance

1. Unit tests for the passthrough: lease taken on play, released on pause/finish/dispose (no leak: a second lease on the same
   keys succeeds after release), a learner write on a leased key pauses the controller. Each new assertion observed failing once
   (quote the message).
2. Existing tests pass: `just unit src/learning/runtime`, `just unit src/graphs/linear`, `just unit src/graphs/base/writes`.
3. `npx tsc --noEmit --pretty false`; `just lint <changed files>`.

Owned: `src/learning/runtime/iterationController.ts` and its tests, the linear-map files only if you switch it (and its tests).

## Return

At most 300 words: per item pass/fail with log paths, the red failures, files changed, the 9-graph table summary.
Notes: `docs/reviews/ux-picks-app-wide/briefs/notes/08-iteration-lease.md`.
