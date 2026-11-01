# Functions stream: handler handoff 11

Handler 11 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-02, after the 150k soft threshold. No workers are running. `G-FN` and `G-REG` are open. `Run state: active`.

## State

- **Worktree:** `.claude/worktrees/stream-functions`, branch `worktree-stream-functions`. The `node_modules` junction points to the main install; delete it before removing the worktree.
- **Pushed to `master`:** `03d079e3..5cd811b2`, then S2 `275243cb` and this note.
- **Accepted this session (all F2a, no routes yet):**
  - **S1 transformation graph** `629a471d` (school function graphs 05 F2a a). `FunctionTransformationGraph`, `functionTransformationModel`, `functionTransformationMessages`, collection `"function-transformation"`. Bases: the five power shapes, `eˣ`, `ln x` (named/poly/rational excluded: they need their own parameters). Sonnet review: no blocking finding.
  - **Fourier 03 F2a** `087cf3e3` + fix `1b92c60c`. `FourierSeriesGraph`, `fourierSeriesModel`, `fourierSeriesMessages`, collection `"fourier-series"`. N integer in 1..1001, rejected not rounded; term list as text (cap 6 terms + last); sine recurrence restarted every 32 terms. Sonnet review: no blocking finding; its three lows were fixed (cache comment, point-count comment, tautological peak test).
  - **S2 inverse/log graph** `275243cb` (05 F2a b). `FunctionInverseGraph`, `functionInverseModel`, `functionInverseMessages`, collection `"function-inverse"`. Sonnet review: no high finding (see the open medium below).
- `PresetCatalog.test.tsx` lists `function-transformation`, `function-inverse` and `fourier-series` in `PENDING_ROUTE_KEYS`. Each F2b removes its key there.
- **Checks:** on clean trees, at `5cd811b2` (on top of `origin/master`): `npx tsc --noEmit` 0 errors, `just unit` over `src/graphs/functions`, `src/graphs/base/presets`, `src/graphs/curves/bspline`, `src/localization` and the two new model tests passed, `just build` passed; lint on touched files passed. At `275243cb`: tsc, the same unit set plus the inverse model test, lint and build passed. The full unit suite and `just check` were **not** run (memory).
- **Incident:** `git apply --cached --unidiff-zero` placed pure-insertion hunks one line early in `functionPresetCollections.ts`, so `087cf3e3` alone does not compile; `1b92c60c` fixes it. When splitting a mixed working tree into commits, build the file contents explicitly (insert after old line N) and verify the commit in a clean temporary worktree, as this session did.

## Next, in order

1. **S2 repair (medium review finding, before its F2b):** `FunctionInverseGraph.tsx:23` (`inverseX0Range` [-3, 3]) and `:64` (`defaultBoundingBox` [-3, 9, 11, -3]). With exp/ln, P or P' leaves the view: a = 5, x₀ = 3 gives P = (3, 125); a = 0,2, x₀ = −3 gives P' = (125, −3). Tie the x₀ range to the base, so that both P and P' stay inside the default box, or fit the box. Also add a test for the sampled forward and inverse curves (`tsx:177–178`), with `installBoardShims` so the board has a size, as `FourierSeriesGraph.host.test.tsx` does. Optional: `aria-pressed` on the inverse and tangent toggles.
2. **F2b registration for the three graphs** (one slice, or one per family): routes, catalog entries (Functions family per ADR 0026 §3 for S1/S2; Fourier per ADR 0034), Demonstrations with `lesson: false`, poster in `POSTER_PENDING`, preview recipes, lesson parameter and choice names in `src/learning/model.ts`, and `lessonFunctionActions()` on the graphs. No graph registers lesson actions yet. Remove the keys from `PENDING_ROUTE_KEYS`. Follow `c5e75f50` (root-finding F2b) as the template. Smoke the new routes in SL and EN with a live switch: they are new routes. Check the S1 view `[-6, 7, 12, -9]` and the Fourier N = 1001 redraw (65–95 ms in Node) in the browser.
3. **Numerical methods 05:** lessons, chapter and media for Batch A (`root-finding`), as in handoff 10.
4. **Projective 06 F3–F6.**

## Deferred items (low)

- S1: `functionTransformationEditMessage` shows raw base ids in the `base` case (`functionTransformationMessages.ts:28`); this cannot be reached from the UI.
- Fourier: the N field redraws on every change, with no throttling, so holding a ± button at large N may be sluggish. Not checked whether `NumberInput` repeats. The curve is sampled only on [−2π, 2π].
- S2: an out-of-range typed base or x₀ shows the generic `number_range_hint`.
- Handoff 10's deferred items still stand.

## Worker notes

- `worker-fourier-handoff.md` (the first Fourier worker hit 139k at 29 turns with no tests written; a fresh worker finished from the note).

## Settings to keep

Successor `--agent claude --model opus --permission-mode auto --effort medium`. Workers and reviewers are `bezeg-worker`/`bezeg-reviewer`, Sonnet `medium`; smoke is `bezeg-smoke`; port 4315. Free memory stayed at about 2 GB. Run heavy checks in the foreground with `BEZEG_MEMORY_FLOOR_GB=0.5`.
