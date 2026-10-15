# 4. Batch A release

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md) — Batch-wide acceptance gate

**Dependencies:** [01](01-bisection.md), [02](02-mean-value-theorem.md), [03](03-accumulation.md)

**Status:** not started

## Goal

Expose the three Batch A Demonstrations and lessons together, then publish.

## Steps

1. Register the routes in `src/Routes.tsx`, catalogue entries in `src/demonstrations.ts` under the Analysis family, preset collections, and the three IDs in `GUIDED_LESSON_AVAILABLE_IDS`; update count assertions.
2. Generate static previews with `scripts/generate-demonstration-previews.cjs` and `scripts/capture-demonstration-previews.cjs`; confirm that no unrelated preview changes.
3. Update capability documentation, `docs/current-architecture.md` ownership notes for the iteration controller, and this task list.
4. Review the integrated diff with parallel reviewers for mathematical correctness, engineering constraints, and UI/accessibility.
5. Verify: TypeScript, unit and content tests (including `lessonMathNotation.test.ts`), production build, the full browser checklist (the catalogue and lesson runtime changed) on desktop/projection, a narrow viewport, keyboard, and essential touch alternatives, in Slovenian and English with a live language switch.
6. Fetch, rebase only the Batch A commits onto `origin/master`, recheck, and push as a fast-forward. Stop and report on rebase conflicts.
