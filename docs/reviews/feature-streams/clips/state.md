# Clips stream state

Stream: [clips](../../../tasks/feature-streams/clips.md). Spec: [lesson-guided catalog clips](../../../specs/lesson-guided-catalog-clips.md). Branch `worktree-stream-clips` (worktree `.claude/worktrees/stream-clips`), pushed to `origin/master` through the commit that adds this note. Earlier numbered handoffs (1–9) stay in this directory as history; do not read them to continue.

## Standing owner directions (verbatim from earlier handoffs)

- "Push by hand: fetch, rebase, the checks for the changed files, then `git push origin HEAD:master`. Do not use `just publish`."
- "Preflight every row with `node scripts/demonstration-clip-rows/_preflight.cjs`, and capture only rows that pass."
- "Decide open questions yourself and record them in the spec as "(handler n)"."

## Present state

116 of 118 Demonstrations have clips, and all six queue steps are done except criterion 1 of step 6. Run state: **blocked**. `ear-clipping` stays poster-only because no motion is possible, which criterion 1 allows. `projective-pascal` waits for the Controls stream: its "Točka D: naslednji položaj" steppers show no value, so a discrete row cannot read a press back. The request is the "From Clips" note in [controls.md](../../../tasks/feature-streams/controls.md#notes).

Accepted by handler 10 (2026-11-08):
- `5180805d`, `b8fee05e`: the `trace-step` readout also reads "korak N, napaka E"; root-finding clip.
- `c8f48cd1`: hull-robustness clip (trace steps from the poster).
- `5a9dd668`, `f5bb9be4`, `1a4d6956`: the validator accepts a row clip's still-colour patch; row CRF ladder to 46; linear-map clip; hull-robustness quote escaping fixed.
- `cdafe07d`: real reasons on the two pending entries.
- `b78f79bb`: criterion 8 docs.
- Reviews of handler 9's three clips found no defects. Spec decisions for each item are marked "(handler 10)".

Checks at `cdafe07d`: `just check` passed and hosted CI (Browser smoke) passed. A Haiku catalog smoke at `b78f79bb` passed five of five checks at 1280×800 and 390×844.

## Next slice (when unblocked)

Relaunch condition: `PascalControls.tsx` on `origin/master` shows the selected point's table index or position. Do not launch a handler before that; it would idle.

- Goal: a `projective-pascal` clip that moves a point along the conic, as the lesson asks ("Premakni točko po stožnici in preveri, ali ostanejo kolinearna").
- Acceptance: spec criteria 1, 2, 5 and 6. Remove the pending entry from `src/demonstrationMotionPending.ts`. Then mark step 6 and the stream complete.
- Inputs: the held row and its failure history are in [held rows](held-rows.md) (row `projective-pascal`). The direction table is at `pascalEdit.ts:65`. The discrete readout belongs in `_driver.cjs` near `readTraceStep`. A new readout kind needs a test seen failing first, and stays with the handler, because it is a shared check.
- Review: Haiku visual and Sonnet mathematics on the contact sheet. Collinearity of the Pascal points is the mathematical check.

## Known limits

- `just clip a,b` captures only the first ID. For several stale rows, run `scripts/capture-demonstration-previews.cjs` with `PREVIEW_RECAPTURE_IDS=a,b`, `PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1` and `PREVIEW_BASE_URL`, because each single capture validates the whole set.
- Any change to the capture scripts or `tests/smoke-catalog.cjs` changes the fingerprint. Set `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1` only when presentation is untouched.
- Row files: write backslashes with `chr(92)` or `String.fromCharCode(92)`. Python heredocs dropped doubled backslashes twice, so lint the row files before capture. Several files use CRLF line endings: edit them with `newline=''`.
- Above CRF 34, view a full-size frame for legibility before accepting.

## Settings

Opus handler, `--permission-mode auto`, `--effort medium`; workers per the [handler card](../../../agent-workflow/handler-card.md) routing. Preview port 4319 (stopped).
