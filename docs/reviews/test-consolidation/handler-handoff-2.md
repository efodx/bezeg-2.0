# Test consolidation handler handoff 2

- Branch `worktree-test-consolidation`, worktree `.claude/worktrees/test-consolidation`, own `node_modules`. `origin/master` is at `9a490d3` (this branch rebased onto `e16ad82`, tooling only).
- Source: [spec](../../specs/test-consolidation.md), [work queue](../../tasks/test-consolidation/README.md), evidence in [coverage.md](../../tasks/test-consolidation/coverage.md) ("Task 1 progress"). Previous note: [handoff 1](handler-handoff-1.md).
- Originally `/implement docs/tasks/test-consolidation/README.md`.

## Accepted work (pushed)

- `5ebb45e` task 1 unit contract: `src/learning/runtime/lessonRestorationContract.tsx`, run by `lessonRestoration.part1–4.test.tsx` (round-robin quarters of `GUIDED_LESSON_AVAILABLE_IDS`). 90 passed, 173 s wall / 652 s summed (4 files in parallel, idle). Three temporary faults recorded in coverage.md: omitted restore and leaked scene object detected; `close` without `stopAnimations` not detectable (graph restore and `next` already stop playback).
- `9277b72`, `9a490d3` docs: evidence and status.

## Remaining steps, in order

1. Step 3 (browser sample), decisions already checked against implementations:
   - Run the `en: Exit…` template (`tests/guided-lessons.smoke.spec.cjs` ~line 2190, inside `for (const row of LESSONS)`) only for: linear-function (function Preset model), repeated-subdivision (curve reconstruction, follow-up Subdivide), farin (standard form, effective weights), spline-c1 (derived/auxiliary points), ph-cubic (hodograph child board), decasteljau (lesson-driven `lessonAnimation`; chosen over decasteljau-alternative, whose `DecasteljauGraph2` driver is user-driven and covered by the unit contract), bisection (iteration-controller playback, shared with sequence/fixed-point). Shared exit-dialog checks (Continue focus, Escape) stay on these rows.
   - ph-cubic needs a real user-state hook: edit hodograph `w1` through the keyboard coordinate editor (open the `point_coordinates_keyboard_editing` summary, input `aria-label="w1 x"`, submit `apply_coordinates`), assert the lesson fixture (`hodographs [[2,0],[2,1]]`) replaces it at the exit step, restored after Exit; stable count of the `#hodograph-input-box` board's objects across re-entry rounds.
   - Then delete hooks made dead on the other 38 rows (`prepareUserState`, `duringLesson`, `assertUserState`, `stableCounts`, `assertBaseline`, `reentryStep`, `exitStep`) and helpers used only by them; keep `setup`/`stepProbe`. Update the spec header comment. Map each removed row's hooks to the contract in coverage.md (inventory table rows → `full()`/resources/twin). This deletion is a separable worker slice (`bezeg-worker`, Sonnet 5.5 medium, brief handoff-v12); the sample and the PH hook stay with the handler.
   - Verify: `just smoke-built --port 4517 --reporter=json` on the guided-lesson file after `just build`; confirm the 7 sampled rows pass and the narrow `en` walk still runs for all 45 rows.
2. Tasks 2, 3 (serial, same smoke file), task 4 (separable worker: `tests/standalone-learning.smoke.spec.cjs`).
3. Repeat baseline timing at a quiet checkpoint (unit suite including the four part files, plus browser); final full unit and browser run; smoke-tester on retained representatives; code-review skill; update `docs/smoke-tests.md`; do-log record; push.

## Checks and environment

- Unit contract: `just unit src/learning/runtime/lessonRestoration.part` (about 170 s). Do not time browser runs while Vitest runs; the contract and `GraphTransientState.test.tsx` are load-sensitive (the slowest contract test, `circle`, takes 45 s under 4-way load; limit 120 s).
- Vitest console output is suppressed in this setup; diagnostics must write to a file. Heredoc Python loses backslashes (`'\n'`); use `String.fromCharCode(10)` or the Edit tool.

## Open decisions and risks

- Unit-suite growth: about 650 s summed is added against about 1245 s of browser `en: Exit` rows to be removed; confirm the net at the final timing.
- No deletions in browser specs yet.
- Settings: handler Opus 5.5, permission mode auto; workers `bezeg-worker` Sonnet 5.5 for implementation, Haiku 5.5 for research/narrow smoke. Handler self-watch: `python tools/agent-usage/claude_worker_watch.py --self --until 150000`.
