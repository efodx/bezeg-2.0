# Analysis guided lessons — Batch A tasks

**Source spec:** [Analysis guided lessons and complex multiplication](../../specs/analysis-guided-lessons.md)

**Scope of this breakdown:** Batch A only (intermediate value theorem and bisection, mean value theorem, accumulated integral and FTC). Batches B and C get their own task files when Batch A is released.

| Task | Depends on | Status |
| --- | --- | --- |
| [00 Analysis family and iterative playback](00-family-and-playback.md) | — | not started |
| [01 Intermediate value theorem and bisection](01-bisection.md) | 00 | not started |
| [02 Mean value theorem](02-mean-value-theorem.md) | 00 (family only) | not started |
| [03 Accumulated integral and FTC](03-accumulation.md) | 00 (family only) | not started |
| [04 Batch A release](04-batch-a-release.md) | 01–03 | not started |

## Ordering and delegation

- Task 00 changes shared runtime contracts (`src/learning/model.ts`, `LessonSession`, `GuidedLesson`, `LessonActionRegistry`, `src/demonstrations.ts`). One owner handles it before any topic encodes playback scenes.
- Within each topic, Part A (pure mathematics in `src/analysis/`, with tests) is independent of the other topics and can run in parallel. Part B (graph adapter) follows Part A. Part C (lesson content) follows the graph capability, as the spec requires.
- Shared integration files — `src/demonstrations.ts`, `src/Routes.tsx`, `src/localization/sl.ts` and `en.ts`, `src/learning/model.ts`, `src/learning/runtime/lessonCatalog.ts`, the preset collection registry, preview scripts, and `tests/guided-lessons.smoke.spec.cjs` — have one owner at a time. Parallel workers return the keys and registry entries they need instead of editing these files concurrently.
- Workers: Sonnet 5.5 at High reasoning for implementation and fixes (see [agent workflow](../../agent-workflow.md)). The main chat reviews, verifies, commits, and pushes.

## Release gating

The spec forbids exposing unimplemented Demonstrations, and pushing to `master` deploys. Therefore:

- Task 00 changes that are invisible to learners (action vocabulary, playback contract, an empty family that the catalogue does not render) may be pushed after review and verification.
- Topic commits that register routes, catalogue entries, previews, or lesson availability stay on the Batch A branch until task 04 passes, then reach `master` together as a fast-forward.

## Shared conventions

Follow the existing function demonstrations (`src/analysis/derivative.ts`, `derivativeModel.ts`, `src/graphs/functions/DerivativeGraph.tsx`, and their tests): pure mathematics without React, JSXGraph, or localization imports; a parsed and validated model; `commitModel` writes the synchronous model; lesson actions are declared through `lessonFunctionActions()` or a registry handler and reject unsupported names. Do not add graph-field mirrors of state.
