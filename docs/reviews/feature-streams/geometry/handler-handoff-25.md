# Geometry stream: handler handoff 25

Written 2026-11-02 by handler 25 (Opus 5.5, auto, effort medium) at the 150k soft threshold. Continues [handoff 24](handler-handoff-24.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md).

## Where things are

- Branch `stream-geometry`, rebased on `origin/master`, with this run's docs commit pushed to `master` (see the commit named in the final report). Sources unchanged by this run. No worker, preview or watcher from this session is still running.
- **Hosted CI:** run `41394302129` (Numerical methods, after Geometry's `b208e4aa`) failed only in `GraphTransientState.part2` `inscribed-angle` (Maps). The `03dfe3b4` run was still pending. Nothing from Geometry.
- **Done this run (docs only):**
  - **Convexity Batch 1 F6, part 1:** the evidence matrix [f6-convexity-evidence-matrix.md](f6-convexity-evidence-matrix.md) (Sonnet `bezeg-reviewer`, read-only, at `8be00ede`). There is no contradiction between spec numbers and tests, and every A1/A2/A4 number is asserted. One MISSING row (glossary) and one PARTIAL row (capabilities) were fixed here: `GLOSSARY.md` gained Orientation, Signed area and Convex hull, and `docs/capabilities.md` describes the orientation, polygon-area and convex-hull routes properly. The other partial rows need the browser (see step 1 below).
  - **`just check` at `8be00ede`** (src identical to master at that point): passed in 23 min. Typecheck, lint, unit (7866 passed, 5 skipped, in 443 files) and the build all pass. The tree was dirty only with docs. Summary in `docs/reviews/convexity-hulls/f6-check.log` (untracked); the full log is under `.command-logs/2026-11-02T05-57-04-*`.
  - **T2 task files** 11–17 and the T2 table in [the triangulation README](../../../tasks/triangulation-voronoi/README.md). Handler decisions are recorded in 12 (edits keep or rebuild the stored triangulation; flips by edge selection or a keyboard list; the before/after minimum angle).

## Remaining, in order

1. **Convexity F6, part 2: the bilingual smoke.** Use a Sonnet `bezeg-smoke` against a production preview (`just build`, then `just preview` on a free port such as 4313). Cover `orientation`, `polygon-area`, `convex-hull` and the chapter `convexity-hulls` in SL and EN. The brief adapts [f6-smoke.md](f6-smoke.md) and closes the matrix's browser rows:
   - deep link and reload, and the static preview in the catalog;
   - a live SL→EN switch in the middle of each lesson (the lesson text, not only the readouts);
   - a keyboard-only run of A1 and A4;
   - touch add mode, at 390 px;
   - SVG/PNG export on one route;
   - projection readability, from a screenshot at 1366;
   - Preset save, reopen and delete;
   - the lesson exit restoring the edited scene, and the final-scene handoff.
   - Handoff 24 asks for one more item: **record the exact input of every refusal check** (for example A2 self-intersecting, A4 all-collinear and n<3).

   Then write `f6-convexity-acceptance.md` modelled on [f6-t1-s1-acceptance.md](f6-t1-s1-acceptance.md), update the convexity README and stream line to "F6 accepted", and remove the "Not done: convexity" note from the T1/S1 record.
2. **S2 task files** (sweep C3, C4). Not started. Planned numbering:
   - 14 monotone partition kernel (`src/compgeo/sweep/monotonePartition.ts`; spec C3 examples and acceptance 1–4; polygon limit `SWEEP_MAX_POLYGON_VERTICES` = 20);
   - 15 monotone triangulation kernel, with a combined partition-then-triangulate trace for C4's free exploration and the comparison counts against `earClippingTrace`;
   - 16 `MonotonePartitionGraph` and 17 `MonotoneTriangulationGraph` (extends 16), both with C-7 side lists;
   - 18 registration (`monotone-partition`, `monotone-triangulation`);
   - 19 lesson C3; 20 lesson C4 (T1 is released, so C4 makes the ear-clipping contrast);
   - 21 chapter sections in `sweep-algorithms`; then F6.

   Template: the S1 files 05–13 and the T2 files written this run. Then add an S2 table to the sweep README.
3. **Dispatch T2 task 11** (kernel, Sonnet `bezeg-worker` medium, followed by a mathematical review), then 12, 13 and onward, one worker at a time. S2's kernels 14 and 15 are independent of T2 and may interleave.
4. Update the stream line for families 2 and 3 once their tasks start.

## Risks

- Memory: about 2.8 GB was free. `just check` competes with other sessions, so run heavy checks one at a time.
- Bash heredocs broke on the LaTeX in the task text this run; write docs with the Write tool (memory note "Bash backslash collapse").
- `src/demonstrationMotionAssets.ts` CRLF-only changes and the `f6-smoke/*.png` screenshots: never stage them (as in handoff 24).
- The URL keeps `learnChapter`/`learnSection` after a lesson exit. This is shared Learn behaviour, not Geometry's.

## Settings to keep

Opus handler, permission mode auto, effort medium. Workers: `bezeg-worker` Sonnet medium, one at a time. Reviews: `bezeg-reviewer` Sonnet. Smoke: `bezeg-smoke` Sonnet.
