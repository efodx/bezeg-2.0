# Bézier patches handler handoff 15 — 2026-10-28

Current entry point; supersedes [handoff 14](handler-handoff-14.md). Objective unchanged: finish `docs/tasks/bezier-patches` tasks 07–14 in index order under AGENTS.md (standing authorization: delegation, commits, fast-forward master push). Task 08 is complete; task 09 implementation is nearly done.

## Successor rule (owner instruction, 2026-10-28)

At your context handoff, commit and push your handoff note, then start your successor yourself: `claude --bg -n "bezier-patches handler <n+1>" --agent claude --model claude-opus-5-5 --permission-mode auto "<prompt>"` from your working directory (CLI at `%APPDATA%\npm\claude`; docs/agent-workflow.md handler budget step 6). The prompt names your note, says to continue under AGENTS.md, and repeats this rule so every successor starts the next one. Do not launch when the remaining work needs an owner decision, would repeat a failed step, or the objective is complete; if the launch fails, end with the note path and a paste-ready prompt. Report the session id, note path and commit in your final message. Repeat this rule in your own handoff note.

## Git state

- `origin/master` = `0e59092` (task 08 repairs `001c1bb` + closure docs). Master CI (Browser smoke) for `0e59092`: success.
- `origin/bezier-patches-wip` = this note's commit: master + `86d6b9f` (09B1 pure differentials), `da0dbf2` (09A `patch-decasteljau`), `71c2773` (09B2 `patch-derivatives`, partial, plus the 09A/B1 review record), then this note. **Not on master** — push after task 09 acceptance.
- Worktree `.claude/worktrees/bezier-patches-r2`, branch `worktree-bezier-patches-r2`. Scratch in the worktree's `.claude/scratch/` (smoke08r scripts there). Main checkout: leave `debug.log` and the stale uncommitted R2 diff for the owner.

## Done this phase (handler 15)

- **Task 08 closed.** 08R repair (`001c1bb`, [brief](t08r-brief.md)): dash patterns for `iso-v`/`iso-w`/`compare` (`SURFACE_DASH`, scaled to scene extent), `P`-subscript editor legends, split compare note, wording, test-claim narrowing. Haiku re-review: no findings; Haiku smoke recheck 7/7; handler retuned `iso-w` to 0.014/0.014 after faint dots. `just check` 4189. Acceptance table in [triangular-workspace.md](triangular-workspace.md); evaluation-log record appended; task file + index marked complete.
- **Task 09** (evidence file [construction-derivatives.md](construction-derivatives.md), which holds both reviews):
  - 09A ([brief](t09a-brief.md), [handoff](t09a-handoff.md)): route, `columnsFirstScheme`, scene builder, DTO `decasteljauOrder`, role `construction-2`; two Sonnet-high workers (first hit 135k at 50 turns; second 31 tool uses), 10 observed mutation failures.
  - 09B1 ([brief](t09b1-brief.md)): `tensorDerivatives.ts`, one worker, 15 tool uses, 5 mutations observed.
  - Handler `just check` on 09A+09B1: 4387 passed.
  - Reviews of `0e59092..da0dbf2` (Sonnet medium ×2): no high/medium. Low findings M1–M3 (test strength), E1–E4 (E2 = stage-2 markers differ by hue only) listed in the evidence file with remedies.
  - 09B2 ([brief](t09b2-brief.md), [handoff](t09b2-handoff.md)): route implemented and committed as partial after the worker hit 135k (56 tool uses). Its run: full vitest 4433 passed, tsc 0, eslint clean. Handler did **not** rerun checks on `71c2773` or review its diff yet.

## Remaining steps, in order

1. **Finish 09B2** from [t09b2-handoff.md](t09b2-handoff.md) with one fresh `bezeg-worker` Sonnet high (≤25 turns): `threeSurfaceView.test.ts` role/dash/contrast/plane lifecycle tests, `planes` finite-coordinate check, observed mutations, `just build`. Fold in the 09A/B1 low repairs in the same or a second small slice: M1–M3 test strengthening, E2 stage-2 marker size/shape, E4 single state write if cheap; decide E1 (handler lean: keep shared field list, document in capabilities) and record E3 (interim poster) for task 13.
2. Review the 09B2 diff (`da0dbf2..` the finished commit): engineering+UI/a11y Sonnet medium (scene contract `planes`, transparent plane disposal, Uredi readout placement — worker flagged it sits at the end of Uredi, vector colour/dash distinctness, `TensorPatchGraph`/`TensorPatchPanels` `startingPatches` hook consumers) and a math review of `TensorDerivativesScene` + degenerate status text (Sonnet medium).
3. Smoke (`bezeg-smoke` Sonnet medium, first pass of new UI): `/patches/decasteljau` (three orders, switch, Reset, Preset, English, 390×844) and `/patches/derivatives` (corners, readout, degenerate Presets show status and no plane/normal, plane visible and not z-fighting, English, 390×844), retained `/patches/tensor`; ADR0018 drag/orbit measurement on both new routes (budgets: drag next-rAF p95 ≤ 60 ms, orbit ≤ 16,7 ms, active frame ≤ 50 ms). Name inspector tabs Uredi/Prikaz/Shrani.
4. Docs: capabilities (two routes, DTO fields `decasteljauOrder`, `showTwist`, interim posters), ui-functionality, current-architecture (scene roles, `planes`), task 09 evidence acceptance table; `just check`; push master fast-forward, mirror wip, CI; evaluation-log record for task 09 (both route slices needed a second worker at ~50 turns — routes with wiring + DTO + localization exceed one ~30-turn slice; split route core vs tests/wiring next time); mark task 09 complete.
5. Tasks 10–14 in index order. Carried: task 13 owns triangular preview framing, the opening-camera policy (S2) and real posters for `patch-decasteljau`/`patch-derivatives`; task 12 owns placeholder lesson sections `tensor-decasteljau`, `tensor-derivatives`, `triangular-patches`, `curve-to-patch`; task 14 adds patch smoke-checklist rows and the tensor-inset single-jump observation from task 08.

## Settings

Handler Opus 5.5, auto mode. Handler self watcher soft threshold 175k (owner override of 150k; also in project memory), then 190k closeout. Workers: `bezeg-worker` Sonnet high for implementation/repairs, Sonnet medium for math/engineering review, Haiku for narrow re-reviews; `bezeg-smoke` Sonnet medium for first-pass smoke, Haiku medium for narrow rechecks. Watchers 135k / Haiku 78k (the launch hook prints the command). At most three workers at once; give one worker preview/build ownership. Route slices with full wiring hit 135k at ~50 turns — split them in two from the start.
