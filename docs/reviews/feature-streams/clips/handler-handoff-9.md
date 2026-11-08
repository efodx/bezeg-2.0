# Clips handler handoff 9

Handler 9 continued from [handoff 8](handler-handoff-8.md) under the same owner direction:
- Push by hand: fetch, rebase, the checks for the changed files, then `git push origin HEAD:master`. Do not use `just publish`.
- Preflight every row with `node scripts/demonstration-clip-rows/_preflight.cjs`, and capture only rows that pass.
- Decide open questions yourself and record them in the spec as "(handler n)".

**Successor launch (owner rule).** At your context handoff, commit and push your note, then launch from this worktree:

`claude --bg -n "clips handler <n+1>" --agent bezeg-handler --model opus --permission-mode auto --effort medium "Continue docs/tasks/feature-streams/clips.md from docs/reviews/feature-streams/clips/handler-handoff-<n>.md under AGENTS.md."`

The supervisor finds a live stream session by the name "clips handler <n>". Confirm the successor appears in `claude agents --json`, stop everything your session started (preview, workers), and pass this rule on.

## Done and pushed

- Reviews of handler 8's seven clips (Haiku visual, Sonnet mathematics): pass. Haiku's one "fail" (interp-hermite) was wrong: P1 is drawn in the handle colour and does move. Epicycles runs half a lap by design, not a full lap.
- Shared checks (handler-owned, each its own commit, each with a test seen failing first):
  - `22b96b88`: the unresponsive-board check also hashes line and segment endpoints (`lineHash`).
  - `5797eb36`: a discrete `number-field` control types start + count × step into an integer field.
  - `button-count` control (Sonnet worker, reviewed by me): presses a button and counts inputs labelled `countLabel` + digits.
- Clips: geometric-series (q sweep), inversion (r 2 → 3 → 2), point-in-polygon (q's y into the notch; no longer poster-only), bspline-nurbs (weight 3 sweep; supersedes the wait for a finer t slider), bspline-insertion (`button-count`) and bezier-clipping (`trace-step`). The first three were reviewed: pass, plus one fixed comment error (the inversion image at r = 2 is tangent outside).
- Each changed driver file changes the capture fingerprint. The first capture after such a change needs `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1`; I used it only after driver changes that leave presentation untouched.

## Next, in order

1. **Reviews of the last three clips**: bspline-nurbs, bspline-insertion and bezier-clipping. Run a Haiku visual and a Sonnet mathematical review, and include an engineering look at the `button-count` diff in `_driver.cjs`, `_schema.cjs` and `_check.cjs`. Sheets: `ffmpeg -i src/images/demonstrations/catalog/<id>.webm -vf "select='not(mod(n\,12))',scale=300:-1,tile=4x2" -frames:v 1 out.png`. Tell Haiku what moves and where; it misidentifies points otherwise. The cues:
   - nurbs: weight 3 belongs to the top point (0,1), and its two arcs flatten inward.
   - insertion: the curve stays and the polygon gains points.
   - clipping: the fat line narrows at the left crossing.
2. **Five remain in `src/demonstrationMotionPending.ts`.** Four are poster-only by decision: ear-clipping, linear-map, hull-robustness and root-finding. Recheck hull-robustness and root-finding against the new kinds before step 6:
   - hull-robustness: its fields are integers, but an edit may reset its trace.
   - root-finding: an x0 change resets the step.

   The fifth, projective-pascal, still needs a table-index readout in `PascalControls.tsx` (Controls stream). `button-count` does not fit it, because its steppers add no fields.
3. Queue step 5 (repair batch, if the reviews find anything), then step 6 (acceptance: every spec criterion, the docs in criterion 8, `just check`, catalog smoke at desktop and 390px, hosted CI).

## Known limits

- Same as handoff 8: CRLF row files (edit with python, `newline=''`), backslashes via `chr(92)`, and no `sed` on path lines. On Git Bash, pass URL paths to node with `MSYS_NO_PATHCONV=1` and use `pwd -W`.
- `.command-logs/h9-probe/probe.cjs <repo> <id> <route>` lists a poster scene's controls. The route-probe was taken on lesson example scenes, not posters.

## Measures

| Slice | Tokens | Outcome |
| --- | --- | --- |
| Haiku visual review, 7 clips | 44.4k | One false fail |
| Sonnet math review, 7 clips | 24.5k | Pass |
| Haiku visual review, 3 clips | 22.0k | Pass |
| Sonnet math and tooling review, 3 clips | 25.4k | One comment error |
| Sonnet worker, `button-count` kind and row | 39.2k | Passed, no repair |
