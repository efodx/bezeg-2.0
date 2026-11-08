# Clip rows

One row describes one lesson-guided Demonstration clip. A row file is any `*.cjs` in this folder that does not start with `_`, is not `index.cjs` and does not end in `.test.cjs`; it exports an array of rows. `index.cjs` gathers them and `_schema.cjs` validates them. Design and decisions: `docs/specs/lesson-guided-catalog-clips.md`.

## Row fields

| Field | Content |
| --- | --- |
| `id` | Demonstration ID (must also have a recipe in `scripts/demonstration-preview-recipes.cjs`) |
| `motion` | `parameter-sweep`, `pointer-drag` or `discrete-exact-steps` (`surface-orbit` validates but the driver refuses it) |
| `control` | `{kind: 'slider' or 'number', label, step}`, `{kind: 'point', name}`, `{kind: 'surface-point', name}`, `{kind: 'stepper', label, step}` or `{kind: 'trace-step', label, step}` (discrete only) |
| `path` | Out and back, first = last. Sweep: control values. Board drag: board coordinates. Surface drag: pixel offsets from `[0, 0]` in the 360x220 host. Discrete: 3 to 8 cumulative press counts, first = last = 0 |
| `lessonQuote` | The lesson sentence the motion comes from |
| `discreteReason` | `null`, except for `discrete-exact-steps`, where it says why smooth motion is impossible |
| `fineGrid` | Optional integer -8 to -1, only for a `pointer-drag` row on a board point. See "Fine grid" |
| `restyle` | Optional `{reason}` for a row where the app itself moves a stroke between widths the poster frame shows (a highlight passing to another cell). Excuses at most 4 frame steps of the pixel check where stored stroke widths change; the state check still holds the value to the schedule |
| `offCamera` | Optional `{points, reason}` for a board row: JSXGraph names of derived points the lesson's motion takes out of view (for example `$$F_2$$` as a conic crosses ε = 1), and why. Every other point stays checked against the camera. Failure messages print each point's name |

Copy accessible labels and point names from `docs/reviews/feature-streams/clips/route-probe.json`. Look at the three rows in this folder (`curve-geometry.cjs`, `bezier.cjs`, `patches.cjs`) as models.

## Choosing the motion

- A slider or point that moves continuously: `parameter-sweep` or `pointer-drag`.
- An integer or coarse control that cannot follow a smooth schedule (it moves in whole steps, so 71 moving frames would repeat or leap): `discrete-exact-steps` with a `discreteReason`. The driver presses the named button to each checkpoint's cumulative count on a fresh poster scene and reads the value back at every checkpoint.
- Keep the path inside the start camera: the camera is fitted to the start state and never changes.

## Algorithm traces (`trace-step`)

A compgeo algorithm trace (convex hull, Bezier hulls, Delaunay, interval sweep, Bentley-Ottmann, monotone partition and triangulation) restarts at step 1 on every edit, and its "Naslednji korak" button has no value input. A `discrete-exact-steps` row with `control: {kind: 'trace-step', label: 'Naslednji korak', step: 1}` reads the step from the visible "Korak N od M" text (the lesson overlay's own line is skipped; exactly one distinct readout must exist). Each checkpoint opens a fresh poster scene, which is already at step `start` (1 plus the recipe's presses), presses the button `path[k]` times and asserts `start + path[k]`. The path counts presses beyond the poster, so the checkpoint 0 is the poster itself. A checkpoint beyond the last step fails with "the trace ends at step M; shorten the path". Without a Back button a poster that already sits at the last step (ear-clipping) has no forward motion and cannot be a row. Distinct steps must also look different: a step that changes only text is rejected by the distinct-frame check, so pick steps that move the board. Rows: `compgeo-traces.cjs`.

## Fine grid

Any graph built on `PointSetGraph` (the compgeo point-set views: orientation, polygon area, triangle centres, Euler line) snaps a dragged point to its model grid, so a smooth pointer drag would hop between grid nodes and fail the state check. Give such a row `fineGrid: -8` (the grid step becomes 2^-8 board units).

The driver sets `window.__bezegClipGridStepExponent` before the page loads (`addInitScript`). `PointSetGraph` reads it in one place, `clipGridStepExponent()`. When set it rescales the model to the finer grid on the first drag (`rescaleToFinerGrid`, points keep their coordinates), keeps the dragged point under the pointer, and clears the selection when the point is released, so the last frame has no selection ring and the loop closes. Voronoi's query point and its clipped drawing box follow the rescale (the box is kept while the view does not change, and the query marker follows the pointer and keeps its look on press), so the diagram does not redraw at the first drag. Without the global the app behaves as before. The lesson's own scene is unchanged; the global is capture-only and nothing ships it.

Pointer tolerance: the offline check that the point is under the pointer allows one thousandth of a CSS pixel (`boardDragTolerance` in `_driver.cjs`), converted to board units from the clip's own camera (box width) and CSS frame width (`width / 2`, captured at deviceScaleFactor 2). Browser pointer coordinates are float32, so a fixed board tolerance of 1e-6 cannot be met. The surface tolerance (0.05 px) is unchanged.

## Check a row before capture

`node scripts/demonstration-clip-rows/_check.cjs <row file name without .cjs>` needs no browser. It confirms that the quote is exact lesson text somewhere under `src/learning`, and that the control label and the path's range agree with the route probe. Start values are not checked offline: the probe was taken on lesson example scenes, but a clip starts from the Demonstration's recipe scene, so the capture asserts the start value or point position itself. It cannot tell whether the quote comes from this Demonstration's lesson, so it prints the file: check that yourself.

## Preflight

`node scripts/demonstration-clip-rows/_preflight.cjs <id>... ` (or `--file <row file name>` for every row of one family file) needs a running preview (`just preview 4319`; `PREVIEW_BASE_URL` overrides the default `http://127.0.0.1:4319/bezeg-2.0`). Each row runs through the same `captureRow` path as the capture and then the same row evidence checks (start value, hidden control, camera, board response, loop closure, distinct frames, state check, frame steps), but writes no poster, encode, manifest or catalog change. It continues past a failing row and prints `id | ok | Ns` or `id | FAIL | <first assertion message>`; the exit code is non-zero if any row failed. Frames of failing rows stay under `.command-logs/preflight-<pid>/`. A row takes about 20 to 40 seconds. The preflight finds bad rows early; the capture below remains the acceptance (it also checks the encode, the poster match and the manifest).

## Capture

Poster and clip both start from the Demonstration's existing poster scene (`_scene.cjs`): the route without a query in a fresh context, the full recipe from `scripts/demonstration-preview-recipes.cjs` applied (actions, camera and outcome check) exactly as for a non-row poster. The lesson chooses only the motion. A row never opens a lesson example scene (`?example=lesson.…`).

Start the production preview, then capture one clip at a time:

```
just preview 4319          # in the background; stop it afterwards
just clip <id>             # recapture, validate and publish one clip, poster, map and manifest
```

`PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1` is an operator flag for the first row of a new presentation fingerprint; routine clips pass without it. A non-publishing trial: `PREVIEW_BASE_URL=http://127.0.0.1:4319/bezeg-2.0 PREVIEW_IDS=<id> PREVIEW_MOTION_IDS=<id> node scripts/capture-demonstration-previews.cjs`; its frames and records stay under `.command-logs/preview-staging-*`.

The driver (`_driver.cjs`) hides the lesson overlay and the reopen-lesson tab (`.guided-lesson-tab`), parks the pointer in an empty corner, and clears the point selection a surface drag leaves behind through the Coons inspector's "Robna krivulja" select. A new surface needs its own clear in `clearSurfaceSelection`.

Rows take the lowest CRF of 10, 14, ... 34 that fits 300 KiB; the choice is recorded as `encoderBudget.crf`.

## Oversized or unreadable clips

The contract (`docs/specs/continuous-motion-previews.md`, Budgets) gives the order when a clip exceeds 300 KiB or the search lands on a high CRF and the mathematics looks unreadable: first fewer moving labels (the existing annotation policy), then a smaller motion amplitude (shorten the `path`), and only then encoder settings. Do not raise the 300 KiB ceiling. If it still exceeds, keep the poster, record the limitation and report it.

## Checks and what to do when one fails

Every message names its row id. Both the state check and the pixel check are reported together, ending in `[state check passed/failed, pixel check passed/failed]`.

| Message contains | Meaning and action |
| --- | --- |
| `state check failed: the app showed a value ... away from the schedule` | The control or point cannot follow the schedule (coarse or integer step). Make the row `discrete-exact-steps` with a `discreteReason`, or use a smaller path. |
| `state check failed: the schedule has a step ...x the typical step` | One leg of the path is much larger than the others, or the control quantises it. Make the legs similar in size, or use `discrete-exact-steps`. |
| `state check failed: frame N shows ... but its checkpoint expects ...` (discrete) | The button did not change the value as `control.step` says. Fix `step` or the label. |
| `state check failed: the app showed a value ... away from the schedule` on a `PointSetGraph` row (hops of a grid step, point snaps back) | The row has no `fineGrid`. Add `fineGrid: -8`. |
| `pixel check failed: largest step ...x the typical` | Neighbouring frames differ far more than usual (a cut or teleport) outside board text. Smooth the path. Do not raise the threshold (3) or exempt the row. |
| `text regions ignored by the pixel check cover ... percent` | Board text covers over 25 percent of the frame, so the mask would hide the picture. Fix the row or the scene; do not raise the limit. |
| `expected one draggable point named ...`, `control ... is missing or ambiguous`, `no surface point ...` | The name or label does not match the page; copy it from `route-probe.json`. |
| `the point starts at ... but the row path starts at ...`, `the scene starts at ... but the row path starts at ...` | The first waypoint is not the control's value or the point's position in the recipe scene (point to 0.02). Read the start from the failure message and from the recipe scene on the Demonstration route. |
| `the scene camera ... differs from the recipe camera` | Update `surfaceCameras` in `scripts/demonstration-preview-recipes.cjs`. |
| `no clip row for this record`, `captured from an older row; recapture it` | The stored record and the row file differ. Run `just clip <id>`. |
| `the app did not respond to the control at frame N` | The input changed but the board did not. Check the control label and whether the scene reacts to it; do not add an allowance. |
| `row ...: the id is not a Demonstration with a capture recipe`, `control.kind ... does not suit` | Fix the row id or the control kind for the Demonstration's view. |
| `only N distinct frames, need 24` | The input changes too little to see; widen the path (discrete rows need one image per distinct press count). |
| `point ... left the fixed camera` on a `fineGrid` row, with coordinates hundreds of times too large | The graph analyses grid coordinates as board units, so the rescale moves its overlays. Fix the graph to convert with `gridToBoard` (app code, its own commit); do not drop `fineGrid`. |
| `first frame differs from recipe poster` | The poster differs from the recipe start scene; recapture it with `just clip <id>`. |
| `no CRF up to 34 fits 300 KiB` | See "Oversized or unreadable clips". |

## What the checks cover

- State check (`assessRowState`, `assessPathSteps` in `_jump.cjs`): the value the app showed (slider readback, board coordinates, surface screen position) against the schedule, every frame, with no schedule step over 3 times the typical step. It is the precise cut detector on dense scenes.
- Pixel check (`frameSteps`, `assessFrameSteps`): the mean absolute difference between neighbouring raw PNG frames, with board text rectangles left out (a readout that flips is meant to change abruptly). No step may exceed 3 times the median moving step. The ignored rectangles are stored in the motion record (`ignored`). On a sparse scene a slider step moves a thin line by about the same pixels whatever its size, so the pixel check cannot see a leg-size cut there; the state check does.
- Board response (`assessRowState`, sweep and discrete rows): on every frame where the input differs from the previous frame, the stored curve path hash and point positions must differ too, with no allowance, so an app that ignores the control fails (`the app did not respond to the control at frame N`).
- Where each result comes from: the pixel result (`jump.steps` and its assessment) is measured at capture from the decoded PNGs. Later validation (`assertRowEvidence`) only checks that the stored steps are consistent with their assessment and the stored mask; it cannot see the pixels again. The state check, including the board response, is re-derived from the stored samples.
- The ignored-text mask is a union over all frames and is bounded only by the 25 percent cap; within that cap it can hide a change in the masked regions.
- The clip's first and last frames are compared with the recipe poster by the capture script.
- Camera held, loop closes (last frame equals first), first and last frames equal the poster, 96 frames at 24 fps, at most 300 KiB.

Tests: `_jump.test.cjs` (pixel check) and `_rows.test.cjs` (schema, state check, offline evidence of the published rows), both run by `just tooling-test`. `assertRowEvidence` in `scripts/demonstration-preview-motion.cjs` re-runs the checks from the stored record.
