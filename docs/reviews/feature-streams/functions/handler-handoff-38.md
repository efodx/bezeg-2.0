# Functions stream: handler handoff 38

Handler 38 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-05, at the 175k soft threshold.

- Stream file: `docs/tasks/feature-streams/functions.md`. Task: `docs/tasks/fourier-series/06-batch-c.md`.
- Worktree `.claude/worktrees/stream-functions`, branch `stream-functions`.
- `origin/stream-functions` has diverged, so never force-push it; push to `master` only, as a fast-forward.

## State

- **On master:** F2b route `/bezeg-2.0/analysis/epicycles` and the owner's drag threshold (`28aff1eb`, `31b2a517`, `f73ec5f9`). CI run 41992047289 on `f73ec5f9` is green.
- **Local only, one commit on `stream-functions`, on top of this note:** F3 lesson F5 and the F4 chapter section, subject `feat: epicycles lesson and chapter section (Fourier series 06 F3, F4)`. **Do not push it before F5:** `src/learning/chapter/guidedExamplePreviews.test.ts:246` fails until the card exists. The lesson cannot be split from the section, because `?learn=1` redirects to a section that must own the lesson.

## Owner decision applied

Drags at any \(N\): p95 at most 50.1 ms, no frame over 100 ms; playback and \(N\) changes stay strict. See ADR 0040 "Drag threshold" and the measurement file "Re-measurement under the relaxed threshold". All seven cases met it.

Report these to the owner, all recorded in those files:

- The owner said "relax"; the values and the any-\(N\) scope are the handler's. Option 3 said high \(N\), but \(N=5\) also has frames over 25 ms, so the scope is every \(N\).
- Handoff 37's claim that \(N=5\) costs the same as 50 was wrong in the browser: 1 to 15 frames over 25 ms per run against about 145.
- Margin is thin: p95 at \(N=50\) moved between 33.4 and 50.0 ms across sessions with no code change.
- Playwright reached about 25 moves a second, not a real pointer's 60. Sustained dragging and the classroom device are unmeasured.

## Next, in order

1. **F5 card and poster.** Template: `docs/reviews/feature-streams/functions/briefs/fourier-05-f5.md` and commit `64fc22be`. New id `fourier-series.epicycles.epicycles`, first frame scene `epi-loop-scene` (circle, equal, \(N=1\), \(t=0\)).
   - `scripts/generate-guided-example-inventory.cjs`: add an expectation for this lesson, authored independently of the kernel.
   - `scripts/capture-guided-example-previews.cjs`: the `fourier-series` family route must accept `/bezeg-2.0/analysis/epicycles`.
   - `src/learning/content/fourierPreviewCopy.ts`, the `ids` list in `guidedExamplePreviews.test.ts`, the inventory JSON, a full `--family fourier-series` capture.
   - The poster: `epicycles` is in `POSTER_PENDING` (`src/demonstrationPosterPending.ts`). Add a recipe in `scripts/demonstration-preview-recipes.cjs`, capture with `PREVIEW_RECAPTURE_IDS=epicycles` (`docs/commands.md` line 38), register it in `src/demonstrationPreviewAssets.ts`, and remove the id.
2. **Review F3+F4.** Only the handler read them; no subagent review ran. The diff is multi-file and mathematical, so run the engineering and mathematical reviews by [review routing](../../../agent-workflow.md#review-routing).
3. **F6.** `just check`, `just smoke-lesson epicycles fourier-series fourier-coefficients`, browser smoke SL and EN at 1920 and 390 with a live switch (no browser smoke of the route has run beyond the perf script and the lesson walk), then rebase, push, and CI. ADR 0040 also asks F6 to re-check the classroom device: it is not available, so report that gap.
4. Update task 06, the stream line and the task README; the family then has F5 released.

## Checks at the local commit

- `just check` on the rebased route: 11465 passed, 4 skipped, 1 failed (an order in `lessonCatalog.test.ts`, fixed in `f73ec5f9`; the 5 affected files then passed, 60 tests).
- F3+F4 tree: `just unit src/learning/content src/learning/chapter src/learning/LearningPage.test.tsx` 1538 passed, 1 failed (the F5 card above, expected). `tsc` clean. `just smoke-lesson epicycles` 2 passed, run before the handler's last wording repairs to `fourierChapter.ts`, which changed prose only.
- Full `just check` has not run on F3+F4.

## Handler repairs to worker output

Worth keeping in briefs: workers wrote "exact" for quadrature, a prompt for a control the graph lacks ("move the start"), and English inside a formula's `\text{}`, and all tests passed. Read the prose against the graph's real controls.

## Open risks and nits

- From handoff 37: the Reset host test does not fail on the unfixed code; `NumberInput` rounds plain-arrow steps to 9 decimals; `EpicycleGraph.unmount` clears `hostListeners`; the S5 explore-scene nit; S6's small-screen notes.
- `docs/tasks/fourier-series/06-batch-c.md` step 2 has a line break inside `\(k\ne0\)` (an old mangled `\n`). Not repaired.
- Count tables conflict on almost every rebase. Keep both sides, and check list order: `lessonCatalog.test.ts` wants catalog order.

## Tool notes

- `gh` is not installed; read CI with `curl -s "https://api.github.com/repos/efodx/bezeg-2.0/actions/runs?branch=master&per_page=3"`.
- `scripts/fourier-browser-perf.cjs` defaults to port 4315; set `PREVIEW_BASE_URL=http://127.0.0.1:4330/bezeg-2.0`.
- A background command's exit code can be a wrapper's: read `check=` or the log, not the notification. `just check` takes over 17 minutes, so run it in the background.
- `just` writes full output to `.command-logs/`; on failure the path is not on the last line of its output.
- `claude_worker_watch.py` has no `--once` under Claude. Run it through the Bash tool with `python -u`.
- Long heredocs with LaTeX break bash parsing. Write a script file with the Write tool.

## Settings to keep

- Handler: `--agent claude --model opus --permission-mode auto --effort medium`. Self-watch `--until 175000` (owner override). At 215k, or right after closing out at the soft threshold, launch the successor with `claude --bg` and pass this rule on.
- Workers: `bezeg-worker`, Sonnet, `medium`, each with a 135k watcher. Reviews: `bezeg-reviewer`, Sonnet. Smoke: `bezeg-smoke`, Sonnet, `medium`.
- Ports: 4315 (preview/capture), 4320 (`just smoke-lesson`), 4330 (perf harnesses). Logs: the job tmp dir.
