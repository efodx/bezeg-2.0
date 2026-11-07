# Clips handler handoff 3

Handler 3 continued from [handoff 2](handler-handoff-2.md). CI was green on `8b5e3198`. The main event: **the owner corrected the start scene.** Clips start from the existing catalog poster (the recipe outcome in `scripts/demonstration-preview-recipes.cjs`), not from the lesson's guided example scene. The example scenes are often a lesson's bare first step, so the six pushed row clips start dull: `orientation` shows two points, `curve-offset` straight lines. The spec's owner decisions now record this ("Correction"), and so does the user memory note. The six clips live on master are still the dull ones until the recapture below is pushed. Nothing from this session is pushed yet: the rebase needs a clean tree, so push everything with the recapture.

The owner also asked why only six clips exist. Answer given: most of the time went into tooling faults (capture hang, line-ending fingerprint, grid snapping, pointer tolerance). Plan promised: larger Sonnet row batches, two workers in parallel by family, back-to-back captures by the handler, hard Demonstrations set aside rather than blocking a family.

## Local commits, not pushed (on `worktree-stream-clips`)

- `a5b71d10` row brief fine-grid rule, README failure row
- `a22ddadc` + revert `e5331fc4`: a weakened poster check, undone after the owner's correction (net zero)
- `3435d29d` spec: start from the posters; records the grid-step decision and accepts `inscribed-angle` 10 to 170 (stored samples reach both ends)
- `fcd5c776` app fix: `OrientationGraph` and `PolygonAreaGraph` print readouts in board units (4^e). Lattice markers mark board-integer points even when a vertex is off the lattice, and Pick's B, I and Pick lines show only on the lattice. Sonnet mathematical review: no findings. Unit tests (owned files plus `src/learning`) and typecheck passed.
- `f85f432e` app fix: `NotablePointsGraph` and `EulerLineGraph` scale exact kernel results by 2^e (positions, lengths s; areas, R², orient s²). Sonnet mathematical review: no findings. Typecheck passed.

## Uncommitted in the worktree (commit after the recapture)

1. **Row clips start from the poster scene** (worker, see [poster-start note](poster-start-note.md)): `_scene.cjs` replaces `_examples.cjs`; `exampleId` removed from schema, check, rows, tests and README; `capture-demonstration-previews.cjs` uses the plain route with the full recipe. Row paths now start at recipe values (`curve-offset` d = -1; `simson-line` t = 60). The `inversion` row was removed: its recipe scene has only integer controls, so it stays pending.
2. **Colour-check pixel for rows** (handler): `stillBackgroundPixel` in `_jump.cjs`, used in the row encode loop in `demonstration-preview-motion.cjs`. The row clips sampled the top-left pixel, which a full side line crosses in the triangle scenes ("Decoded background changed"). It now takes a pixel whose 17×17 neighbourhood is background in every frame. The test is in `_jump.test.cjs`, and the mutation without the margin was seen failing.

`just tooling-test` fails 5 `_rows.test.cjs` tests until every row is recaptured, because the stored records still carry `exampleId`. Publish is all-or-nothing for the same reason.

## Next, in order

1. `just build`, then `just preview 4319` in the background. Recapture all 9 rows one at a time with `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1` (fingerprint inputs changed, so the flag is justified), each wrapped in `timeout 500`: curve-offset, reduction, patch-coons, inscribed-angle, orientation, polygon-area, triangle-centres, euler-line, simson-line.
   - `triangle-centres` and `euler-line` were shrunk by the worker to 0.4 and 0.25 units, which is too small to see. With the colour-check fix, try about 1.5 units. If 300 KiB still fails, follow the README order: fewer moving labels, then a smaller amplitude, keeping it visible at card size.
2. View every new poster against the old one (`git show 6c0c6a28:src/images/demonstrations/catalog/orientation.png` and similar). They should match the pre-stream posters apart from palette changes since.
3. `just tooling-test` green, then commit items 1 and 2 with the published media, and `just publish`. Check `just ci` afterwards.
4. Then the plane-geometry family is complete except `inversion`: Haiku visual review of contact sheets and Sonnet mathematical review.
5. Row batches for the remaining families through the [row brief](row-brief.md). The brief and README still mention example scenes in places: update them for the poster start first, so workers read row start values from the recipe scene. Rows must start at the recipe's control values, which `_check.cjs` no longer checks; only the capture checks them.

## Known limits

- `orientation` and `polygon-area` example scenes hid labels; the poster scenes show them, so the readout fix is required for them.
- `inversion`: no smooth control in the poster scene; consider a discrete row with a reason or a capture-only driver later.
- Graphs that bind their own drags (`simson-line`, `inversion`, `voronoi`, `point-in-polygon`) and small-limit sweep graphs remain as in handoff 2.
- Controls stream: number fields apply on Enter or blur (the driver presses Tab), and switches render as `bool-field` checkboxes (inspector only, not the board).

## Measures

| Slice | Tokens | Outcome |
| --- | --- | --- |
| Sonnet, centre-graph grid fix | 66.3k | Done, reviewed clean |
| Sonnet reviewer, centre-graph fix | 25.5k | No findings |
| Sonnet, simson and inversion rows | 36.1k | 2 rows; inversion later dropped |
| Sonnet, poster-start capture path | 124.0k | 7 of 10 staged, 3 blocked (app readouts, inversion) |
| Sonnet, orientation and area readouts | 73.4k with follow-up | Done |
| Sonnet reviewer, readouts | 28.4k | No findings |

Not yet entered in the evaluation log.
