# Test consolidation handler handoff 4

- Branch `worktree-test-consolidation`, worktree `.claude/worktrees/test-consolidation`, own `node_modules`. `origin/master` is at `a878c17` (task 2, accepted). The branch carries one unaccepted commit on top, `2023c3a` (task 3 WIP), plus this note; both are pushed to `origin/worktree-test-consolidation`, not to master.
- Source: [spec](../../specs/test-consolidation.md), [work queue](../../tasks/test-consolidation/README.md), evidence in [coverage.md](../../tasks/test-consolidation/coverage.md) ("Task 2 shared interaction matrix", "Task 3 single content traversal"). Previous: [handoff 3](handler-handoff-3.md). Originally `/implement docs/tasks/test-consolidation/README.md`.

## Accepted work (handler 4)

- `a878c17` (handler, task 2): the per-row sl walk clicks Next with a real pointer on every frame. Its observation-frame unlock, ≥ 44 px tab, reopen-identity and hit-test checks moved to "Observation flow". `en: Exit` drops dialog focus and Escape (owned by `lesson-experience-checks`). The language-switch test now proves frame and `boardStats` survive. There is a new reduced-motion unit case in `GuidedLesson.test.tsx`. Faults A, B' and C are in coverage.md. Full guided spec: 130 passed.

## Task 3 state (not accepted)

- `2023c3a`: one traversal per lesson. The worker's version changed mode twice per frame. The handler's revision changes mode once per frame, alternating sl desktop and en 390 px. It adds an exact in-order frame check, explicit guard failure and math-block containment (the old page-width check could not see notation overflow), and a 15 s 390 px click timeout.
- Back-to-back A/B timing, run while the owner played a game (noisy), favors HEAD's two walks: 2044 s vs 2412 s summed (worker version), and 1885 s vs 2010 s (alternating version). So the task's "revisit if switching erases savings" condition is met.
- The alternating version fails arc-length step 5 frame 2 at 390 px: the view is framed when the scene is applied and does not refit after a shrink. This is an app finding; decide whether it is a defect.
- Next step: choose the direction, asking the owner if unclear. The recommended direction keeps the two navigations (sl desktop, en 390 px) and adds the new exact-order, guard and containment checks to both. The cheaper alternative to measure is a per-frame language toggle without resizing. Then redo faults (a)–(d) from coverage.md on the chosen form, run the full spec, and merge or replace `2023c3a` (do not push it to master as is).

## Remaining after task 3

Repeat baseline timing at a quiet checkpoint (no game; unit suite including the four `lessonRestoration.part*` files, plus browser). Then a final full unit and browser run, smoke-tester on retained representatives, the code-review skill, `docs/smoke-tests.md` (the three-scenarios-per-lesson rule is superseded only for accepted replacements), do-log records for handler 3's three workers (handoff 3) and handler 4's task 3 worker, and push.

## Worker records for do-log (handler 4)

- Task 3: `bezeg-worker` Sonnet 5.5 medium, handoff-v12, dispatched 2026-10-25T15:51:23Z, ~25 min, 42 tool uses, 62k tokens. It delivered a working implementation and faults (a)–(d). Its 3-row "−20 %" timing did not hold in full-suite A/B. It left one load failure (4 s click timeout), which the handler raised to 15 s. Not accepted: the approach is open.

## Checks and environment

- The build in `dist` comes from the clean app code at `a878c17` (test-only changes since). `smoke-built` refuses a stale build after any `src/` edit, so run `just build` first.
- The full guided spec on the alternating tree: 84 passed, 1 failed (arc-length, above). Machine load came from the owner's game; treat every timing from this handler as indicative only.
- Spec files are LF in the working copy. Bash heredocs collapse backslashes; write code with the Write/Edit tools.

## Settings

Handler Opus 5.5, permission mode auto; workers `bezeg-worker` Sonnet 5.5 medium (implementation), Haiku 5.5 (research, narrow smoke). The owner starts the successor manually.
