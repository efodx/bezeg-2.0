# Contracts handler handoff 4

Written 2026-11-07 at `BUDGET SOFT`. Read this and the [handler card](../../../agent-workflow/handler-card.md), then continue. Same worktree (`.claude/worktrees/stream-contracts`), branch `worktree-stream-contracts`, port 4318. Launch line, which you pass on and use for your own successor: `claude --bg -n "contracts handler <n>" --agent bezeg-handler --model opus --permission-mode auto --effort medium "<prompt>"`. Keep card routing and at most two workers.

## Done since handoff 3

- **Task 4 accepted.** The final commit `f8dfbe85` leaves the store holding only `{initialized, model}`. The 21 test readers were flat shape reads with unchanged values. Checks:
  - The `=all` suite: 12,060 tests, 0 failed. The 9 above 12,051 are input tests from master.
  - Hosted CI green for `a085c210` and `f8dfbe85`.
  - The full checklist through `bezeg-smoke` passed, with flat exported Presets. Gaps: no draggable point on bisection or fixed point; export round trip on linear only.
  - Interleaved drag/slider baselines recorded (`7c7aa7ee`, [results](../../../bezier-performance-results.md#live-function-model-in-the-store--2026-11-07)). Acceptance in `d5ba1154`, with the evaluation entry.
- **Step 4 (lesson-authoring workstream 2):** task file [02-lesson-lookup.md](../../../tasks/lesson-authoring-architecture/02-lesson-lookup.md) is in `2e76896d`. Slice 1 (`ff4d4e96`) holds the characterization tests and the L1 isolation harness, with eight `test.fails` observed failing on the old code (`.claude/jobs/lookup-s1-fail.log`).

## Done: slices 2 and 3 merged, committed and pushed

All twelve cyclic registries had the identical shape, so I migrated them in one go rather than piloting B-spline first. The changes:

- New `src/learning/content/catalogLessonAdapter.ts` holds the former `adaptContent` and its helpers, moved from `lessonCatalog.ts`, plus `adaptCatalogLesson` (cached). `lessonCatalog.ts` re-exports `patchFixture`, `sceneActions` and `view3dFixture`.
- New `src/learning/content/catalogSectionLessons.ts`: cheap `demonstrations` rows, `lesson(section)`, and `all()` for tests and export only.
- The twelve `*ChapterRegistry.ts` files export `<name>GuidedExampleLessons` built by the helper. Getters and runtime-catalog imports are gone.
- `chapterOwnedLessons.ts`:
  - `rows()` replaces `entries()`, and the thunk branch is gone.
  - It adds `chapterOwnerRows()` (the default-order index) and `chapterOwnedDemonstration()`.
  - `findChapterOwnedLessonByDemonstration` resolves only the selected row.
- `guidedLessonOwnership.ts` reads the rows.
- Mechanical updates: twelve chapter tests use `.all()`; `guidedExamplePreviews.test.ts` and the characterization test use `rows()` with the same expected values; `scripts/generate-guided-example-inventory.cjs` calls `all()` when present.
- The isolation `test.fails` are flipped to `test` and pass.

Checks: typecheck, lint, production build and the full `BEZEG_TRANSIENT_STATE=all` suite passed (`.claude/jobs/lk-all.log`).

## Next

1. Nothing pending from the core: it is on master (see `git log --oneline -3`).
2. Slice 4:
   - L2 integrity checks: duplicate owners, missing providers or sections, conflicting mappings, invalid order, with exact IDs.
   - L3 import-graph test: no transitive import from `src/learning/content/` into `runtime/lessonCatalog.ts`, seen failing on a deliberate back-import.
   - Check whether `guidedExamples.ts` still enumerates anything.
   - Update `docs/current-architecture.md` on lesson lookup.
   - An engineering review (Sonnet) of the integrated diff, then the full checklist through `bezeg-smoke`, as the task file lists.
3. Accept step 4 in `contracts.md`, the task file, and the spec's verification. Log the evaluation entry, noting the merged slices 2 and 3 and the reason. Then tell Controls (its step 9 consumes these identities) through the queue note.

## Open observations

- The worker found that `resolveGuidedExample('?explore=bezier-curves.bernstein-form.bernstein', 'bernstein')` returns undefined although the owner is accepted. It is pinned as current behaviour; decide whether it is intended.
- No Demonstration has `lesson: false` today, so the lessonless check is vacuous.
- The temporary perf worktree was removed; `git worktree prune` is harmless if a stale entry remains.

## Traps (carried)

- A `just unit` argument containing `/` drops to 2 workers. `just preview 4318` takes the port positionally.
- `sed -i` turns CRLF files into LF (harmless with `autocrlf`). Inline `node -e` regexes with backticks fail, so write a script file under `.claude/jobs/`.
- A `test.fails` passes on any failing assertion, so it guards nothing until flipped.
