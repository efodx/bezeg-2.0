# Batch 16 smoke: computational-geometry family registration

Production build from `38347c40` (HEAD). Full revision `38347c409a5bb4e918b7c908931efa1fc014fee5`. Command: `just build` (log `.command-logs/batch16-build.log`). The build passed (`exit=0`, `build: passed in 9.0s; revision 38347c409a5bb4e918b7c908931efa1fc014fee5; clean; warnings present (see log)`); warnings are recorded in the provenance log (`.command-logs/2026-11-12T17-22-41-595Z-35776-7e76ad5a.log`), not classified here.

History: a first attempt at `d07f7ff0` (the registration commit) was blocked before any test ran. `tests/smoke-catalog.cjs` required a non-empty `legacyDemonstrationRows` array, and that table is empty once every family is registered. The harness guard was fixed in `38347c40` (`tests/smoke-catalog.cjs:83-86`); the rerun below is on `38347c40`. The logs of the `d07f7ff0` attempt were overwritten by this rerun.

Paths were taken from `src/graphs/compgeo/computationalGeometry/registration.ts` (lines 12-27): `/bezeg-2.0/compgeo/orientation`, `/polygon-area`, `/convex-hull`, `/point-in-polygon`, `/hull-robustness`, `/bezier-hulls`, `/ear-clipping`, `/point-set-triangulation`, `/delaunay`, `/voronoi`, `/voronoi-degenerate`, `/interval-sweep`, `/segment-intersections`, `/monotone-partition`, `/monotone-triangulation`, `/fortune`. The Preset collection keys are `computationalGeometryCollectionKeys` (lines 33-50), for example `convex-hull` → `compgeo-hull-trace`, `point-set-triangulation` → `compgeo-triangulation`, `segment-intersections` → `compgeo-bentley-ottmann`.

Grep saved in `.command-logs/batch16-grep.txt`:

`(^| )(orientation|polygon-area|convex-hull|point-in-polygon|hull-robustness|bezier-hulls|ear-clipping|point-set-triangulation|delaunay|voronoi|voronoi-degenerate|interval-sweep|segment-intersections|monotone-partition|monotone-triangulation|fortune)( |$)|the catalogue shows every demonstration|catalog filters combine|generated preview mapping and provenance`

Selection dry run: `just smoke-built --port 4331 --workers=2 --list --grep "$G"` (wrapper log `.command-logs/batch16-list.log`, `exit=0`; child list log `.command-logs/2026-11-12T17-22-57-939Z-24548-a0e90f86.log`). It listed 51 tests in 2 files and ran no tests. The run waited about six minutes for a test slot held by other sessions' publish checks before listing. Every listed row:

- Catalog (3): "the catalogue shows every demonstration in teaching order with useful cards and supported destinations" (`demonstrations.smoke.spec.cjs:61`), "generated preview mapping and provenance cover the active catalog without a fixed route total" (`:140`), "catalog filters combine topic and forgiving search, then clear recoverable empty results" (`:149`).
- Demonstrations (16): each of the 16 IDs "renders its heading, graph, and inspector" (`demonstrations.smoke.spec.cjs:299`, generated loop).
- Lesson walks (32): for each of the 16 IDs, the `Lesson <id>` describe with the Slovenian `?learn=1` walk (`guided-lessons.smoke.spec.cjs:2661`) and the English 390x844 walk (`:2672`). Lesson rows are in the `LESSONS` table (`:2580`); the ID rows are at `:1859`, `:1871`, `:1884`, `:1898`, `:1911`, `:1928`, `:1945`, `:1958`, `:1971`, `:1983`, `:2000`, `:2107`, `:2178`, `:2191`, `:2204`, `:2520`.
- Extra rows: none. The title grep matched no test outside the three catalog rows and the generated per-ID rows. The 51 rows are exactly 3 + 16 + 32.

Total: 51 rows, all `[chromium]`.

Then `just smoke-built --port 4331 --workers=2 --grep "$G"`. Wrapper log: `.command-logs/batch16-smoke.log` (`exit=0`). Result: `smoke-built: passed in 85.1s (test slot 2/2, 5 workers); revision 38347c409a5bb4e918b7c908931efa1fc014fee5; clean; reusing build from revision 38347c409a5bb4e918b7c908931efa1fc014fee5 (clean at build time)`. Playwright run log: `.command-logs/2026-11-12T17-29-41-680Z-31780-4f412994.log` (`51 passed (1.4m)`; no failed, skipped, or flaky lines; no failure lines matched). The preview was the harness-owned production preview started by `smoke-built` on port 4331.

Result: 51 passed, 0 failed, 0 skipped, 0 flaky.

Selected rows and status:
- Catalog (3): all pass.
- Demonstrations (16): all 16 "renders its heading, graph, and inspector" rows pass.
- Lesson walks (32): all 16 `Lesson <id>` Slovenian desktop and English 390x844 walks pass.
- Extra rows (0): none listed.
- Lesson exit: no exit rows were generated for these IDs.

Preset save/reopen: no Preset row covers the 16 IDs or their `compgeo-*` collection keys. A search of `tests/*.cjs` for `preset` near these IDs or keys, and for `compgeo-`, returned no hits at `38347c40`. No Preset row was added, and none was run.

Not covered:
- Preset save/reopen and import/export for the computational-geometry collections (`computationalGeometryCollectionKeys`). No harness row covers them.
- Lesson exit for these IDs (no exit rows generated).
- Console and page errors: the demonstration rows do not capture them, so those rows establish render only.
- Drag, slider and graph interaction on the 16 routes; only route load, render, and lesson walks ran.
- Catalog controls at 390, 724 and 1440 px, topic history, deep links, card-back restore, and breadcrumb rows.
- Mathematical correctness of the readouts; a passing walk means the harness probes passed, not that the geometry was re-derived.
- Unit test `src/graphs/registrationIntegrity.test.ts:200` (reads `legacyDemonstrationRows`) was not run here.
- Other families' rows were not selected by this grep.
- Cleanup: the preview was harness-owned and disposed by `smoke-built`. This worker created no data and started no long-lived process; both wrappers exited with `exit=0`.
