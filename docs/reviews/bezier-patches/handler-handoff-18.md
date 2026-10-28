# Bézier patches handler handoff 18 — 2026-10-28

Current entry point; supersedes [handoff 17](handler-handoff-17.md). Objective unchanged: finish `docs/tasks/bezier-patches` tasks 07–14 in index order under AGENTS.md (standing authorization: delegation, commits, fast-forward master push). Tasks 07–09 are complete; task 10 is in progress: both routes are done, reviewed, smoked and on master; the teapot capstone (10T) and closure remain.

## Successor rule (owner instruction, 2026-10-28)

At your context handoff, commit and push your handoff note, then start your successor yourself: `claude --bg -n "bezier-patches handler <n+1>" --agent claude --model claude-opus-5-5 --permission-mode auto "<prompt>"` from your working directory (CLI at `%APPDATA%\npm\claude`; docs/agent-workflow.md handler budget step 6). The prompt names your note, says to continue under AGENTS.md, and repeats this rule so every successor starts the next one. Do not launch when the remaining work needs an owner decision, would repeat a failed step, or the objective is complete; if the launch fails, end with the note path and a paste-ready prompt. Report the session id, note path and commit in your final message. Repeat this rule in your own handoff note.

## Git state

- `origin/master` = `origin/bezier-patches-wip` = `6d8d48b` (before this note's commit, which goes to the wip branch and master). Master CI for `6d8d48b` was **not yet confirmed** at handoff; the previous master `c78b441` was green (run 40740657465).
- Worktree `.claude/worktrees/bezier-patches-r2`, branch `worktree-bezier-patches-r2`. No uncommitted work. Scratch in `.claude/scratch/`. Main checkout: leave `debug.log` and the stale uncommitted R2 diff for the owner.

## Done this phase (handler 18)

| Commit | Content | Evidence |
|---|---|---|
| `515d82a` | Route cores 10S-1/10J-1 ([brief](t10sj-core-brief.md)): `TensorSubdivision{Graph,Scene}`, `TensorJoin{Graph,Scene}`; optional route fields on `TensorPatchGraphState` (handler), `settleNet` hook + `netWithDegree` in `TensorPatchGraph.tsx` | 35 + 38 tests; mutations observed (10J-1 15/16, one equivalent mutant M6); `just check` 4605 |
| `1b15888` | 10W-S `patch-subdivision` route ([brief](t10w-brief.md), [handoff](t10ws-handoff.md)); recipes/smoke catalog accept a declared 0 control points for this route (pieces make the scene non-editable) | 13 mutations; poster by selective recapture (`VERIFIED_PRESENTATION` only because the recipes file changed); built smoke 119/0; `just check` 4670 |
| `3c38f9c` | 10W-J `patch-joins` route ([handoff](t10wj-handoff.md)); starting scenes C1, G1 α=2, C0 kink; `Slider` `disabled` prop; `framedPoints` hook | 39 panel tests, 8 mutations; poster recaptured (32 points framed); built smoke 120/0; `just check` 4719 |
| `d3a44fc` | Review repairs: [math review](t10-math-review.md) M1 (`c0-planes` report case, angle tolerance `COINCIDENT_PLANES_ANGLE = 1e-6` in `TensorJoinPanels.tsx`), L1, L3; [engineering review](t10-engineering-review.md) medium (subdivision point editor locked via `pointLocked`), α `aria-describedby`, no setState in render | 6 mutations; `just check` 4723 |
| `6d8d48b` | Docs: capabilities (table + sections), ui-functionality, current-architecture | — |

Reviews: math 0 high / 1 medium / 4 low (L2, L4 accepted as is); engineering+UI 0 high / 1 medium / 5 low (the `checkState`-for-all-collections behaviour judged consistent with `decasteljauOrder`/`showTwist`; derived B points look draggable but a drag is silently refused — accepted low). Smoke (`bezeg-smoke` Sonnet medium, real WebGL2/SwiftShader, 1366×768 and 390×844): all selected checks pass on both routes, no console errors; gaps: joins Preset export/import, `none`/`C0` on a non-C1 scene, touch. Expected behaviour noted: switching the default C1 pair to none/C0 keeps its free rows, so the measured report stays C1.

Poster note: `patch-subdivision.png` sits slightly right of centre and `patch-joins.png` has overlapping `S(u,v)`/`S_{B,u}` labels — revisit with task 13 posters/motion.

## Remaining steps, in order

1. Confirm master CI for `6d8d48b` (and this note's commit) is green: `curl -s "https://api.github.com/repos/efodx/bezeg-2.0/actions/runs?branch=master&per_page=3"`. If it fails, reproduce locally (`just build`, then `SMOKE_TEST_IGNORE='**/guided-lessons.smoke.spec.cjs' CI=true npm run test:smoke:built`).
2. **10T teapot capstone** ([teapot-data.md](teapot-data.md), [fixture](teapot-fixture.md), prototype `docs/prototypes/bezier-patches/teapot-data.js`): production asset with licence/provenance beside it; a `patch-joins` Preset/scene at tiling 8 rendering all 32 owners, no editable net/inset, no extra default surface (the join graph's two-patch model does not apply: decide a read-only capstone mode or a separate scene, and record the decision); plus the task 07 carried item (reuse last scene geometry when `revision` is unchanged — `reconcileView` → `buildScene` re-samples on every orbit pointermove) and orbit-frame measurement against ADR 0018 (active-frame budget). Brief like the others (`docs/reviews/bezier-patches/t10t-brief.md`); likely two slices (asset + scene/Preset; geometry reuse + measurement). Math check: patch count, corner/boundary sharing between owners, licence recorded.
3. Smoke teapot orbit/export/resize and active-frame budget (`bezeg-smoke`); rerun `tests/demonstrations.smoke.spec.cjs` (built smoke) if any route/preset/poster changes; `just check`; push master fast-forward + mirror wip; CI.
4. Record task 10 in [subdivision-joins.md](subdivision-joins.md) (route cores, wiring, reviews, smoke, teapot), update spec/task status, evaluation record (`.agents/skills/subagent-flow-evaluation/SKILL.md#do-log`) covering handler 17's workers (10M, CI posters, math review, stopped 10S-1/10J-1) and handler 18's workers: 10S-1 (Sonnet high, 30 tools, 89k, complete), 10J-1 (Sonnet high, 35 tools, 118k, complete), 10W-S (Sonnet high, 71 tools, 144k, HANDOFF partial — poster blocked by 0-point framing wait), 10W-S2 (Sonnet high, 41 tools, 66k, complete), 10W-J (Sonnet high, 49 tools, 142k, HANDOFF partial — no tests), 10W-J2 (Sonnet high, 49 tools, 97k, complete), math review (Sonnet medium, 17 tools, 68k), engineering/UI review (Sonnet medium, 16 tools, 59k), repairs (Sonnet high, 37 tools, 69k, complete), smoke (Sonnet medium, 39 tools, 56k, pass). Lesson: a full route-wiring slice (panels + ~50 keys + DTO + collection + wiring + tests + poster + smoke) exceeds one Sonnet worker's 135k budget; split into wiring and tests/poster/smoke from the start. Mark task 10 complete.
5. Tasks 11–14 in index order; carried items as in [handoff 16](handler-handoff-16.md#remaining-steps-in-order) step 3; the motion clips of all six patch routes and the two poster cosmetics above remain for task 13. Task 12 authors sections `tensor-subdivision` and `tensor-joins` (placeholders in `guidedLessonOwnership.ts`).

## Lessons to keep

- Any new route needs a generated poster before push: `tests/demonstrations.smoke.spec.cjs` rejects hand-mapped previews and `just check` does not run it. A route whose default scene has no draggable points needs `surfaceControlPointCounts` in the recipes (see `1b15888`).
- `just build` fails with "inputs changed while building" while another worker edits `src/`; give the build owner a quiet tree.
- Handler 16's lessons still apply (no mutation checks during a full `just check`; `just preview` needs a fresh build; Edit tool for backslash strings; CRLF in `en.ts`/`sl.ts`).
- Handler 18 did two route cores + two route wirings + reviews/repairs/smoke within budget by keeping worker reports short and stopping each watcher on return.

## Settings

Handler Opus 5.5, auto mode. Handler self watcher soft threshold 175k (owner override of 150k; also in project memory), then 190k closeout. Workers: `bezeg-worker` Sonnet high for implementation/repairs, Sonnet medium for math/engineering review, Haiku for narrow re-reviews; `bezeg-smoke` Sonnet medium for first-pass smoke, Haiku medium for narrow rechecks. Watchers 135k / Haiku 78k (the launch hook prints the command). At most three workers at once; give one worker preview/build ownership.
