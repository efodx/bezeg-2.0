# 4. Owned standalone scenes

Status: slices 1–3 implemented and reviewed 2026-11-10 (`s8-1.md`, `s8-2.md`, `s8-2-review.md` in `docs/reviews/feature-streams/controls/`); closeout pending: browser smoke (`s89-smoke.md`). Task file written 2026-11-08 by the Controls stream (step 8 of [controls.md](../feature-streams/controls.md)). Source: [lesson-authoring architecture, section 4](../../specs/lesson-authoring-architecture.md#4-owned-standalone-scenes), acceptance S1–S5 (canonical there), plus [verification](../../specs/lesson-authoring-architecture.md#verification-and-completion-evidence). Starts after task 5 is accepted: the two must not change `BaseGraph` replacement hooks at the same time. May run beside task 3, which does not touch those hooks.

## Scope and entry points

`BSplineBlossomGraph.tsx` and `BSplineNurbsGraph.tsx` (their `scene`/`ensureScene`/`removeScene` and lifecycle overrides), `BaseGraph.tsx` host hooks (mount, committed state change, replacement sync, figure disposal, session disposal), `SceneReplacement.ts` and `GraphSession.ts`. Blossom and NURBS only; Blossom stays lessonless at `/bezeg-2.0/bspline/blossom`. Reconcile against current `master` first.

## Slices

1. **Characterize.** Real-graph harness tests for both consumers capturing old element/listener identities (drag handlers, Blossom's language subscription), reset/import/checkpoint/figure entry-and-return, StrictMode-style remount, and the NURBS equal-shape/different-knots replacement (S2, S5). These pass before the change.
2. **Slot.** A typed graph-owned scene declaration and a `BaseGraph`-owned slot scoped to the current `GraphSession`: one live instance, cleared before disposal, construction failure releases partial resources, late deferred work after cancellation is ignored (S3). No second scheduler or store mirror.
3. **Migrate Blossom and NURBS** and delete their repeated lifecycle code, keeping NURBS's rebuild on replacement and Blossom's knot synchronization (S1, S4, S5).

## Verification

Focused `just unit` paths from the spec's scene-ownership row, `just typecheck`, `just lint`, `just build`, then `just check`. Smoke: full workspace/lesson-runtime checklist including the Blossom and NURBS routes. Engineering review of the diff.
