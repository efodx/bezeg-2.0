# Slice B note (clips step 2): jump check, pending list, `just clip`

Status: complete. Slice A may capture.

## What exists

- `scripts/demonstration-clip-rows/_jump.cjs`: exports exactly `frameSteps(pngBuffers)` and `assessFrameSteps(steps, {discrete})` returning `{ok, typical, max, ratio, threshold}`. Unit test: `_jump.test.cjs` (6 tests, in the `tooling-test` list).
- `src/demonstrationMotionPending.ts`: `MOTION_PENDING`, 67 entries `{id: DemonstrationId, reason}`. Slice A removes `curve-offset`, `reduction`, `patch-coons` when their clips land (the unit test fails on a stale entry). Test: `src/demonstrationMotionAssets.test.ts`.
- `just clip <id>` (`justfile`, `scripts/commands.cjs` `clip` command, test in `scripts/commands.test.cjs`). It sets `PREVIEW_RECAPTURE_IDS`, `PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1`, and `PREVIEW_BASE_URL` (default `http://127.0.0.1:4319/bezeg-2.0`, an existing value wins). It never sets `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION`; an operator value passes through (tested both ways). An id that is not lowercase-with-hyphens, or not exactly one argument, fails with a usage message.

## Jump check

Metric: mean absolute RGB difference (0-255) between neighbouring frames. `typical` is the median of steps above `FLOOR = 0.05`. `ok` is true for `discrete: true`; otherwise it needs at least one moving step and `max / typical <= THRESHOLD = 3`. No moving step gives typical 0, ratio Infinity, `ok` false.

Measured on frames decoded from the shipped WebM clips with FFmpeg 9.0.2 (into `.command-logs/scratch/clips/`), not on raw capture PNGs. Capture evaluates raw PNGs, so encoder noise is absent there; the floor then only decides which tiny steps enter the median. Frame sequences of these clips also contain repeated frames between moving ones (the capture frame rate is lower than the 24 fps clip rate), which is why zero steps are excluded from typical.

Noise floor: across the 28 clips, 618 steps are non-zero and below 0.2. 324 are below 0.01. The rest thin out with no gap (0.02-0.05: 48, 0.05-0.10: about 140). So 0.05 is a pragmatic floor, not a measured boundary between noise and motion.

### Smooth clips (28, modes `parameter-sweep`, `pointer-drag`, `surface-orbit`; discrete modes excluded)

Columns: typical, max, ratio. All pass at threshold 3.

| clip | typical | max | ratio |
|---|---|---|---|
| area-between-curves | 0.423 | 0.567 | 1.341 |
| bezier | 0.410 | 0.560 | 1.365 |
| complex-multiplication | 1.219 | 2.271 | 1.862 |
| continuity | 3.667 | 3.848 | 1.049 |
| decasteljau | 1.912 | 2.405 | 1.258 |
| derivative | 1.197 | 2.246 | 1.876 |
| exponential-function | 2.088 | 2.538 | 1.216 |
| extrapolation | 0.061 | 0.093 | 1.527 |
| extrema | 1.928 | 3.519 | 1.825 |
| farin | 0.634 | 0.970 | 1.530 |
| linear-function | 2.405 | 3.047 | 1.267 |
| patch-decasteljau | 2.054 | 4.018 | 1.956 |
| patch-derivatives | 1.875 | 3.893 | 2.076 |
| patch-joins | 2.214 | 4.370 | 1.974 |
| patch-subdivision | 1.588 | 3.201 | 2.015 |
| patch-tensor | 1.645 | 3.405 | 2.070 |
| patch-triangular | 1.363 | 2.919 | 2.142 |
| ph-cubic | 2.574 | 4.127 | 1.604 |
| rational | 0.976 | 2.032 | 2.082 |
| rational-decasteljau | 0.729 | 1.392 | 1.910 |
| rational-extrapolation | 0.071 | 0.097 | 1.367 |
| spline-c1 | 0.278 | 0.378 | 1.360 |
| spline-c2 | 0.231 | 0.311 | 1.346 |
| spline-g1 | 0.348 | 0.914 | 2.628 |
| spline-g1-symmetric | 0.289 | 0.422 | 1.461 |
| spline-parameterization | 0.243 | 0.393 | 1.616 |
| trigonometric-functions | 3.917 | 4.023 | 1.027 |
| weighted-parameterization | 0.744 | 0.829 | 1.113 |

Worst smooth ratio 2.628 (spline-g1). Margin below the threshold: 0.372 (14%). `extrapolation` and `rational-extrapolation` have typical steps of 0.061 and 0.071, close to the floor: very slow clips are near the edge of what the check can judge.

### Deliberately cut sequences (real frames, middle frames removed)

| source, removed frames | typical | max | ratio | result |
|---|---|---|---|---|
| bezier, 30 frames from 30 | 0.471 | 1.796 | 3.815 | fails (margin 0.815) |
| bezier, 40 frames from 25 | 0.370 | 1.795 | 4.851 | fails |
| spline-g1, 30 from 30 | 0.312 | 1.589 | 5.098 | fails |
| spline-c1, 30 from 30 | 0.305 | 1.574 | 5.157 | fails |
| farin, 30 from 30 | 0.633 | 2.183 | 3.451 | fails (margin 0.451) |
| derivative, 30 from 30 | 1.196 | 2.954 | 2.471 | passes (missed) |
| patch-tensor, 30 from 30 | 1.792 | 3.417 | 1.907 | passes (missed) |
| decasteljau, 30 from 30 | 1.918 | 2.186 | 1.140 | passes (missed) |
| linear-function, 30 from 30 | 2.492 | 3.067 | 1.231 | passes (missed) |
| bezier, 12 from 40 | 0.473 | 1.013 | 2.140 | passes (missed) |

Recorded cut for the acceptance: bezier with 30 frames removed, ratio 3.815, above 3 by 0.815.

### Limit of this metric (decided, not hidden)

A whole-frame mean difference saturates once a moving line has left its previous pixels, so a jump of a dense or fast scene costs little more than a normal step. The check reliably catches a teleport in a sparse scene, such as a dragged point (ratios 3.45-5.16), and misses cuts in dense scenes (1.14-2.47) and short cuts (12 frames). 3 is the lowest round value that passes every measured smooth clip with a margin; a lower value would reject spline-g1. Treat a pass as "no gross teleport", and review the contact sheet by eye. A stronger check (per-region or max-block difference) would be a separate change.

## Checks observed

- `just tooling-test`: 47 of 49 tests pass (`clip` and all six `_jump` tests included). The one failure is in slice A's file: `scripts/demonstration-preview-motion-runner.test.cjs:14`, `51 !== 54` (its hard-coded legacy count against slice A's in-progress change). Not edited here.
- `just typecheck` passed. `just lint` on the six changed code files passed.
- `just unit src/demonstrationMotionAssets.test.ts`: 4 tests pass (51 clips + 67 pending = 118 Demonstrations).
- Missing-clip test observed failing, each restored afterwards: reduction removed from the pending list (`missing: ['reduction']`); `ph-cubic` (has a clip) added (`stale: ['ph-cubic']`); an unknown id added (`unknown: ['nonexistent-thing']`, which also is a type error under `tsc`); `reduction` duplicated (`duplicate: ['reduction']`). The file was restored to 67 entries.
- The jump test's failing case: `assessFrameSteps` on the synthetic cut returns `ok: false`, and the same input with `discrete: true` returns `ok: true`. I did not run the assertion against a mutated threshold; the real-frame cut ratios above come from the same function.
- `just clip Bad_Id` prints the usage error. No capture was run.

## Not verified

- No real capture ran through `assessFrameSteps` on raw PNGs; nothing calls it from the runner yet (slice A wires it).
- The unit test uses synthetic frames only; the real-clip calibration is a scratch script, not committed.
