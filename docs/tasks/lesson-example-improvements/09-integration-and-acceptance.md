# 09. Integrate and accept the example improvements

**Source spec:** [Acceptance and delivery](../../specs/lesson-example-improvements.md#acceptance-criteria)

**Status:** planned. **Dependencies:** 00–08. **Owner:** main handler.

## Work

1. Reconcile the task index with `GUIDED_LESSON_AVAILABLE_IDS` in `src/learning/runtime/lessonCatalog.ts`. Account for all 45 reviewed IDs exactly once; explicitly disposition any IDs added or removed since the review.
2. Review each task's concrete scenes, calculations, bilingual copy, retained cases, and evidence. Close shared-interface, ownership, cache, label, or narrative inconsistencies. Verify the Bézier chapter's affected activities/prose agree with actual scenes.
3. Record which demonstration defaults, Reset behavior, previews, or other documented capabilities changed. Update only the relevant architecture/capability guidance; record any consequential decision with genuine alternatives in an ADR. Preserve unrelated checkout work.
4. Obtain parallel mathematical and engineering reviews for large/geometry diffs and UI/accessibility review where visuals or controls changed. Assign findings to owners and verify their resolution.
5. Verify from a stable checkout/build with a named preview owner. Complete the shared runtime checklist if task 00 changed runtime behavior, plus changed-scene and retention coverage. Check graph/control agreement after Back/Next, instruction hide/reopen, Reset, language switch, preset restore, and exit/re-entry; verify animations stay under learner control.
6. Update task status and write a concise final acceptance record under `docs/reviews/lesson-example-improvements/`, linking numerical evidence, commands, screenshots, revision/dirty state, findings/dispositions, and remaining gaps. Do not claim classroom validation from screenshots or source tests.

## Acceptance and checks

- Every criterion in the source spec has observed evidence or an explicit unmet disposition; incomplete required checks mean partial acceptance.
- Run `just --list`, appropriate focused checks, the notation test, `npx tsc --noEmit --pretty false`, the full unit suite, and the production build at the final integrated checkpoint. Use provenance-validated builds for browser checks per the command guide.
- Each lesson retains a smoke row in `tests/guided-lessons.smoke.spec.cjs`; update affected rows and add meaningful scene assertions where coverage is missing. Use `$smoke-tester` and the browser checklist, reporting missing tooling or incomplete coverage.
- The published task index clearly distinguishes planned, implemented, and accepted work and links completed evidence. Commit bounded verified changes and publish under the repository's normal fetch/rebase/fast-forward rules; do not bundle unrelated work.
