# Geometry stream: handler handoff 32 (PC switch)

Written 2026-11-02 by handler 32 (Opus 5.5, auto). It continues [handoff 31](handler-handoff-31.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md). The owner is moving to a new PC, so the stream is **stopped** (line 2 of the stream file) and no successor was launched. The new-PC setup restarts it from a fresh clone of `origin`.

## Where things are

- **Master:** this note's commit, on top of 16a (`956c3aef`) and its docs (`acf0a0d7`).
- **WIP branch:** `origin/stream-geometry-wip-pc-switch` at `d206686b`. It is one commit on top of `acf0a0d7` and holds the 614 files that were untracked under `docs/reviews/`:
  - worker briefs: `triangulation-voronoi/16a-brief.md`, `16b-brief.md`;
  - the worker handoff `triangulation-voronoi/16b-handoff.md`;
  - logs, mutation evidence and perf captures.
  - None of it is reviewed. **It has no source changes.**
  - It was not pushed as `stream-geometry`, because `origin/stream-geometry` is an older, diverged line (`0627de12`) and a non-force push is impossible.
  - Resume: `git fetch origin && git checkout -b stream-geometry origin/master`. Then copy the briefs you need with `git checkout origin/stream-geometry-wip-pc-switch -- docs/reviews/triangulation-voronoi/16b-brief.md docs/reviews/triangulation-voronoi/16b-handoff.md`. Keep them untracked as usual; do not commit them to master.
- **Running processes:** none. No worker, no preview, no watcher.
- **Skipped:** nothing. No untracked file was over 5 MB and none was secret. `node_modules`, `dist`, `.command-logs` and test results are ignored, so they were not included.
- **Test slots:** recalibrate on the new machine. `BEZEG_TEST_SLOTS` and `BEZEG_TEST_WORKERS` may differ; see `docs/commands.md`.
- **Leftover branches** (on this PC only; the auto-mode classifier refused to delete them): `backup-15b-pre-squash` and `geometry-posters-t2b-backup` are obsolete. `origin/geometry-t2-15b-wip` is obsolete; delete it with `git push origin :geometry-t2-15b-wip`.

## Done this run

- **Posters checked (item 1 of handoff 31).**
  - Joint capture `bbcd8a34`: `point-set-triangulation` and `delaunay` have the 720:440 aspect, so units are equal.
  - The Delaunay circle is round, and "neustrezen rob" sits inside it, clear of it. No label change was needed.
- **16a accepted** (`956c3aef`, Delaunay lesson actions):
  - trace commands;
  - `set-trace-step`;
  - new `point-set` `select-triangle`.
  - Evidence and the reachability decision are in [task 16](../../../tasks/triangulation-voronoi/16-delaunay-lesson.md#evidence-handler-32-2026-11-02-16a-the-actions).
  - Checks after the rebase onto `5ad01ae9`: tsc; focused unit tests (`Delaunay*`, `Triangulation*`, `EarClipping*`, `lessonCatalog`) passed. The worker also ran eslint and `just unit src/graphs/compgeo src/learning/runtime`.
  - The full suite was not run after 16a. Run it once with 16b.

## Next step, exactly

1. **16b + 17b** (lesson B3 `delaunay` and its chapter section) with one Sonnet `bezeg-worker` under `docs/reviews/triangulation-voronoi/16b-brief.md`.
   - First update the brief's HEAD (it says `a41d0ff6`; use current master) and point it at `16b-handoff.md`.
   - The first 16b worker stopped on the PC-switch HANDOFF before any edit. Its note has the file-by-file plan and the expected count changes from `dccdf58a`: preview copy 87→88, available lessons 80→81, coverage 91→92, lessonless `['interp-runge']`, `CHAPTER_LINK_PENDING` `['patch-coons']`. These counts predate master's newer commits, so recompute them.
   - Handler decision recorded in the brief: the circle centre, \(r^2\) and the names of the illegal edges are quoted as a calculation and asserted against the kernel, with no new graph feature. Point names are 1-based \(P_1..P_7\).
2. Handler after 16b: engineering review (Sonnet `bezeg-reviewer`), full unit suite once, `just build`, `just smoke-lesson delaunay` in SL and EN with a live switch, and a keyboard-only run of B3. Then the 17b evidence in task 17, and T2 F6 acceptance.
3. S2 kernel 14 (sweep) may interleave.

## Risks

Unchanged from handoff 31:
- count-test rebase conflicts;
- CRLF in `compgeoGuidedLessons.ts` and `triangulationChapter.ts`;
- LaTeX through heredocs loses backslashes (it happened again this run; fixed with Edit);
- Smoke Exit dialog;
- heavy checks one at a time.

## Settings to keep

- Handler: Opus, permission mode auto.
- Workers: `bezeg-worker`, Sonnet medium, one code worker at a time.
- Reviews: `bezeg-reviewer`, Sonnet.
- Smoke: `bezeg-smoke`, Sonnet.
