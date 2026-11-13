# Families-prep state note

Handler 14 handed off on 2026-11-13 to handler 15. The worktree is on branch `worktree-stream-families-prep-2`. Rewrite this note at your handoff.

## Setup

- `.claude/settings.local.json` (untracked, budget scale 1.5) and `npm ci` are done in this worktree.
- Shell calls can take minutes while other streams hold the two test slots. Run long checks in the background.
- Publish with `just publish --background --recipe <docs|tooling|runtime> --base <last published local commit> --commits <id,...>`; the commit list must be exactly `base..HEAD`. `tests/*.spec.cjs` needs `runtime`; `scripts/` needs `tooling`. The gate runs `check-changed` itself and checks added Markdown links (no placeholder links). Then `just publish --status`. `bash .command-logs/h12-slowci.sh <run id>` (background) polls a hosted CI run every two minutes. The owner asked that this stream keep master's CI green. A newer push (often another stream's) cancels the running CI run of an older one; then watch the newest master run (`gh run list --workflow browser-smoke.yml --branch master --limit 3`), which covers both. The pushed sha differs from the local one when master moved; the base for the next publish is still the local commit.
- If master CI is red from another stream, find the commit (`gh run view <id> --log-failed`), message that stream's handler (`ListAgents`), and fix only with its agreement, in a separate worktree off `origin/master` (`git worktree add --detach ../<name> origin/master`), pushing as a fast-forward; never rebase this tree while a worker runs. The publish gate's `check-changed` does not run `scripts/*.test.cjs`; run `node --test scripts/ci-change-scope.test.cjs scripts/transient-state-scope.test.cjs` yourself when `scripts/` or graph registration moves.
- If a publish fails at `reconcile`, abort the rebase in the kept publish worktree (`git -C <publish worktree> rebase --abort`), rebase only your new commits here with `git rebase --onto origin/master <last published local commit>`, resolve mechanically, rerun `just check-changed`, and publish on the new base.
- Run `git diff --cached --check` before committing (workers leave trailing spaces in notes and tests; `sed -i 's/[ \t]*$//' <file>`). Python on Windows writes CRLF in text mode: open files with `newline=''`.
- Sweeps for one Demonstration: set `BEZEG_TRANSIENT_STATE`, `BEZEG_PRESET_ROUNDTRIP`, `BEZEG_GRAPH_TEARDOWN`, `BEZEG_LESSON_RESTORATION`, `BEZEG_SCENE_CONTENT`, `BEZEG_SCENE_REPLACEMENT` to its id and run `just unit src/graphs/base src/learning/runtime`. The handler check script `.command-logs/f3-<family>-b/h-final.sh` runs unit, sweeps, `check-changed` and `smoke-lesson` in one go; derive a new one with `sed` from the last.
- Reviewers and smoke workers: never bare `npx vitest`/`npm test`/playwright test runs.
- Tool-channel pitfall: shell heredocs, `node -e` strings and Python strings sent through the shell halve backslashes (`\\tfrac` arrived as TAB + `frac` twice this handoff). Edit lesson TS and spec lines with Read+Edit, or build backslashes with `chr(92)`/`String.fromCharCode(92)`, then grep the line. Count single-backslash delimiters after a content slice.
- A worker or reviewer that reports while "waiting on its own background work" must be stopped with TaskStop before the next worker edits the tree. Briefs say "do not leave background jobs running"; wiring workers ignored it about half the time.
- **CI after a cancelled push:** a docs-only push directly after a cancelled code push takes the docs-only CI path, so the code is never verified. Then dispatch a full run: `gh workflow run browser-smoke.yml --ref master`, and watch it. A single push that holds a code and a docs commit is fine.

## Done

- F0, F1, F2a, F2b for all fifteen families (handlers 7–9). F3 Batch A: handler 10 (trigonometry, analytic lines, isometries), handler 11 (circle geometry, combinatorics, kinematics, mechanical curves, waves), handler 12 (recursion, randomness, level sets; phase portraits Batch C), handler 13 (solids; trigonometry Batch B). Older detail: `git show ba49471c:docs/reviews/feature-streams/families-prep/state.md`.
- Handler 14, all F3 Batch B, each as a content worker, a wiring worker beside a Sonnet reviewer, then a fixes-and-tests worker; handler checks per family: unit, the six sweeps, `check-changed`, `smoke-lesson`; spec deviations recorded as "F3 Batch B decisions" in each spec; notes `notes/f3-<family>-b.md` with a "Handler review" section:
  - Trigonometry Batch B publish confirmed (`c67627f0`); the full dispatched CI run on `6a1c6b15` was green.
  - **Analytic lines** `9ae44144` (pushed `78e4feae`, CI green): L3, L4 on `line-geometry`, sections `angle-between-lines`, `distance-point-line`; existing `lines` actions.
  - **Isometries** `852241ee` (`44e3e351`, CI green): L3 on `isometries`, section `dilation-similarity`; new `isometry` operation `set-dilation`.
  - **Circle geometry** `70efc8d7` + `cc50660b` (`abfb5cef`, CI green): CG3, CG4 on `circle-construction`, sections `apollonius-circle`, `common-tangents`; new `circle` operation `set-apollonius`.
  - **Kinematics** `e58a53bd` (`7a287bd3`, CI green): KN3, KN4 on `curve-kinematics`, sections `projectile-motion`, `circular-motion`; existing actions.
  - **Waves** `a22915a0`: WV3 on `waves`, section `standing-waves`; existing actions. Publish status: see In flight.
  - **Mechanical curves**: see In flight.
- **Recurring review findings** (every content brief carries them; `.command-logs/f3-mech-b/brief-s1.md` is the latest): the lesson `summary` renders before step 1 (`GuidedLesson.tsx:570`) and must not answer a prediction; step titles and a step's formula blocks render with the step; `purpose`, scene `expectedState`, `edgeCases` and `learningGoals` are not rendered; a scene must not already be in the state the text asks the learner to produce; the free step opens neutral; every step that reveals something new asks first, not only step 1; claims true in one case not stated generally; rounded numbers called approximate; English math uses a decimal point (`lessonMathNotation.test.ts` fails on `{,}` in English).
- **Brief reuse:** each family's four briefs are in `.command-logs/f3-<family>-b/brief-{s1,s2,review,s3}.md`, derived from the previous family's with small Python replace scripts (`mk*.py` there).

## In flight at handoff

- Waves `a22915a0` is pushed as `bfa3c8f1`; its hosted CI run was not yet confirmed at handoff (check `gh run list --workflow browser-smoke.yml --branch master --limit 4`).
- **Mechanical curves Batch B** (MC3 on `mechanics-descent`, section `tautochrone`, existing `descent` actions; all handler checks passed) and this handoff docs commit are publishing together in one background publish on base `a22915a0` (`just publish --status`). Then watch that push's full CI run; it covers both commits, because they are in one push.
- No worker is running.

## Owed

- Per family task files list their owed items (F4 guided examples, F5 poster/clip/thumbnail, F6). New this handoff: analytic lines task 05, isometries task 06, circle geometry task 05, kinematics task 05, waves task 05, mechanical curves task 05 — no browser look at the new modes during the lessons or at the new chapter sections (one default smoke row per Demonstration). Waves: after a mode change the status keeps "čas je vrnjen na 0" while the slider moves (`WavesGraph`). Mechanical curves: the descent graph's readouts and status show equal times at t = 0, before step 1's prediction (graph unchanged). Isometries: several published Batch A steps (L1, L2) state answers in the explanation; owed to a later content pass.
- Lesson text Slovenian is reviewed by Sonnet only; terms added to `docs/localization.md` with notes (marked handler-unreviewed).
- Older items: `git show 6ccf1da3:docs/reviews/feature-streams/families-prep/state.md`, section "Owed".

## Next

1. Confirm the publishes and CI runs named under In flight.
2. Combinatorics Batch B (task 05), the last earlier family with an existing graph: check the spec's batch table first; it is F3 only if the graph already has the modes. Use the four briefs of `.command-logs/f3-mech-b/` as templates.
3. Linear-maps Batch B (task `docs/tasks/linear-maps/08-batch-b.md`: an ADR on the eigen-direction predicate after trying drag feel, plus F2a eigen and ellipse modes) unblocks phase-portraits Batch A and linear-maps Batch D; it needs a graph worker per mode before any lesson. No other stream claims it.
4. F4 (chapter guided examples) per chapter once its F3 lessons exist.

Rules to keep: at most two workers in the stream at once, and only one F3 worker editing at a time (a read-only reviewer may run beside it); never edit shared host files (`BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/`, the lesson runtime, `src/graphs/base/` apart from test lists). At handoff, launch the successor from this worktree with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`, and pass this self-spawn rule on.
