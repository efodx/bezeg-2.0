# Functions stream: handler handoff 16

Handler 16 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-02 after the 150k soft threshold. `G-FN`, `G-REG` and `G-HL` are open. `Run state: active`.

## State

- **Worktree:** `.claude/worktrees/stream-functions`, branch `worktree-stream-functions`, at the handoff commit on `origin/master`. The `node_modules` junction points to the main install; delete it before removing the worktree. `origin/worktree-stream-functions` has old, diverged history: do not push there (never force). A leftover `origin/stream-functions-f3a-wip` (27f29bfd, superseded by master) may be deleted by the owner.
- **Pushed to `master` this session:**
  - `2c45bf1c` test: `src/Routes.test.tsx` counted 75 routes after the curves stream's `d3953bdf` added two (B-spline); this broke `just check` for every stream.
  - `e7efe05d` + `25bee242` projective 06 F3a: `projective` lesson-action kind (`load-example`, `move-handle`) on `CrossRatioGraph`, the seven-step K1 lesson in `src/learning/content/projectiveConicsGuidedLessons.ts`, registration (interim owner `rational-curves`/`worked-conic` until F4). The commit subject of `e7efe05d` still says "wip, unverified"; `25bee242` records the acceptance. Handler fix: SL "Natanko ena slika" became "Največ ena slika" (EN "At most one").
- **Checks on F3a (`47b1fcef`, then rechecked on `25bee242` after rebase):** `just typecheck`; focused units (`src/learning/content`, `runtime`, `chapter`, `LearningPage.test.tsx`, `src/graphs/projective`, `src/graphs/base/GraphTransientState*`, `demonstrations.test.ts`, `Routes.test.tsx`) passed; lint on touched files; `just build`; `just smoke-lesson projective-cross-ratio`. After the final rebase: typecheck and the F3a/registration tests passed. Worker mutation evidence: 5 mutations, 8 test failures (worker note `worker-projective-f3a-handoff.md`, committed).
- **F6 for numerical, school and Fourier (at `2c45bf1c`, clean):** `just check` stages all green (typecheck, lint, 7889 units with only the route count failing before the fix, which then passed; build). `just smoke-lesson root-finding function-transformation function-inverse fourier-series bisection trigonometric-functions uniform-convergence` passed (15 tests). Browser smoke (`bezeg-smoke`, scripts in the job tmp folder) passed in SL and EN with a live switch: the three Learn chapter pages and their cards (images load, captions switch, card links open their routes), the four new routes (a primary control changes the board; value and board persist across the switch), bisection, trigonometric and uniform-convergence unchanged; no console errors; chapter pages at 390 px without horizontal overflow. **Missing: a green hosted CI.** Runs on `0ba214a`, `2c45bf1c` and `70491e6` failed only on the inscribed-angle transient-state test, fixed by the maps stream in `62ad3616`; check CI on `62ad3616` or later (`just ci`), then record F6 accepted in the three family task files (`numerical-methods/05-batch-a-lessons.md`, `school-function-graphs/05-batch-a.md`, `fourier-series/04-batch-a-release.md`) and the stream table.

## Next, in order

1. Confirm hosted CI green on current master, then record the F6 acceptance above (docs only).
2. **Projective 06 F3b:** lesson K2 (Pascal) on `PascalGraph`. Write the brief from `briefs/projective-06-f3a.md` (projective action kind now exists in `src/learning/model.ts`; add `PascalGraph` operations to the same union and register in `projectiveConicsGuidedLessons.ts`; drop `lesson: false` for `projective-pascal`; remove it from `lessonCatalog.test.ts`'s no-lesson list; one smoke row). Then F3c (K3 pole/polar), then F4 chapter (moves the interim owner), F5 cards (chapter-owned mode), F6.
3. Point worker logs at the new job's tmp folder; update the brief's log path before dispatch (this session found the F3a brief pointing at an older job).

## Deferred items (low)

- Learn card image `alt` text contains raw LaTeX (screen readers read `\(f(x)=x^2-2\)`); about 25 card copies share the pattern, so fix it in the shared rendering (`ChapterExploration.tsx`, `LearningPage.tsx`) rather than per card.
- Smoke saw root-finding's Method switch (Newton to secant) leave the drawn paths unchanged on the default scene; the example and \(x_0\) controls change the board. Check whether this is expected for the default scene.
- Handoff 15's items still stand (Fourier \(S_1\) sampling is coarse; Fourier scenes cannot zoom; the uniform-convergence link is prose plus a `sources` entry).

## Settings to keep

Successor `--agent claude --model opus --permission-mode auto --effort medium`. Workers `bezeg-worker` Sonnet `medium` (the F3a worker reached 135k at about 60 turns; size K2 tighter or split actions from text); smoke `bezeg-smoke`; port 4315. Heavy checks with `BEZEG_MEMORY_FLOOR_GB=0.5`, in the foreground or polled; the system ran low on memory once this session and killed background jobs. For gates while a worker edits the stream worktree, use a separate detached worktree in the job tmp folder with a junction to the main `node_modules` (delete the junction before `git worktree remove`). Never force-push; push only `HEAD:master`, rechecking after the rebase before pushing.
