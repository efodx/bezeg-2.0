# Families-prep state note

Handler 13 handed off on 2026-11-12 to handler 14. The worktree is on branch `worktree-stream-families-prep-2`. Rewrite this note at your handoff.

## Setup

- `.claude/settings.local.json` (untracked, budget scale 1.5) and `npm ci` are done in this worktree.
- Shell calls can take minutes while other streams hold the two test slots. Run long checks in the background.
- Publish with `just publish --background --recipe <docs|tooling|runtime> --base <last published local commit> --commits <id,...>`; the commit list must be exactly `base..HEAD`. `tests/*.spec.cjs` needs `runtime`; `scripts/` needs `tooling`. The gate runs `check-changed` itself and checks added Markdown links (no placeholder links). Then `just publish --status`. `bash .command-logs/h9-pubci.sh <local short sha>` (background) waits for a publish and watches its hosted CI run, but `gh run watch` polls fast and once hit the GitHub API rate limit; `bash .command-logs/h12-slowci.sh <run id>` polls every two minutes. The owner asked that this stream keep master's CI green. A newer push (often another stream's) cancels the running CI run of an older one; then watch the newest master run (`gh run list --workflow browser-smoke.yml --branch master --limit 3`), which covers both. The pushed sha differs from the local one when master moved; the base for the next publish is still the local commit.
- If master CI is red from another stream, find the commit (`gh run view <id> --log-failed`), message that stream's handler (`ListAgents`), and fix only with its agreement, in a separate worktree off `origin/master` (`git worktree add --detach ../<name> origin/master`), pushing as a fast-forward; never rebase this tree while a worker runs. Handler 12 did this for the CI scope detector (`92c7cf4d`). The publish gate's `check-changed` does not run `scripts/*.test.cjs`; run `node --test scripts/ci-change-scope.test.cjs scripts/transient-state-scope.test.cjs` yourself when `scripts/` or graph registration moves.
- If a publish fails at `reconcile`, abort the rebase in the kept publish worktree (`git -C <publish worktree> rebase --abort`), rebase only your new commits here with `git rebase --onto origin/master <last published local commit>`, resolve mechanically, rerun `just check-changed`, and publish on the new base.
- Run `git diff --cached --check` before committing. Python on Windows writes CRLF in text mode: open files with `newline=''`.
- Sweeps for one Demonstration: set `BEZEG_TRANSIENT_STATE`, `BEZEG_PRESET_ROUNDTRIP`, `BEZEG_GRAPH_TEARDOWN`, `BEZEG_LESSON_RESTORATION`, `BEZEG_SCENE_CONTENT`, `BEZEG_SCENE_REPLACEMENT` to its id and run `just unit src/graphs/base src/learning/runtime`.
- Reviewers and smoke workers: never bare `npx vitest`/`npm test`/playwright test runs.
- Tool-channel pitfall: shell heredocs, `node -e` strings and some worker scripts halve backslashes. Edit lesson TS text with Read+Edit, or build backslashes with `String.fromCharCode(92)`. After a content slice, count single-backslash delimiters with such a node script.
- A worker or reviewer that reports while "waiting on its own background work" must be stopped with TaskStop before the next worker edits the tree.
- **CI after a cancelled push:** a docs-only push directly after a cancelled code push takes the docs-only CI path (its range starts at the cancelled push), so the code is never verified. Then dispatch a full run: `gh workflow run browser-smoke.yml --ref master`, and watch it.
- Tests workers usually hit HANDOFF before the final checks. Run the rest yourself in one background script: `just unit src/learning <graph folder>`, the six sweeps, `just check-changed` (it also lints and builds; worker tsc runs miss lint), then `just smoke-lesson <id>`.

## Done

- F0, F1, F2a, F2b for all fifteen families (handlers 7–9). Handler 10: frame times, F3 Batch A of trigonometry, analytic lines, isometries. Handler 11: F3 Batch A of circle geometry, combinatorics, kinematics, mechanical curves, waves.
- Handler 12 (all pushed; hosted CI green at `e15cf349`, then a full run at `3e9d1f58` covering phase portraits):
  - **Recursion Batch A** `2994856b` (pushed as `30cb1e17`): chapter `recursion` (functions strand, after analysis), RG1–RG3 on `recursion-growth`, action kind `recursion`. Split 03 → 04–06.
  - **Randomness Batch A** `3aa360d8` (`fb5df05a`): chapter `randomness` (functions strand, after probability, last), RS1–RS2 on `prob-simulation`, action kind `random`. Split 04 → 05–07.
  - **Level sets Batch A** `a055e1fa` (`e15cf349`): chapter `level-sets` (after numerical methods), LS5 on `linear-program`, action kind `levelsets`; term *izrojeno (degenerirano) oglišče*. Split 05 → 06–08.
  - **Phase portraits Batch C** `ddfd7684` (`d1e7bb4b`): chapter `phase-portraits` (after recursion), PP4–PP5 on `logistic-map`, action kind `phase`. Batch A (PP1–PP2) is blocked on linear-maps Batch B; Batch C ran first. Split 04 → 05–07.
  - CI scope-detector repair `92c7cf4d` (another stream's break; follow-up owned by authoring-rollout).
- Handler 13:
  - **Solids Batch A** `7e2a53bc` (pushed as `50a79bce`, hosted CI green): release batches split into tasks 05–07; chapter `solids` (functions strand, after `analysis`), SV1 (`cube-sections`) and SV2 (`pyramid-sections`) on `solids`, action kind `solids`, axial section of the pyramid drawn with the caption *osni presek piramide*.
  - **Trigonometry Batch B** `6c723fb9` (publishing at handoff): TR3 `triangle-sine-rule` and TR4 `triangle-cosine-rule` on `triangle-solver`, sections `sine-rule` and `cosine-rule` in the chapter `trigonometry` (now spanning the functions and plane-geometry families), action kind `triangle`, chapter link to `triangle-geometry#inscribed-angle`.
- **F3 pattern**: per family — content worker (actions + host-free content + probe of real readouts; stops on budget after content), then skeleton worker (chapter, wiring, test lists, smoke rows) beside a Sonnet reviewer (read-only), then tests worker (review fixes, content test with red evidence, sweeps, build, smoke). Record spec deviations in the spec's Implementation Decisions when the review names them. Latest template commits `7e2a53bc` (new chapter) and `6c723fb9` (lessons joining an existing chapter); notes `notes/f3-<family>-<batch>.md`, each with a "Handler review" section. Recurring review findings: claims true only in one case stated generally (the boundedness claim in LP), prompts no grid value satisfies, single-backslash delimiters in metadata strings, numbers not called approximate, words in latex fields, answers shown before their prediction (frame order: explanation, worked example, observation; only `expectedObservations` follow the prediction, so name this in the content brief).

## In flight at handoff

- Publish of `6c723fb9` (trigonometry Batch B) on base `7e2a53bc`. A detached loop (`.command-logs/h13-handoff-publish.log`) waits for it, then publishes this docs commit with `--recipe docs --base 6c723fb9`, then dispatches a full CI run on master (because the docs push would skip verifying the code) and records the run list. Check `just publish --status` and `gh run list --workflow browser-smoke.yml --branch master --limit 4` first; watch the newest full run.
- No worker is running.

## Owed

- Per family task files list their owed items (F4 guided examples, F5 poster/clip/thumbnail, F6). New this handoff: solids task 05 (no browser look at the chapter, the axial triangle or its caption; cube offset phone items), task 07 (revolve discs p95 phone miss); trigonometry task 08 (no browser look at the circle mode in the lesson or the chapter link; TR4 has no smoke row).
- Lesson text Slovenian is reviewed by Sonnet only; terms added to `docs/localization.md` with notes (*osni presek piramide* and the solids plain words marked handler-unreviewed, as are *met*, *pas 95 %* and the level-sets plain words).
- Older items: `git show 6ccf1da3:docs/reviews/feature-streams/families-prep/state.md`, section "Owed".

## Next

1. Confirm the trigonometry publish, the docs publish and the full CI run the loop dispatched.
2. Batch B of the other earlier families with existing graphs, in rank order: analytic lines (task 05, `/line-geometry`), isometries (task 06), circle geometry, kinematics, waves, mechanical curves, combinatorics. Each is F3 only (content, skeleton beside a reviewer, tests), joining the family's existing chapter like `6c723fb9`. Check each spec's batch table first: a Batch B that needs new graph modes or an ADR (as linear-maps Batch B does) is not a three-slice F3 job.
3. Linear-maps Batch B (task `docs/tasks/linear-maps/08-batch-b.md`: an ADR on the eigen-direction predicate after trying drag feel, plus F2a eigen and ellipse modes) unblocks phase-portraits Batch A and linear-maps Batch D; it needs a graph worker per mode before any lesson. No other stream claims it.
4. F4 (chapter guided examples) per chapter once its F3 lessons exist.

Rules to keep: at most two workers in the stream at once, and only one F3 worker editing at a time (a read-only reviewer may run beside it); never edit shared host files (`BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/`, the lesson runtime, `src/graphs/base/` apart from test lists). At handoff, launch the successor from this worktree with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`, and pass this self-spawn rule on.
