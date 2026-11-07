# Clips handler handoff 4

Handler 4 continued from [handoff 3](handler-handoff-3.md). Pushed: the nine row clips recaptured from the posters (`cab2c685`), then 12 new clips for interpolation, school functions, B-splines and analysis, plus a record of the rows held back (`9c4d9972`), and the evaluation entry (`f1e79227`). Mathematical review of the six plane-geometry clips: no findings. Visual review: label crossings accepted as app layout; the euler-line quote was changed to the step about the line's direction.

The owner asked why the stream is slow. About 2 of 4 hours went into `just publish`: its 25-minute `just check` lost two push races to other streams, and its clean-tree stage stopped on worker files. Capture batches lost the rest, because one bad row aborts the run and the rerun recaptures the good rows. Agreed fixes, now owner direction:

1. **Push by hand**: fetch, rebase, run the checks for the changed files (tooling-test, lint, the asset units `src/demonstrationMotionAssets.test.ts src/demonstrationPreviewAssets.test.ts`, typecheck when `src` changes), then `git push origin HEAD:master` at once. Do not use `just publish` for this stream.
2. **Preflight every row before capturing** with `node scripts/demonstration-clip-rows/_preflight.cjs <id>...` or `--file <family>` (about 25 to 35 s per row, continues past failures). It runs the capture's own `captureRow` and row evidence checks without poster, encode or manifest.
3. **Capture only rows that passed preflight**, one family per run.
4. **Write the next family's rows while the current one captures.**

## Local, not pushed

- `01013b7d` the preflight (`_preflight.cjs`, export `preflightRow` in `scripts/demonstration-preview-motion.cjs`, README and `docs/commands.md`). Worker checks: two rows pass, two held rows fail with their capture messages, `just tooling-test` and `just lint scripts` passed. That file is in the presentation fingerprint, so the next capture needs `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1`.
- This note.

## Rows written, not captured

A Sonnet worker wrote rows into `curve-geometry.cjs` (curve-parametric, curve-curvature, curve-comb, curve-evolute, curve-envelope), `bezier.cjs` (arc-length-param, bezier-clipping) and a new `probability.cjs` (prob-density, prob-binomial-normal, prob-clt, prob-summary, prob-correlation). The worker wrote 11 of 12 (`_check.cjs` and lint passed); `bezier-clipping` is unresolved because moving any control point resets the clipping display, so the loop cannot return to the poster. Worker's least sure: `curve-parametric` starts at t = π/2, written as 1.57 (the `bspline-nurbs` rounding trap); `prob-summary` and `prob-correlation` use comma-decimal number fields (the `root-finding` loop trap); `prob-density` sweeps σ while its quote names μ and σ. Rows without a clip cannot be committed: every row id is an expected clip, so the asset checks fail. They are parked as whole files in `.command-logs/rows-pending/` (ignored): copy `curve-geometry.cjs`, `bezier.cjs` and `probability.cjs` back into `scripts/demonstration-clip-rows/` (the first two replace the committed files and keep their existing rows).

## Next, in order

1. `just build`, `just preview 4319` in the background. Preflight the pending rows; fix or move failures to [held rows](held-rows.md).
2. Capture the passing rows family by family with `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1 PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1 PREVIEW_RECAPTURE_IDS=<ids> PREVIEW_BASE_URL=http://127.0.0.1:4319/bezeg-2.0 node scripts/capture-demonstration-previews.cjs`. Hold any other uncaptured row file aside during the run: the final validation checks every row in the index.
3. Remove captured ids from `src/demonstrationMotionPending.ts` (the capture does not), view a contact sheet per batch (frames 0, 24, 40, 56), commit per family, push by hand.
4. Then dispatch rows for linear and complex maps (linear-map, complex-reciprocal, complex-roots), projective (five ids) and the compgeo algorithms (Sonnet, see the stream queue's step 3), and work through [held rows](held-rows.md). `conic-focal` needs an owner decision on points leaving the camera; it is in the final report to the owner.

## Known limits

- A Windows lock on `scripts/demonstration-previews/manifest.json` stopped a rebase pick once ("unable to unlink"). Stop the preview, remove the partial pick's untracked files, `git checkout -- .`, then `git rebase --continue`.
- After `just preview` the build must match the checkout, so rebuild after rebasing onto a master that changed `src`.

## Measures

| Slice | Tokens | Outcome |
| --- | --- | --- |
| Sonnet, interpolation and school-function rows | 120.5k | 11 rows; 6 captured, 5 held |
| Sonnet, B-spline and analysis rows | 112.8k | 10 rows; 6 captured, 4 held |
| Haiku visual review, nine clips | 52.5k | Label findings; 1 quote fixed |
| Sonnet mathematical review, six clips | 34.8k | No findings |
| Sonnet, preflight tool | 41.8k | Done, checks passed |
| Sonnet, curve, Bézier and probability rows | 130.9k | 11 rows, 1 unresolved |
