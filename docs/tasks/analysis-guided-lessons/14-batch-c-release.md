# 14. Batch C release

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md), Batch-wide acceptance gate

**Dependencies:** [10](10-sequence-convergence.md), [11](11-uniform-convergence.md), [12](12-fixed-point-iteration.md), [13](13-complex-multiplication.md)

**Status:** not started

## Steps

1. Register the routes in `src/Routes.tsx`. Add catalogue entries in `src/demonstrations.ts`: three under Analysis and complex multiplication under Foundations (`basics`). Register the preset collections and add the four ids to `GUIDED_LESSON_AVAILABLE_IDS`. Update the count assertions.
2. Capture static previews from a production build: `vite preview` on port 3012, then `scripts/capture-demonstration-previews.cjs`. Restore the unrelated PNGs the script rewrites, and merge the manifest for the four new ids only.
3. Update the capability documentation and `docs/current-architecture.md` where ownership changes. Correct ADR 0011 ("eleven topics" becomes ten in Analysis, with complex multiplication in Foundations). Update the spec status and this task list.
4. Review the integrated diff with parallel reviewers for mathematical correctness, engineering constraints, and UI/accessibility.
5. Verify:
   - TypeScript, unit and content tests (including `lessonMathNotation.test.ts`), and the production build.
   - The full production smoke suite, because the catalogue changed.
   - A scripted browser pass over the four routes: desktop (1440 px) and narrow (390 px, touch context), drag, keyboard, reveals, iterative playback, and a live SL/EN switch.
   - Board screenshots of every example, checking for caption and label collisions.
   - Lesson frames at 390 px, checked for overflow with a margin. Hosted CI on Linux Chromium renders formulas wider than Windows. Split long inline `=` chains in prose, never in `*Latex` fields.
6. Fetch, rebase only the Batch C commits onto `origin/master`, recheck, and push as a fast-forward. Stop and report on rebase conflicts.
