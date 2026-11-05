# Functions stream: handler handoff 39

Handler 39 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-05, past the 175k soft threshold.

- Stream file: `docs/tasks/feature-streams/functions.md`. Task: `docs/tasks/fourier-series/06-batch-c.md`.
- Worktree `.claude/worktrees/stream-functions`, branch `stream-functions`.
- `origin/stream-functions` has diverged, so never force-push it; push to `master` only, as a fast-forward.

## State

- **Remote `master`:** `2b8005cf`. It has F2b and Curves' joint posters, including the `epicycles` poster.
- **Local only, on top of `2b8005cf`:** F3 and F4, the F5 card, the review repair, three rebase follow-ups, and this closeout. All of it is verified and none of it is released.
- **The one blocker:** the permission layer refused `git push origin HEAD:master` as "Git Destructive", although the push was a fast-forward the owner authorized. The handler did not route around it. The owner must allow it or push.

## Next, in order

1. `git fetch origin`. If `master` moved, rebase, and run `npx vitest --clearCache` before the unit run, because new cards leave a stale `import.meta.glob` (`docs/commands.md` line 18).
2. `git push origin HEAD:master`.
3. Read CI: `curl -s "https://api.github.com/repos/efodx/bezeg-2.0/actions/runs?branch=master&per_page=3"`. CI runs every transient-state graph, which the local sample does not.
4. On green, record F6 accepted with the run id in task 06, the stream line and `docs/tasks/fourier-series/README.md` (the Batch C row still says `planned`), then push that docs commit.

## Done in this run

- **F5 card:** `fourier-series.epicycles.epicycles`. The real board reports 5 curves and 12 points, equal to the expectation authored from the circle's definition. The family capture also refreshed the `fourier-coefficients` card: its old PNG predated the palette change `6c0c6a28`.
- **Poster:** not ours. Curves claimed the joint capture in `699b085a`, after handoff 38. The handler's local capture was discarded. The default circle shows no epicycles, so any later recipe needs another example; Curves' uses the diamond.
- **Tool fix:** `scripts/capture-demonstration-previews.cjs` no longer fails a selective recapture on ids in `POSTER_PENDING`; a full run still expects every demonstration. Exercised by one real capture, before the poster was dropped.
- **Mathematical review:** no finding. An independent computation, without the app kernel, reproduced every quoted value.
- **Engineering review:** no defect. Repairs for two weak tests: a test that starts playback before each scene (a no-op `halt` fails it; removing any single `halt()` call does not, because several paths stop playback), and a tighter routing regex.

## Checks

- Final code tree: `tsc` and lint clean. Unit run at `5d7a8bc2`: 10701 passed, 8 skipped, 3 failed. All three are closed: one was a count, fixed in the last test commit; two were the stale cache. The three files pass with `--no-fsModuleCache` and again plainly after the cache clear. **The full suite was not rerun after that one-constant fix.**
- `just smoke-lesson epicycles fourier-series fourier-coefficients` passed at `5d7a8bc2`.
- Browser smoke at `02b92ce1`, before the last rebase, which brought Curves' posters and cards and test counts: workspace, lesson and chapter passed at 1920 and 390, SL and EN, live switch, clean console.

## Report these to the owner

- Gaps in the browser smoke: playback is locked in `content` mode (`DemonstrationWorkspace.tsx:242`), so "start playback, then change step" was not run in a browser; the new unit test covers it. That "Opazuj na grafu" unlocks it was read from the code, not observed. The 390 px lesson text was not read closely.
- ADR 0040's F6 re-check on the classroom device did not run: the device is not available. Sustained 60 Hz pointer input stays unmeasured.
- At step 1 frame 1 the lesson card covers the whole unit circle, because the view spans about 7 units each way at 1920. This is the shared layout, and the card can be hidden or dragged. Not changed.
- Pre-existing: `scripts/demonstration-preview-motion-runner.test.cjs` fails on `patch-coons`, a surface demonstration without a surface motion entry. No `just` or package script runs that file. Not fixed; it belongs to another stream.
- The F5 worker deleted the shared `node_modules/.vitest-cache`, and the handler cleared it once with `npx vitest --clearCache`. Other worktrees lose only cached transforms.

## Open risks and nits

- From handoffs 37 and 38: the Reset host test does not fail on the unfixed code; `NumberInput` rounds plain-arrow steps to 9 decimals; `EpicycleGraph.unmount` clears `hostListeners`; the S5 explore-scene nit; S6's small-screen notes; the mangled `\(k\ne0\)` in task 06 step 2.
- Conflict resolutions for count tables need the whole-suite check: this run's first resolution dropped `epicycles` from `LESSONS`, and lint caught it. Assertions stop at the first failed count, so a second count can hide behind it.

## Tool notes

- `gh` is not installed.
- A background command's exit code can be a wrapper's: read `check=` in the log. Twice here the notification said 0 and the log said 1.
- `just check` is `tsc`, lint, unit, in that order, and `smoke-lesson` needs a fresh `just build`.
- Long heredocs with LaTeX break bash parsing. Write a script file with the Write tool.

## Settings to keep

- Handler: `--agent claude --model opus --permission-mode auto --effort medium`. Self-watch `--until 175000` (owner override). At 215k, or right after closing out at the soft threshold, launch the successor with `claude --bg` and pass this rule on.
- Workers: `bezeg-worker`, Sonnet, `medium`, each with a 135k watcher. Reviews: `bezeg-reviewer`, Sonnet. Smoke: `bezeg-smoke`, Sonnet, `medium`.
- Ports: 4315 (preview/capture), 4320 (`just smoke-lesson`), 4330 (perf harnesses). Logs: the job tmp dir.
