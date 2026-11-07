# Clips handler handoff 6

Handler 6 continued from [handoff 5](handler-handoff-5.md) under the same owner direction:
- Push by hand: fetch, rebase, the checks for the changed files, then `git push origin HEAD:master`. Do not use `just publish`.
- Preflight every row with `node scripts/demonstration-clip-rows/_preflight.cjs`, and capture only rows that pass.
- Write the next family's rows while the current family captures.
- Decide open questions yourself and record them in the spec.

**Successor launch (owner rule, from README step 5).** At your context handoff, commit and push your note, then launch from this worktree:

`claude --bg -n "clips handler <n+1>" --agent bezeg-handler --model opus --permission-mode auto --effort medium "Continue docs/tasks/feature-streams/clips.md from docs/reviews/feature-streams/clips/handler-handoff-<n>.md under AGENTS.md."`

The `-n` name matters: the supervisor finds a live stream session by the name "clips handler <n>". Handler 6's session was first unnamed, and the supervisor started a duplicate. Confirm the successor appears in `claude agents --json`, stop everything your session started (preview, workers), and pass this rule on.

## Done and pushed

- `4ddfd63c` tooling:
  - Control kind `trace-step` for discrete rows: it presses "Naslednji korak" and reads the step from the page's "Korak N od M" text.
  - `stillColourPixel` for the encoder colour check.
  - Spec decisions marked "(handler 6)".
- `4c3ed8df` clips:
  - 7 compgeo trace clips: convex-hull, bezier-hulls, delaunay, interval-sweep, segment-intersections, monotone-partition and monotone-triangulation.
  - Visual-review repairs to curve-comb (gain up to 2.2) and curve-parametric (radius up to 1.1).
- `c0f47c9e` conic-focal clip: the row field `offCamera {points, reason}` exempts `$$F_2$$` and `$$P$$`.
- Reviews of handler 5's 18 clips and of the 7 compgeo clips. Mathematical review: no errors. Visual review: only the two curve repairs above. Panel readouts that clips cannot show are settled by a spec decision.
- 20 Demonstrations remain in `src/demonstrationMotionPending.ts`.

## Next, in order

1. **Review conic-focal.** It has had only my own check of the sheet.
2. **Revisit segment-intersections.** The mathematical review found checkpoints +0 and +4 look identical. Consider path `[0, 8, 12, 0]`-style checkpoints that each show a new event. Recapture only if a preflighted path shows more.
3. **Held compgeo rows** (row text in `.command-logs/rows-pending/compgeo-traces-held.cjs`, reasons in [held rows](held-rows.md)):
   - `fortune`: a point leaves the camera. The message now prints its name, so decide whether `offCamera` fits it.
   - `ear-clipping`: the poster is already at the last step, with no back button.
   - `voronoi` and `voronoi-degenerate` need ordinary drag rows on the query point.
4. **The rest of [held rows](held-rows.md):** `projective-pascal` (snapped drag), `inversion`, the interpolation, B-spline and analysis rows, and `epicycles`.
5. **Poster-only:** `linear-map` exceeds 300 KiB at every CRF (446 KiB at CRF 34) and stays poster-only under the budget rule. `hull-robustness` and `point-in-polygon` are listed with reasons.
6. **Check handler 4's 12 clips.** Its handoff names the review of the plane-geometry clips. The interpolation, school-function, B-spline and analysis clips may not have had steps 4–5. Check the evaluation log and the handoffs before reviewing them.

## Known limits

- **Shared capture fingerprint.** `just clip <id>` checks every shipped clip against its row. After you edit the rows of two clips, recapture both in one run: `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1 PREVIEW_RECAPTURE_IDS=a,b PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1 PREVIEW_BASE_URL=http://127.0.0.1:4319/bezeg-2.0 node scripts/capture-demonstration-previews.cjs`. Any change to the capture scripts needs `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1`.
- **Socket errors.** A seven-clip run hit a Windows `ERR_NO_BUFFER_SPACE` on page seven and published nothing. Runs of three or four clips passed.
- **Backslashes in heredocs.** The shell tool collapses `\\` in heredocs. Build backslashes with `chr(92)`, and always run `_check.cjs` on the row file.
- **Contact sheets:** `.command-logs/sheet4.sh <out.png> <id>` produces frames 0/24/48/72 at 480 px.

## Measures

| Slice | Tokens | Outcome |
| --- | --- | --- |
| Sonnet worker, trace-step driver and compgeo rows | 66.4k | Design accepted; 7 of 9 rows captured |
| Sonnet mathematical review, 18 clips | 57.0k | No errors; 3 suspected presentation items |
| Haiku visual review, 9 + 9 clips | 39.6k + 44.0k | 2 real frame defects, repaired |
| Haiku visual review, 7 compgeo clips | 51.8k | No defects; label crossings readable |
| Sonnet mathematical review, 7 compgeo clips | 55.0k | No findings; one weak checkpoint |
