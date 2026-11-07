# Row pilot note (clips step 3)

Two Haiku `medium` batches of three Demonstrations, spot-checked by the handler against lessons, probe and graph source. Five rows are committed; none has been captured.

## Measures

| Batch | Tokens | Tool uses | Rows returned | Rows repaired or withdrawn |
| --- | --- | --- | --- | --- |
| `triangle-geometry` | 58,014 | 18 | 3 | 2 |
| `convexity-hulls` | 61,253 | 20 | 3 | 1 |

About 20k tokens per row, against 130–200k per one or two clips in the earlier motion pilot. Three of six rows needed a change. All three passed `_check.cjs`, which cannot see these faults.

## Findings

- `triangle-centres`: the quote said to show \(O\), which is off in the example scene. Replaced with the centroid step's prompt, which asks for a vertex drag on what is visible.
- `inscribed-angle`: straight drag legs for a point confined to a circle, with a fine slider available. Now a sweep of that slider, 10 to 170 degrees in equal legs. The arc above \(AB\) runs from about -23 to 203 degrees, and the slider stops at 0, so the clip covers most of the arc and not its ends, although the quote says end to end.
- `convex-hull`: withdrawn. The row stepped with a quote from the monotone chain step, while the example opens on `slow-edge-test`. A drag is no answer either: any model change returns the trace to step 0 (`HullTraceGraph.tsx`), and the hull is drawn only when the trace is `done` (`hullTraceRun.ts`), so from this scene a drag moves only a dot. Send it to Sonnet with the algorithm Demonstrations. `HULL_TRACE_STEPS.slowEnd` is 504, so large cumulative press counts may show edges accumulating; that is untested.

Accepted with a flag for step 4's visual review:

- `euler-line`: the quote is the drag step, but the Euler line is off in the example scene, and whether the \(HG\) and \(GO\) readouts show was not checked. The drag is real; collinearity may not read at card size.
- `polygon-area`: the quote comes from the bow-tie step and speaks of the readout, which is off in the example's pentagon scene. The vertex drag is real and does make the polygon cross itself.
- `orientation`: the recipe poster has \(r=(3,2)\), and the example scene has only \(p\) and \(q\). `just clip` should recapture the poster from the example; confirm that.

## Decision

Haiku stays on rows with an obvious slider or drag. All three faults were implied checks, so `row-brief.md` now states them: confined points use their slider, a quote must match what the example shows, and a drag must change the picture from the start scene. Whether that lowers the repair rate is unmeasured until the next batches. Rejected: moving everything to Sonnet, because each repair was a small edit and the token saving is large.

## Capture status

Corrected 2026-11-07 by the next handler. The first version of this section blamed low memory for a capture that ran over 400 seconds. Memory was not the cause, and 400 seconds is not normal.

### What actually happened

`just clip orientation` did not run slowly. A rerun failed about 2 seconds in on `Capture presentation fingerprint changed`, then sat idle for 60 minutes, because the manifest checks threw after the browser launched and outside its `finally`, and an open browser keeps Node alive. The earlier 400-second run matches this, though that run's log was not read. A working capture takes about 40 seconds (`inscribed-angle`: 38).

The fingerprint change was not a presentation change. The stored value reproduces exactly with every input CRLF and `_jump.cjs` LF: Git's autocrlf had rewritten that one file on checkout, and the fingerprint hashed raw bytes. Fixed in `cda9b0de`, which hashes normalized source text and launches the browser after those checks. The same failure now exits 1 in 6 seconds.

Other rules this adds: `sed -i` here rewrites a CRLF file as LF, which no longer matters to the fingerprint. `capture-guided-example-previews.cjs` has its own fingerprint, not reviewed for this.

### Rows the first captures changed

- `inscribed-angle`: captured. The slider has no `id` and its arrow step is 1 degree, so the row now sweeps the number field, and the driver keeps its label locator when a control has no id. The readout holds 66,8 degrees through the sweep. The eased schedule sampled only about 39 to 144 degrees, not the row's 10 to 170, while the quote says end to end: review this with the family.
- `orientation`, `polygon-area`, `euler-line`, `triangle-centres`: compgeo points always snap to the grid, so a pointer drag cannot follow a smooth schedule. See [the fine grid note](fine-grid-note.md) once that slice returns.
