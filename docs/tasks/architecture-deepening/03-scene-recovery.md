# Verify and concentrate Lesson scene recovery

**Source spec:** [Architecture deepening, section 3](../../specs/architecture-deepening.md#3-lesson-scene-recovery)
**Status:** planned; task requested on 2026-10-20, implementation not started.
**Priority:** worth exploring; test first, after visit ownership settles.

## Goal

Establish caller-visible recovery behavior, then deepen shared mechanics only if the interface gives existing callers more leverage and improves locality. Preserve each graph adapter's ownership and the useful depth already present in both session modules.

## Scope and sequence

1. Read the source spec's six acceptance criteria and ADRs 0002, 0003 and 0013. Inspect `LessonSession.ts`, `ActivitySession.ts`, ordinary-return recovery in `useChapterActivity.ts`, the capability model and existing tests. Reassess after [visit ownership](01-chapter-activity-visit.md); do not edit the shared hook concurrently.
2. Add targeted tests for multiple synchronous actions: a later action reads an earlier state write, and a later failure rolls back an earlier mutation. Keep the sequence within one tick.
3. Establish intentional differences: lesson entry checkpoint versus activity last-valid-scene recovery, successful completion, empty/absent scenes, pause/stop, disposed graphs and rollback failure. Verify state and board ownership, not just call counts.
4. Apply the deletion test to proposed consolidation. Introduce a recovery seam only if at least two existing callers need the same mechanics and both become simpler; retain their distinct checkpoint policy. Do not build a generic transaction framework or graph-field mirrors.
5. If tests show that current modules already provide sufficient depth, retain them and record why consolidation was rejected. Targeted verification and a documented disposition can complete this task.

## Verification and completion

- Start with `just --list`; run focused `LessonSession`, chapter activity, scene-store and graph/control tests appropriate to the final change.
- Cover partial mutation, capture/restore failure, rollback failure, disposed graphs and synchronous dependent actions. Preserve Preset isolation and stopped/paused animation behavior.
- Apply the source spec's browser-verification rule if shared lesson runtime or interactions change. Test-only work does not require smoke tests; report coverage accurately.
- Record the chosen disposition, evidence and any remaining risk. Update architecture guidance only if ownership changes. Commit and push this task's verified work under AGENTS.md.

## Completion evidence

Pending. No shared recovery module is assumed necessary.
