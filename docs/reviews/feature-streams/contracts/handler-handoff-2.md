# Contracts handler handoff 2

Written 2026-11-07 at `BUDGET SOFT`. Read this and the [handler card](../../../agent-workflow/handler-card.md), then continue. Same worktree (`.claude/worktrees/stream-contracts`), branch `worktree-stream-contracts`. Keep: `--agent bezeg-handler --model opus --permission-mode auto --effort medium`, card routing, at most two workers. Pass this launch line on to your successor. Port 4318.

## Accepted

- Work item 1: authority tests and [inventory](../../../tasks/mathematical-runtime-contracts/04-consumer-inventory.md), `5c973d40`, `d07f58c8`.
- Base slice: `ef8144bc`. The store owns the model and `commitModel` is the one write. Deployed; hosted CI green on `b4079eb0`. Decision and rejected alternatives are in the spec, section 4, "Representation".

Handoff 1's hosted CI failure has cleared.

## Not accepted: on `origin/worktree-stream-contracts` only

The pilots (Linear, Binomial) and F1 to F4 (25 of the 40 remaining classes) are committed per family on this branch and are **not on `master`**. Focused family tests, typecheck and lint passed, and the full suite exited green, but its count is unexplained:

| Run | Revision | Passed | Skipped | Total | Log |
| --- | --- | --- | --- | --- | --- |
| Before | `ef8144bc` | 12,046 | 4 | 12,050 | `.command-logs/2026-11-07T05-25-08-082Z-51960-0f42b230.log` |
| After | `886a8822` plus F1 to F4 | 11,479 | 8 | 11,487 | `.command-logs/2026-11-07T06-07-53-969Z-45684-137f3b6f.log` |

That is 563 fewer tests and 4 more skipped, with the same 611 passed and 3 skipped files. Cause unknown. What is known: in the diff, test declarations changed only in their titles, so a generated or conditional suite is the likely place, but that is a hypothesis. It may be environmental rather than caused by these commits. The logs hold totals only.

## Test count: cause found, confirmation pending

Recorded 2026-11-07 by the next handler. **The drop comes from the transient state contract's local sampling, not from lost tests. The confirming `=all` comparison has not finished, so `master` stays closed.**

`GraphTransientState.part*.test.tsx` mounts all 118 Demonstrations only when the diff from the merge-base with `origin/master` touches a shared path; otherwise it mounts the 14-graph sample plus graphs named like a changed file ([scope rules](../../../commands.md)). Each graph is 8 tests, and each part that leaves graphs out adds 1 skipped placeholder. So the count depends on where `origin/master` is, not only on the code.

| Run | Revision | Graphs | Total | Skipped | Status |
| --- | --- | --- | --- | --- | --- |
| Handoff "before", 06:25 local | `ef8144bc`, master at `a0e95b32` | 118 | 12,050 | 4 | logged; `BaseGraph.tsx` in the diff, so all ran |
| Rerun | `ef8144bc`, master at `b4079eb0` | 14 | 11,222 | 8 | measured; 12,050 − 104×8 + 4 |
| Rerun | `3cf0cec7`, master at `b4079eb0` | 38 | 11,415 | 8 | measured; 12,051 − 80×8 + 4 |
| Handoff "after", 07:07 local | `886a8822` plus F1 to F4, dirty | 47 (inferred) | 11,487 | 8 | logged; master moved at 06:47 |

The per-file diff of the two reruns (`.claude/jobs/unit-before-sample.json`, `unit-after.json`) shows only the four part files changing, plus one test added to `BaseFunctionGraph.authority.test.tsx`. Twelve further tests were retitled. No test outside the part files was lost.

Not proven:

- **The 11,487 run.** It is 9 graphs above today's 38. No single file name adds exactly 9, and the transcript does not name the files, so this is inferred to be extra files dirty in that tree. It cannot be rerun.
- **All 118 graphs on this branch.** F1 to F4 have only ever run 38 of them locally, and `docs/commands.md` requires `BEZEG_TRANSIENT_STATE=all` before pushing restoration or Preset work. This is a verification gap as well as a count check.

Both `=all` runs were started and stopped by Claude Code for low system memory, with no results. That says nothing about the code. Its notice says to restart only when the owner asks. Once asked, run one at a time, with no `/` in any argument, then move the file:

- Here: `BEZEG_TRANSIENT_STATE=all just unit --reporter=default --reporter=json --outputFile.json=unit-after-all.json`
- In `.claude/worktrees/contracts-baseline` (detached at `ef8144bc`, `npm ci` done, nested here but outside Vitest's `src/**`): the same with `unit-before-all.json`.

Expect 12,050 and 12,051 totals with 4 skipped each, and only the known authority test differing. A failure or another difference means a commit is at fault: fix it (step 3 below). Remove the baseline worktree afterwards.

## First: explain the test count

Do this before anything else, and push nothing further to `master` until it is explained. Steps 1 to 3 are superseded by the section above, except the `=all` comparison it leaves open. Step 2's test is unsound: the baseline no longer reproducing 12,050 does not show an environmental cause by itself.

1. Run the full suite with a JSON reporter on this branch (`just unit --reporter=json --outputFile=.claude/jobs/after.json`) and on `ef8144bc` in a temporary worktree, or `b4079eb0` if that is simpler. Each run takes about 20 minutes.
2. Diff the per-file counts. Do not assume the baseline reproduces: if `ef8144bc` also shows about 11,487 now, the cause is environmental, and these commits are clear.
3. If a commit lost tests, fix it. The perf tests under `src/graphs/compgeo` use `skipIf`/`runIf` and may explain the skips.
4. Once explained, record the cause here, rebase, and push to `master` with `git push origin HEAD:master`.

## Then: finish step 3

1. **F5 and F6.** Dispatch from the [family brief](task4-family-brief.md), one worker each. Fourteen classes still read flat fields or `stateSnapshot()`, listed there; `IterativeFunctionGraph` has none itself. Commit per family. Each family took about 25k worker tokens.
2. **Audit every family yourself.** Workers reported three families "clean" while `stateModel()` copies survived in 12 classes, because the grep looked only for `this.state`. The brief now has the rule and the stronger grep. Also search for any other helper that rebuilds a model field by field under another name.
3. **Final commit, F4 of the spec.** Handler core, about the size of the base slice:
   - Type becomes `BaseGraphState & {model: M}`. Delete the flat spread in `modelPatch`, then `stateSnapshot()`.
   - `replaceState` stays. `importPreset` and `savedGraphState` stay as the file edge.
   - Check that casts in `commitModel` and `replaceState` are gone rather than kept.
   - Tests still reading flat `graph.state.<field>` fail here. The `AGENTS.md` sentence about scene `setState` stays true; do not edit it unless the code makes it false.
   - The two authority tests titled "current contract" and "current checkpoint shape" need their titles rechecked. Checkpoint `graphState` stays flat by design.
4. **Close task 4.** Update current architecture on live ownership (F4). Record representative drag and slider baselines (work item 4; none are recorded yet, see `docs/performance-plan.md`). Run a full unit suite, lint, build, an engineering review of the final diff, and the full browser checklist through `bezeg-smoke` (Sonnet), because the shared host changes. Then mark task 4 accepted in `contracts.md` and the [queue](../../../tasks/mathematical-runtime-contracts/README.md), and log the evaluation entry for the rest of the task.

Then step 4 of `contracts.md`, as handoff 1 describes: write the lesson-authoring workstream 2 task file first, keep it to lesson lookup and out of `GuidedLesson.tsx`. Re-read `controls.md` on `origin/master` first; on 2026-11-07 steps 1 to 4 were all pending, so no family was blocked.

## Risks and gaps

- Behavior change, recorded in the spec: a disposed graph keeps its last model until it remounts. Same-instance remount is proved by a unit test. The browser recheck used in-app navigation, which may build a new instance, so do not count it as proof.
- The review's low finding stands until the final commit: a flat reader could see a stale value if a Preset parser returned a partial model. Collection parsers were not audited for completeness. After the migration every reader sees `this.model`, exactly as before.
- Smoke at `d07f58c8`-plus-base: 494 of 495. `bspline-nurbs` failed once with `net::ERR_NO_BUFFER_SPACE` and passed on isolated rerun. `complex-roots` showed a 1e-13 path difference after Reset, judged harmless and not compared with an older build. No narrow-viewport, keyboard or Presentation check ran.
- F1 to F4 had unit checks only. The task's broad smoke at step 4 above covers them.

## Traps

- A background command's `exit code 0` is the last command's. End the command with `exit $rc`, and read `Tests` from the `.command-logs` file. This hid 241 failures once.
- A targeted run is not enough before calling a production edit safe: deleting a "redundant" store write passed the authority file and failed three tests in the full suite.
- `sed -i` across `*Graph.tsx` rewrote `CltGraph.tsx`'s line endings. Edit named files only, and check `git diff --stat` for whole-file diffs before staging.
- `git status` can list a file as modified with an empty diff; `git update-index -q --refresh` clears that.
- Multi-line heredocs sometimes fail in the shell wrapper. Write the script with the Write tool.
- Any `just unit` argument containing `/` or `.test.` counts as a path filter: the run skips the slot queue and gets 2 workers. Step 1's `--outputFile=.claude/jobs/after.json` would do this.
- Compare full-suite counts only under `BEZEG_TRANSIENT_STATE=all`. Default totals move whenever `origin/master` does.

## Owner item

`origin/contracts-task4-wip` should be deleted now that its file is accepted, as handoff 1 asked. The permission classifier refused it and it was not retried. It is harmless; leave it for the owner.

## Open from handoff 1

`series_fields_help` still says `q` reaches exactly −1 and 1 while the slider allows −2 to 2. Not task acceptance.
