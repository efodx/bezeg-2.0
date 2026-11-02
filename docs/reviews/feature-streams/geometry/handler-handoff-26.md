# Geometry stream: handler handoff 26

Written 2026-11-02 by handler 26 (Opus 5.5, auto, effort medium) at the 150k soft threshold. Continues [handoff 25](handler-handoff-25.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md).

## Where things are

- Branch `stream-geometry`, pushed to `master` at the commit named in the final report. No worker, preview or watcher from this session is still running (the 215k self-watcher dies with the session).
- **Done this run:**
  - **S2 task files** 14–21 for sweep C3 and C4 and the S2 table in [the sweep README](../../../tasks/sweep-algorithms/README.md) (`30343207`). Handler decisions are recorded in 14 (event order and "below", helpers carried as `helperChanges` beside the sweep trace with `partitionStateAt`), 15 (the stack folded as the status list, a combined `partitionAndTriangulate` trace, comparison by `predicateCount` totals), 19 (interim lesson owner until task 21; registration adds both ids to `CHAPTER_LINK_PENDING`) and 20 (the ear-clipping contrast is made, since T1 is released).
  - **T2 task 11 accepted** (`4b11b174`): `src/compgeo/pointInsertion.ts` with `insertPoint` and `boundaryCount`, the shared `visibleBoundaryArc` in `delaunay.ts`. Sonnet worker, then Sonnet mathematical review (no high findings). The handler repaired the medium finding: the random runs now assert flips, insertions and all four insertion cases. Evidence is in the task file.
  - **Convexity F6 part 2, the bilingual smoke:** [f6-convexity-smoke.md](f6-convexity-smoke.md), from a Sonnet `bezeg-smoke` against the production preview at `62a18d6a` (src unchanged since `just check` at `8be00ede`). 28 passed, 0 failed, 0 blocked, 5 skipped by brief. It covered every browser row of the [evidence matrix](f6-convexity-evidence-matrix.md): deep link, reload and catalog previews, the SL lesson with Back, exit restore and the final frame, the live SL→EN switch of lesson prose, keyboard-only A1 and A4, touch add at 390 px, SVG/PNG export, Presets, the chapter links in both languages, and the exact refusal inputs (check 9). Raw JSON and PNGs in `f6-convexity-smoke/` stay untracked.

## Why convexity F6 is not accepted yet

The smoke found two defects (recorded as observations, but both are acceptance problems):

1. **Projection (gate 3):** at 1366×768 the default example's P5 \((2,5)\) sits on the board's top edge on `polygon-area` and `convex-hull` (screenshot `f6-convexity-smoke/convex-hull-1366.png`). `HullTraceGraph` and `PolygonAreaGraph` have no `initialView()` override. The sweep, ear-clipping and Maps compgeo graphs do (for example `src/graphs/compgeo/EarClippingGraph.tsx:245`). Check `OrientationGraph` too. Add the override as sweep task 10's follow-up did, and extend `compgeoDefaultView.host.test.tsx` (a mutation removing an override must fail).
2. **Text (A4.6/A4.7):** with n<3, step 1 of all three hull algorithms says "Verigi združimo v konveksno ovojnico" ("the chains are joined"), which is chain wording even for the slow test and gift wrapping. The string is in `src/localization/sl.ts` (find the EN twin). Give the n<3 case algorithm-neutral wording in both catalogs, with a host test.

Also seen, not blocking: on `convex-hull` at 1366×768 the trace step text is below the fold; the "+12" label on `polygon-area` is overdrawn by an interior-point marker; there is no skip link (the board is Tab stop 10 on `orientation`, the point list stop 36); the document title is "Bezeg" on every route (shared shell). Record these as gaps in the acceptance record. The "+12" overdraw is a cheap fix if the worker is in that file anyway.

## Remaining, in order

1. **Repair the two defects** with one Sonnet `bezeg-worker` medium (both are small; same family). Checks: tsc, lint on touched files, `just unit src/graphs/compgeo src/localization`, build. Then a narrow Haiku `bezeg-smoke` recheck on a fresh preview (`just build`, then `just preview 4313`; the recipe takes a bare port): `polygon-area` and `convex-hull` at 1366×768 frame all default points, the n<3 text in SL and EN for all three algorithms.
2. **Write `f6-convexity-acceptance.md`**, modelled on [f6-t1-s1-acceptance.md](f6-t1-s1-acceptance.md). Evidence: the matrix, `just check` at `8be00ede` (`docs/reviews/convexity-hulls/f6-check.log`), this smoke, the repair and its recheck. Gaps: the non-blocking items above, no physical touch, no mouse drag, and readability judged from screenshots. Then set the convexity README and stream line to "F6 accepted", and remove "Not done: convexity Batch 1 has no F6 record yet" from the T1/S1 record.
3. **T2 task 12** (`docs/tasks/triangulation-voronoi/12-point-set-triangulation-graph.md`), then 13 onward, one code worker at a time, each followed by the review its task names. **S2 kernel 14** may interleave (independent of T2).
4. Update the stream lines for families 2 and 3 as tasks start. Both lines are current as of this handoff, and the convexity line names the two pending repairs.

## Checks run this run

- Task 11: `just unit src/compgeo` (worker), the focused `pointInsertion.test.ts` after the repair, `just lint src/compgeo`, tsc. All pass at `4b11b174`'s tree. Logs: `docs/reviews/triangulation-voronoi/11*.log` (untracked).
- `just build` at `62a18d6a` for the smoke preview passed.
- No full `just check` this run. The next F6 acceptance needs one after the repair, or an argument that the repair's scope is covered by focused checks plus CI.

## Risks

- Memory was tight (about 1.5 GB free at lint). Run heavy checks one at a time.
- Write docs that contain LaTeX with the Write tool, not Bash heredocs.
- Never stage `src/demonstrationMotionAssets.ts` (CRLF only), the `f6-smoke*/` screenshots or JSON, or the untracked logs.
- Hosted CI: the last known failures are Maps' and Curves' `GraphTransientState.part2/part3` cases, none from Geometry. Recheck after this push.

## Settings to keep

Opus handler, permission mode auto, effort medium. Workers: `bezeg-worker` Sonnet medium, one code worker at a time. Reviews: `bezeg-reviewer` Sonnet. Smoke: `bezeg-smoke`, Sonnet for broad runs and Haiku for narrow rechecks.
