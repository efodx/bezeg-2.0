# B8g brief (handoff-v13): plane geometry captures missed by the B8 sweep (G03, G04)

**Role.** `bezeg-worker`, worker B (recipes and captures). No git commands that move HEAD, no commits, never push. Scratch in `.command-logs/`, never `/tmp`. Do not build or touch the preview on port 4333 (it serves this worktree's current build). Edit no `src/` source file; only capture outputs.

**Goal.** The spec rows (`docs/specs/site-walkthrough-graphs-and-captures.md:151-153`) were never swept; their posters still show Arial sentences:

- `euler-line`: Remove ("Eulerjeva premica: O, G in H so kolinearne").
- `simson-line`: Remove ("Nožišča D, E, F: kolinearna").
- `inscribed-angle`: Keep in part: strip to the angle values. Today: "∠APB = 66,8°; ∠ACB = 66,8°; središčni kot = 133,6°" → "66,8°; 66,8°; 133,6°".

**Change.** In `scripts/demonstration-preview-recipes.cjs`, the `captureText` table (line 213 onward; see how `orientation` keeps and strips, and `docs/reviews/site-walkthrough/graphs/b8b/worker.md` for the B8b pattern): add `'euler-line': {keep: [], strip: []}`, `'simson-line': {keep: [], strip: []}`, `'inscribed-angle': {keep: [/°/], strip: [/∠[A-Z]{3} = /g, /središčni kot = /]}`. Strip patterns are applied with `String.replace` (`scripts/capture-demonstration-previews.cjs:229`), so a `g` flag removes every match. If the text is a smartlabel the capture refuses to strip it (line 227): then report and stop. Add the three ids to the test list in `scripts/demonstration-preview-text.test.cjs` where B8b–B8f added theirs, and run `node --test scripts/demonstration-preview-text.test.cjs`. The B8f overlap rule applies: a kept value that lands on the subject becomes Remove; say so if it does.

**Capture.** Copy current posters and clips of the three ids to `docs/reviews/site-walkthrough/graphs/b8g/before/`, then:
`PREVIEW_BASE_URL=http://127.0.0.1:4333/bezeg-2.0 PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1 PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1 PREVIEW_RECAPTURE_IDS=inscribed-angle,euler-line,simson-line node scripts/capture-demonstration-previews.cjs > .command-logs/b8g-capture.log 2>&1`
(the handler authorizes VERIFIED for this recipe-only change). If it reports stale provenance for another id, add that id and say so. If a clip exceeds 300 KiB, stop and report the byte count.

**Acceptance.** A. `euler-line`, `simson-line` posters: no text; geometry unchanged. B. `inscribed-angle` poster: only the three angle values, no symbols or words; not overlapping the circle or points (else Remove). C. Manifest changed by id only for the three ids (and any stale id you had to add). D. Text test passes. E. `b8g/after/` copies and `b8g/index.html` in the format of `../b9/index.html`.

**Return.** ≤200 words: per-id poster verdict, check results, anything not done. Note in `docs/reviews/site-walkthrough/graphs/b8g/worker.md`.
