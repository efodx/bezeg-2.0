# Families-prep state note

Handler 16 handed off on 2026-11-13 to handler 17. The worktree is on branch `worktree-stream-families-prep-2`. Rewrite this note at your handoff.

## Setup

- `.claude/settings.local.json` (untracked, budget scale 1.5) and `npm ci` are done in this worktree.
- Shell calls can take minutes while other streams hold the two test slots. Run long checks in the background.
- Publish with `just publish --background --recipe <docs|tooling|runtime> --base <last published local commit> --commits <id,...>`; the commit list must be exactly `base..HEAD`. `tests/*.spec.cjs` or `src/` needs `runtime`; `scripts/` alone needs `tooling`. The gate runs `check-changed` itself (15 minutes when localization or shared lesson files change) and checks added Markdown links. Then `just publish --status`. `bash .command-logs/h12-slowci.sh <run id>` (background) polls a hosted CI run every two minutes. The owner asked that this stream keep master's CI green. A newer push cancels the running CI run of an older one; then watch the newest master run, which covers both. The pushed sha differs from the local one when master moved; the base for the next publish is still the local commit.
- If master CI is red from another stream, find the commit (`gh run view <id> --log-failed`), message that stream's handler (`ListAgents`), and fix only with its agreement, in a separate worktree off `origin/master` (`git worktree add --detach ../<name> origin/master`), pushing as a fast-forward; never rebase this tree while a worker runs. Run `node --test scripts/ci-change-scope.test.cjs scripts/transient-state-scope.test.cjs` yourself when `scripts/` or graph registration moves.
- If a publish fails at `reconcile`, abort the rebase in the kept publish worktree (`git -C <publish worktree> rebase --abort`), rebase only your new commits here with `git rebase --onto origin/master <last published local commit>`, resolve mechanically, rerun `just check-changed`, and publish on the new base.
- Run `git diff --cached --check` before committing. Python on Windows writes CRLF in text mode: open files with `newline=''`. `python -I` ignores `PYTHONIOENCODING`: print non-ASCII with `ascii()`.
- **CRLF normalization skips binaries:** handler 16's loop ran `sed` on two new PNGs and corrupted them (recaptured). Use `for f in $(git diff --name-only) $(git ls-files --others --exclude-standard src docs); do case $f in *.png) continue;; esac; n=$(tr -cd '\r' < $f | wc -c); [ $n -gt 0 ] && sed -i 's/\r$//' $f; done`.
- **Chapter card images:** a new chapter section needs a start-frame PNG: add the opening matrix to `scripts/generate-guided-example-inventory.cjs`, regenerate with `--chapter linear-maps`, build, `just preview <port>`, `PREVIEW_BASE_URL=http://127.0.0.1:<port>/bezeg-2.0 node scripts/capture-guided-example-previews.cjs docs/reviews/linear-maps/guided-example-inventory.json --family linear-maps` (default port 4387 is often taken by another worktree), stop the server. A stale `import.meta.glob` in `node_modules/.vitest-cache` hides new PNGs locally: delete the cache, do not edit `guidedExamplePreviews.ts`.
- Sweeps for one Demonstration: `.command-logs/lm-d/h-final.sh` runs unit (`src/learning src/graphs/linear src/linear`), the six sweeps, `check-changed` and `smoke-lesson linear-map`; derive a new one with `sed` on its `L=` line.
- Reviewers and smoke workers: never bare `npx vitest`/`npm test`/playwright test runs. Smoke workers build, serve with `just preview` in the background and run a node Playwright script; lesson controls are inert until the panel is hidden with "Skrij".
- Tool-channel pitfall: shell heredocs, `node -e` strings and Python strings sent through the shell halve backslashes. Edit lesson TS with Read+Edit, or build backslashes with `chr(92)`/`String.fromCharCode(92)`.
- A worker that reports while "waiting on its own background work" must be stopped with TaskStop before the next worker edits the tree.
- **CI after a cancelled push:** a docs-only push directly after a cancelled code push takes the docs-only CI path; then dispatch `gh workflow run browser-smoke.yml --ref master` and watch it.
- **Lesson content slices** (two lessons): the content worker hits HANDOFF after writing both lessons and the probe (twice this handoff); a test worker continues from its note while a Sonnet reviewer reads the lessons; the handler applies review fixes, then a join worker adds chapter sections, registry, preview copy and images, and test lists; then a Sonnet smoke walk. Briefs: `.command-logs/lm-d/brief-{s1,s1b,review,s2,smoke}.md` (latest), `.command-logs/lm-f3/` (L3/L4).

## Done

- F0–F2b for all fifteen families (handlers 7–9); F3 Batch A (handlers 10–13); F3 Batch B for trigonometry, analytic lines, isometries, circle geometry, kinematics, waves, mechanical curves (handlers 13–14), combinatorics (handler 15). Older detail: `git show 59f3726d:docs/reviews/feature-streams/families-prep/state.md`.
- Handler 16:
  - Confirmed handler 15's publishes: ellipse mode pushed `96b1ebf3` (CI green), handoff docs `43b8cdb6` (CI green).
  - **Linear-maps Batch B F3–F6 done:** L3 and L4 `5f3c7ddd` (pushed `4b336b64`, CI green) and the smoke repair `de5170a6` (pushed `dca9abad`, CI green): sections `eigen-directions`, `singular-ellipse`. Review: one blocking finding (eigen-mode opening showed the asked eigenvalue). Smoke: the snap moves v to the nearest eigen-direction, so `eigen-second` now has the learner set v near the computed direction first. Spec "F3 Batch B decisions"; note `notes/lm-f3-s1.md`; task 08 closed with owed items.
  - **Linear-maps Batch D F3–F6** (L6 power method, L7 trace and determinant): `set-start`/`step` moved into the shared `LessonAction` union; sections `power-method`, `trace-determinant`; review one blocking finding (td-triangle worked example answered the prediction), smoke no defects. Spec "F3 Batch D decisions"; note `notes/lm-d-s1.md`; task 11 status. Publish state: see In flight.
- **Recurring review findings** for lesson content (every content brief carries them; `.command-logs/lm-d/brief-s1.md` is the latest): a mode that shows readouts or lines at once must not open a step that predicts them (open in `basis` and name the mode to choose); an earlier step's opening must not show a later step's answer; a control named in a prompt must do what the prose says from that opening (probe it); worked examples must not evaluate the step's answer; the `summary` and titles render before step 1; no claim true in one case stated generally; rounded numbers approximate, exact never; English math uses a decimal point.

## In flight at handoff

- The Batch D commit and the handoff docs commit (this note and the evaluation entry) publish together in one push on base `de5170a6` with the task 08 docs commit `7d3e9ee9` and this correction (`just publish --status`). A first publish on the wrong base `7d3e9ee9` was stopped before its push (log `.command-logs/publish-93340182-858125.aborted-wrong-base.log`). Watch that push's CI run (`gh run list --workflow browser-smoke.yml --branch master --limit 3`). If the publish failed, read its log, fix, and republish on the same base with both commits.
- No worker is running.

## Owed

- Linear-maps task 08 and 11 (see their status lines): Presentation mode and figure export of the eigen, ellipse, iterate and tracedet modes not checked; touch drag; the example option "S_y" shows a literal underscore; L7 inset labels overlap at 390 px; L6 step 7 and L7 steps 5–7 controls not exercised in the browser; the Slovenian eigen help text ("povedana toleranca … nikoli točno") wants rewording; label overlaps at 390 px (N's σ₂, E's a₁/a₂).
- Combinatorics task 05, analytic lines task 05, isometries task 06, circle geometry task 05, kinematics task 05, waves task 05, mechanical curves task 05: no browser look at the new modes during the lessons or at the new chapter sections. Waves: after a mode change the status keeps "čas je vrnjen na 0". Mechanical curves: descent readouts show equal times at t = 0. Isometries: published Batch A steps (L1, L2) state answers in the explanation.
- Lesson text Slovenian is reviewed by Sonnet only; terms in `docs/localization.md` marked handler-unreviewed.
- Older items: `git show 6ccf1da3:docs/reviews/feature-streams/families-prep/state.md`, section "Owed".

## Next

1. Confirm the Batch D publish and its CI run; then publish the handoff docs commit.
2. **Phase portraits task 05 (Batch A: PP1–PP2 lessons)**, now unblocked by linear-maps Batch B (update its status line `docs/tasks/phase-portraits/05-batch-a-lessons.md:9`); spec `docs/specs/phase-portraits-lessons.md` sections PP1, PP2; the chapter skeleton exists from task 07 (PP4, PP5, handler 12, note `notes/f3-pp-c.md`). Use the lesson content slice pattern above. Also phase portraits task 07 F4–F6 (chapter guided examples, gate).
3. Linear-maps Batch C (task 09: L5 composition and affine maps) is planned but needs F2a first (a composition mode); check its task before starting.
4. F4 (chapter guided examples) per chapter once its F3 lessons exist.

Rules to keep: at most two workers in the stream at once, and only one worker editing the tree at a time (a read-only reviewer and a smoke worker may run beside it); never edit shared host files (`BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/`, the lesson runtime, `src/graphs/base/` apart from test lists). At handoff, launch the successor from this worktree with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`, and pass this self-spawn rule on.
