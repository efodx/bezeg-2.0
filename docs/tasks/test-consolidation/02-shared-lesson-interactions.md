# 2. Give shared lesson interactions one test owner

Status: implemented; matrix, mapping and fault evidence in [coverage.md](coverage.md) "Task 2 shared interaction matrix". Depends on task 1's coverage inventory. Source: [specification](../../specs/test-consolidation.md), acceptance 1, 3, 7–9.

## Scope and entry points

Own the shared browser matrix in `tests/guided-lessons.smoke.spec.cjs`, `tests/lesson-experience-checks.cjs` and `tests/lesson-graph-access.smoke.spec.cjs`, and focused gaps in `src/learning/runtime/GuidedLesson.test.tsx` / `LessonSession.test.ts`. Read the current overlay and guided-lesson contracts. Preserve compact-tab behavior from `lesson-overlay-minimize.md`; older external-control rules are superseded.

The per-frame desktop walk currently repeats Observe, graph unlock, tab target sizing, reopen identity and Next hit-testing. The English template repeats dialog and short Back behavior. Existing shared and graph-access blocks also cover related flows. Create an assertion inventory before consolidating: similar names do not prove identical coverage.

## Implementation and acceptance

- Assign transitions, confirmation/Escape, focus handoff/trap, keyboard navigation, locking, language switch and cancellation one shared test owner per distinct behavior. Prefer existing unit/component tests for exhaustive state combinations, retaining real-browser integration for layout, input and playback behavior.
- Select representative lessons by features actually exercised: observation with edits, animation/playback, long math, graph-label overlap, and relevant board integration. Cover reduced and non-reduced motion, keyboard and touch without multiplying every lesson by every mode.
- Retain complete representative forward/back walks, intermediate/last observation completion, minimize/reopen preserving edits/frame/reading position/board identity, exit rollback and completion retention. Verify content language switching without resetting the scene.
- Remove only mapped redundant interaction assertions from per-content walks. Keep the minimal actions needed to reach all content frames and keep frame progression/reachability assertions. Task 3 may then reduce traversal count.
- Demonstrate a temporary broken frame transition or reopen behavior fails the shared tests. Keep runtime-error handling, real pointer reachability and required access checks active.

## Verification and handoff

Run focused runtime/workspace tests, typecheck and build, then delegated smoke for the shared runtime checklist and feature matrix. Report the removed-to-replacement mapping and unexercised variants. Document matrix selection in the final smoke guidance. Do not claim a reduced total until integration measurements include unit time.
