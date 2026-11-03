# Functions stream: handler handoff 32

Handler 32 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-03 after its 175k soft threshold. Stream file: `docs/tasks/feature-streams/functions.md`. Worktree `.claude/worktrees/stream-functions`, branch `stream-functions` (`origin/stream-functions` has diverged, never force-push it). Use `git log` for hashes after any rebase.

## Done this session (on master, `origin/master` at `1837597f` when pushed)

- **Numerical 07 F2a accepted** (`8ab99787` graph, `6db7371e` repairs): the ratio note says "approaches 2 as h shrinks" (SL "se približuje 2, ko se h manjša"); the exact end value uses `exactAt` (|y| ≤ 1000 bound); the steps readout counts steps taken; any path edit (example, step, initial point, end x) resets `revealed` to null; comments on unreachable edit issues and shared field arrays; tests for reveal reset, exact bound, resize cache key and unmount of points/captions. Mutations of the reveal reset and exact bound failed the new tests.
- **Numerical 07 F2b accepted** (`26a7bd74`, `fd5d206e`, `1837597f`): route `/analysis/euler-method`, Demonstration `euler-method`, Preset collection `euler` (its scene-state check accepts `revealed: null`), `lesson: false`, lesson parameters `euler-x0|y0|end`, choices `euler-example|step` (`EulerGraph.lesson.test.ts`). UI/a11y review (Sonnet): no blocking/should findings; SL status lines now "ne doseže končnega x". Smoke (Sonnet) on `b1114c8a`: 7/7 items at 1920 and 390, SL/EN, no console errors; zoom/pan keep one field at about 65 ms per wheel step. Not covered: touch, keyboard-only.
- **Posters:** joint selective capture of `euler-method` (window `[-1.2, 3, 2.6, 0.7]`) and the curves stream's `bspline-insertion` (a selective capture cannot leave another Demonstration pending). `POSTER_PENDING` now holds only curves' `bspline-extraction`; note in `docs/tasks/feature-streams/curves.md`. Capture flags: `PREVIEW_BASE_URL=http://127.0.0.1:4315/bezeg-2.0`, `PREVIEW_RECAPTURE_IDS=…`, `PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1`, `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1`; empty the ids from `POSTER_PENDING` before the run or publishing fails; the tree must match the served build.
- Checks before the last push: tsc, eslint, `just unit` over demonstrations/Routes/DemonstrationsPage/preview assets/learning/graphs functions/presets/localization (3463 tests at `a1782ed0` before the final rebase; conflicted tables rechecked after it), `just build`. `scripts/demonstration-preview-capture.test.cjs` fails only "real VP9 encoding … color metadata" (local FFmpeg lacks `bt709` tagging; independent of the posters).

## In progress

- **07 F3 + F4 (lesson N5 and chapter section)**: brief `briefs/numerical-07-f3f4.md`. The Sonnet worker hit its 135k budget and returned partial work; its note is `worker-numerical-07f3-handoff.md`. That work sits in the WIP commit on the local branch, which is also pushed as backup branch `origin/stream-functions-wip-32` and is **not on master**. tsc is clean on it. Only `EulerGraph.lesson.test.ts` was run (it passed); lint, the broad units and the node tests were not.
  - Done: `euler-exact` visibility target (`src/learning/model.ts`, `EulerGraph.tsx`, lesson test); `numericalEulerGuidedLesson.ts` with 7 scenes in SL and EN (field-predict with end x = x0 and the exact curve hidden; one-step h = 0.5 to end 0.5; polyline 2.25; halve-h 2.4414; error-ratios h = 0.125; initial point y0 = 2; explore); wiring (`numericalMethodsGuidedLessons.ts`, `numericalChapterRegistry.ts`, `guidedLessonOwnership.ts`, `demonstrations.ts` drops `lesson: false`, `guidedExamplePreviewCopy.ts`); chapter section `euler-method` in `numericalChapter.ts` and its test; count tables.
  - Remaining: the real-graph lesson test `numericalEulerGuidedLesson.test.ts` (every scene out of order and twice in one synchronous sequence, numbers recomputed with an own Euler loop); `numericalExpectedFor` and the capture route regex with node tests; the smoke row in `tests/guided-lessons.smoke.spec.cjs`; lint, broad units, mutations, lesson review, then the commit to master. Re-commit as proper feature commits; the WIP commit does not go to master as is.
  - **Check first:** the worker says the first \(y'=x-y\) ratio is 3.12, "not 2.29". 3.12 compares h = 1 with h = 0.5; the spec's 2.29 is 0.2358/0.1029 (h = 0.5 vs 0.25). Make the lesson quote the pair it shows. The worker quotes 4-digit errors (0.4683, 0.2769, 0.1525) to match the readout; this is fine. Step 1 with end x = x0 shows a polyline with no steps: check that it renders sensibly, or use another way to hide the polyline.

## Next, in order

1. Integrate and review F3/F4 (lesson review with mathematical check of every quoted number; run the brief's suggested mutations), commit, push.
2. F5: chapter card media and guided-example capture (`node scripts/generate-guided-example-inventory.cjs --chapter numerical-methods`, then `capture-guided-example-previews.cjs … --family numerical-methods`; pattern `bc786aad` for the quadrature card).
3. F6 Batch C gate: `just check`, `just smoke-lesson`, browser smoke SL/EN 1920/390 including 1920 zoom/pan frames on the real route (ADR 0037), CI green.

## Open risks

- Count tables (`demonstrations.test.ts` totals and family lengths, `Routes.test.tsx`, `DemonstrationsPage.test.tsx`, `familyChapters.test.ts`, `lessonCatalog.test.ts`, `guidedExamplePreviewCopy.test.ts`, `authoredChapterCoverage.test.ts`) conflict on rebases; totals can merge cleanly and still be wrong (both streams added one route: 102, not 101). Rerun them after every rebase.
- Never put `git stash` in a compound command; handler 32 stashed by accident and restored by SHA.
- Heredocs halve `\`; edit LaTeX with the Edit tool.
- Open deviation (owner): Fourier decay spectra stacked in the inspector, not side by side.

## Settings to keep

Handler `--agent claude --model opus --permission-mode auto --effort medium`; self-watch `--until 175000` (owner override), launch the successor at 215k or right after closing out at the soft threshold, and pass this rule on. Workers `bezeg-worker` Sonnet `medium`, 135k watcher each; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` Sonnet `medium`. Ports 4315 (preview/capture), 4320 (`just smoke-lesson`), 4330 (field perf harness).
