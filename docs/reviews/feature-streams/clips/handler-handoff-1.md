# Clips handler handoff 1

Handler 1 stopped at `BUDGET SOFT` before starting step 3. Steps 1 and 2 are done and pushed. 54 clips, 64 pending.

## First actions

1. Run `just ci 1d200b78`. Developer tools passed; **Browser smoke was still in progress** at handoff. `just ci` prints status and exits, so its exit code proves nothing: read the lines. A failure must be fixed before this stream pushes anything else. Also check the newer revision.
2. Confirm the worktree has its `node_modules` junction, and rebase onto `origin/master`.
3. Read [the Controls queue](../../../tasks/feature-streams/controls.md) on `origin/master` before each family's capture. At handoff, Controls had finished only step 0, and its family sweeps were pending.

## State

- Capture path: `scripts/demonstration-clip-rows/`; start with its README. `just clip <id>` captures one clip against `just preview 4319`.
- Decisions: "Handler decisions (2026-11-07)" in the [spec](../../../specs/lesson-guided-catalog-clips.md).
- History and evidence: [capture path note](capture-path-note.md), [jump calibration](slice-b-note.md), [route probe note](route-probe-note.md), whose "Handler correction" section overrides the text after it.

## Step 3: next slice

Rows are ready to dispatch through the shared [row brief](row-brief.md). Each dispatch names two or three Demonstrations and one row file, `scripts/demonstration-clip-rows/<family>.cjs`, using the family names below. Two workers at once, on different row files. Send the first two batches as a pilot and spot-check them before scaling: quotes from the right lesson, sensible control, moderate path.

Pending by family. `*` means the probe proved only a display control, and `!` means no live point:

| Family | Demonstrations |
| --- | --- |
| advanced-bezier | arc-length-param, bezier-clipping |
| b-splines | bspline-basis, bspline-deboor, bspline-insertion*, bspline-extraction*, bspline-nurbs, bspline-blossom |
| complex-maps | complex-reciprocal*, complex-roots* |
| convexity-hulls | orientation, polygon-area, convex-hull, point-in-polygon, hull-robustness, bezier-hulls |
| curve-geometry | curve-parametric!, curve-curvature, curve-comb, curve-evolute, curve-envelope |
| fourier-series | fourier-series*, fourier-coefficients*, epicycles |
| interpolation | interp-lagrange, interp-hermite*, interp-runge*!, interp-least-squares, interp-subdivision* |
| linear-maps | linear-map* |
| numerical-methods | root-finding*, quadrature, euler-method |
| probability | prob-density!, prob-binomial-normal, prob-clt!, prob-summary*, prob-correlation* |
| projective-conics | projective-cross-ratio, projective-pascal*, projective-pole-polar, projective-five-point, projective-three-views! |
| school-function-graphs | function-transformation*, function-inverse*, polynomial-zeros*, rational-function, geometric-series!, conic-focal |
| sweep-algorithms | interval-sweep, segment-intersections, monotone-partition, monotone-triangulation, fortune |
| triangle-geometry | triangle-centres, inscribed-angle, euler-line, simson-line, inversion |
| triangulations-voronoi | ear-clipping, point-set-triangulation, delaunay, voronoi, voronoi-degenerate |

Routing: Haiku `medium` by default. Sonnet for `sweep-algorithms`, `triangulations-voronoi` and other algorithm Demonstrations with no obvious smooth control, as the stream file says. `curve-geometry` rows join the existing file; other families get a new one.

## Known gaps

- **Runner test unexercised case.** `scripts/demonstration-preview-motion-runner.test.cjs` now follows `MOTION_PENDING`, so a row may land before its clip. It passes today, but no pending row exists yet, so that case has not run. Confirm it on the first pushed row, with `just tooling-test`. Before this change, rows without clips failed it.
- **`_check.cjs` limits.** It proves a quote exists under `src/learning`, not that it belongs to this Demonstration's lesson. It prints the file; the spot check covers the rest.
- **No capture hook yet for algorithm Demonstrations.** A capture-only smooth driver, such as a continuous sweep-line position, is not built. If rows come back unresolved, it goes in its own commit and needs engineering review.
- **`patch-coons` amplitude** is modest, about 32x24 px of 720. Send it through step 4's visual review. Enlarging it needs a capture only.
- **Over-mask guard** was seen failing only with its constant lowered.
- **`interp-runge`** has a working stepper: a temporary row read back 6, 7, 8, 9, 6.

## Rules learned

- Any edit to `_driver.cjs`, `_schema.cjs`, `_examples.cjs`, `_jump.cjs`, `demonstration-preview-motion.cjs` or `demonstration-preview-recipes.cjs` invalidates the presentation fingerprint, and every later `just clip` stops. Recover with one reviewed `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1` capture, then prove a capture without the flag. Tightening a check can also invalidate stored records; recapture those clips together.
- No worker may change a limit: `THRESHOLD` stays 3. A worker once raised it to 6, which would have caught none of the recorded cuts.
- Recount worker figures from the files. The probe report overstated two results.
- The worktree guard refuses compound shell commands that mix git, loops or long heredocs. Use plain commands and the file tools.
- The preview runs as `node scripts/serve-smoke-build.cjs`; match that when stopping it.

## Evaluation

Steps 1 and 2 are logged. The stream's pilot measure (tokens per clip and repair rate for Haiku) starts with step 3.
