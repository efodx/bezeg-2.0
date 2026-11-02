# Functions stream: handler handoff 20 (PC switch)

Handler 20 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-02. It stopped early because the owner is moving to a new computer; the request came through the session "feature stream state portability". `Run state: stopped` in the stream file until the new-PC setup sets it back to active. No successor was launched.

## State

- **Master:** this note's commit. Projective conics Batch A is released: F6 accepted (record in `docs/tasks/projective-conics/06-batch-a-release.md`). All four families now have Batch A released.
- **WIP branch:** `wip/functions-pc-switch` on `origin`, one `wip:` commit on top of this note's master commit. It holds the unverified 07a source and every untracked worker report and brief from `docs/reviews/feature-streams/functions/`. Do not push it to master as is. `origin/worktree-stream-functions` has old, diverged history; it was not touched and should not be used.
- **Resume:** on the new PC, clone, then `git fetch origin && git switch -c stream-functions origin/wip/functions-pc-switch` (or a worktree on it). When 07a is accepted, rebase onto `origin/master` and split the `wip:` commit: the source and tests in one `feat:` commit, and the docs under `docs/reviews/` in a `docs:` commit.
- **Test slots:** `BEZEG_TEST_SLOTS` and `BEZEG_TEST_WORKERS` will be recalibrated on the new machine, so the slot counts and timings in older notes may not apply. The `node_modules` junction and the memory constraints of this PC (3 GB free, reaped background commands) may not apply either.

## In-flight work

- **07a (K4 five-point graph)**, brief `briefs/projective-07a.md`, worker stopped by `HANDOFF` and returned partial. Its note: `docs/reviews/feature-streams/functions/worker-projective-07a-handoff.md` (on the WIP branch).
  - New: `src/graphs/projective/fivePointModel.ts`, `fivePointEdit.ts`, `fivePointText.ts`, `FivePointGraph.tsx`, `FivePointControls.tsx`.
  - Edited: `projectivePresetCollection.ts` (`projective-five-point` parser), `src/graphs/base/presets/PresetImport.ts` (registration), 41 `projective_five_point_*` keys each in `sl.ts`/`en.ts`.
  - Verified: `npx tsc --noEmit` clean before a final eslint fix (unused `ConicType` import removed by sed in `fivePointText.ts`); neither tsc nor eslint was rerun. Nothing else is verified: no tests, no `just unit`, no mutations, no example numbers checked, no browser.
  - Review points: the graph's in-inspector Reset (renamed `restoreDefault` because `BaseGraph.reset` exists) next to the app-level Reset; whether the `PresetImport` registration belongs in 07a or in F2b (Batch A registered at the route slice); `lastUnique` kept in graph state and stripped from the exported Preset.
- No other workers running.

## Next, in order

1. Resume 07a with a fresh `bezeg-worker` (Sonnet `medium`) from the worker note and the brief: rerun tsc and eslint, write the model, host and Preset tests, `just unit src/graphs/projective src/projective src/localization`, at least four mutation failures. Then handler review against K4 acceptance 1–7 and an engineering and UI review (Sonnet) per review routing.
2. 07b (K5 two-panel graph) and 07c (drag measurement), as planned in `docs/tasks/projective-conics/07-batch-b.md`. Then F2b–F6 of Batch B.
3. The other families' Batch B tasks (`numerical-methods/06`, `school-function-graphs/06`, `fourier-series/05`) are planned and gated on `G-FN` and `G-REG`, which handoff 19 recorded as open.

## Checks this session

- `just build` at `2bde04a6` (passed).
- F6 browser smoke at `2bde04a6`, 8 of 8 passed (evidence in `06-batch-a-release.md`).
- Hosted CI green on master at `f6d0190b` (run 41446577763).

## Skipped from commits

- Smoke and worker logs, screenshots and the export downloads in the job tmp folder `C:/Users/NonFriedMotherBoard/.claude/jobs/7077c050/tmp/` (f6, 07a): scratch, not needed.
- A stray scratch folder `C:/c/Users/NonFriedMotherBoard/.claude/jobs/...` that the smoke worker created by a path mistake. It holds only smoke scripts and output. The owner may delete it.
- `node_modules` (a junction), `dist`, test results.

## Deferred items (low)

- Smoke: a language switch while a lesson is open was not tried; on cross-ratio and Pascal the selected point is not restored on lesson exit (positions are).
- Handoff 19's deferred items still stand (F5 K1 card crowded, K2 labels clipped; `pole-polar-place` while P is at infinity untested; handoff 16's items).

## Settings to keep

Handler `--agent claude --model opus --permission-mode auto --effort medium`. Workers `bezeg-worker` Sonnet `medium`; smoke `bezeg-smoke` Sonnet `medium`. Logs in the current job's tmp folder. Port 4315.
