# Bézier patches handler handoff 16 — 2026-10-28

Current entry point; supersedes [handoff 15](handler-handoff-15.md). Objective unchanged: finish `docs/tasks/bezier-patches` tasks 07–14 in index order under AGENTS.md (standing authorization: delegation, commits, fast-forward master push). Tasks 07–09 are complete; task 10 is next and not started.

## Successor rule (owner instruction, 2026-10-28)

At your context handoff, commit and push your handoff note, then start your successor yourself: `claude --bg -n "bezier-patches handler <n+1>" --agent claude --model claude-opus-5-5 --permission-mode auto "<prompt>"` from your working directory (CLI at `%APPDATA%\npm\claude`; docs/agent-workflow.md handler budget step 6). The prompt names your note, says to continue under AGENTS.md, and repeats this rule so every successor starts the next one. Do not launch when the remaining work needs an owner decision, would repeat a failed step, or the objective is complete; if the launch fails, end with the note path and a paste-ready prompt. Report the session id, note path and commit in your final message. Repeat this rule in your own handoff note.

## Git state

- `origin/master` = `739f445` (task 09 complete: `8b2007d` finish + repairs, `7447559` docs, twist dash retune, closure docs). Master CI (Browser smoke) for `739f445` was in progress at handoff (run 40736789041); **check it first** — `curl -s https://api.github.com/repos/efodx/bezeg-2.0/actions/runs/40736789041` (no `gh` CLI on this machine). Previous master `0e59092` CI: success.
- `origin/bezier-patches-wip` mirrors master plus this note's commit.
- Worktree `.claude/worktrees/bezier-patches-r2`, branch `worktree-bezier-patches-r2`. Scratch in `.claude/scratch/` (smoke09 scripts, incl. `h16-export.cjs` export/keyboard check and `h16-twist.cjs`). Main checkout: leave `debug.log` and the stale uncommitted R2 diff for the owner.

## Done this phase (handler 16)

- Task 09 finished and closed: 09C-X/09C-Y parallel slices ([brief](t09c-brief.md)), engineering and math reviews of 09B2 ([eng](t09b2-review-eng.md), [math](t09b2-review-math.md)), handler repairs, first-pass smoke ([task09-smoke.md](task09-smoke.md)), handler export/keyboard check, docs (capabilities, ui-functionality, current-architecture, spec status), acceptance table in [construction-derivatives.md](construction-derivatives.md#acceptance-handler-16), evaluation-log record, task + index marked complete. `just check` 4494 on the integrated tree.

## Remaining steps, in order

1. Confirm master CI for `739f445`; if it failed, diagnose before new work.
2. **Task 10** ([file](../../tasks/bezier-patches/10-subdivision-joins.md), evidence → `docs/reviews/bezier-patches/subdivision-joins.md`). Not started. Handler 16's plan (adjust if reading shows otherwise):
   - Already exists: `TensorProductBezierPatch.subdivide(direction, value)` and `.elevate(direction)` (`src/bezeg/impl/patch/tensor-product-bezier-patch.ts:284,299`). Teapot data + licence review: `docs/reviews/bezier-patches/teapot-data.md` (three.js r180 `0af9729`, MIT, Newell/SPD attribution), prototype extractor `docs/prototypes/bezier-patches/teapot-data.js`, fixture note `teapot-fixture.md`.
   - 10M (first, pure): join model module (e.g. `src/graphs/patches/tensorJoins.ts`) — shared boundary orientation (A at `u = 1` meets B at `u = 0`), degree matching along the boundary by elevation, C0 (shared boundary row), C1 (`m_A(P_m − P_{m−1}) = m_B(Q_1 − Q_0)` row-wise), G1 without C1 (positive scalar multiple ≠ the C1 ratio), cross-boundary derivative checks on the displayed pair incl. non-C1 counterexamples; subdivision piece maps (`S_L(s, v) = S(u₀ s, v)`, `S_R(s, v) = S(u₀ + (1 − u₀) s, v)`). Write the model section into the task 10 spec/evidence and get a Sonnet-medium **math review before building controls** (task requirement).
   - 10S: `patch-subdivision` route — split as **two slices** (route core + scene; then wiring/DTO/localization/tests), per the task 09 lesson.
   - 10J: `patch-joins` route, two slices likewise.
   - 10T: teapot capstone Preset/scene at tiling 8 (32 actual owners, no single editable net/inset, licence beside the production asset) plus carried task-07 item: reuse last scene geometry when `revision` is unchanged before the 32-patch scene; measure orbit frames (ADR 0018).
   - Then reviews (math, engineering+UI), smoke both routes + teapot orbit/export/resize and active-frame budget, docs, `just check`, push, CI, evaluation record, mark complete.
3. Tasks 11–14 in index order. Carried: task 13 owns triangular preview framing, opening-camera policy (S2), real posters for `patch-decasteljau`/`patch-derivatives`, and the `n`/`S(u, v)` label overlap at some orbit angles; task 12 owns placeholder lesson sections `tensor-decasteljau`, `tensor-derivatives`, `triangular-patches`, `curve-to-patch`; task 14 adds patch smoke-checklist rows, the tensor-inset single-jump observation (task 08), a real-GPU look at the twist dots, and touch drag on the task 09 routes.

## Lessons to keep

- Plan each new route as two slices from the start (core vs wiring/tests); parallel disjoint-file slices finished in ~23 tool uses each.
- Do not run mutation checks while a full `just check` is running (spurious failure seen).
- `just preview <port>` refuses a stale build: run `just build` first. Tabs are not ARIA tabs for Playwright: use `getByText('Shrani', {exact: true})`.
- Use the Edit tool or Python with explicit strings (not shell heredocs) for strings with backslashes; `en.ts`/`sl.ts` have CRLF line endings — anchor replacements within one line.

## Settings

Handler Opus 5.5, auto mode. Handler self watcher soft threshold 175k (owner override of 150k; also in project memory), then 190k closeout. Workers: `bezeg-worker` Sonnet high for implementation/repairs, Sonnet medium for math/engineering review, Haiku for narrow re-reviews; `bezeg-smoke` Sonnet medium for first-pass smoke, Haiku medium for narrow rechecks. Watchers 135k / Haiku 78k (the launch hook prints the command). At most three workers at once; give one worker preview/build ownership.
