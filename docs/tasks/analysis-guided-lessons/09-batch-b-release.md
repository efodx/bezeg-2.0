# 9. Batch B release

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md) — Batch-wide acceptance gate

**Dependencies:** [05](05-extrema.md), [06](06-convexity.md), [07](07-darboux.md), [08](08-taylor.md)

**Status:** not started

## Steps

1. Register the routes in `src/Routes.tsx`, catalogue entries in `src/demonstrations.ts` under the Analysis family, preset collections, and the four IDs in `GUIDED_LESSON_AVAILABLE_IDS`; update count assertions.
2. Generate static previews with `scripts/generate-demonstration-previews.cjs` and `scripts/capture-demonstration-previews.cjs`; confirm that no unrelated preview changes.
3. Update capability documentation, `docs/current-architecture.md` where ownership changes, the spec status, and this task list.
4. Review the integrated diff with parallel reviewers for mathematical correctness, engineering constraints, and UI/accessibility.
5. Verify: TypeScript, unit and content tests (including `lessonMathNotation.test.ts`), production build, browser checks of the four routes and lessons (catalogue changed, so the full checklist) on desktop/projection, a narrow viewport, keyboard, and essential touch alternatives, in Slovenian and English with a live language switch.
6. Fetch, rebase only the Batch B commits onto `origin/master`, recheck, and push as a fast-forward. Stop and report on rebase conflicts.
