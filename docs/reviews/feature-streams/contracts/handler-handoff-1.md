# Contracts handler handoff 1

Written 2026-11-07 at `BUDGET SOFT`. Read this and the [handler card](../../../agent-workflow/handler-card.md), then continue. Same worktree (`.claude/worktrees/stream-contracts`), branch `worktree-stream-contracts`. Keep: `--agent bezeg-handler --model opus --permission-mode auto --effort medium`, card routing, at most two workers. Pass this launch line on to your successor. Port 4318.

## Accepted

Steps 1 and 2 (tasks 1 and 5) are on `master`: `f6da5b14` conic types, `a8d5d788` series evaluation, `0c581578` acceptance docs. Evidence sits beside the [queue](../../../tasks/mathematical-runtime-contracts/README.md). Full unit, lint and build passed on the combined tree; typecheck and focused suites passed after rebasing onto `5825ceba`.

## First: hosted CI

`0c581578` failed in `chromium (lessons-3, guided-lessons shard 3/3)` and `smoke`, so it did not deploy. The same two jobs failed on `5825ceba`, the parent, which is another stream's `fix: keep guided lesson navigation in place`. `325d36ec` (`fix: preserve page position between lesson frames`) followed and its run was cancelled. `2e8eae43` was running at handoff, and it contains our commits.

Before pushing any application code, read the newest `master` run. `gh` is not installed, so `just ci` fails; use the public API: `curl -s -H "User-Agent: bezeg-handler" https://api.github.com/repos/efodx/bezeg-2.0/commits/<sha>/check-runs?per_page=30`. Job logs need authentication, and the annotations only say exit code 1. If the shard is green, go on. If it still fails, reproduce with `just build` then `just smoke-built tests/guided-lessons.smoke.spec.cjs --shard=3/3 --port 4318`, and decide whether a series, conic or lesson-navigation change is responsible. Series and conic lessons are in that suite, so do not assume it is the other stream's failure.

## Next slice: finish step 3's first item

Task: [one live function model](../../../tasks/mathematical-runtime-contracts/04-live-function-model.md), Work item 1. Spec: `docs/specs/mathematical-runtime-contracts.md` section 4, F1-F4. Dispatch a fresh `bezeg-worker` (Sonnet `medium`) from [the worker note](task4-inventory-worker-note.md), which holds the findings, the five test failure causes and the remaining steps.

- Goal: `src/graphs/functions/BaseFunctionGraph.authority.test.tsx` passes on unchanged production code with one observed mutation failure per group, and `docs/tasks/mathematical-runtime-contracts/04-consumer-inventory.md` exists, under 150 lines.
- Owned paths: those two files only. No production edits, no Git.
- The test file is untracked in this worktree (7 of 30 pass, typecheck not run). A copy is on `origin/contracts-task4-wip` in case the worktree is lost. It must not reach `master` failing. Delete that branch once the file is accepted.
- Raw counts: `task4-inv-counts.txt` and `task4-inv-counts2.txt` here. Columns are explained in the worker note.
- The first worker used 145k tokens, mostly on the inventory, so the fresh one should mainly fix tests. Cap it at the note's steps.

## Step 3 inputs for the design

Facts from the inventory, unreviewed by the handler except where the code was read:

- 42 classes, not 36: 36 direct subclasses plus 6 through `IterativeFunctionGraph`. Task and spec say "every subclass", so count 42.
- No subclass writes `this.model`, calls `setState`, or overrides the scene hooks; `commitModel` (`BaseFunctionGraph.tsx:263`) is the one write path. 22 subclasses read `this.state` flat, 19 read `stateSnapshot()`.
- Stored `graphState` carries flat model fields, and `data` wins at restore. Ten collections in `functionPresetCollections.ts` override `checkGraphState` for that reason. `checkSceneState` (`PresetCollection.ts:36`) applies name rules to flat fields.
- Compgeo and projective graphs already hold a nested `model` in state and strip it on export (`PointSetGraph:451`).
- `graphTransientStateContract.tsx:392` and `BaseFunctionGraph.test.ts:167` pin the flat shape, and about 45 test files read `.state`.
- Pilots: `LinearFunctionGraph` (simple), `BinomialNormalGraph` (cache-heavy).

Direction I would take, not yet decided. Record the choice and rejected alternative in the spec:

1. `FunctionGraphState<M> = BaseGraphState & {model: M}`, with `model` a getter over `state.model`, so reads keep identity and allocate nothing. `commitModel` becomes the one store write. Check the late-write-after-unmount path at `:265`, which today only updates the mirror, and the remount reset at `:188`.
2. Files keep their flat `graphState` through edge adaptation on export and import, so no file shape changes and the `checkGraphState` overrides stay. Persisted validation stays with Controls step 7.
3. Migrate one family per commit and push each, as `contracts.md` requires. That needs a short-lived flat projection until the last family, then deletion of it with `stateSnapshot()` and the reconciliation at `:435`, `:441`, `:454`. F4 forbids it staying. `memoView` keys on field values and can stay.

Before migrating, read `controls.md` on `origin/master`: Controls has accepted its task 0, and a family under sweep waits. Task 4 requires broad production smoke of function-derived families; if the shared host changes, run the full checklist.

## Then

Step 4, lesson-authoring workstream 2, is queued in `contracts.md`: write its task file from the spec first, and it opens Controls step 9. Keep it to lesson lookup and out of `GuidedLesson.tsx`, which Codex is editing.

## Open

- `series_fields_help` says `q` reaches exactly −1 and 1, while the slider and model allow −2 to 2. It predates this stream and was left alone. It may mean "lands exactly on". Decide it under the localization rules or leave it; it is not task acceptance.
- The evaluation entry for step 3 starts from the first worker: partial at `HANDOFF`, 145,328 tokens, 62 tools, 1,562 s.
