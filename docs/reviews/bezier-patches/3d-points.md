# Bézier curve points with optional height

Implementation record for [task 04](../../tasks/bezier-patches/04-3d-points.md) and [the shared geometry contract](../../specs/bezier-patches.md#shared-geometry-contract).

Accepted2026-10-26 at18:58:28UTC. No routes, stored Presets, or controls change; smoke is not required for this geometry-only slice. Independent reviews and final checks below cover the required acceptance.

## Successor verification with pinned dependencies

The final full `just check` passes in the isolated source snapshot with JSXGraph **1.14.1**: TypeScript, lint without exclusions, **194 files / 3773 tests**, and production build. Check log: `.command-logs/patches-acceptance/.command-logs/2026-10-26T18-50-59-598Z-106120-90085359.log`; build log: `2026-10-26T18-57-09-984Z-106120-61f155a6.log` in the same directory. The check took 369.7s, followed by an 8.3s build. Build warnings are existing Sass deprecations and upstream direct eval. All 28 changed source files match the primary checkout byte for byte; [hash inventory](points3d-source-snapshot.json).

The unchanged pointer-sketch assertion passes. The earlier failure came from an inconsistent install, not a required test or production fix; see [dependency audit](dependency-audit.md). Historical partial acceptance and drag numbers below are retained for provenance and superseded by this pinned-runtime verification.

The first pinned-runtime drag runs showed equal settled geometry and 16.7ms frames, with small synchronous update increases. Code review then found avoidable coordinate-array allocation in the existing degree-four-and-up scratch path. The handler restored in-place extraction and trims reused rows back to two coordinates when all heights become zero. The regression test now observes the actual kernel input row dimensions and reuse through 3D → 2D → 3D transitions. A deliberate isolated mutation removing the 2D trim fails exactly this assertion (`2026-10-26T18-44-14-232Z-53360-3e91ec3e.log`); restored source passes all26 focused tests (`2026-10-26T18-44-25-490Z-15948-ed826f6a.log`). These logs are in the isolated acceptance directory above. Full acceptance and timings must use the repaired source; the first pinned runs alone do not verify it.

The first final-source check passed3759 tests but one suite could not load because Windows returned `UNKNOWN` opening a generated `.vitest-cache` file (`2026-10-26T18-44-28-548Z-81996-0d292551.log`). The handler verified the cache path lies inside the isolated directory, removed only that generated cache, and reran unchanged source. The complete pass above supersedes that infrastructure failure. No production, test, or dependency changes were made between those two runs.

## Final pinned-runtime drag comparison

The final idle run was18:57:30–18:58:15UTC, Windows Chromium156.0.8078.4 at1440×960, with the same three alternating A/B gestures per route described below. Both served runtimes assert JSXGraph1.14.1; served JS/CSS hashes match the unchanged-master and final task04 production builds. Every gesture changes the actual point and visible curve path; endpoints match within1e-5. [Raw final results](points3d-drag.json).

| Route | Update median A → B (ms) | p95 A → B (ms) |
| --- | --- | --- |
| Bézier curve | 2.7 → 2.9 | 5.0 → 5.9 |
| De Casteljau | 4.2 → 4.1 | 6.8 → 7.8 |
| Rational de Casteljau | 3.6 → 3.4 | 7.3 → 7.4 |

All median rAF intervals are16.7ms, with p95 at16.7–16.8ms. Per-trial update medians overlap between A/B on every route. Small synchronous tail increases remain visible in the data; this is not a zero-overhead claim. No material frame-time or settled-geometry regression is observed. These are board-update timings and frame intervals, not input-to-paint or physical-phone measurements. All later historical measurements below are superseded.

## API decision

`Point` gains optional `Z()` and `setZ()` methods; no method or absent coordinate means `z = 0`. `PointImpl` and `FixedPoint` implement `Z()`. `PointImpl` keeps constructor compatibility by retaining the third `dependencies` argument and adding optional numeric/function-backed `z` as the fourth argument: `new PointImpl(x, y, dependencies?, z = 0)`. `setCoordinates(x, y)` leaves height unchanged. Numeric and dependency-backed height reads participate in point stamps and invalidation. This avoids a parallel point hierarchy while keeping planar clients compatible.

Polynomial and rational curves build a uniform two- or three-coordinate net. Nets with all heights zero use the existing two-coordinate kernel path; once any height is nonzero, every row includes `z`, including zero-height endpoints. Degree elevation, subdivision, extrapolation and the de Casteljau scheme carry all coordinates. `blendPoints` interpolates all three coordinates. Existing 2D adapters and DTO row shapes remain `[x, y]`.

## Planar guard inventory

- PH: `PhBezierCurve` constructor, replacement of its `w` points, and version/evaluation after held input edits; `phControlPoints`, `phSigmas` and `phOffsetRational` reject runtime vectors with a third coordinate.
- Geometry: `distance`, `boundingBoxOf`, `convexHull`, and `chordKnots` reject nonzero `z`. `blendPoints` is generalized to 3D.
- Splines: all built-in scheme `build` methods validate their free points. `BezierSpline` validates on generation and version reads, so later edits are caught.
- Preset conversion: every adapter's direct `toDto` and `fromDto` methods validate the model or DTO; `ClassMapper` retains the shared conversion guard.
- JSXGraph: `AbstractJXGPointControlledCurve` rejects spatial input rows and replacement points. `ModelPointBinding` validates at construction, drag, and model-to-board sync, including after a held point's height is edited.
- General curve transforms change `x` and `y` while preserving `z`; bounds and convex hull remain explicitly planar.

## Verification

`src/bezeg/impl/curve/bezier-3d.test.ts` uses an independent Bernstein sum (including rational weights) at in-range and extrapolated parameters. It checks evaluation, construction rows, subdivision, extrapolation, elevation, mixed zero/nonzero heights, degree-four scratch reuse, cache invalidation, function-backed `z`, 2D defaults, the planar guard inventory, later edits to held points, and XY transforms that preserve height. After the final transform change, focused unit passed at 18:16:39 UTC (`.command-logs/2026-10-26T18-16-39-186Z-5928-28ee284c.log`), scoped lint passed at 18:16:38 UTC (`.command-logs/2026-10-26T18-16-38-946Z-105648-0de3a496.log`), and `npx tsc --noEmit --pretty false` exited 0 (`.command-logs/3d-points-tsc.log`).

Regression mutation evidence: at 18:15:21 UTC, `polynomial-bezier-curve.ts` was briefly mutated so `coordinateRows()` always projected to `[x, y]`. The focused suite failed 3 tests: polynomial 3D evaluation, rational 3D evaluation (its inherited polynomial evaluator), and z-edit invalidation. The mutation was reverted immediately; the source was restored before the passing focused run at 18:15:35 UTC. Mutation output: `.command-logs/2026-10-26T18-15-21-311Z-109784-f3990c57.log`.

The broader affected unit run had 131 passing tests across 15 files; one additional suite could not start because Vitest was denied access to `node_modules/@adobe/css-tools/package.json` (`operation not permitted`): `.command-logs/2026-10-26T18-14-05-444Z-108232-d06b0f83.log`. The independent browser drag comparison and full `just check` are owned by the handler.

No UI, route, preset, or file-format change is part of this slice.

## Handler verification and review — 2026-10-26

Implementation is complete; acceptance is partial. Mathematical review found spatial `scale()` reached a guarded planar bounding box; scale now computes its XY projection center while preserving height, with a regression test. Engineering review found missing per-spline/per-adapter guard coverage. The handler expanded the table-driven checks: all 26 focused tests pass (`2026-10-26T18-19-32-674Z-97696-67eb49cc.log`). Direct conversion tests check rejection before board access; redundant guards are not required individually to fail when another guard still enforces the same contract.

- Final typecheck passed (`2026-10-26T18-20-48-229Z-59056-c778f31a.log`). Production build passed (`2026-10-26T18-20-27-028Z-109140-4ede64f5.log`), with upstream JSXGraph direct-eval warnings.
- `just check` stopped at lint because pre-existing untracked `.worktrees/` checkouts caused competing TypeScript roots. A retry also found an unrelated ignored `.benchmark-output/check-localization-assets.cjs` scratch violation. `just lint . --ignore-pattern '.worktrees/**' --ignore-pattern '.benchmark-output/**'` passes (`2026-10-26T18-22-55-063Z-107268-70ac2e47.log`). Those directories were preserved.
- Full `just unit`: **3772 passed, 1 failed** in 194 files, 357.8s (`2026-10-26T18-20-12-561Z-12424-982087e0.log`). Failure: `GraphTransientState.test.tsx:121`, pointer-sketch batch replacement, reads undefined `board.sketches.filter`. The same 6-pass/1-fail result reproduces in isolation on both the final source (`2026-10-26T18-26-49-663Z-104256-4fe8d2ef.log`) and the untouched `e0191c0` archive (`.command-logs/points3d-baseline/pointer-sketch-baseline.log`). This predates task 04; full-suite acceptance remains open.
- An initial integrated run overlapped a worker's deliberate mutation (18:15:21–18:15:30 UTC) and scale repair, so it was interrupted and superseded. The full unit run above used stable production source; the later table additions were also checked in the focused suite and final typecheck.
- No smoke test is required by task 04: production controls/routes/rendering are unchanged. The separate matched drag harness is `points3d-drag.cjs`; its output and final disposition belong in this record when completed.

All command logs above are under ignored `.command-logs/`. The source/build base is master `e0191c0a181cf9bab08e85b703cba79875333202` plus the task's uncommitted changes. No commit or push has been made while acceptance is incomplete.

## Matched drag measurement

**Superseded pending rerun (successor audit, 18:32 UTC):** the primary checkout's installed JSXGraph reports **1.9.2**, while committed `package-lock.json` pins **1.14.1**. `npm ls jsxgraph --depth=0` confirms the invalid install. The preceding pointer-sketch failure therefore does not establish a defect in the pinned runtime. The earlier drag/build evidence did not capture the installed dependency version and cannot establish task acceptance against 1.14.1. Preserve its numbers as historical observations only. A fresh isolated archive plus the exact dirty task source was created at `.command-logs/patches-acceptance`; its independent `npm ci` installed 1.14.1. Full checks and matched measurements are being repeated there. The shared primary dependency tree was left intact after automatic approval review rejected its replacement.

`points3d-drag.cjs` ran with no implementation, unit, or renderer work active, 18:27:12–18:27:52 UTC. Windows, headless Chromium 156.0.8078.4, 1440×960; three alternating fresh-context A/B pairs per route, 24 delivered mouse moves spanning (+84, −48) pixels with 20ms gaps. A is a `git archive e0191c0` production build under `.command-logs/points3d-baseline`; B is the final task production build. Served entry JS/CSS hashes match local artifacts. Every gesture moved the actual point and changed a visible curve path, and all endpoints match within 1e-5. Raw timings/provenance: [points3d-drag.json](points3d-drag.json).

| Route | Board update median A → B (ms) | p95 A → B (ms) |
| --- | --- | --- |
| Bézier curve | 1.5 → 1.5 | 3.0 → 2.8 |
| De Casteljau | 1.8 → 1.9 | 2.9 → 3.1 |
| Rational de Casteljau | 1.8 → 1.9 | 2.8 → 3.1 |

Median rAF frame interval is 16.7ms in every group; p95 is 16.7–16.8ms. The small 0–0.1ms median differences are within this run's variation; no material 2D dragging regression is observed. These are synchronous board-update timings and frame intervals, not input-to-paint or physical-phone measurements. The pre-existing full-suite failure remains the acceptance gap.
