# Functions stream: handler handoff 29

Handler 29 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-03 at its 175k soft threshold. Stream file: `docs/tasks/feature-streams/functions.md`. Worktree `.claude/worktrees/stream-functions`, branch `stream-functions` (`origin/stream-functions` has diverged, never force-push it; WIP goes to `origin/stream-functions-h29`).

## Done this session (on master, `80453975..37a4922f`)

- **Fourier 05 F2a-2 accepted:** decay view review repairs (`7115fb8a`): `smooth` amplitudes from the closed form; kernel amplitudes below 1e-12 returned as exact 0 (`isZeroAmplitude` is `=== 0`); relative bound tolerance; sup help says nodes next to a jump are included; 12 px HTML labels; options held by another slot disabled (`ChoiceSelect` gained optional `disabled`); sup error incremental per grid node (Chebyshev recurrence). Measurement recorded in `05-batch-b.md`: N sweep p95 183 → 16,7 ms; drags 16,7 ms.
- **Fourier 05 F2b accepted:** route `/analysis/fourier-coefficients` (rebased `0e3b3a28`) plus review repair `f27f37dd` (scene-state check runs the model rules whenever any model field is present; import tests). Browser smoke 1920/390 px, SL/EN, Reset passed. Catalog count 99 after the curves stream's `prob-correlation` (`37a4922f`).
- **Deviation recorded** (`05-batch-b.md` F2a-2, stream row): the decay spectra sit stacked in the inspector (the app's slot for auxiliary plots), not side by side as spec §F4 says; a workspace slot below the board is a separate shell change for the owner. Open risk: the three board functions differ by colour only.

## In progress: F3 lesson (commit `414ac782`, local and `origin/stream-functions-h29`, not on master)

`src/learning/content/fourierCoefficientsGuidedLessons.ts` (14 steps: F2 `coef-*` ×7, F4 `decay-*` ×7) + test + registration (owner `fourier-series`/`fourier-idea`; `fourier-coefficients` stays in `CHAPTER_LINK_PENDING` until F4). Brief `briefs/fourier-05-f3.md`; worker note `worker-fourier-05-f3-handoff.md`. Checks at `414ac782`: tsc, `just unit src/learning src/demonstrations.test.ts src/graphs/functions/FourierCoefficientsGraph` passed.

- Engineering review: no blocking findings. Mutations observed failing: selection slot forced to `abs`, `fourier-scale` action removed. **Low:** removing the `fourier-harmonic = 1` pre-lowering (`fourierCoefficientsGuidedLessons.ts:49`) fails nothing (every scene uses K=16); add a scene/test with K below the previous k, or a comment that it is defensive.
- Math review: all quoted numbers recomputed and correct; theorems (Parseval cited, F4 forward only, M-test converse not claimed) fine; terms fine. **Minor prose repairs (SL and EN, Edit tool for LaTeX):**
  1. Step 13 (~l.366–369): the grid sup 0,9976 < 1, while on the open interval \(\sup|S_N-f|\ge1\); add that the grid misses the supremum approached next to the jump and mathematically it is at least 1.
  2. Step 5 (~l.263): "partial sum needs many terms near a jump (Gibbs)" mixes slow decay with Gibbs; say slow convergence, and separately the Gibbs overshoot (F3 lesson).
  3. Step 1 (~l.186): the explanation already prints \(b_1=0{,}98059\) before the prediction; move the value to the observation frame.
  4. Step 12 (~l.346): say all zero amplitudes (square even k and \(|x|\) even k) are not drawn on the log scale.

## Next, in order

1. Apply the 4 prose repairs and the harmonic-lowering test (handler or one small `bezeg-worker`), rerun the lesson units and `lessonMathNotation.test.ts`; then `just build` and `just smoke-lesson fourier-coefficients` (port 4320); browser check of the lesson in SL and EN. Record F3 in `05-batch-b.md` and the stream row, fetch, rebase onto `origin/master`, recheck, push to master.
2. F4 chapter section for `fourier-coefficients` in the `fourier-series` chapter (like task 04 F4, brief `fourier-04-f4.md`): move ownership to the new section and remove `fourier-coefficients` from `CHAPTER_LINK_PENDING`.
3. F5 card/media (poster stays in `POSTER_PENDING` for the owner's recapture), F6 batch gate like task 04 (`just check`, `just smoke-lesson` for the Fourier and neighbouring lessons, browser smoke SL/EN, hosted CI).
4. Then numerical methods N5.

## Open risks

- Heredocs in the Bash tool halve `\` and turn `\t` into a tab: edit LaTeX with the Edit tool; check `grep -c $'\t'` after scripted edits.
- Avoid repo-wide `grep -rn` over `docs/` (large JSON under `docs/reviews/bezier-patches`).
- `just preview` takes the port positionally (`just preview 4315`), not `--port`.
- Rebases: the curves stream keeps adding Demonstrations; route/catalog counts in `Routes.test.tsx` and `demonstrations.test.ts` (lines ~116, ~163) auto-merge to stale values — recheck counts after every rebase.
- Posters for `polynomial-zeros`, `rational-function`, `fourier-coefficients` stay in `POSTER_PENDING` for the owner's recapture.

## Settings to keep

Handler `--agent claude --model opus --permission-mode auto --effort medium`; self-watch `--until 175000` (owner override), successor launch at 215k or right after closing out at the soft threshold, and pass this rule on. Workers `bezeg-worker` Sonnet `medium`, 135k watcher each (lesson workers hit 135k at ~38 turns; keep briefs tight); reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` Sonnet `medium`. Ports 4315 (preview/smoke) and 4320 (`just smoke-lesson`).
