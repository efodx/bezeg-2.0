# Clips handler handoff 5

Handler 5 continued from [handoff 4](handler-handoff-4.md) under the same owner direction: push by hand (fetch, rebase, the checks for the changed files, `git push origin HEAD:master`; no `just publish`), preflight every row with `node scripts/demonstration-clip-rows/_preflight.cjs`, capture only passing rows, and write the next family's rows while the current one captures. At your own context handoff, commit and push your note, then start your successor with `claude --bg --agent bezeg-handler` and pass this self-spawn rule on.

The owner said "decide for yourself, I trust you" about the open decisions; three are now in the spec's handler decisions, marked "(handler 5)".

## Done and pushed

- 18 clips: curve-parametric, curve-curvature, curve-comb, curve-evolute, curve-envelope, arc-length-param, the five probability clips, complex-reciprocal, complex-roots, projective-pole-polar, projective-five-point, projective-three-views, projective-cross-ratio and point-set-triangulation. 28 Demonstrations remain in `src/demonstrationMotionPending.ts`.
- `_driver.cjs` sweep controls resolve among `input` elements only (a value list labels each row's group with its input's name).
- Coarse sweep minimum: a `parameter-sweep` row needs one distinct frame per scheduled grid value, clamped to 16–24 (`minimumDistinctFrames` in `scripts/demonstration-preview-motion.cjs`, test in `_rows.test.cjs`, seen failing first). It is in the presentation fingerprint, so captures need `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1` as before.
- Checks before each push: `just unit src/demonstrationMotionAssets.test.ts src/demonstrationPreviewAssets.test.ts`, `just typecheck`, `just tooling-test`, `just lint scripts`. Contact sheets per batch (`.command-logs/sheet.sh <out.png> <id>...`, frames 0/24/40/56; clips have 96 frames, so check frame 48 for the midpoint).

## Not reviewed yet

None of handler 5's clips has had the Haiku visual review or the Sonnet mathematical review (queue step 4). I spot-checked each contact sheet and the values on it (cycloid 8r and 3πr², normal-distribution shares, binomial mean and σ, 1/z, cube roots, polar of (1, y₀), the B–D–E collinear line pair).

## Next, in order

1. Reviews of handler 5's 18 clips: Haiku visual against each `lessonQuote`, Sonnet mathematical per family (curves, probability, complex, projective). Fix findings in a repair batch.
2. Compgeo trace driver (spec decision "Compgeo step traces need driver support"): one Sonnet `bezeg-worker` on the capture tooling, owning `_driver.cjs`, `_schema.cjs` and their tests. Goal: a discrete row that steps an algorithm's trace with "Naslednji korak" (and its back button, if one exists) reading the step from the page instead of a value input, and returns to the poster step. Then rows for convex-hull, bezier-hulls, ear-clipping, delaunay, voronoi, voronoi-degenerate, fortune, interval-sweep, segment-intersections, monotone-partition, monotone-triangulation. Worker drafts with their last preflight messages: `.command-logs/rows-pending/compgeo-hulls-held.cjs` and `compgeo-sweeps-held.cjs` (ignored, in this worktree). `hull-robustness` has no motion prompt; `point-in-polygon`'s q field snaps to whole numbers (3 values) and its graph binds its own drags.
3. `conic-focal` camera exemption (spec decision): a per-row field naming derived points that may leave the camera, with a reason, validated in `_schema.cjs`, applied only to those points. The row text is in [held rows](held-rows.md).
4. `linear-map`: passes preflight, but the encoder colour check finds no pixel that stays background in every frame. Row text in `.command-logs/rows-pending/linear-complex-with-map.cjs`.
5. The rest of [held rows](held-rows.md), including `projective-pascal` (snapped drag) and `inversion`.

## Known limits

- The Windows lock on `manifest.json` stopped a rebase pick again; the recovery in handoff 4 worked (stop the preview, delete the pick's untracked files, `git checkout -- .`, `git rebase --continue`, then confirm the replayed commit holds its clips with `git show --stat`).
- Workers that must not touch the row folder during a capture: I used a flag file `.command-logs/clips-capture-idle`. One worker returned early instead of waiting; tell workers to wait or draft only.
- `.command-logs/drop-rows.cjs <file> <id>...` and `add-row.cjs <from> <to> <id>...` move row blocks; normalize CRLF first.

## Measures

| Slice | Tokens | Outcome |
| --- | --- | --- |
| Sonnet, repair of six curve and probability rows | 44.2k | Source fixes, returned before the idle flag; handler finished them, all six captured |
| Sonnet, linear, complex and projective rows | 110.4k | 8 rows; 5 passed, handler retargeted 2 quotes' paths; 2 held rows later passed under the coarse minimum |
| Sonnet, compgeo hull rows | 68.5k | 1 of 7 captured; 5 blocked by trace reset |
| Sonnet, compgeo sweep rows | 73.8k | 0 of 7; all blocked by trace reset or snapping |
