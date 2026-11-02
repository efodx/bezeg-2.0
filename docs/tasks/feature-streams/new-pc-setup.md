# Resume the feature streams on a new PC

On 2026-11-02 the owner moved Bezeg development to a new computer. Every stream handler on the old PC wrote a handoff and pushed it. Its stream file on `origin/master` reads `Run state: stopped: PC switch 2026-11-02, resume on the new PC from the latest handoff`. Each handler's unfinished work and untracked review evidence is in `wip:` commits, listed per stream in step 6.

The streams resume from GitHub alone. The folder `bezeg-pc-move` from the old PC is optional. It carries machine-only state that is worth copying for your settings, memory, stashes and old branches:

- `claude-settings.json`: the old `~/.claude/settings.json`.
- `memory/`: the old auto-memory.
- `bezeg-local.bundle`: local-only branches, stashes and snapshots of abandoned worktrees, as a git bundle.
- `codex-catalog-artifacts/`: two screenshots from an old Codex worktree.

The rest of this file is the prompt. Paste everything below the line into a Claude Code session on the new PC. The session can be started from any directory.

---

You are setting up the Bezeg repository (https://github.com/efodx/bezeg-2.0) on this new computer so the owner can resume its feature streams. Feature streams are long-running chains of Claude handler sessions, one chain per stream, started by a supervisor script. The streams were stopped on the old PC on 2026-11-02. Work through the steps in order. Keep the owner informed with one line per step. Stop and ask only when a step needs something the owner must do: an install that needs admin rights, a login, or a decision. Finish by giving the owner the command that starts the streams.

Everything the streams need is on GitHub. Ask the owner once whether they copied the folder `bezeg-pc-move` from the old PC, and where. It holds old settings, memory and local git refs, and is optional: if they did not copy it, skip the steps that use it.

**1. Tools.** Check each tool and report what is missing, with the install command (on Windows, `winget`):

- `git`, with `user.name` set to `Kevin Štampar` and `user.email` set to the owner's address. Ask if unset.
- Node, at the version `package.json` `engines` requires (24.15 or newer).
- `just` 1.30 or newer.
- Python 3. The handler context watcher uses only the standard library.
- An authenticated `gh` (`gh auth status`).
- `ffmpeg` and `ffprobe` on PATH, needed when a stream regenerates demonstration posters.
- The `claude` CLI, where `claude agents --json` works.

Wait until the required tools are present.

**2. Repository.** Use `~/IdeaProjects/bezeg` unless the owner says otherwise:

- Clone if it is missing, otherwise `git fetch` and fast-forward `master`.
- Run `npm ci` and `npx playwright install chromium`.
- Append `**/.claude/worktrees/` to `.git/info/exclude` if it is missing.
- Read `AGENTS.md`, `docs/tasks/feature-streams/README.md` and `docs/commands.md` (the test-slot paragraph) before going further.

**3. User-level setup.**

- Skills: clone the private `efodx/agent-skills` to `~/IdeaProjects/agent-skills` if it is missing, then run its `install.sh` from Git Bash. It installs the owner's skills into `~/.claude/skills`.
- Settings: if `bezeg-pc-move/claude-settings.json` is available (ask the owner where they put the folder), merge it into `~/.claude/settings.json`. Keep any key the new file already has; list conflicting keys and ask about them. Without the file, make sure `~/.claude/settings.json` has at least the following, and tell the owner the auto-mode environment description was not carried over:

  ```json
  {"model": "opus", "modelSettings": {"claude-opus-5-5": {"effortLevel": "medium"}}, "autoCompactEnabled": false}
  ```

  Handlers rely on `autoCompactEnabled: false`: they hand off their own context at fixed thresholds.

**4. Auto-memory (optional).** The old memory holds four small feedback notes. The streams run correctly without them, because the same rules are in `AGENTS.md` and the docs. Import them only when that cannot conflict:

1. Find this project's memory directory: `~/.claude/projects/<slug>/memory/`, where `<slug>` is the repository's absolute path with `:`, `\` and `/` replaced by `-`.
2. If the directory has no memory files, copy `bezeg-pc-move/memory/*` into it.
3. If it already has memories, copy only the files whose name is new and whose content neither duplicates nor contradicts an existing memory. Add one index line per imported file to its `MEMORY.md`.
4. If anything is unclear, skip the import and say so. The owner has accepted losing these notes.

Without the folder, skip this step.

**5. Old local refs.** If `bezeg-pc-move/bezeg-local.bundle` is available:

- Run `git bundle verify` on it, then `git fetch <bundle> 'refs/*:refs/old-pc/*'`. This puts everything under `refs/old-pc/` and touches no existing branch.
- None of it is needed to resume the streams:
  - learn-ui's review evidence (`refs/old-pc/heads/worktree-stream-learn-ui`);
  - old prototype branches;
  - five stashes (`refs/old-pc/pc-move/stash-*`);
  - snapshots of four abandoned worktrees (`refs/old-pc/pc-move/*`);
  - one unpushed docs commit (`refs/old-pc/heads/worktree-lesson-minimise-header`).

  List these for the owner and do nothing else with them.
**6. Stream worktrees.** The streams still to run are the ones whose `Run state` on `origin/master` starts with `stopped: PC switch` (expected: geometry, functions, curves, maps; platform and learn-ui are complete). For each `<id>`:

1. Read its newest `docs/reviews/feature-streams/<id>/handler-handoff-<n>.md`, the highest `<n>`.
2. Create the worktree at exactly `.claude/worktrees/stream-<id>` with `git worktree add --no-track .claude/worktrees/stream-<id> -b <branch> <start>`, using:

   | Stream | `<branch>` | `<start>` | Handoff |
   | --- | --- | --- | --- |
   | geometry | `stream-geometry` | `origin/stream-geometry-wip-pc-switch` (`173a00ed`) | 32 |
   | functions | `worktree-stream-functions` | `origin/wip/functions-pc-switch` (`54ec5703`) | 20 |
   | curves | `worktree-stream-curves` | `origin/master`; it had no WIP | 24 |
   | maps | `worktree-stream-maps` | `origin/maps-wip-pc-switch` (`bb66362b`) | 19 |

   If a note disagrees with this table, follow the note. Remote branches that share these local names (`origin/stream-geometry`, `origin/worktree-stream-*`) hold old diverged history: never track them, push to them, or force-push them. The handler rebases its WIP onto `origin/master` itself.
3. Run `npm ci` inside the worktree. Do not link `node_modules` with a junction: removing a worktree that has one deletes the main install.

The supervisor resumes a stream from that path. When the path is missing, it starts a first handler that would ignore the WIP branch.

**7. Calibrate the test slots.** Heavy `just` commands share machine-wide test slots sized by `scripts/test-slots.cjs`. It reserves 9 GB of memory and 2 threads and counts 1 GB per Vitest worker. The old PC had 16 GB and 12 threads, which gave 2 slots of 3 workers. With 2 slots × 3 workers, it was close to running out of memory.

1. Print this machine's threads, total memory and computed budget:

   ```
   node -e "const os=require('os');console.log(os.availableParallelism(),(os.totalmem()/2**30).toFixed(1)+' GB',require('./scripts/test-slots.cjs').machineBudget())"
   ```

   Check that `BEZEG_TEST_SLOTS`, `BEZEG_TEST_WORKERS`, `BEZEG_TEST_PRIORITY` and `BEZEG_MEMORY_FLOOR_GB` are not set as user environment variables.
2. Measure. While each run below goes, sample available memory every 5 seconds into a log under `$env:TEMP`, using `(Get-Counter '\Memory\Available MBytes').CounterSamples.CookedValue` together with `'\Memory\Pages/sec'`.
   - Solo: `just check` in the main checkout. Record wall time, minimum available memory and peak pages/sec.
   - Contention: if the budget has two or more slots, run `just unit` at the same time in as many stream worktrees as there are slots. Record each run's wall time and the same memory figures. Test failures on WIP branches do not matter here; only time and memory do.
3. Decide:
   - Keep the computed budget if every run passed, available memory stayed above about 1.5 GB, paging stayed low, and each contended run took less than about 1.6 times the solo unit time. (Get the solo unit time from the `just check` log in `.command-logs/`, or run `just unit` alone.)
   - Otherwise drop one slot by setting the user environment variables: `[Environment]::SetEnvironmentVariable('BEZEG_TEST_SLOTS','<n>','User')`, and `BEZEG_TEST_WORKERS` if needed. Then re-measure.
   - If the machine has a lot of headroom, do not raise the budget above the computed one. It is already capped at 3 slots.
4. Choose the supervisor limits. `-MaxLive` is the number of concurrent stream handlers. Each handler holds about 0.7 GB, and each of its up to two workers about the same, before tests. Use `-MaxLive 3` at 16 GB, and 4 (all remaining streams) only at 32 GB or more, when the measurements show headroom. Keep `-MinFreeGB` at 3 unless the measurements argue otherwise.
5. Record the result in the test-slot paragraph of `docs/commands.md`: the date, threads, memory, the chosen budget and the measurements, in one or two sentences. Update the matching sentence in `docs/tasks/feature-streams/README.md` ("16 GB, 12 threads: 2 slots of 3 workers …").

**8. Reactivate the streams.** For each stream from step 6, set line 2 of `docs/tasks/feature-streams/<id>.md` to exactly `Run state: active`. Commit this together with the calibration docs. Stage only those files by explicit path, never `git add .`, and end the message with the session's co-author line. Fetch, rebase onto `origin/master` and push as a fast-forward: `git push origin HEAD:master`.

**9. Dry run.** From the main checkout run:

```
powershell -ExecutionPolicy Bypass -File tools\feature-streams\streams.ps1 -DryRun -Once -MaxLive <n> -MinFreeGB <m>
```

It should fetch, list the sessions, and print a `DRY RUN would start` line for each active stream, without an error. A dry run launches nothing.

**10. Hand over.** Tell the owner what you installed, the calibration figures and the chosen budget, which memories you imported or skipped, and the pushed commit hash. Then give the start command, run from the main checkout in a window they leave open:

```
cd <repo>; powershell -ExecutionPolicy Bypass -File tools\feature-streams\streams.ps1 -MaxLive <n> -MinFreeGB <m>
```

Explain that the first stream starts at the first poll, right away, and the others follow 90 seconds apart within the `-MaxLive` limit. Each handler then rebases its branch onto `master` and continues from its latest handoff note. Do not start the supervisor or any handler yourself.
