# Functions stream: handler handoff 12

Handler 12 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-02, after the 150k soft threshold. No workers are running. `G-FN` and `G-REG` are open. `Run state: active`.

## State

- **Worktree:** `.claude/worktrees/stream-functions`, branch `worktree-stream-functions`. The `node_modules` junction points to the main install; delete it before removing the worktree.
- **Pushed to `master` this session:** `3fd3771b` (S2 view repair) only. **F2b `3f9abc63` and this note are on `origin/worktree-stream-functions`, not on `master`:** the post-rebase check run was stopped by Claude Code under critical memory pressure (tsc finished with 0 errors; the unit run started no tests).
- **Accepted this session:**
  - **S2 view repair** `3fd3771b`. The x₀ range now depends on the restriction and the base: f(x₀) ≤ 8 (`INVERSE_VALUE_MAX`) and x₀ ≥ −3, cut inwards on the 0.1 grid (x²: [0, 2.8]; eˣ: [−3, 2]; a = 5: [−3, 1.2]; a = 0.2: [−1.2, 3]). The review's finding was wider than stated: x² at x₀ = 4 and eˣ at 3 also left the box. A base edit moves x₀ to the nearer end of the new range. The default box is [−4, 9, 11, −4]. A new host test on a sized board (`installBoardShims`) checks the sampled curves against f and f⁻¹ and both markers inside the view at every range end. Mutation (cap 1000, inverse curve swapped for the forward curve) failed 7 tests. Reviewed in the handler (small diff). `aria-pressed` was not added: the toggles change their label, so a pressed state would contradict it.
  - **F2b** `3f9abc63` (Sonnet worker, handler review). Routes `/bezeg-2.0/functions/transformations` and `/bezeg-2.0/functions/inverse` (Functions family, after the trigonometric functions, ADR 0026 §3) and `/bezeg-2.0/analysis/fourier-series` (Analysis, after uniform convergence: the spec's ADR 0011 registration). `lesson: false`, posters pending, preview recipes. Lesson actions: `transform-a/b/c/d/u`, `transform-base`, `reference` (ghost); `inverse-base`, `inverse-x0`, `inverse-restriction`, `tangent`, new `inverse-curve`; `fourier-n`, `fourier-x`, `fourier-epsilon`, `fourier-example`. `PENDING_ROUTE_KEYS` is gone. The handler changed the SL title of S1 to "Premiki, raztegnitve in zrcaljenja grafa" (term table words only). Rebase conflict in `lessonCatalog.test.ts` (both sides edited the no-lesson list) was resolved by keeping both.
- **Smoke** (Sonnet `bezeg-smoke`, production preview on 4315, revision 33aa2b3e plus the F2b diff, before the rebase): all three routes pass in SL and EN with a live switch and at 390×844; catalog cards in the right families open their routes; no console errors; N = 1001 redraw 27–32 ms headless. Screenshots were in the job's tmp folder (not kept).
- **Checks:** before the rebase (33aa2b3e plus the F2b diff): tsc 0 errors, `just unit src/graphs/functions src/graphs/base/presets src/localization src/learning src/demonstrations.test.ts src/Routes.test.tsx src/DemonstrationsPage.test.tsx` passed, `just build` passed. After the rebase onto `b213a37d` (curves and geometry commits touched `src/learning/model.ts` and the lesson catalog): tsc 0 errors only. The full unit suite and `just check` were **not** run.

## Next, in order

0. **Verify and push F2b:** on `3f9abc63` (plus this note), rerun the unit set and `just build` above (in the background; they took over 10 minutes together). If they pass, fetch, rebase onto `origin/master` and push `HEAD:master`. A failure in `lessonCatalog.test.ts` or `model.ts` unions after the rebase is a mechanical list merge.
1. **Numerical methods 05 F3a:** lessons N1 and N2 for `root-finding` and `bisection` per [05](../../../tasks/numerical-methods/05-batch-a-lessons.md) (one-shot lesson text; multi-action scenes tested in one synchronous sequence). Then F3b (N3), F4 chapter, F5 media, F6 gate.
2. **School function graphs 05 F3:** lessons S1 and S2, using the lesson actions above. Note: `inverse-x0` is valid only inside the current restriction/base range, so scenes set the restriction and base before x₀.
3. **Fourier 04 F3:** lessons F1 and F3 (theorem statements and citations per the spec).
4. **Projective 06 F3–F6.**
Lessons in 1–3 are independent families; run at most one or two lesson workers at a time.

## Deferred items (low)

- Fourier has no value-reset button (only the Preset tab's reset); decide in its F3 whether the lesson needs one.
- Smoke did not change the S1 `a` field or test pointer/touch drag on S1.
- Typing x₀ = 100 in S2 settles the field at 1,2 (existing `NumberInput` behaviour at its max), not a rejection hint.
- Handoff 11's deferred items still stand.

## Settings to keep

Successor `--agent claude --model opus --permission-mode auto --effort medium`. Workers and reviewers are `bezeg-worker`/`bezeg-reviewer`, Sonnet `medium`; smoke is `bezeg-smoke`; port 4315. Run heavy checks with `BEZEG_MEMORY_FLOOR_GB=0.5`; a combined unit + build run can exceed the 10-minute foreground limit, so run it in the background. To push while a worker holds the tree, cherry-pick onto `origin/master` in a temporary worktree with its own junction (delete the junction before `git worktree remove`).
