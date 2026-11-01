# Curves stream: handler handoff 13

Handler 11 wrote this on 2026-11-01 at its 150k soft threshold. It supersedes [handoff 12](handler-handoff-12.md). No agents are running and no preview is running. Run state is `active`. Settings are unchanged from [handoff 8](handler-handoff-8.md): handler Opus, `--permission-mode auto`, `--effort medium`; workers `bezeg-worker` Sonnet `medium`; reviews `bezeg-reviewer` Sonnet.

## Accepted and on master

| Commit | Content | Evidence |
| --- | --- | --- |
| `41e1a36` | Curvature \(t\) slider: structured editing never rendered `getGraphCommands`, so the slider is now the first Edit group | Host test moves the slider and checks the board readout. It fails on the old code with "Unable to find … slider 'Parameter t'". Production browser check at 1366×768 in SL and EN: the slider is keyboard-operable, κ/R/φ at \(t=0{,}9\) match \(y=x^2\) at \(x=0{,}8\), and the live language switch keeps the slider. tsc, lint and build passed. |
| `2401652` | Fix of the master unit failures caused by our F2b (`2a6e9c4`). `FAMILY_CHAPTER_PENDING` in `LearningPage.test.tsx` lists `curve-geometry` and `interpolation`. `patch-coons` joins `CHAPTER_LINK_PENDING` in `familyChapters.test.ts`. A new assertion fails once a pending family has a chapter. | Both tests failed on master and pass after the fix. Hosted CI is green at `0950adb6`. **Each F4 chapter slice removes its entry.** |

## Not accepted: CG-B1-3 (L1, L2 lessons) on branch `stream-curves-cg-b1-3`

Commits `437f1bf` (lessons) and `d28fecc` (comment fix from review) sit on top of `0950adb6`. The local stream branch `worktree-stream-curves` holds the same commits. Start by rebasing them onto `origin/master`.

Evidence at `d28fecc`:
- The focused unit run (`src/learning src/demonstrations src/DemonstrationsPage src/graphs/curves/parametric src/graphs/curves/bezier/Curvature src/graphs/base/presets`) passed 81 files and 1425 tests.
- tsc passed and the build passed.
- Worker mutations each failed the intended test: roll stop disabled; quoted number edited; circle visibility handler no-op'd; `setCurvatureT` deferred.
- Engineering review (Sonnet) found no blocking defect.

**Smoke failures to fix before acceptance** (`SMOKE_PORT=4314 just smoke-lesson curve-parametric curve-curvature`, log `.command-logs/2026-11-01T13-47-51-351Z-96292-2e4e4960.log`):
1. `curve-parametric`, en 390×844: "visible board points outside the lesson view at 390 px" (`tests/guided-lessons.smoke.spec.cjs:1738`). Some step's view does not fit the parametric curve at narrow width. Compare `prepareLessonDefaultScene` with the per-step view, and the ear-clipping fix `e3c27e58` ("frame each … lesson scene on its polygon").
2. `curve-curvature`, sl walk: "curvature readout at Korak 2 od 7 · Okvir 2 od 2", `toBeVisible` with no element found. Either the row's `.JXGtext` readout probe is wrong (no existing row reads `.JXGtext`), or step 2 hides the readout. The screenshot is in `test-results-4314/guided-lessons.smoke-Lesso-ad539-*`.
- These rows passed: parametric sl walk and curvature en 390×844.

Review findings deferred, all low:
- The overlay visibility tests check only the state flags, not the visibility of JSXGraph elements. Add one test reading a real overlay element's `visible()`.
- The roll test never fires an animation frame, and nothing covers unmount or a language switch while rolling. Static review found the code correct.
- The parametric smoke probe `/8\b.*9[.,]4248/s` is weak.

Known display defect (pre-existing F2a, not fixed): the curvature board readout joins its lines with `\n`, which JSXGraph HTML text renders on one line. Seen in the production screenshot. Use `<br>` (or separate texts) in `CurvatureOverlay.readoutText` for display, and keep the tests' plaintext checks working. Fix it in the same slice as smoke failure 2, since both touch the readout.

## Next steps
1. Fix the two smoke failures and the readout line breaks in one worker slice on top of the branch. Re-run the two lesson rows in both languages (memory note: verify both languages, including the live switch). Then rebase onto `origin/master`, rerun the focused unit tests, push to master and mark CG-B1-3 done.
2. Remaining F3 lessons: interpolation I1, I3, I5 and D4 `patch-coons`. **Split per lesson:** one worker for L1 and L2 together hit its budget at 38 turns and 140k (partial), and a fresh worker from its note finished at 134k. The lesson-text claims are in handoffs 6 and 7, "Open items for registration".
3. Smoke gaps from handoff 12 step 3 still apply.
4. Gates are unchanged (handoff 12 step 4).

## Repo-wide notes
- Hosted CI poster rows (`demonstration-motion` and catalogue preview map) failed until other streams' posters landed. Curves posters wait for each family's F5. If those rows fail again for `curve-*`, `interp-*` or `patch-coons`, check whether `POSTER_PENDING` covers them in the smoke spec.
- Builds and unit runs queue on the single test slot behind other streams' `just check` (the build waited 699 s). The focused unit run took 735 s, so run it in the background and wait for the notification.
- The temporary worktree `$CLAUDE_JOB_DIR/tmp/push-wt` has a `node_modules` junction. Delete the junction before removing it.

## Evaluation record (not yet logged with `do-log`)
- Worker CG-B1-3a, Sonnet medium, dispatched 2026-11-01T12:36:49Z, brief handoff-v12: partial at the budget (168k total, 48 tools). Cause: slice too large (two lessons plus all wiring).
- Worker CG-B1-3b from the note: finished, 134k, 83 tools. Its check run showed the 2 master failures that `2401652` had already fixed.
- Reviewer, Sonnet: 60k, 3 low findings, 1 repaired by the handler.
- Handler: the curvature slider fix and the CI fix, handler-only.
