# Batch 11 smoke: functions family registration

Production build from `e11c95b9` (clean; `e11c95b9` is HEAD and is the local functions-family registration commit named in the brief). Command: `just build` (log `.command-logs/batch11-build.log`, provenance log `.command-logs/2026-11-12T13-37-40-737Z-27460-4d24d6a3.log`). The build passed (`exit=0`, `build: passed in 9.0s; revision e11c95b99a7027338079861c02a551bc493cd86c; clean`); warnings are present and are recorded in the provenance log, not classified here.

Paths were taken from `src/graphs/functions/registration.ts` (`functionsDemonstrationRows`): `/bezeg-2.0/functions/{linear,exponential,trigonometric,transformations,inverse,polynomial-zeros,rational-functions,geometric-series,conics,continuity,derivative,integral,area-between,arc-length}`.

Selection dry run: `just smoke-built --port 4331 --workers=2 --list --grep "$G"` (log `.command-logs/batch11-list.log`; wrapper log `.command-logs/2026-11-12T13-38-06-093Z-25668-27d994cf.log`). It listed 46 `[chromium]` rows and ran no tests. `continuity`, `derivative` and `arc-length` matched only their exact rows; `arc-length-param` was not selected.

Then `just smoke-built --port 4331 --workers=2 --grep "$G"`. The grep is saved in `.command-logs/batch11-grep.txt`:

`(^| )(linear-function|exponential-function|trigonometric-functions|function-transformation|function-inverse|polynomial-zeros|rational-function|geometric-series|conic-focal|continuity|derivative|definite-integral|area-between-curves|arc-length)( |$)|the catalogue shows every demonstration|catalog filters combine|generated preview mapping and provenance`

Wrapper log: `.command-logs/batch11-smoke.log`. Result: `smoke-built: passed in 70.3s (test slot 2/2, 5 workers); revision e11c95b99a7027338079861c02a551bc493cd86c; clean; reusing build from revision e11c95b99a7027338079861c02a551bc493cd86c (clean at build time)`. Playwright run log: `.command-logs/2026-11-12T13-38-46-169Z-27904-383a30ee.log` (`46 passed (1.2m)`; no failed, skipped, or flaky lines). The preview was the harness-owned production preview started by `smoke-built` on port 4331.

Result: 46 passed, 0 failed, 0 skipped, 0 flaky.

Selected rows (46 total, all `[chromium]`):
- Catalog (3): "the catalogue shows every demonstration in teaching order with useful cards and supported destinations" (`demonstrations.smoke.spec.cjs:61`), "generated preview mapping and provenance cover the active catalog without a fixed route total" (`:140`), "catalog filters combine topic and forgiving search, then clear recoverable empty results" (`:149`). All pass.
- Demonstrations (14): each of the fourteen IDs "renders its heading, graph, and inspector" (`demonstrations.smoke.spec.cjs:299`). All pass.
- Lesson walks (28): for each of the fourteen IDs, the `Lesson <id>` describe (`guided-lessons.smoke.spec.cjs:2652` for the Slovenian `?learn=1` walk with pointer clicks on Next to completion, and `:2663` for the English 390x844 walk). All pass. Only 14 IDs were checked here; the lesson walks run on the lesson-side rows, not on the registration metadata itself.
- Lesson exit (1): "Lesson linear-function exit: en: Exit restores the user state and re-entering twice keeps board counts stable" (`guided-lessons.smoke.spec.cjs:2701`). The `linear-function` ID is in the `EXIT_SAMPLE` set, so the anchored grep selected it. It is a row of the functions family, not an unrelated row, and it passes.

Unrelated rows: none selected. The anchored regex matched only the fourteen functions IDs, the three catalog rows, and the `linear-function exit` row. `arc-length-param` (a bezier row) was not selected.

Preset save/reopen: no Preset row in `tests/*.cjs` names any of the fourteen IDs (search for each ID across `tests/*.cjs`; the matches are the demonstration, lesson, and `EXIT_SAMPLE` rows listed above). `tests/workflows.smoke.spec.cjs` has no collection-wide loop over `functionsCollectionKeys`. No Preset row was added, and none was run.

Not covered:
- Preset save/reopen and import/export for the functions collections (`functionsCollectionKeys` in `src/graphs/functions/registration.ts`, including the two keys that differ from the ID: `trigonometric-function` and `piecewise-continuity`). No harness row covers them.
- Lesson exit for the other thirteen IDs (no exit rows are generated for them), and lesson walks for the `functionsPrimaryOwners` section IDs beyond the walk rows themselves.
- Console and page errors: the demonstration rows do not capture them, so those rows establish render only.
- Drag, slider and graph interaction on the fourteen routes; only route load, render, and lesson walks ran.
- Catalog controls at 390, 724 and 1440 px, topic history, deep links, card-back restore, and breadcrumb rows.
- Mathematical correctness of the readouts; a passing walk means the harness probes passed, not that the mathematics was re-derived.
- No diff-level comparison against pre-registration behaviour was made.
- Other families' rows (unit-circle, waves, patches, and the rest of the catalog order) were not selected by this grep.
- Cleanup: the preview was harness-owned and disposed by `smoke-built`. This worker created no data and started no long-lived process; no process started by this worker remains.
