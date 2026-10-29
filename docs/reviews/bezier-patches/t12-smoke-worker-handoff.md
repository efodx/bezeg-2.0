# Task 12 smoke worker handoff

Worker stopped at the bounded-turn limit before receiving the handler's final Playwright result.

## State

- Checkout: `.claude/worktrees/bezier-patches-r2`, branch `worktree-bezier-patches-r2`, HEAD `b3c80f6`.
- Worker edits: `tests/unified-learning.smoke.spec.cjs` adds the nine-family inventory assertion and patch chapter acceptance checks; `docs/reviews/bezier-patches/t12-codex-chapter-smoke.md` records the acceptance scope and pending result.
- Pre-existing untracked `.claude/scratch/` and `docs/reviews/bezier-patches/t12-source-ci.md` remain untouched.
- Handler-confirmed preview: production build at `http://127.0.0.1:4391/bezeg-2.0/`, HTTP 200, title `Bezeg`; do not stop it.
- The handler said it would execute `just smoke-built tests/unified-learning.smoke.spec.cjs --port 4392 --workers=1` outside the sandbox. No result reached the worker. The worker's ad-hoc Playwright attempt inside the sandbox could not launch Chromium because the sandbox-specific browser executable is absent; it created no process and made no app changes. No worker-owned processes remain.

## Needed to finish

1. Obtain the handler's focused smoke-run output and elapsed time. If it did not execute, rerun the stated command outside the sandbox against port 4392.
2. Update `t12-codex-chapter-smoke.md` with the actual result, viewport, runtime-error status, and any failures/skips.
3. Keep patch-specific activity return/focus marked as a task 13 integration gap: static inspection of `src/learning/FamilyChapterPage.tsx` shows the current renderer does not render `demonstrationIds` or `investigationPrompts`; authored scenes/examples/figures remain task 13 scope.

The stale pre-fix count has exact CI evidence: run `40840496778`, head `27330ef`, failure at `unified-learning.smoke.spec.cjs:10` (expected 8 family cards, rendered 9). The test now derives the expected count and order from an explicit nine-ID inventory; `bezier-patches` is after `parametrization` in `familyChapters.ts`.
