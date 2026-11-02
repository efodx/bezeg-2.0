# Brief handoff-v12 — mutation evidence, triangulation 09

- **Role:** test verification; may edit source files only temporarily (every mutation reverted before the next one and before returning). Worktree `C:\Users\NonFriedMotherBoard\IdeaProjects\bezeg\.claude\worktrees\stream-geometry`; uncommitted diff on `dc899f60` is the work under test — preserve it exactly. Do not commit, do not run `just build`, do not delegate.
- **Goal:** Acceptance 4 of [docs/tasks/triangulation-voronoi/09-ear-clipping-lesson.md](../../../tasks/triangulation-voronoi/09-ear-clipping-lesson.md) requires an observed failure under a deliberate mutation for each new assertion. Cover the new tests in `src/graphs/compgeo/EarClippingLessonActions.host.test.tsx`, `src/learning/content/compgeoEarClippingLesson.test.ts`, and the changed parts of `src/learning/content/compgeoGuidedLessons.test.ts`, `src/learning/runtime/lessonCatalog.test.ts`.
- **Mutations (minimum; add one per remaining uncovered test):**
  1. `set-trace-step` clamp removed / `'end'` mapped to last−1 (`src/graphs/compgeo/EarClippingGraph.tsx`, `setTraceStep`).
  2. Edit action no longer returns to step 0, or `set-overlay` resets the step.
  3. `algorithm-trace` `next-step` bypasses the button transition (e.g. advances two steps).
  4. Base `PointSetGraph` accepts `set-trace-step` (no throw); `HullTraceGraph` accepts one new overlay name.
  5. Scheduler callback not cancelled on Back/scene change/unmount.
  6. A lesson scene value changed (e.g. comb scene loads a 9-vertex polygon, or the guards scene sets step 0 instead of `'end'`), and one quoted readout changed in the SL text.
  7. `lessonCatalog.ts` stops rejecting a non-finite `step`.
  Before mutating, run the two new test files clean once.
- **Checks:** per mutation, run only the affected test file(s) with `just unit <path>` (or `npx vitest run <path>`), log to `docs/reviews/feature-streams/geometry/t09-mut<N>.log`, record failing test names, revert, and confirm `git diff --stat` matches the starting stat (save it first to `t09-mut-start.stat`). Finish with one clean run of the four test files to `t09-mut-final.log`.
- **Return:** ≤250 words: table mutation → file:line → failing test name(s); any new test that no mutation made fail (name it — that is a finding); confirmation that the tree matches the start stat.
- **Budget:** read ≤150 lines per call, `grep -n` to locate, quote `file:line`, logs to files. On `HANDOFF` or past ~30 turns, revert any live mutation, write `t09-mut-handoff.md`, return partial.
