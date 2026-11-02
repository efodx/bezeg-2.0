# Geometry stream: handler handoff 30

Written 2026-11-02 by handler 30 (Opus 5.5, auto, effort low/medium) after the 150k soft threshold. Continues [handoff 29](handler-handoff-29.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md).

## Where things are

- **Branch:** `stream-geometry`. Master is at `9bede337` (pushed by this handler). The local branch has one commit beyond it, plus this note:
  - `4318e8a7` **wip** 15b. It is pushed to `origin/geometry-t2-15b-wip`, not to master.
- **Old remote branches:**
  - `origin/stream-geometry` is an old line; leave it alone and never force-push.
  - `origin/geometry-t2-14-wip` is obsolete.
- **Local backup branch:** `geometry-posters-t2b-backup` holds the unpublished trial poster capture (see below). Delete it once the joint capture lands.
- **Running processes:** none. No worker and no preview are running.

## Done this run

- **Posters, item 1 of handoff 29.**
  - The capture script's `git diff` overflow on Windows (ENAMETOOLONG) is fixed on master by Curves' chunking (`c6dd85a9`). My equivalent pathspec fix was dropped in the rebase.
  - A trial capture of the five then-pending ids worked. It showed the Delaunay circumcircle drawn as an ellipse: a recipe framing window disables equal units, and the window's aspect did not match the frame. I fixed both of our recipe windows to the 720:440 aspect (`458c99b4`, on master). A recapture with the new windows showed a round circle.
  - The trial was **not published**: `simson-line` joined `POSTER_PENDING` without a recipe, and the bspline recipes changed after the capture.
  - **The joint capture is Curves BS-A-5b** (their handoff 21 claims it and asks for a single capturer). Geometry does not run it; this is recorded in the stream notes (`9c5abe6e`).
- **15a accepted** (`9bede337`, on master). It adds the actions `set-triangulation`, `flip-edge` and `select-edge` (via the Preset validators and the panel's select/flip path), catalog shape checks, and 8 host tests. Mutation evidence is in `docs/reviews/triangulation-voronoi/15a-*.log`. The handler reviewed the diff, including Delaunay: an action there is an edit of the start triangulation and resets the trace to step 0, as the panel does. tsc and the two test files passed after rebasing onto the projective K3 commits.
- **15b built, not yet accepted** (`4318e8a7`):
  - Lesson B2 in `compgeoGuidedLessons.ts`, with its test `compgeoPointSetTriangulationLesson.test.ts` (12 tests). Every quoted number is asserted against the readout: 7/13/8, 1,91° against 25,35°, +2 for an inside point, 10 triangles with n = 9 and k = 6.
  - The worker's mutation evidence is in `docs/reviews/triangulation-voronoi/15b-*.log`.
  - The prose labels the points \(P_1..P_7\), matching the graph's labels; the spec says \(p_0..p_6\).
  - **Interim owner:** the chapter's `ear-clipping` section, in `guidedLessonOwnership.ts`, because `guidedLessonOwnership.test.ts` requires an existing section. Task 17 moves it to its own section.
  - **Smoke row** `pointSetTriangulation` in `tests/guided-lessons.smoke.spec.cjs`. The probe is the readout's point count n per step (7, 7, 7, 7, 9, 7, 9), and `minFrames` is 16.
  - **Checks on `4318e8a7`'s tree:** tsc, eslint on the handler's files, `just unit src/learning` (523 s, passed), and the worker's `just build`.

## Remaining, in order

1. **Finish 15b:**
   - Rebase onto `origin/master` and recheck tsc and `just unit src/learning`.
   - Run a Sonnet `bezeg-reviewer` engineering review of `9bede337..4318e8a7` (scene actions, readouts, counts; not prose).
   - Run `just smoke-lesson point-set-triangulation` through `bezeg-smoke` in SL and EN with a live switch. The step-1/2 probe assumes the readout panel is present while the triangulation is hidden; confirm it.
   - Run the full unit suite once (about 18 minutes).
   - Then squash or reword the wip commit into a normal commit, mark task 15 accepted with evidence in its task file and the stream line, and push to master. Delete `origin/geometry-t2-15b-wip` afterwards (`git push origin :geometry-t2-15b-wip`, not a force-push).
2. **Tasks 16 (B3) and 17** (chapter sections for B2 and B3, including the ownership move away from `ear-clipping`), one code worker at a time. **S2 kernel 14** (sweep) may interleave.
3. **Posters:** wait for Curves BS-A-5b. Afterwards check that the `point-set-triangulation` and `delaunay` posters have equal units. The trial also found "neustrezen rob" overlapping the Delaunay circle; tweak it only if it is still visible.

## Risks

- **Do not rebase under a running worker.** I did it once this run; it went through only because the worker had no tracked edits yet.
- **Memory:** run heavy checks one at a time.
- **Rebase conflicts:** `lessonCatalog.test.ts` and `guidedExamplePreviewCopy.test.ts` counts conflict often with other streams. Keep both sides and recompute the counts.
- **Never stage:** `src/demonstrationMotionAssets.ts` (the capture leaves a CRLF-only change; `git checkout --` it), smoke screenshots or JSON, or untracked logs.
- **LaTeX:** use the Write or Edit tool, not heredocs.

## Settings to keep

- Handler: Opus, permission mode auto.
- Workers: `bezeg-worker`, Sonnet medium, one code worker at a time.
- Reviews: `bezeg-reviewer`, Sonnet.
- Smoke: `bezeg-smoke`, Sonnet for lesson runs; keep repro scripts in the job tmp directory.
