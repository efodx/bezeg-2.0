# Maps stream: handler handoff 17

Written 2026-11-02 by handler 17 (Opus 5.5, `auto`, effort `medium`), which continued from [handoff 16](handler-handoff-16.md). Gates: `G-REG` and `G-CG` open, `G-HL` closed. `Run state: active`. Worktree `.claude/worktrees/stream-maps`, branch `worktree-stream-maps`, equal to `origin/master` at `2c031c89` before this note. Push to `master` only.

Reason for handoff: the handler context passed the 150k soft threshold during the F3+F4 review. The step was finished; no new step was started.

## Done this session (all on `origin/master`)

- **Hosted CI** passed at `002d14c8` (contains `a1e45cba`, 07 F2a).
- **`a2e23da7` docs: owner decision on the T4 tolerance policy.**
  - Relayed by the supervisor 2026-11-02. Owner's words: "'exactly collinear' if the lesson assumes collinear in that state, but isn't just because of numerical errors, then let it say collinear."
  - Recorded in spec T4 acceptance 2, `07-batch-c.md` (release condition accepted) and the stream file.
  - **F6 is no longer blocked on the owner.**
- **`11c4eb0c` 07 F2b: `/simson-line` registered.**
  - Brief: `docs/reviews/triangle-geometry/07-f2b-brief.md`.
  - The Demonstration is in family `plane-geometry` and is listed in `POSTER_PENDING`. Its Preset key `compgeo-simson-line` was added to import.
  - Four terms were recorded in `docs/localization.md`.
  - Rebase: a mechanical conflict with Geometry's triangulation and Delaunay routes. I kept both sides (catalog total 81).
  - Checks:
    - The worker's focused `just unit` passed.
    - The handler ran tsc, `just build`, a Playwright route check in SL and EN with no console errors, and the conflicted tests after the rebase.
- **`01b5751b` glider wording repair (owner decision).**
  - At ε = 0 the status reads "kolinearna" / "collinear" and the area readout "= 0".
  - Keys: `simson_status_collinear`, `simson_area_zero`. The internal status id `collinear-within` and `SIMSON_GLIDER_TOLERANCE` stay.
  - The host test expects the plain text in both languages. A mutation restoring the hedge fails it.
  - Checks: tsc, eslint, Simson and localization unit tests, build, and a browser check in both languages.
- **`2c031c89` 07 F3+F4: lesson T4 `simson-line`, chapter section `simson-line`, preview copy, smoke row.**
  - New lesson action kind `{kind: 'simson'; operation: 'load-example' | 'set-offset'}`, plus `parameter t` on `SimsonLineGraph`.
  - Brief: `07-f3-f4-brief.md`. Worker 1 reached its context threshold (notes: `07-f3-f4-w1-notes.md`). Worker 2 finished the checks and ran 6 mutations.
  - Engineering review (Sonnet) and content review (Haiku). The handler repaired:
    - the SL comma in the chapter purpose;
    - summary prose that wrongly said the readout decides "only if" (fixed in both languages and in the code comment);
    - "izreka" in T4 and in the shipped T3.
  - Declined: adding the ε = −0,2 value (0,09 S) to step 4, because the step asks the learner to read it from the readout.
  - Accepted: the transient-state contract exercises only `parameter t`; the `simson` kind is covered by the dedicated synchronous-sequence test.
  - Smoke bound raised from 3 to 4 board points.
  - Checks before the final rebase: tsc, build, focused unit, `just smoke-lesson simson-line euler-line` (4/4), and `just smoke-built tests/unified-learning.smoke.spec.cjs`.
  - Rebase onto the Functions pole-polar lesson and Geometry 15a conflicted in `model.ts`, `lessonCatalog.test.ts` and the `LESSONS` list in `guided-lessons.smoke.spec.cjs`; I kept both sides.
  - A focused unit rerun over `src/learning`, `src/graphs/compgeo`, presets, demonstrations and routes found one failure: the preview-copy counts had merged as 78/85. I fixed them to 79/86 and reran the affected files; they pass. tsc passes.
  - **Not rerun after the final rebase: `just build` and the smoke rows.** Check hosted CI for `2c031c89`.

## Next, in order

1. Check hosted CI for `2c031c89` or later. If it fails, reproduce locally and repair first.
2. **07 F5: the `simson-line` poster recipe**, modelled on `30ba2b2e` (06 F5, `euler-line`).
   - All overlays should be on, with the window of the sibling recipes (`[-3.55, 5.81, 10.55, -2.81]`) unless P or the feet fall outside it.
   - The evidence should check the vertices, P and the feet.
   - Run `node --test scripts/demonstration-preview-capture.test.cjs`.
3. **07 F6: Batch C checks.**
   - `just check`.
   - A browser smoke (Sonnet `bezeg-smoke`, port 4316) modelled on `docs/reviews/triangle-geometry/06-f6-smoke-brief.md`. It must cover the offset slider (every stop, with "not collinear" at ±0.001 and plain "collinear" at 0), exact mode, the vertex example, lesson T4, and earlier lessons T1–T3 unchanged.
   - F6 then waits only on the poster capture, like 05 and 06.
4. Then 08 Batch D (power of a point and inversion, T5), per `docs/tasks/triangle-geometry/08-batch-d.md`. It needs complex maps 01 (done).

## Open items carried over

- Geometry has not added the `PointSetGraph` vertex-name hook. The panels still say "A (P1)".
- Posters for `linear-map`, the complex maps, `triangle-centres`, `inscribed-angle`, `euler-line` and `simson-line` wait for the shared capture. Geometry handed the joint capture to Curves BS-A-5b (`9c5abe6e`).
- Content review nits not applied:
  - SL step 1 could say the perpendiculars are drawn only in step 2.
  - The chapter could name glider mode by its UI label.
  - Spec T4 item 5 asks for a textbook section, but the prose cites author and title only, following the file's convention.
- The memory reaper sometimes kills background commands. Restart the context watcher at once if that happens.
- A brief lesson: ask M-size lesson workers to run the unit tests after their first describe block. Worker 1 spent its budget on 330 unrun test lines (recorded in `docs/agent-workflow/evaluation-log.md`).

## Settings to keep

Opus 5.5 handler, `--permission-mode auto`, `--effort medium`. Workers: `bezeg-worker` Sonnet 5.5 `medium`. Reviewers: `bezeg-reviewer` Sonnet for engineering and mathematics, Haiku for UI, localization and content fidelity. Smoke: `bezeg-smoke` Sonnet on port 4316. `just smoke-lesson <lesson-id>` runs a guided-lesson row against the current build.
