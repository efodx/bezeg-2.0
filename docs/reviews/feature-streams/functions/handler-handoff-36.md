# Functions stream: handler handoff 36

Handler 36 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-05. It closed out at a clean boundary because the next slice, Fourier F2a, would cross the 175k soft threshold.

- Stream file: `docs/tasks/feature-streams/functions.md`.
- Worktree `.claude/worktrees/stream-functions`, branch `stream-functions`.
- `origin/stream-functions` has diverged, so never force-push it; push to `master` only, as a fast-forward.

## Done this session (all on master)

- **CI for handoff 35's push.** Run 41686081417 on `22a4d16d` was cancelled by newer pushes. Run 41687018411 on `4bc016c7`, which contains it, is green.
- **School function graphs 07 F3/F4/F5 Part B (S6 `conic-focal`).** Commit `7a65ebeb` (rebased from `a64b47fb`).
  - A seven-scene lesson, the chapter section after `geometric-series`, and the card.
  - Lesson actions `conic-weight`, `conic-bridge` and `conic-example`.
  - SL term repair: every "izsrednost" is now "numerična ekscentričnost", per the README term table and ADR 0026 §4.
  - The content/math review found a blocking error in the quarter-ellipse numerator; it is repaired with a test. Three more text repairs.
  - Details and deviations: `docs/tasks/school-function-graphs/07-batch-c.md`.
- **07 F6, the Batch C gate.** Commit `ccdb0f9a`.
  - `src/analysis/conicBridgeRational.test.ts` checks the S6 bridge against the rational curves chapter's `RationalBezierCurve` (17 cases, 1e-12).
  - `just check`, `just smoke-lesson`, and a browser smoke in SL/EN at 1920 and 390 (7/7, 0 console errors) passed.
  - CI run 41935910406 on `7a65ebeb` is green. Its deploy first failed on a transient OIDC "socket hang up" and passed on rerun.
  - **School function graphs Batch C is released.**
- **Fourier 06 Batch C step 1.** Commit `0be765a3`.
  - Measurement `scripts/epicycle-perf.cjs` with its harness, and the review `docs/reviews/fourier-series/06-epicycle-measurement.md`.
  - **ADR 0040**: the arm chain and all circles as two NaN-separated JSXGraph curves, with a 2000-sample trace and a fixed object set. Per-term objects fail on N changes.
  - Brief: `briefs/fourier-06-measure.md`.

## Next, in order

1. Confirm CI for `ccdb0f9a` and `0be765a3` (`just ci`).
2. **Fourier 06 F2a, the epicycle graph** (`docs/tasks/fourier-series/06-batch-c.md` step 2, on ADR 0040):
   - Write a brief like `briefs/fourier-05-f2a-*.md` and `numerical-07-f2a.md`.
   - Expect two workers, model then host, as for 05 F2a. The kernel is `src/analysis/closedSpline.ts` and `fourier.ts`.
   - ADR 0040 Consequences ask F2a to re-check control-point drags and the host's update cadence.
   - Then engineering and math reviews.
3. F2b–F6 as in task 04, with lesson F5.

## Open risks and nits

- S6: at 390 the lesson card covers the graph, as the shared lesson layout does. The conic is small at view top 20. The bridge's dash is hard to see where it lies on the ellipse. The ε thumb shows 1,65 for 5/3. A touch drag needs a short hold. All are recorded in 07 F6; none is blocking.
- Open nit from handoff 35: the S5 explore-scene test does not compare first n = 8 with the model.
- Count tables conflict on almost every rebase. Keep both sides and rerun the count tests (see handoff 35).
- After a new PNG, delete `node_modules/.vitest-cache` if `import.meta.glob` tests break.
- Bash heredocs and `sed` mangle doubled backslashes in lesson TS strings. Use Read/Edit, or the Write tool, for those lines.

## Settings to keep

- Handler: `--agent claude --model opus --permission-mode auto --effort medium`. Self-watch `--until 175000` (owner override). At 215k, or right after closing out at the soft threshold, launch the successor with `claude --bg` and pass this rule on.
- Workers: `bezeg-worker`, Sonnet, `medium`, each with a 135k watcher. Reviews: `bezeg-reviewer`, Sonnet. Smoke: `bezeg-smoke`, Sonnet, `medium`.
- Ports: 4315 (preview/capture), 4320 (`just smoke-lesson`), 4330 (perf harnesses). Logs: the job tmp dir.
