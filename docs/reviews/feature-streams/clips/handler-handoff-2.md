# Clips handler handoff 2

Handler 2 was relaunched by the supervisor after handler 1's successor did not start. Steps 3 and 4 are now running together. Three new clips (`inscribed-angle`, `orientation`, `polygon-area`) and the capture fixes are pushed in `562df8d0..1db6960e`. Check `just ci 1db6960e` first; browser smoke was not run, because the hook changes nothing without its global and unit tests cover that, so CI is the first browser check; a CI failure is fixed before anything else.

## What changed this session

- **Captures no longer hang.** A failed capture used to leave the browser open and Node alive forever: the "over 400 seconds" in the pilot note was a 2-second failure followed by a hang. It is fixed in `cda9b0de`. A capture now takes 20–40 seconds, so anything much longer is a fault. Always wrap captures in `timeout 500` and read the real exit code.
- **The fingerprint ignores line endings.** Git autocrlf had rewritten `_jump.cjs` on checkout. The fingerprint is now hashed from normalized text.
- **Compgeo points snap to the grid.** A pointer drag on any `PointSetGraph` hops between grid points. Rows set `fineGrid: -8`, and a capture-only hook (`cde6916c`, reviewed) rescales the model on the first drag. See the spec decision and [fine grid note](fine-grid-note.md).
- **The pointer check is a thousandth of a CSS pixel**, not 1e-6 board units (spec decision).
- **Controls without an `id`** now work in sweeps (`562df8d0`).

The presentation fingerprint changed again. The manifest in the publish carries the new value, so `just clip` without the flag should pass after a rebase. Prove that on the next capture, and if it fails, find the cause as in the [pilot note](row-pilot-note.md#what-actually-happened) before using the flag.

## Next, in order

1. **`euler-line` and `triangle-centres`** fail before the drag. The poster recipes (`scripts/demonstration-preview-recipes.cjs:379` and `:409`) check for N, midpoints and feet, or for G, O and H, which the example scenes do not draw. The spec says the clip starts from the example scene. Decide whether the poster evidence for these rows should follow the example scene, as the capture path already does for `orientation`, then recapture both. Record the decision in the spec.
2. **`inscribed-angle` amplitude.** The eased schedule sampled about 39–144 degrees against the row's 10–170, while the quote says end to end. Check the full sample list in the manifest, then either widen the path or accept it with a reason.
3. **Haiku visual review and Sonnet mathematical review** for the captured clips once each family is complete (stream file step 4).
4. **Next row batches** through the [row brief](row-brief.md). Add one rule to the brief first: a drag on a compgeo graph gets `fineGrid: -8`.

## Known limits for later rows

- `SimsonLineGraph`, `InversionGraph`, `VoronoiGraph` and `PointInPolygonGraph` bind their own drag handlers, so the fine-grid hook does not reach them. `simson-line`, `inversion`, `voronoi` and `point-in-polygon` drags need their own look. Prefer a slider if the lesson uses one.
- Sweep graphs (`fortune`, `interval-sweep`, `segment-intersections`, `bezier-clipping`, `bezier-hulls`) have small coordinate limits, so the rescale usually refuses and drags stay stepped there.
- `convex-hull` is still withdrawn (pilot note): it goes to Sonnet with the algorithm Demonstrations.
- A worker's preview restart is fine. Rebuild with `just build` after any change under `src/`, because the preview serves `build/`.

## Measures

| Slice | Tokens | Outcome |
| --- | --- | --- |
| Sonnet, preset route probe | 52.7k | Stopped correctly: presets are disabled in a lesson |
| Sonnet, fine-grid hook | 140.9k (budget handoff) | Hook and `orientation` done |
| Sonnet, finish captures | 48.0k | 2 clips, pixel tolerance, README |
| Sonnet reviewer, hook | 21.6k | One medium finding (coordinate limit), confirmed and fixed |

Not yet entered in the evaluation log.
