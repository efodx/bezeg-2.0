# Test consolidation handler handoff 1

- Branch `worktree-test-consolidation`, worktree `.claude/worktrees/test-consolidation`, based on `origin/master` `a2216c4`, rebased onto `b7a9dc8` (tooling-only; no src changes). Own `node_modules` from `npm ci` (no junction).
- Source: [spec](../../specs/test-consolidation.md), [work queue](../../tasks/test-consolidation/README.md), evidence in [coverage.md](../../tasks/test-consolidation/coverage.md).
- Invoked via `/implement docs/tasks/test-consolidation/README.md` (implement skill: tdd at agreed seams, typecheck and single files regularly, full suite once at the end, then the `code-review` skill, then commit).

## Accepted work

- `531ebe6` test: shared real-graph scene helpers in `src/graphs/base/realGraphScenes.ts`, behavior-preserving (typecheck, lint; `GraphTransientState.test.tsx` passed except three load-induced `subdivision` timeouts that pass alone).
- Baseline browser run 1 and the 45-row exit-hook inventory, recorded in coverage.md.

- `1653fbb` task 5: all six exclusions were harness artifacts in `boardSignature`; the filter is removed and the contract passes unfiltered (369 passed). The disposition and gaps are in coverage.md. Worker worktree `.claude/worktrees/agent-a3ffd2e075748943f` (uncommitted copy of the same change) can be discarded; it has its own `node_modules` from `npm ci`, not a junction.

## Remaining steps, in order

1. (Done: task 5 integrated, so no browser row needs retaining on its account.)
2. Task 1 session contract, new file `src/learning/runtime/lessonRestoration.test.tsx` (planned design): for each `GUIDED_LESSON_AVAILABLE_IDS` id, mount `graphFactories[id]()`, `changeScene(mounted, 'a')`, capture `full(mounted)` plus resources (`board.objectsList.length`, `Object.keys(JXG.boards).length` for child boards, animation driver `isRunning()`). Three rounds: `new LessonSession(getLessonForDemonstration(id), capabilities)`, each transition in its own `act` (start; for each frame `explore()`/`showContent()` on observation frames, `applyCurrentAction()` and `applyAnimation('play')` where the frame declares them; `next()` until the last frame; one `back()`/`next()` pair), assert the scene differs from the captured one, `close()`, compare unfiltered, resources equal. Then continued interaction: twin graph with `changeScene('a')`, same `flipSwitches` + `sceneActions('b')` on both, compare. Separate cases: completion keeps the final scene (next past last frame, then close, equals pre-completion scene and differs from captured); unmounted graph close is a no-op without errors. Faults required: temporarily skip `restoreState` in `LessonSession.close` and leak a board object in a scene action; record failures, revert.
3. Browser: restrict the per-row `en: Exit…` template to a documented sample by implementation (function: linear-function; curve reconstruction: repeated-subdivision; rational standard form/effective weights: farin; spline auxiliary: spline-c1; PH child board: ph-cubic needs a real user-state hook added; animation/playback: decasteljau-alternative and bisection; check the rationale for each against actual implementations before fixing the list). Map each removed row's hooks to the contract (inventory table), delete dead hooks, keep English coverage through the narrow walk. Update `lessonSmokeCoverage.test.ts` only if row organization changes.
4. Tasks 2, 3 (serial, same file), task 4 (separable worker: `tests/standalone-learning.smoke.spec.cjs`).
5. Repeat baseline timing at a quiet checkpoint; final full unit + browser run; smoke-tester on retained representatives; code-review skill; update `docs/smoke-tests.md`; do-log evaluation record; push per AGENTS.md.

## Checks and environment

- Browser runs: `just smoke-built --port 4517 --reporter=json`; summarize with a script that parses the JSON in the `.command-logs` file (counts, wall, summed, per-group). Do not run Vitest concurrently with timing runs: `GraphTransientState.test.tsx` times out under load.
- Bash quirks: commands that compute a program name in a variable or `cd` into the main repo are refused by worktree isolation; put scripts in files.

## Open decisions and risks

- The spec requires repeated timing and fault evidence before deletions; nothing is deleted yet.
- Settings: model Opus 5.5, permission mode auto; workers Sonnet 5.5 for implementation, Haiku 5.5 for inventory/research (Explore agents cannot write files; ask for inline output or use general-purpose).
