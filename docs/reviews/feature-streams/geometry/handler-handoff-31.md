# Geometry stream: handler handoff 31

Written 2026-11-02 by handler 31 (Opus 5.5, auto) at the 150k soft threshold. Continues [handoff 30](handler-handoff-30.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md).

## Where things are

- **Branch:** `stream-geometry`. Master and the local branch are both at `f6d0190b` (pushed), apart from this note.
- **Running processes:** none. No worker, no preview, no watcher.
- **Leftover branches.** The auto-mode classifier refused to delete these, so the owner should delete them or allow it:
  - `origin/geometry-t2-15b-wip` is obsolete; delete it with `git push origin :geometry-t2-15b-wip`, not a force-push.
  - Local `backup-15b-pre-squash` is obsolete; its content is on master.
  - Local `geometry-posters-t2b-backup` is the old trial capture. Delete it after checking item 1 below.
  - `origin/stream-geometry` is an old line; leave it alone.

## Done this run

- **Task 15 accepted** (T2, lesson B2 `point-set-triangulation`). Record: [15](../../../tasks/triangulation-voronoi/15-point-set-triangulation-lesson.md#evidence-handler-31-2026-11-02).
  - `90c282c1` fix: with the triangulation overlay hidden, the panel shows only n and k. The review found that steps 1–2 spoiled the prediction step.
  - `dccdf58a` feat: lesson B2, its smoke row, and the chapter section `point-set-triangulation`.
  - **17a was pulled forward.** The interim owner (the `ear-clipping` section) cannot open a lesson in a chapter-owned chapter: `guidedExamples.ts` `resolveGuidedExample` accepts only the section's own lesson. The first smoke showed the lesson never opened. Any future interim owner inside `triangulations-voronoi`, `convexity-hulls` or `sweep-algorithms` has the same problem: give the lesson its own section in the same change.
  - Checks:
    - Full unit suite on the pre-push tree: 8252 passed, 5 skipped.
    - Smoke recheck passed, in SL and EN with a live switch.
    - After the final rebase onto `380b2a0e`: tsc, 28 focused files with 293 tests, and lint. Conflicts were the counts only: coverage refs 91; `CHAPTER_LINK_PENDING` = `patch-coons`, `delaunay`; lessonless ids `interp-runge`, `delaunay`.
  - Evidence logs, all untracked, are in `docs/reviews/triangulation-voronoi/`: `15b-r*`, `15b-h-full-unit.log`, `17a-*`, `15-push-*`.

## Remaining, in order

1. **Posters:** Curves BS-A-5b landed the joint capture (`bbcd8a34`, notes in `291ba8da`). Check that the `point-set-triangulation` and `delaunay` posters have equal units (the circumcircle is round). Check whether "neustrezen rob" still overlaps the Delaunay circle, and adjust the label only if it does. Then remove `geometry-posters-t2b-backup`.
2. **Task 16, lesson B3** (`delaunay`), with one Sonnet `bezeg-worker`, modelled on 15b (`docs/reviews/triangulation-voronoi/15b-brief.md`). Change for B3:
   - Its owner must be a new `delaunay` section from the start: do 17b in the same slice, or give the owner the section directly. Do not add an interim owner.
   - Add the `resolveGuidedExample` test, as 17a did in `triangulationChapter.test.ts`.
   - B2's step 6 forward link to B3 is task 16's job.
   - The "unreleased lessons" scan in `triangulationChapter.test.ts` must drop the Delaunay vocabulary once B3 ships.
3. **Task 17b** (the `delaunay` section) if not merged into 16. Then T2 F6 acceptance.
4. **S2 kernel 14** (sweep) may interleave.

## Risks

- **Do not rebase under a running worker.**
- **Memory:** run heavy checks one at a time. The full suite takes about 15 minutes, `src/learning` plus `src/graphs/compgeo` about 14.
- **Rebase conflicts:** count tests conflict with other streams almost every time. Keep both sides and recompute: `lessonCatalog.test.ts`, `guidedExamplePreviewCopy.test.ts` (currently 80 lessons, 87 copies, before master's additions), `authoredChapterCoverage.test.ts`, and `familyChapters.test.ts` `CHAPTER_LINK_PENDING`.
- **Never stage:** `src/demonstrationMotionAssets.ts` CRLF-only changes, smoke screenshots or JSON, or untracked logs and briefs.
- **LaTeX:** use the Write or Edit tool, or Python with `newline=''`, keeping CRLF.
- **Smoke Exit:** a smoke script that pressed Exit after the last step stayed on the lesson, probably because of the confirmation dialog. It was not diagnosed. Ask smoke workers to confirm the dialog.

## Settings to keep

- Handler: Opus, permission mode auto.
- Workers: `bezeg-worker`, Sonnet medium, one code worker at a time.
- Reviews: `bezeg-reviewer`, Sonnet.
- Smoke: `bezeg-smoke`, Sonnet; scripts in the job tmp directory.
