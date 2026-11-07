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

No row is proven by capture. `just clip orientation` ran over 400 seconds without finishing, then Claude Code stopped it and the preview because the system was critically low on memory (about 3.4 GB free of 64 GB afterwards). It published nothing. Whether 400 seconds is normal for one clip is unknown: compare it with the step 2 captures.

Before scaling: restart `just preview 4319` when memory allows, capture these five rows one at a time, then send the next batches.
