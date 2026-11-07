# Controls handler handoff 1

Written at `BUDGET SOFT`, 2026-11-07. Read this and the [handler card](../../../agent-workflow/handler-card.md), then continue.

## State

- **Worktree and branch:** `.claude/worktrees/stream-controls`, branch `worktree-stream-controls`, also pushed to `origin` under the same name. `Run state: active` is on `master`.
- **On `master`:** task 0 (`8141864c`, `2e8eae43`). Accepted.
- **On the branch only, not accepted:** a one-line evaluation log correction, and slice 1a as a commit marked WIP. Do not push 1a to `master` until step 1 below passes. The log correction goes out with it.
- **Running:** nothing. No preview, worker or Monitor is left from this session.
- **Queue:** steps 3a, 5a, 8 and 9 were added by the owner in `aba5da1f`; verified on `origin/master`. Expect rebases around `GuidedLesson.tsx`, `DemonstrationWorkspace.tsx` and `sl.ts`/`en.ts`, which Codex is editing.

## Slice 1a: what remains

Done: `NumberInput` commits on Enter or blur only, through one `confirmDraft`; `stepKeys.ts` holds the shared keymap; `Slider` and `CountSetter` use it; `Select.tsx` is removed; `applyOn` is gone; `src/inputs/testEntry.ts` gives tests `enterNumber` and `blurNumber`. Evidence: [foundation-1a.md](foundation-1a.md).

Checks at the WIP commit: full unit 609 files and 11,184 tests passed; lint and typecheck passed; `count-setter` smoke 3 passed. `workflows` plus `guided-lessons` smoke: 293 passed, **2 failed**.

The two failures are `guided-lessons.smoke.spec.cjs:2549` for `linear-function` and `bisection`, "Exit restores the user state". The first is read: `:595` does `.fill('3')` and expects the graph to change with no Enter (`Received: y = 2x + 1`), which is the behaviour decision 2 removes. So the spec is out of date, not the app. The `bisection` failure was not read; confirm it has the same cause rather than assuming so.

**Next steps, in order:**

1. Smoke specs were outside the worker's rewrite. Classify the 30 `.fill(` sites in 9 files under `tests/` (workflows 9, guided-lessons 7, library-picker 4, curve-ownership 2, demonstration-motion 2, lesson-graph-access 2, demonstrations 2, standalone-learning 1, count-setter 1). A site on a `NumberInput` needs `.press('Enter')` or a blur after it; text search fields do not. `scripts/demonstration-preview-*.cjs` also mention number fields, so check whether they fill one.
2. Run every affected spec through `just smoke-built` after `just build`. CI gates all four smoke shards, so a site missed here fails on `master`. Add real-browser coverage of blur and of Shift or Page steps, which no smoke covers yet.
3. Rebase, recheck, and push to `master`. Record the evaluation entry and set step 1's status.

Worker for this: `bezeg-worker`, Sonnet medium. Owned paths: `tests/*.smoke.spec.cjs`, and the preview scripts if needed. Keep the slice small; it is mechanical apart from classifying the sites.

Evaluation inputs for 1a: one worker, Sonnet medium, reported 70,508 tokens and 43 min, then 117,875 tokens and 62 min after the repair (the second figure may be cumulative). Handler findings sent for repair: R1, a test-only commit path that left consumer tests vacuous; R2, blur silently dropping a small edit. Handler smoke then found the out-of-date specs. The brief named unit tests and did not name smoke specs as consumers of the timing change: that omission was the handler's.

## After 1a

- **Slice 1b:** boolean checkbox and switch variants, and field chrome (label, help and error association, row wrapping, hit area) under [workstream 1](../../../specs/lesson-authoring-architecture.md#1-shared-inspector-controls). Owned: `src/inputs`. Acceptance: I1–I5 in both languages. Name smoke specs in the brief.
- **Task 1 slices 2–5**, in the order in [01-foundation.md](../../../tasks/shared-graph-controls/01-foundation.md). Slice 2 carries task 0's decisions: the off-grid snap and notice in the shared field, with models still refusing; `axisPoint` and knot-marker refusals gain a reason. Slice 3 has 10 gated compgeo panels and ungated functions and De Boor to unify.
- **Task 2** must smoke `interp-fifth-point-added` and `hermite-locality-six`: their view boxes in part 3b are nominal.

All decisions are in the [spec](../../../specs/shared-graph-controls.md#decided-in-task-0--2026-11-07). None is open; the stream decides without asking the owner.

## Risks and working notes

- **Port 4317** was held by Codex's dev server (PID 9380, `--strictPort`). Do not stop it. Use `SMOKE_PORT=4327`, and `just preview 4327`.
- **Handbacks compress.** Twice a summary differed from the part file; check a surprising claim against the file.
- **Isolation guard:** it refuses compound commands mixing git, `.github` paths, shell variables near `sed`, or long heredocs. Run git as single plain commands, and put scripts in the ignored `.command-logs/`.
- **Worker size:** about 10k lines of reading reached the budget. A full unit run takes about 20 minutes.

## Settings

Successor: `--agent bezeg-handler --model opus --permission-mode auto --effort medium`. Routing per the handler card. Each handler launches its own successor at handoff and passes this rule on.
