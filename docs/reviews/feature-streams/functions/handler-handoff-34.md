# Functions stream: handler handoff 34

Handler 34 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-03 after its 175k soft threshold. Stream file: `docs/tasks/feature-streams/functions.md`. Worktree `.claude/worktrees/stream-functions`, branch `stream-functions`. `origin/stream-functions` has diverged, so never force-push it; push to `master` only.

## Done this session

- **Numerical methods 07 Batch C released.** F3/F4 (`32dec87f`), F5 card (`11d53347`), count fix (`c31888b9`), docs (`cfb55afd`, `bfdba64d`, `70efe184`), all on master. `just check` passed on `cfb55afd`. `just smoke-lesson euler-method` passed 2/2. Browser smoke (Sonnet) passed SL/EN at 1920 and 390, including zoom and pan. Hosted CI run 41644682121 is green, including deploy.
  - The handoff-33 preview test failure was a stale `node_modules/.vitest-cache` (documented in `docs/commands.md:18`), not code. If an `import.meta.glob` test misses a new PNG, delete that folder.
  - Rebases conflicted twice on the pending/lesson lists and the count tables. Both sides had bumped the same totals to the same number, so I set them to the true values: coverage 115, preview copy 101/108.
  - Commit `11d53347` keeps its WIP message ("preview resolver test still red"). The auto-mode classifier blocked an amend; `c31888b9` records that the test is green.
- **School function graphs 07 F2a-1 (S5 `GeometricSeriesGraph`) accepted.** It is commit `10b38dc5` (rebased on `752a07ad`). Details and F2b/F3 follow-ups are in `docs/tasks/school-function-graphs/07-batch-c.md`. Engineering and math reviews (Sonnet) found nothing blocking, and all repairs are applied. tsc and lint are clean, and the scoped units pass (4057). Mutations were observed failing.
  - **Push state:** `just check` passed on `10b38dc5` (868 s), and it is pushed to master with this note.

## Next, in order

1. Confirm the hosted CI run for the push is green (`just ci`).
2. School 07 **F2a-2**: the S6 conic focal view, drawn from the definition (focus, directrix, ε), with the rational Bézier overlay and the max-deviation readout. ε = 1 must be exactly reachable on the slider. Kernel: `src/analysis/conic.ts` (task 04). Spec: S6 in `docs/specs/school-function-graphs-lessons.md` (~line 117). Delegate to `bezeg-worker` (Sonnet), then run engineering and math reviews.
3. School 07 F2b (routes for S5 and S6, remove `geometric-series` from `PENDING_ROUTE_KEYS`, browser check of the caption overlap and playback timing), then F3 lessons S5 and S6, F4, F5 and the F6 gate (S6 bridge verified against the rational Bézier chapter).
4. Fourier 06 Batch C (epicycles) starts with a measurement and an ADR (`docs/tasks/fourier-series/06-batch-c.md`).

## Open risks

- Count tables and pending lists conflict on almost every rebase, because the curves and geometry streams push often. Resolve by keeping both sides, then rerun `authoredChapterCoverage`, `guidedExamplePreviewCopy`, `lessonCatalog`, `familyChapters` and `lessonMathNotation` tests.
- From handoff 32, still open: the owner deviation on the Fourier spectra layout.
- Card `alt` text keeps `\(...\)` delimiters in every numerical card (existing convention). A screen reader may read them.

## Settings to keep

Handler `--agent claude --model opus --permission-mode auto --effort medium`. Self-watch `--until 175000` (owner override). At 215k, or right after closing out at the soft threshold, launch the successor with `claude --bg` and pass this rule on. Workers: `bezeg-worker`, Sonnet, `medium`, each with a 135k watcher. Reviews: `bezeg-reviewer`, Sonnet. Smoke: `bezeg-smoke`, Sonnet, `medium`. Ports: 4315 (preview/capture), 4320 (`just smoke-lesson`), 4330 (field perf harness).
