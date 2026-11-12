# Batch 14 smoke: maps family registration

Production build from `da39cbe7` (clean; `da39cbe7` is HEAD, the local maps-family registration commit `refactor: register the maps family locally`). Command: `just build` (log `.command-logs/batch14-build.log`). The build passed (`exit=0`, `build: passed in 7.9s; revision da39cbe7140918fad1298d7604d2f6f9ca13d18f; clean; warnings present (see log)`); warnings are recorded in the provenance log, not classified here.

Paths were taken from `src/graphs/maps/registration.ts` (`mapsDemonstrationRows`, lines 16-18): `/bezeg-2.0/linear-map`, `/bezeg-2.0/complex-reciprocal`, `/bezeg-2.0/complex-roots`. The Preset collection keys are `mapsCollectionKeys` (lines 24-28), each equal to its id.

Selection dry run: `just smoke-built --port 4331 --workers=2 --list --grep "$G"` (wrapper log `.command-logs/batch14-list.log`; child list log `.command-logs/2026-11-12T16-04-42-159Z-14448-dc9291a0.log`). It listed 12 tests in 2 files and ran no tests. The grep is saved in `.command-logs/batch14-grep.txt`:

`(^| )(linear-map|complex-reciprocal|complex-roots)( |$)|the catalogue shows every demonstration|catalog filters combine|generated preview mapping and provenance`

Then `just smoke-built --port 4331 --workers=2 --grep "$G"`. Wrapper log: `.command-logs/batch14-smoke.log`. Result: `smoke-built: passed in 18.8s (test slot 1/2, 5 workers); revision da39cbe7140918fad1298d7604d2f6f9ca13d18f; clean; reusing build from revision da39cbe7140918fad1298d7604d2f6f9ca13d18f (clean at build time)`. Playwright run log: `.command-logs/2026-11-12T16-04-51-565Z-23036-bb3de4ba.log` (`12 passed (17.9s)`; no failed, skipped, or flaky lines). The preview was the harness-owned production preview started by `smoke-built` on port 4331.

Result: 12 passed, 0 failed, 0 skipped, 0 flaky.

Selected rows (12 total, all `[chromium]`):
- Catalog (3): "the catalogue shows every demonstration in teaching order with useful cards and supported destinations" (`demonstrations.smoke.spec.cjs:61`), "generated preview mapping and provenance cover the active catalog without a fixed route total" (`:140`), "catalog filters combine topic and forgiving search, then clear recoverable empty results" (`:149`). All pass.
- Demonstrations (3): "linear-map", "complex-reciprocal", "complex-roots" each "renders its heading, graph, and inspector" (`demonstrations.smoke.spec.cjs:299`, generated loop at `:298`). All pass.
- Lesson walks (6): for each of the three IDs, the `Lesson <id>` describe with the Slovenian `?learn=1` walk (`guided-lessons.smoke.spec.cjs:2661`) and the English 390x844 walk (`:2672`). All pass. The lesson definitions are at `guided-lessons.smoke.spec.cjs:1349` (`linearMap`, 6 steps), `:1362` (`complexReciprocal`, 7 steps) and `:1375` (`complexRoots`, 7 steps). Each id owns exactly one lesson; no second `linear-map` lesson row was generated.
- Lesson exit (0): no exit rows were generated for these IDs.
- Extra rows (0): none. Every listed row maps to one of the three catalog rows, three demonstration rows, or six lesson walk rows above.

Preset save/reopen: no Preset row covers the three IDs or their collection keys. A search of `tests/*.cjs` for `preset` (files: `curve-editing-modes`, `curve-ownership`, `guided-lessons`, `smoke-catalog`, `workflows`) and for the maps IDs or `linear|complex|maps` near preset, collection or save terms returned no Preset row for them. The only hits are the Bezier preset row at `workflows.smoke.spec.cjs:89`, ownership rows on other routes, and a seeded stored preset on the elevation route at `guided-lessons.smoke.spec.cjs:2971`. No Preset row was added, and none was run.

Stale comment observed, not changed: `guided-lessons.smoke.spec.cjs:1347` still reads "Not yet run in a browser: F6 acceptance walks it." for the linear-map lesson. The walk passed in this run, so the comment is out of date.

Not covered:
- Preset save/reopen and import/export for the maps collections (`mapsCollectionKeys` in `src/graphs/maps/registration.ts`). No harness row covers them.
- Lesson exit for the three map IDs (no exit rows are generated for them).
- Console and page errors: the demonstration rows do not capture them, so those rows establish render only.
- Drag, slider and graph interaction on the three routes; only route load, render, and lesson walks ran.
- Catalog controls at 390, 724 and 1440 px, topic history, deep links, card-back restore, and breadcrumb rows.
- Mathematical correctness of the readouts; a passing walk means the harness probes passed, not that the mathematics was re-derived.
- Other families' rows (functions, analysis, probability, unit-circle, waves, patches, complex batch D, isometry, and the rest of the catalog order) were not selected by this grep.
- No diff-level comparison against pre-registration behaviour was made.
- Cleanup: the preview was harness-owned and disposed by `smoke-built`. This worker created no data and started no long-lived process; the wrapper exited with `exit=0`.
