# Authoring-rollout closeout smoke (task 06 step 4, handler 7)

Worker: bezeg-smoke (browser smoke only; no source edits, no commits).

## Checkout and build

- Worktree: `stream-authoring-rollout`
- HEAD at smoke time: `97d704ea` (dirty, 7 entries in `git status --short`).
- Build under test: `build/`, provenance from `ccecc1d8` (dirty at build time). `smoke-built` reported "reusing build from revision ccecc1d8". HEAD moved from `ccecc1d8` to `97d704ea` after the build, so the served build does not match HEAD. Results verify the built bundle, not `97d704ea`. The build was not rebuilt, per the brief.
- Preview: production (`build/`), served by `scripts/serve-smoke-build.cjs`.

## Port deviation

- Port 4323 was already held by another worktree's preview (`stream-families-prep`, `scripts/serve-smoke-build.cjs`, PID 19508). That process was not touched.
- The first `SMOKE_PORT=4323` run failed at webServer start ("already used"), with no tests run.
- All runs below used port 4324, which `docs/smoke-tests.md` allows for a busy port.

## Check 1: `just smoke-built` (route loading and preset)

Command: `SMOKE_PORT=4324 just smoke-built tests/demonstrations.smoke.spec.cjs tests/workflows.smoke.spec.cjs`
Log: `.command-logs/h7-smoke.log`

- Run result: 148 passed, 1 failed.
- Failure: `[chromium] demonstrations.smoke.spec.cjs:299 > decasteljau renders its heading, graph, and inspector`. Cause: `page.goto: net::ERR_NO_BUFFER_SPACE` on `/bezeg-2.0/bezier/decasteljau`. This is a Windows socket-buffer error during navigation, not an app assertion.
- One rerun of that test alone (`--grep "decasteljau renders"`) passed. Log: `.command-logs/h7-smoke-retry.log`.
- Net: 149 of 149 tests passed after one transient retry. The first-run failure is recorded above.
- Scope: `demonstrations.smoke.spec.cjs` (9 tests, catalog and catalog-route rendering) and `workflows.smoke.spec.cjs` (3 tests: SL/EN language switch, preset save/change/reopen on Bezier, fit-to-points). Only the Bezier preset test is the "preset save/change/reopen" check.

## Check 2: custom Playwright checks

Script: `.command-logs/h7-checks.cjs`; output: `.command-logs/h7-checks.out`. Each check ran in its own browser context, with localStorage language set to `en`. Result: 14 checks, 0 failed, 0 console errors or page errors.

- (a) Voronoi preset round trip at `/bezeg-2.0/compgeo/voronoi` (real path from `src/graphs/compgeo/computationalGeometry/registration.ts`; the brief's `computational-geometry/voronoi` does not exist).
  - a1 board loads with 15 points: PASS
  - a2 "Add point" button adds a point, 15 to 18: PASS. Used the button, not a drag.
  - a3 Preset `smoke-h7` saved and selected: PASS
  - a4 reload of the same URL (no query or hash) restores 15 default points: PASS
  - a5 reopening `smoke-h7` restores the saved 18-point set (compared by rounded coordinates): PASS
  - a6 Delete preset (confirm "Yes") removes `smoke-h7`: PASS. The first run failed only because the script's confirm regex missed "Yes"; the app was fine.
  - Cleanup: presets live in isolated browser contexts that are closed. No browser data outside this run was touched.
- (b) `/bezeg-2.0/no-such-graph` shows "Unable to open this page. Return to Bezeg and choose a demonstration." (error page, not blank): PASS
- (c) Catalog `/bezeg-2.0/demonstrations` lists 546 links. First card is "Bernstein polynomials". The brief's premise that the first card matches the first `mapsDemonstrationRows` row (Linear map) is wrong. "Linear map" is listed further down the catalog. The check was rewritten to confirm the Linear map card exists: PASS.
- (d) Direct load plus refresh, no console errors:
  - `/bezeg-2.0/bspline/basis`: "B-spline basis functions" PASS
  - `/bezeg-2.0/patches/tensor`: "Tensor-product Bézier patch" PASS
  - `/bezeg-2.0/projective/cross-ratio`: "Cross-ratio and central projection" PASS
  - `/bezeg-2.0/inscribed-angle`: "Inscribed angle and Thales' theorem" PASS
  - `/bezeg-2.0/functions/linear`: "Linear function" PASS

## Coverage gaps

- Route loading is covered by one spec file (`demonstrations.smoke.spec.cjs`), not by a per-route check of every Demonstration in this run.
- The voronoi preset test used the Add button, not a drag, and the reload had no query or hash because the URL had none.
- No touch, keyboard, narrow-screen, or drag checks were run for this change.
- The `decasteljau` failure was not reproduced in the full run; it passed on a single rerun.
- The served build is `ccecc1d8` (dirty), not `97d704ea`.

## Cleanup

- Preview on 4324 (PID 37528, started by this run) was terminated and the port is free.
- Port 4323 holder (PID 19508, `stream-families-prep`) was left alone.
- Artifacts: `.command-logs/h7-*`, `test-results-4324/`, `playwright-report-4324/`.
