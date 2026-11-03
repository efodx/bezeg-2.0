# Functions stream: handler handoff 28

Handler 28 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-03 at its 175k soft threshold. Stream file: `docs/tasks/feature-streams/functions.md`. Worktree `.claude/worktrees/stream-functions`, branch `stream-functions` (`origin/stream-functions` has diverged, never force-push it).

## Done this session

- **School function graphs 06 F6 accepted** on hosted CI run 41584845703 (our own runs were cancelled by concurrency): all our jobs green; unit (2) failed only the curves stream's `GraphTransientState.part4` `prob-summary` test, so `smoke` (aggregate) failed and deploy was skipped. Not ours; report it to the owner if it persists. Recorded in `06-batch-b.md` and the stream file.
- **Fourier 05 F2a-1 accepted and on master** (`39217a5e`, `0d3be8f3`, `fca39858`): coefficients model, projection view, spectrum of a0/2, a_k, b_k; 32 model + 8 host tests, 7 mutations; engineering and math review repaired. Terms settled (spec terms table, `docs/localization.md`): *spekter koeficientov*, *Parsevalova identiteta / vsota*, *integral kvadrata* for (1/pi)∫f^2 (twice the mean of f^2; the spec's "mean square" corrected).
- **Fourier 05 F2a-2 committed locally, not on master** (`3e2ffec5`, decay view; also corrected the spec's a_10 = 2.2029e-6). Pushed with the F2b work to `origin/stream-functions-h28` only (see below).

## Next, in order

1. **F2a-2 review repairs** (before anything goes to master). Engineering/UI and math reviews of `3e2ffec5`:
   - *Math, must fix:* `smooth` amplitudes below the 1e-12 cut-off (true A_k ≈ 3e-13 at k=22, quadrature noise beyond k≈25: kernel 7e-16 vs true 8e-18 at k=30) are shown as exact zeros: table "0", linear zero marker "the amplitude is 0", log note "log 0 is not drawn" (`src/analysis/fourierDecay.ts:12,100`, `FourierDecaySpectra.tsx:26,101-103,114-115`). Expected: only exact zeros (square even k etc.) count as 0; for `smooth` use the closed form (2/sqrt3) r^k in the view, or show "< 10⁻¹²" without the zero key/note. Prefer the closed form for `smooth` (exact, no noise) and keep the kernel–formula agreement test.
   - *Math, minor:* the bound test's absolute +1e-9 tolerance is vacuous for `smooth` at k ≥ 15; use a relative tolerance. The sup-error help should say nodes next to a jump are included (sup does not decay for square/sawtooth/jump: 0.998, 3.13, 1.025 at N=11).
   - *UI, medium:* SVG tick/k labels `fontSize: 10` in a 240-wide viewBox render ≈8–10 px (`FourierDecaySpectra.tsx:~107-111`); make them ≥ 12 px on screen. Example selects offer options held by other slots and then reject (`FourierCoefficientsGraph.tsx:~170,~404`): disable those options (keep the model rejection) and note for lesson authors that a swap needs a free example.
   - *UI, low (open risk):* the three board functions differ by colour only (legend names exist).
   Repair via one `bezeg-worker`, then rerun `just unit src/analysis/fourier src/graphs/functions/FourierCoefficientsGraph`.
2. **F2b** (brief `briefs/fourier-05-f2b.md`): route `/bezeg-2.0/analysis/fourier-coefficients` and the K=16 drag measurement (`scripts/fourier-browser-perf.cjs`). Status at handoff: see the "F2b worker" section below.
3. Then record F2a-2/F2b in `docs/tasks/fourier-series/05-batch-b.md` and the stream file, fetch, rebase onto `origin/master`, recheck and push to master. Then F3 (lessons F2, F4), F4 chapter, F5 media, F6 like task 04; then numerical N5.

## F2b worker

Done, committed locally after `3e2ffec5` (brief `briefs/fourier-05-f2b.md`): route `/bezeg-2.0/analysis/fourier-coefficients`, id `fourier-coefficients`, after `fourier-series`, `lesson: false`, poster pending, preview recipe, count tests (98 routes), `familyChapters` `CHAPTER_LINK_PENDING`, no-lesson list. Outside the brief (accepted by handler): `functionPresetCollections.ts` got `fourierCoefficientsCollection()` with a `checkGraphState` using `checkFourierCoefficientsModel` (least-squares pattern), since array fields fail the flat scene-state rule. tsc, eslint, `just unit src/Routes src/demonstrations src/DemonstrationsPage src/graphs/base/presets src/learning src/graphs/functions`, `just build` passed (logs `C:/Users/1337Hacker/.claude/jobs/ca5fa4e4/tmp/f2b/`). Not reviewed by a reviewer yet; no browser smoke yet.

Measurement (`scripts/fourier-browser-perf.cjs`, production preview, headless 60 Hz, median of 3 runs): drags `abs` K=16 + overlay, K=32, `jump`, 1920 px: median 16.7 ms, p95 16.7–16.8, no frame over 25 ms. **Decay N sweep 1→101, log: median 16.7 ms but p95 183 ms (max 233), ~88 frames over 25 ms per run; one run crashed the page (`perf-1.log`, not reproduced).** Likely cause: the sup error on a 20001-point grid for three functions recomputed for every new N (≈6·10⁶ trig evaluations). Fix in the F2a-2 repair worker (e.g. evaluate S_N by an incremental sum per grid node, a coarser grid with the corner-refined maximum, or compute the sup lazily/debounced off the slider), then re-measure and record the threshold in `05-batch-b.md` F2a.

## Open risks

- Heredocs in the Bash tool halve `\` and turn `\t` into a tab: edit LaTeX in docs/lesson text with the Edit tool; check `grep -c $'\t'` after scripted edits.
- Avoid repo-wide `grep -rn` over `docs/` (large JSON under `docs/reviews/bezier-patches`); scope paths.
- Posters for `polynomial-zeros`, `rational-function` (and `fourier-coefficients` once registered) stay in `POSTER_PENDING` for the owner's recapture.

## Settings to keep

Handler `--agent claude --model opus --permission-mode auto --effort medium`; self-watch `--until 175000` (owner override), successor launch at 215k or right after closing out at the soft threshold, and pass this rule on. Workers `bezeg-worker` Sonnet `medium`, 135k watcher each; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` Sonnet `medium`. Ports 4315 (preview/smoke) and 4320 (`just smoke-lesson`).
