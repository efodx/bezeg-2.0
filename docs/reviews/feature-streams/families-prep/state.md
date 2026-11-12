# Families-prep state note

Handler 11 handed off on 2026-11-12 to handler 12. The worktree is on branch `worktree-stream-families-prep-2`. Rewrite this note at your handoff.

## Setup

- `.claude/settings.local.json` (untracked, budget scale 1.5) and `npm ci` are done in this worktree.
- Shell calls can take minutes while other streams hold the two test slots. Run long checks in the background.
- Publish with `just publish --background --recipe <docs|tooling|runtime> --base <last published local commit> --commits <id,...>`; the commit list must be exactly `base..HEAD`. `tests/*.spec.cjs` needs `runtime`; `scripts/` needs `tooling`. The gate runs `check-changed` itself and checks added Markdown links (no placeholder links). Then `just publish --status`. `bash .command-logs/h9-pubci.sh <local short sha>` (background) waits for a publish and watches its hosted CI run. The owner asked that this stream keep master's CI green. A newer push (often another stream's) cancels the running CI run of an older one; then watch the newest master run (`gh run list --workflow browser-smoke.yml --branch master --limit 3`), which covers both. The pushed sha differs from the local one when master moved; the base for the next publish is still the local commit.
- If a publish fails at `reconcile`, abort the rebase in the kept publish worktree (`git -C <publish worktree> rebase --abort`), rebase only your new commits here with `git rebase --onto origin/master <last published local commit>`, resolve mechanically, rerun `just check-changed`, and publish on the new base. Do not rebase while a worker or a check runs in this tree.
- Run `git diff --cached --check` before committing.
- Sweeps for one Demonstration: set `BEZEG_TRANSIENT_STATE`, `BEZEG_PRESET_ROUNDTRIP`, `BEZEG_GRAPH_TEARDOWN`, `BEZEG_LESSON_RESTORATION`, `BEZEG_SCENE_CONTENT`, `BEZEG_SCENE_REPLACEMENT` to its id and run `just unit src/graphs/base src/learning/runtime`.
- Reviewers and smoke workers: never bare `npx vitest`/`npm test`/playwright test runs.
- Tool-channel pitfall: shell heredocs and `node -e` strings halve backslashes. Edit lesson TS text with Read+Edit (keeps `\\(`), or build backslashes with `String.fromCharCode(92)` in a node script. Check inserted text with `od -c` if unsure.
- A worker that reports done while "waiting on its own background work" must be stopped with TaskStop before the next worker edits the tree.

## Done

- F0, F1, F2a, F2b for all fifteen families (handlers 7–9). Handler 10: frame times, F3 Batch A of trigonometry, analytic lines, isometries.
- Handler 11 (all pushed; master CI green at `648921dd`, the mechanical-curves push; waves publishing at handoff):
  - **Circle geometry Batch A** `ffb1d186`: chapter `circle-geometry` (plane geometry, after analytic lines), CG1–CG2 on `circle-construction`, action kind `circle`. Task files split 03 → 04–05.
  - **Combinatorics Batch A** `19af0446`: chapter `combinatorics` (functions strand, before probability), CB1 on `lattice-paths`, CB2 on `counting-tree` (two Demonstrations), action kind `combinatorics`. Split 03 → 04–06.
  - **Kinematics Batch A** `6c588f64` (pushed as `feb34d57`): chapter `kinematics` (curves strand, after curve geometry), KN1–KN2, action kind `kinematics`, caption placement clear of the y-axis tick labels. Split 03 → 04–06.
  - **Mechanical curves Batch A** `3d5e03ad` (pushed as `648921dd`): chapter `mechanical-curves` (curves strand, after kinematics), MC1–MC2 on `mechanics-descent`, action kind `descent`. Review caught a wrong closed form (line time \(L/\sqrt{gr}\)). Split 03 → 04–05.
  - **Waves Batch A** `a2b110d1` (publishing at handoff): chapter `waves` (functions strand, after Fourier series), WV1–WV2, action kind `waves`, sampling label fixes. Split 03 → 04–06.
- **F3 pattern**: per family four agents — content worker (actions + host-free content, stops on budget after content), skeleton worker (chapter, wiring, test lists, smoke rows, probe of real readouts), Sonnet reviewer (parallel with the next worker, read-only), tests worker (host test, content test with red evidence, sweeps, build, smoke, review fixes when listed in its brief). Latest template commit `a2b110d1`; notes `notes/f3-<family>-a.md` (each has a "Handler review" section). Review findings that recur: bare symbols outside `\(...\)`, closed forms valid only at the default parameter, physical claims true at one point stated for the whole object, slider values not called approximate, English words in latex fields.

## In flight at handoff

- Publish of `a2b110d1` (waves) on base `3d5e03ad`. Check `just publish --status`, then `bash .command-logs/h9-pubci.sh a2b110d1`.
- This state note and the evaluation entry follow as a docs commit; a detached loop (`.command-logs/h11-handoff-publish.log`) publishes it with `--recipe docs --base a2b110d1` once the waves publish is ok. Check status before starting another.
- No worker is running.

## Owed

- Per family task files list their owed items (F4 guided examples, F5 poster/clip/thumbnail, F6).
- New this handoff: kinematics phone Play miss (profile first) and the seven-line caption wrap at 390 px; waves remeasure of a sinc state change, error/redraw split, reduced-motion refresh, and the sticky Play bar covering the lower wheel label at 390×844; mechanical-curves browser timing. All in the batch-A task files under F6.
- Lesson text Slovenian is reviewed by Sonnet only; terms added to `docs/localization.md` with notes (coaxal circles: *krožnice z isto potenčno premico*; *pot po mreži* unreviewed).
- Older items: `git show 6ccf1da3:docs/reviews/feature-streams/families-prep/state.md`, section "Owed".

## Next

1. Confirm the waves publish and the hosted CI run of the last push.
2. F3 Batch A for the remaining families, one at a time (shared chapter files): recursion, randomness, level sets, phase portraits, solids. Split each release-batch file per batch first (pattern: `docs/tasks/waves/03-release-batches.md` and 04–06), record the chapter placement as a handler decision in task 04, and fold owed graph items small enough for F3 (labels, captions) into the content worker's brief; leave measurements and shared layout to F6. Batch B of the earlier families can interleave.
3. F4 (chapter guided examples) can follow per chapter once its F3 lessons exist.

Rules to keep: at most two workers in the stream at once, and only one F3 worker editing at a time (a read-only reviewer may run beside it); never edit shared host files (`BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/`, the lesson runtime, `src/graphs/base/` apart from test lists). At handoff, launch the successor from this worktree with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`, and pass this self-spawn rule on.
