# Batch 12 smoke: analysis family registration

Production build from `55beb2cd` (clean; `55beb2cd` is HEAD and is the local analysis-family registration commit named in the brief). Command: `just build` (log `.command-logs/batch12-build.log`, provenance log `.command-logs/2026-11-12T14-07-10-686Z-29284-ecee9e27.log`). The build passed (`exit=0`, `build: passed in 8.7s; revision 55beb2cd9b6a638adb8c0067965ff43347ed0726; clean`); warnings are present and are recorded in the provenance log, not classified here.

Paths were taken from `src/graphs/analysis/registration.ts` (rows at lines 16-31): `/bezeg-2.0/analysis/{bisection,root-finding,quadrature,euler-method,mean-value,accumulation,darboux,extrema,convexity,taylor,sequence,uniform-convergence,fourier-series,fourier-coefficients,epicycles,fixed-point}`.

Selection dry run: `just smoke-built --port 4331 --workers=2 --list --grep "$G"` (wrapper log `.command-logs/batch12-list.log`; child list log `.command-logs/2026-11-12T14-07-25-963Z-33456-9f327ee2.log`). It listed 53 tests in 3 files and ran no tests. The grep is saved in `.command-logs/batch12-grep.txt`:

`(^| )(bisection|root-finding|quadrature|euler-method|mean-value|accumulation|darboux|extrema|convexity|taylor|sequence|uniform-convergence|fourier-series|fourier-coefficients|epicycles|fixed-point)( |$)|the catalogue shows every demonstration|catalog filters combine|generated preview mapping and provenance`

Short IDs (`sequence`, `taylor`, `extrema`) matched only their exact rows. Extra rows beyond the 16 IDs and 3 catalog rows: (a) `Lesson bisection exit` (`guided-lessons.smoke.spec.cjs:2710`, an English Exit/re-entry row for an ID in `EXIT_SAMPLE`, the same kind of row batch11 recorded as `linear-function exit`); (b) `Taylor observation can hide, edit, reopen the same frame, continue and restore on exit` (`lesson-graph-access.smoke.spec.cjs:34`). The regex has no case-insensitive flag and the title has no lowercase `taylor` token, so the reason this row matched was not established; it is recorded as an unexplained extra row and was not removed from the run.

Then `just smoke-built --port 4331 --workers=2 --grep "$G"`. Wrapper log: `.command-logs/batch12-smoke.log`. Result: `smoke-built: passed in 111.1s (test slot 2/2, 5 workers); revision 55beb2cd9b6a638adb8c0067965ff43347ed0726; clean; reusing build from revision 55beb2cd9b6a638adb8c0067965ff43347ed0726 (clean at build time)`. Playwright run log: `.command-logs/2026-11-12T14-08-17-799Z-30516-c71fe060.log` (`53 passed (1.8m)`; no failed, skipped, or flaky lines). The preview was the harness-owned production preview started by `smoke-built` on port 4331.

Result: 53 passed, 0 failed, 0 skipped, 0 flaky.

Selected rows (53 total, all `[chromium]`):
- Catalog (3): "the catalogue shows every demonstration in teaching order with useful cards and supported destinations" (`demonstrations.smoke.spec.cjs:61`), "generated preview mapping and provenance cover the active catalog without a fixed route total" (`:140`), "catalog filters combine topic and forgiving search, then clear recoverable empty results" (`:149`). All pass.
- Demonstrations (16): each of the sixteen IDs "renders its heading, graph, and inspector" (`demonstrations.smoke.spec.cjs:299`). All pass.
- Lesson walks (32): for each of the sixteen IDs, the `Lesson <id>` describe, with the Slovenian `?learn=1` walk (`guided-lessons.smoke.spec.cjs:2661`) and the English 390x844 walk (`:2672`). All pass. The `bisection` row is also a lesson-walk row in the `LESSONS` table; it is not an extra row.
- Lesson exit (1): "Lesson bisection exit: en: Exit restores the user state and re-entering twice keeps board counts stable" (`guided-lessons.smoke.spec.cjs:2710`). Passes. Extra row (see above).
- Extra graph-access row (1): "Taylor observation can hide, edit, reopen the same frame, continue and restore on exit" (`lesson-graph-access.smoke.spec.cjs:34`). Passes. Extra row, match reason unexplained (see above).

Preset save/reopen: no Preset row covers any of the sixteen IDs. A search of `tests/*.cjs` for `preset` (files: `curve-editing-modes`, `curve-ownership`, `guided-lessons`, `smoke-catalog`, `workflows`) with any of the sixteen IDs or `analysis` returned no lines. `analysisCollectionKeys` and `analysisPrimaryOwners` in `src/graphs/analysis/registration.ts` (lines 37 and 61) have no harness row. No Preset row was added, and none was run.

Not covered:
- Preset save/reopen and import/export for the analysis collections (`analysisCollectionKeys` in `src/graphs/analysis/registration.ts`). No harness row covers them.
- Lesson exit for the other fifteen IDs (no exit rows are generated for them), and lesson walks for the `analysisPrimaryOwners` section IDs beyond the walk rows themselves.
- Console and page errors: the demonstration rows do not capture them, so those rows establish render only.
- Drag, slider and graph interaction on the sixteen routes; only route load, render, and lesson walks ran.
- Catalog controls at 390, 724 and 1440 px, topic history, deep links, card-back restore, and breadcrumb rows.
- Mathematical correctness of the readouts; a passing walk means the harness probes passed, not that the mathematics was re-derived.
- No diff-level comparison against pre-registration behaviour was made.
- Other families' rows (functions, unit-circle, waves, patches, and the rest of the catalog order) were not selected by this grep.
- The reason the `Taylor observation` row (`lesson-graph-access.smoke.spec.cjs:34`) matched the anchored grep is unexplained; it was not investigated further.
- Cleanup: the preview was harness-owned and disposed by `smoke-built`. This worker created no data and started no long-lived process; no process started by this worker remains.
