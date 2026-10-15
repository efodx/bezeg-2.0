# 4. Batch A release

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md) — Batch-wide acceptance gate

**Dependencies:** [01](01-bisection.md), [02](02-mean-value-theorem.md), [03](03-accumulation.md)

**Status:** released 2026-10-15 (pushed to master)

## Goal

Expose the three Batch A Demonstrations and lessons together, then publish.

## Steps

Release (2026-10-15): routes, catalogue entries, preset collections, allowlist ids and counts (37 routes); real previews captured and checked; capabilities and architecture documents updated; parallel mathematics, engineering and UI/accessibility reviews run and their findings fixed; production smoke suite run (151/154 rows initially, the three failures traced to a label-visibility bug, a long lesson formula at 390 px and a wrong smoke expectation, all fixed and the affected rows rerun green, the full 154-row suite was not rerun after the fixes). Known limits: no physical touch device or projector, GitHub Pages hosting not exercised locally, the "a" label of the accumulation preview touches a tick label, and the label crowding on the narrow mean-value board is not addressed.

1. Register the routes in `src/Routes.tsx`, catalogue entries in `src/demonstrations.ts` under the Analysis family, preset collections, and the three IDs in `GUIDED_LESSON_AVAILABLE_IDS`; update count assertions.
2. Generate static previews with `scripts/generate-demonstration-previews.cjs` and `scripts/capture-demonstration-previews.cjs`; confirm that no unrelated preview changes.
3. Update capability documentation, `docs/current-architecture.md` ownership notes for the iteration controller, and this task list.
4. Review the integrated diff with parallel reviewers for mathematical correctness, engineering constraints, and UI/accessibility.
5. Verify: TypeScript, unit and content tests (including `lessonMathNotation.test.ts`), production build, the full browser checklist (the catalogue and lesson runtime changed) on desktop/projection, a narrow viewport, keyboard, and essential touch alternatives, in Slovenian and English with a live language switch.
6. Fetch, rebase only the Batch A commits onto `origin/master`, recheck, and push as a fast-forward. Stop and report on rebase conflicts.
