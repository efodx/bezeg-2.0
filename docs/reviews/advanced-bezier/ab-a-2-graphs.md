# AB-A-2a and AB-A-2c: degree-reduction and arc-length graphs

Spec: [D1, D3](../../specs/advanced-bezier-lessons.md); tasks: [Batch A plan](../../tasks/advanced-bezier/README.md#batch-a-plan-d1-and-d3-handler-58-2026-11-06). Written by curves handler 58 on 2026-11-06. Commit `f7d6294a`. Both graphs are unrouted: registration is AB-A-2b and AB-A-2d.

## Delivered

- **D1,** `src/graphs/curves/reduction/`: `DegreeReductionGraph.tsx`, `ReductionOverlay.ts`. Collection `reduction`, which rejects a curve without four points. Lesson actions `reduction-mode`, `reduction-points`; visibility targets `reduction-quadratic`, `reduction-elevation`.
- **D3,** `src/graphs/curves/arclength/`: `ArcLengthParametrizationGraph.tsx`, `ArcLengthOverlay.ts`, `ArcSpeedPlot.tsx`, `ArcDetails.tsx`, `arcLengthModel.ts`. Collection `arc-length-param`. Lesson actions `arc-curve`, `arc-pieces`, `arc-mover-mode`, `arc-mover-position`, `arc-play`, `arc-pause`; visibility targets `arc-equal-t`, `arc-equal-arc`, `arc-speed-plot`. Locale prefix `arcparam_`, as `arc_` belongs to the function arc-length graph.

## Decisions

- **Short board captions.** Each board shows short lines only; the long readouts sit in the inspector. D1 has five short lines and its tolerance sentence in the inspector. D3 has at most four lines under 40 characters, and its other readouts in `ArcDetails`, a list written imperatively, so a drag renders no React.
- **Built-in Presets do not exist;** Presets are saved by the user. So P and P2 (D1) and the cusp cubic (D3) reach students only through lesson scenes or a Preset file.
- **D3 playback** redraws the board per frame and writes no state; the position is committed on pause. The slider is disabled while playing. A press on the board, including a pan, pauses. A mode change commits the live position first.
- **Control polygon of Q:** the test asserts 8,324555; the spec's 8.32456 is that value rounded.

## Checks

On `f7d6294a`'s tree: `npx tsc --noEmit --pretty false` exit 0; ESLint on both folders and the collection file exit 0; `just unit` on both folders, `curvePresetCollections`, `src/graphs/base/presets` and `src/localization` passed (D1 13 graph tests, D3 22). The full suite did not run.

Mutations observed failing, each reverted: D1 `effectiveMode` forced to fixed, `onStateChange` redraw disabled, `dispose` without `removeObject`, `pointCount` check off. D3 equal-arc pool reading equal-t points, unmount without `stopPlayback`, `exactLength` returning a value for a non-PH curve, mode change without `pause`, details push removed.

Not covered: no browser check; no test that a drag renders no React in `ArcDetails`; the real-time feel of playback.

## Review and disposition

Engineering, UI and graph-level mathematics in one review (`bezeg-reviewer`, Sonnet, read-only). No high finding. Lifecycle, consumers, PH control points and exact label, and vacuous assertions found nothing. It did not read `en.ts`, `ArcSpeedPlot` or `ReductionOverlay`, so the D1 overlay's `quadraticSamples` has only the graph tests and the handler's reading behind it.

| Finding | Disposition |
| --- | --- |
| Position slider does not follow playback | Fixed: disabled while playing |
| Mode change during playback drops the position | Fixed: commits first, regression test |
| `reduction_mode` names the feature, not the choice | Fixed by the handler: "Krajišči kvadratne krivulje" |
| Play button name generic, no `aria-pressed` | Fixed |

The caption repairs came from the handler's own reading and were outside the review's scope. Nothing was re-reviewed after the repair; the handler read the diff below.

## Incident: files overwritten during the repair

The repair worker restored backups from `/tmp/g.bak` and `/tmp/o.bak`, names another worker had already used, so `ArcLengthParametrizationGraph.tsx` and `ArcLengthOverlay.ts` were overwritten with the reduction files. Nothing was committed, and the worker rewrote both from what it had read; it reported this itself. The handler rebuilt the reviewed versions from the transcripts (replaying the workers' edits for the graph, the reviewer's `Read` for the overlay) and diffed them against the rewrite: every difference is an intended repair. The reduction files were untouched. `/tmp` is shared by every job, so briefs must name a private scratch path.
