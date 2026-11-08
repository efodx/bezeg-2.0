# Clips handler handoff 10

Handler 10 continued from [handoff 9](handler-handoff-9.md) under the same owner direction (push by hand, preflight every row, decide and record as "(handler n)").

## Done and pushed

- Reviews of handler 9's last three clips (Haiku visual, Sonnet mathematics and the `button-count` diff): no defects. Each reviewer raised one false finding, refuted with the source. Haiku took the inspector point at t = 1/16 for the weighted point in bspline-nurbs. Sonnet read the default quadratic example instead of the poster's cubic and called the insertion row's "at most 3 presses" wrong. Step 5 had nothing to repair.
- `trace-step` also reads root-finding's board text "korak N, napaka E" (`parseTraceReadout` in `_driver.cjs`, test seen failing first).
- Clips:
  - root-finding: steps Newton from the poster's step 1 to step 3 and back.
  - hull-robustness: steps the monotone chain from step 5. It is a hull trace graph, and its lesson's prompt is Play.
  - linear-map: a1 sweep at CRF 46. The row ladder now runs to 46, and `assertMotionBackground` in `tests/smoke-catalog.cjs` accepts a row clip's recorded still-colour patch.
  
  Spec decisions are recorded for each.
- Pending entries carry real reasons. ear-clipping: no motion is possible. projective-pascal: waits for a readout. A "From Clips" note in `controls.md` asks for a table-index readout in `PascalControls.tsx`.
- Step 6 acceptance: criterion 8 docs updated (capabilities, architecture, commands, family template F5). `just check` passed and hosted CI passed. A Haiku catalog smoke at 1280 and 390 px passed all five checks: 118 posters, the six newest clips play, the two poster-only cards attach no video, no console errors, no overflow at 390 px.

## State

116 of 118 Demonstrations have clips. Criterion 1 is open only for `projective-pascal`. Run state: blocked.

**No successor launched (handler 10 decision).** The only remaining work waits on the Controls stream, so a live handler would idle. Relaunch with the handoff-9 command, using `<n>` = 10, once `PascalControls.tsx` shows a table index or position for the selected point. Then write a discrete row on "Točka D: naslednji položaj": the held row and failures are in [held rows](held-rows.md). Capture it, review it, remove the pending entry, set criterion 1 done and mark the stream complete.

## Known limits

- `just clip a,b` captures only one ID. To recapture several rows at once, run `scripts/capture-demonstration-previews.cjs` with `PREVIEW_RECAPTURE_IDS=a,b`, `PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1` and `PREVIEW_BASE_URL` (in `docs/commands.md`). That run is needed when two stored rows are stale, because each single capture validates the whole set.
- Python heredocs dropped doubled backslashes in `lessonQuote` twice. Lint the row files before capture, and write backslashes with `chr(92)` or Node's `String.fromCharCode(92)`.

## Measures

| Slice | Tokens | Outcome |
| --- | --- | --- |
| Haiku visual review, 3 clips | 28.3k | One false concern |
| Sonnet math and `button-count` review | 35.8k | One false finding |
| Haiku catalog smoke, 2 viewports | 31.8k | Pass |
