# Bézier patches handler handoff 17 — 2026-10-28

Current entry point; supersedes [handoff 16](handler-handoff-16.md). Objective unchanged: finish `docs/tasks/bezier-patches` tasks 07–14 in index order under AGENTS.md (standing authorization: delegation, commits, fast-forward master push). Tasks 07–09 are complete; task 10 is in progress.

## Successor rule (owner instruction, 2026-10-28)

At your context handoff, commit and push your handoff note, then start your successor yourself: `claude --bg -n "bezier-patches handler <n+1>" --agent claude --model claude-opus-5-5 --permission-mode auto "<prompt>"` from your working directory (CLI at `%APPDATA%\npm\claude`; docs/agent-workflow.md handler budget step 6). The prompt names your note, says to continue under AGENTS.md, and repeats this rule so every successor starts the next one. Do not launch when the remaining work needs an owner decision, would repeat a failed step, or the objective is complete; if the launch fails, end with the note path and a paste-ready prompt. Report the session id, note path and commit in your final message. Repeat this rule in your own handoff note.

## Git state

- `origin/master` = `c78b441` (CI fix + 10M; master CI run 40740657465 **success**, deploy done).
- `origin/bezier-patches-wip` = master + `aa3a1cf` (`net-2` role; view tests, tsc, eslint passed; no full `just check` yet — push it to master with the route cores) + this note's commit.
- Worktree `.claude/worktrees/bezier-patches-r2`, branch `worktree-bezier-patches-r2`. No uncommitted work. Scratch in `.claude/scratch/`. Main checkout: leave `debug.log` and the stale uncommitted R2 diff for the owner.

## Done this phase (handler 17)

- **Master CI repair.** Run 40736789041 (`739f445`) failed in `tests/demonstrations.smoke.spec.cjs`: task 09 routes reused the `patch-tensor` poster in the generated preview map. Fixed in `c78b441` (recipes + selective recapture, posters inspected, non-lesson smoke 118/0, `just check` 4531); cause recorded in [construction-derivatives.md](construction-derivatives.md#master-ci-failure-after-closure-handler-17). Pushed to master.
- **10M** pure model `4064fb6` (on master): [model + review record](subdivision-joins.md); `tensorSubdivision.ts`, `tensorJoins.ts`, 37 tests; Sonnet-medium math review: no high, M1/M2 fixed by the handler, lows documented. Model accepted for controls.
- **`net-2` scene role** `aa3a1cf` (burnt orange, medium-dashed; view tests + observed mutation failure).
- **10S-1 / 10J-1** route cores ([brief](t10sj-core-brief.md)): dispatched in parallel, stopped first by the account 5-hour usage limit (reset 21:10 Ljubljana) and then by this handler's 190k closeout before writing code. Their research is in [t10s1-handoff.md](t10s1-handoff.md) and [t10j1-handoff.md](t10j1-handoff.md) (plans, public methods, DTO fields + validation rules, test/mutation plans).

## Remaining steps, in order

1. Confirm master CI for `c78b441` is green (`curl -s "https://api.github.com/repos/efodx/bezeg-2.0/actions/runs?branch=master&per_page=3"`; no `gh`). If a job fails, logs need auth: reproduce locally (`just build`, then `SMOKE_TEST_IGNORE='**/guided-lessons.smoke.spec.cjs' CI=true npm run test:smoke:built`).
2. **10S-1 and 10J-1 route cores.** First, as handler (decision on the 10S-1 blocker, option 1): add the optional route fields to `TensorPatchGraphState` (`src/graphs/patches/TensorPatchGraph.tsx:21`), like the derivatives fields — `subdivisionDirection?`, `subdivisionValue?`, `showPieces?`, `joinContinuity?`, `joinAlpha?`, `joinV?`, `mB?`, `nB?`, `netB?` — so neither worker edits a shared type; workers map them in `stateDto`/`stateOf` with a local DTO type extending `PatchStateDto` (no casts). Then dispatch two fresh Sonnet-high workers on [t10sj-core-brief.md](t10sj-core-brief.md), each also given its handoff note; 10J-1 owns any protected hook in `TensorPatchGraph.tsx` (e.g. `setDegree` changing `B`'s `n`). Integrate, review the diff, `just check`.
3. **10W wiring** for both routes in one slice (one owner for the shared files): panels (`TensorSubdivisionPanels.tsx`, `TensorJoinPanels.tsx`; Uredi: direction, `u₀`, pieces switch, elevate buttons disabled at degree 4, correspondence readout; continuity mode, `α`, `B` degree, join report with C0/C1/G1 wording that never calls tangent-plane agreement matching derivatives, and the `derivativesVanish` case), `sl.ts`/`en.ts` (research Slovenian terms per docs/localization.md; e.g. *delitev*, *dvig stopnje*, *zlepek/stik krp*, *zveznost C0/C1*, *geometrijska zveznost G1*), `patchDto.ts` field validation, `patchPresetCollections.ts` (`patch-subdivision`, `patch-joins` collections + starting Presets), `demonstrations.ts` (routes `/bezeg-2.0/patches/subdivision`, `/bezeg-2.0/patches/joins`, prompts), `graphFactories.ts`, `guidedLessonOwnership.ts` + `guidedExamplePreviewCopy.ts` (task 12 sections), preview recipes + selective poster recapture (**required**, see the CI lesson), Reset/Preset/language-switch tests. Probably two workers in sequence (subdivision wiring, then joins wiring) to stay within ~25 turns each.
4. **10T** teapot capstone ([teapot-data.md](teapot-data.md), [fixture](teapot-fixture.md), prototype `docs/prototypes/bezier-patches/teapot-data.js`): production asset with licence/provenance beside it; a `patch-joins` Preset/scene at tiling 8 rendering all 32 owners, no editable net/inset, no extra default surface; plus the task 07 carried item (reuse last scene geometry when `revision` is unchanged) and orbit-frame measurement against ADR 0018.
5. Reviews (math of the scene/report wording; engineering + UI/a11y), smoke both routes + teapot orbit/export/resize and active-frame budget (`bezeg-smoke`, Sonnet medium), **run `tests/demonstrations.smoke.spec.cjs`**, docs (capabilities, ui-functionality, current-architecture, spec status), `just check`, push, CI, evaluation record (`.agents/skills/subagent-flow-evaluation/SKILL.md#do-log`; include this phase's workers: 10M, CI posters, math review, 10S-1, 10J-1), mark task 10 complete.
6. Tasks 11–14 in index order; carried items as in [handoff 16](handler-handoff-16.md#remaining-steps-in-order) step 3, except that the `patch-decasteljau`/`patch-derivatives` **posters** are done (their motion clips and those of `patch-tensor`/`patch-triangular` remain for task 13).

## Lessons to keep

- Any new route needs a generated poster before push: `tests/demonstrations.smoke.spec.cjs` rejects hand-mapped previews and `just check` does not run it.
- `just build` fails with "inputs changed while building" while another worker edits `src/`; give the build owner a quiet tree or retry.
- Handler 16's lessons still apply (two slices per route; no mutation checks during a full `just check`; `just preview` needs a fresh build; Edit tool for backslash strings; CRLF in `en.ts`/`sl.ts`).
- Handler context reached 175k at ~70 turns with three worker reports; budget roughly one task-sized step per handler.

## Settings

Handler Opus 5.5, auto mode. Handler self watcher soft threshold 175k (owner override of 150k; also in project memory), then 190k closeout. Workers: `bezeg-worker` Sonnet high for implementation/repairs, Sonnet medium for math/engineering review, Haiku for narrow re-reviews; `bezeg-smoke` Sonnet medium for first-pass smoke, Haiku medium for narrow rechecks. Watchers 135k / Haiku 78k (the launch hook prints the command). At most three workers at once; give one worker preview/build ownership.
