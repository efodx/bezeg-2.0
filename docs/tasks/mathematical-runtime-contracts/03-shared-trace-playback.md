# 3. Shared trace playback policy

Status: pending. Source: [specification, section 3](../../specs/mathematical-runtime-contracts.md#3-shared-trace-playback-policy), acceptance P1–P3 and shared verification. Dependency: task 2 accepted; serialize edits to its trace consumers.

## Scope and entry points

Start at `src/graphs/compgeo/HullTraceGraph.tsx`, `IntervalSweepGraph.tsx`, `traceLessonActions.ts` and the existing `IterationController` implementation/tests. Locate the controller rather than introducing another scheduler. Inventory the same policy in Bentley–Ottmann, monotone partition/triangulation, Delaunay and Fortune graphs, including their different cadence, input-change and export behavior.

## Work and completion

1. Record a behavior matrix for command dispatch, advancement/end, seek, input edits, named-step lesson actions, exports, replacement and disposal. Preserve differences supported by current callers and source contracts; duplication alone does not prove every policy is identical.
2. Prove a small composed policy with hull and interval graphs. Supply live index/run access and state commands; keep the index in `SceneStore`, scheduling in `IterationController`, mathematical decisions in the algorithms and lesson dispatch in its existing helper.
3. Migrate the remaining repeating trace graphs and remove their superseded choreography. Each graph retains only domain-specific configuration/commands and rendering integration. Preserve synchronous scene-action sequencing and existing controller cleanup/remount behavior.
4. Complete P1–P3 through the shared interface and real consumers. Verify a nonempty final result, rather than equality of empty/absent outputs, when comparing Next and Play.

## Verification and return

Use deterministic scheduler tests for completion, seek/replay/reset, refused/empty inputs and cancellation. Run real-host trace tests, relevant scene-content/restore contracts, typecheck, final unit suite, lint and build. Delegate production smoke for affected trace routes, exercising buttons and lesson actions, edits while playing, seek after completion, Preset/checkpoint restore, export and navigation/remount. Keep concurrent browser ports and builds owned explicitly.

Return the behavior matrix and any deliberate policy differences, removed per-graph duplication, Next/Play evidence, disposal checks, exact revision/results and coverage gaps.
