# Clips handler handoff 8

Handler 8 continued from [handoff 7](handler-handoff-7.md) under the same owner direction:
- Push by hand: fetch, rebase, the checks for the changed files, then `git push origin HEAD:master`. Do not use `just publish`.
- Preflight every row with `node scripts/demonstration-clip-rows/_preflight.cjs`, and capture only rows that pass.
- Decide open questions yourself and record them in the spec as "(handler n)".

**Successor launch (owner rule).** At your context handoff, commit and push your note, then launch from this worktree:

`claude --bg -n "clips handler <n+1>" --agent bezeg-handler --model opus --permission-mode auto --effort medium "Continue docs/tasks/feature-streams/clips.md from docs/reviews/feature-streams/clips/handler-handoff-<n>.md under AGENTS.md."`

The supervisor finds a live stream session by the name "clips handler <n>". Confirm the successor appears in `claude agents --json`, stop everything your session started (preview, workers), and pass this rule on.

## Done and pushed

- Reviews: Sonnet mathematical and Haiku visual of fortune, voronoi, voronoi-degenerate and handler 4's 12 clips (interpolation, school functions, B-splines, analysis). No mathematical errors. One real defect: bspline-blossom's point was half clipped at b = 1.5, so the peak is now 1.3. The faint voronoi cell highlight is an app finding: the outline is on layer 0 under the edge curve (`voronoiDrawing.ts`). The clip stays, and a later app fix means recapturing voronoi and voronoi-degenerate together.
- `b614484e` (app, its own commit): the Runge max-error marker is named `runge-grid-max` and the rational probe point `rational-probe`, so `offCamera` can name them. Host tests were seen failing without the names.
- `611d25cc`: interp-runge and rational-function clips; bspline-blossom recaptured.
- `ecac3f08`: interp-hermite (P1's y field), bspline-extraction (knot u3) and epicycles (time slider) clips.
- `249fc06f`: fourier-coefficients clip (tip value field); `route-probe.json` gained that field, marked `addedBy`.
- Decisions (spec, "handler 8"): root-finding is poster-only, bspline-nurbs waits for a finer slider, and geometric-series stays held on the driver's response signature. inversion and projective-pascal need app changes.
- 11 Demonstrations remain in `src/demonstrationMotionPending.ts`. Poster-only by decision: ear-clipping, linear-map, hull-robustness, point-in-polygon and root-finding.

## Next, in order

1. **Reviews of handler 8's six new clips** (interp-runge, rational-function, interp-hermite, bspline-extraction, epicycles, fourier-coefficients) and the recaptured bspline-blossom: Haiku visual and Sonnet mathematical. I checked each sheet myself (Runge overshoot grows with n; the rational asymptote is x + (3 − a); the blossom point stays in view; the epicycle slider runs 0–6.28, a full lap). Sheets: `ffmpeg -i src/images/demonstrations/catalog/<id>.webm -vf "select='not(mod(n\,12))',scale=300:-1,tile=4x2" -frames:v 1 out.png`.
2. **Open rows needing a change outside rows** (details in [held rows](held-rows.md) and the spec):
   - geometric-series: add line and segment coordinates to `boardUnresponsiveFrame` (`_driver.cjs:112-115`, handler-owned shared check, its own commit), plus a quote that asks for the motion.
   - inversion: a capture-grid snap in `InversionGraph.tsx:474` (capture-only hook, its own commit), then drag S with `fineGrid`.
   - projective-pascal: a table-index readout beside the Pascal steppers. That is a visible control change, so read the Controls queue first.
   - bspline-nurbs: a slider step that holds t = 1/16 (Controls).
   - Still unresolved: bezier-clipping (moving a control point resets the clipping display) and bspline-insertion (only the Vstavi vozel button changes the picture).
3. Then queue steps 5 and 6 of the task file.

## Known limits

- Same as handoff 7: the shared capture fingerprint (recapture edited rows in one run), socket errors on runs over four clips, backslashes in heredocs (use python with `chr(92)`).
- Row files have CRLF line endings: python anchors with `\n` miss them. Never `sed` a path line: identical paths repeat across rows (my slip edited three; the capture's stored-row check caught it).
- `_check.cjs` validates control labels against `route-probe.json`, which was probed on lesson example scenes, not posters. A field present only in the poster needs an `addedBy` probe entry.

## Measures

| Slice | Tokens | Outcome |
| --- | --- | --- |
| Sonnet math review, 3 compgeo clips | 21.5k | Pass; highlight cause found |
| Haiku visual review, 2 Voronoi clips | 26.0k | Confirmed faint highlight |
| Sonnet math review, 12 handler-4 clips | 36.9k | No errors; blossom clipping |
| Haiku visual review, 12 handler-4 clips | 58.8k | No new defects |
| Sonnet worker, 4 held rows | 66.0k | All blocked, causes right |
| Sonnet worker, 4 held rows | 80.9k | 3 rows passed |
| Sonnet worker, 3 rows | 69.7k | 1 row passed, 2 blocked |
