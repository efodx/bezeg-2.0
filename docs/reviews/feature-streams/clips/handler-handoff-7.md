# Clips handler handoff 7

Handler 7 continued from [handoff 6](handler-handoff-6.md) under the same owner direction:
- Push by hand: fetch, rebase, the checks for the changed files, then `git push origin HEAD:master`. Do not use `just publish`.
- Preflight every row with `node scripts/demonstration-clip-rows/_preflight.cjs`, and capture only rows that pass.
- Decide open questions yourself and record them in the spec as "(handler n)".

**Successor launch (owner rule).** At your context handoff, commit and push your note, then launch from this worktree:

`claude --bg -n "clips handler <n+1>" --agent bezeg-handler --model opus --permission-mode auto --effort medium "Continue docs/tasks/feature-streams/clips.md from docs/reviews/feature-streams/clips/handler-handoff-<n>.md under AGENTS.md."`

The supervisor finds a live stream session by the name "clips handler <n>". Confirm the successor appears in `claude agents --json`, stop everything your session started (preview, workers), and pass this rule on.

## Done and pushed

- `766eebce` fortune trace clip (steps 5 to 8, `offCamera` for `fortune-breakpoint`). segment-intersections recaptured with path +0/+6/+10/+14/+18, one checkpoint per sweep height, and the swap prompt as its quote.
- `388eaecf` capture-only app hook (own commit): under the clip global, the fine-grid rescale also scales the Voronoi query point and followed drawing box. It keeps that box while the view is unchanged, lets the query marker follow the pointer, and keeps the marker's look on press. Host tests were seen failing without each fix, except for the press highlight, which only preflight covers.
- `53028c46` voronoi (query drag across two borders) and voronoi-degenerate (P4 of the trapezoid ±1, the degree-4 vertex splits and rejoins), both `fineGrid: -8`. New row field `restyle {reason}`: strokes switch only between poster widths and are re-presented, and at most 4 restyled frame steps are excused from the pixel check (`restyledSteps` in `_jump.cjs`, also used by the offline validator). ear-clipping recorded as poster-only.
- Reviews: I checked conic-focal myself against the conic formulas (a=5, c=4 at ε=0.8; the hyperbola frame matches ε≈1.4; the small ellipse ε≈0.4). A Haiku visual review of conic-focal, fortune and segment-intersections reported only allowed off-frame points and label overlaps already in the poster. I checked these findings and they need no change.
- 17 Demonstrations remain in `src/demonstrationMotionPending.ts` (ear-clipping, linear-map, hull-robustness and point-in-polygon are poster-only by decision and stay there).

## Next, in order

1. **Mathematical review (Sonnet) of fortune, voronoi and voronoi-degenerate.** Sheets: `ffmpeg -i src/images/demonstrations/catalog/<id>.webm -vf "select='not(mod(n\,12))',scale=300:-1,tile=4x2" -frames:v 1 out.png`. A Haiku visual review of voronoi and voronoi-degenerate is still open. In voronoi the highlight outline on P7's cell looks faint; check whether it shows at all.
2. **The rest of [held rows](held-rows.md):** `projective-pascal` (snapped drag; the fine-grid pattern may transfer if its graph has a grid hook), `inversion`, interp-hermite, interp-runge (`offCamera` may fit, as for fortune), rational-function, geometric-series, the B-spline rows, root-finding and `epicycles`. The row text for each is in held-rows.md.
3. **Check handler 4's 12 clips** (interpolation, school functions, B-splines, analysis). See if they had a Sonnet mathematical review and a Haiku visual review: read the evaluation log and handoffs 4 to 6 first.
4. Then queue steps 5 and 6 of the task file.

## Known limits

- Same as handoff 6: the shared capture fingerprint (recapture edited rows in one run), socket errors on runs over four clips, backslashes in heredocs (use python with `chr(92)`).
- A trace's step-by-step look: `.command-logs/h7/steps.cjs <route> <pre-presses> <last-step> <outdir>` (needs `MSYS_NO_PATHCONV=1`). It is slow (about 30 s a step, waiting on a missing text locator).

## Measures

| Slice | Tokens | Outcome |
| --- | --- | --- |
| Sonnet worker, Voronoi drag-start jump | 78.8k | Root cause found (rounded follow box re-measured, marker highlight, quarter snap); both rows passed |
| Haiku visual review, 3 clips | 22.0k | No real defects; 3 findings checked and dismissed |
