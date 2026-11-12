# Batch 13 smoke: probability family registration

Production build from `17d21783` (clean; `17d21783` is HEAD, a docs-only commit on top of `1b16e809`, the local probability-family registration commit named in the brief). Command: `just build` (log `.command-logs/batch13-build.log`, provenance log `.command-logs/2026-11-12T15-11-10-879Z-35640-a20e8ca4.log`). The build passed (`exit=0`, `build: passed in 7.8s; revision 17d217831b43e7664a64974846328ab5d1d5b07e; clean`); warnings are present and are recorded in the provenance log, not classified here.

Paths were taken from `src/graphs/probability/registration.ts` (`probabilityDemonstrationRows`, lines 16-20): `/bezeg-2.0/probability/density`, `/bezeg-2.0/probability/binomial-normal`, `/bezeg-2.0/probability/clt`, `/bezeg-2.0/probability/summary`, `/bezeg-2.0/probability/correlation`. The Preset collection keys are `probabilityCollectionKeys` (lines 26-31), each equal to its id.

Selection dry run: `just smoke-built --port 4331 --workers=2 --list --grep "$G"` (wrapper log `.command-logs/batch13-list.log`; child list log `.command-logs/2026-11-12T15-11-27-000Z-35688-cbb277b0.log`). It listed 18 tests in 2 files and ran no tests. The grep is saved in `.command-logs/batch13-grep.txt`:

`(^| )(prob-density|prob-binomial-normal|prob-clt|prob-summary|prob-correlation)( |$)|the catalogue shows every demonstration|catalog filters combine|generated preview mapping and provenance`

Then `just smoke-built --port 4331 --workers=2 --grep "$G"`. Wrapper log: `.command-logs/batch13-smoke.log`. Result: `smoke-built: passed in 26.5s (test slot 1/2, 5 workers); revision 17d217831b43e7664a64974846328ab5d1d5b07e; clean; reusing build from revision 17d217831b43e7664a64974846328ab5d1d5b07e (clean at build time)`. Playwright run log: `.command-logs/2026-11-12T15-11-45-971Z-32096-c4670930.log` (`18 passed (25.7s)`; no failed, skipped, or flaky lines). The preview was the harness-owned production preview started by `smoke-built` on port 4331.

Result: 18 passed, 0 failed, 0 skipped, 0 flaky.

Selected rows (18 total, all `[chromium]`):
- Catalog (3): "the catalogue shows every demonstration in teaching order with useful cards and supported destinations" (`demonstrations.smoke.spec.cjs:61`), "generated preview mapping and provenance cover the active catalog without a fixed route total" (`:140`), "catalog filters combine topic and forgiving search, then clear recoverable empty results" (`:149`). All pass.
- Demonstrations (5): "prob-density", "prob-binomial-normal", "prob-clt", "prob-summary", "prob-correlation" each "renders its heading, graph, and inspector" (`demonstrations.smoke.spec.cjs:299`). All pass.
- Lesson walks (10): for each of the five IDs, the `Lesson <id>` describe with the Slovenian `?learn=1` walk (`guided-lessons.smoke.spec.cjs:2661`) and the English 390x844 walk (`:2672`). All pass. The lesson definitions are at `guided-lessons.smoke.spec.cjs:2445-2520` (`probabilityDensity`, `probabilityBinomialNormal`, `probabilityClt`, `probabilitySummary`, `probabilityCorrelation`).
- Lesson exit (0): no exit rows were generated for these IDs.
- Extra rows (0): none. Every listed row maps to one of the three catalog rows, five demonstration rows, or ten lesson walk rows above.

Preset save/reopen: no Preset row covers the five IDs or their collection keys. A search of `tests/*.cjs` for `preset` (files: `curve-editing-modes`, `curve-ownership`, `guided-lessons`, `smoke-catalog`, `workflows`) with the five IDs or `probability` returned no Preset row for them. The only lesson-file `prob-` hits are the lesson definitions above; `workflows.smoke.spec.cjs:89` is a Bezier preset save/reopen row with no probability coverage. No Preset row was added, and none was run.

Not covered:
- Preset save/reopen and import/export for the probability collections (`probabilityCollectionKeys` in `src/graphs/probability/registration.ts`). No harness row covers them.
- Lesson exit for the five probability IDs (no exit rows are generated for them).
- Console and page errors: the demonstration rows do not capture them, so those rows establish render only.
- Drag, slider and graph interaction on the five routes; only route load, render, and lesson walks ran.
- Catalog controls at 390, 724 and 1440 px, topic history, deep links, card-back restore, and breadcrumb rows.
- Mathematical correctness of the readouts; a passing walk means the harness probes passed, not that the mathematics was re-derived.
- Name collision observation, not verified by this run: `prob-density` also appears as a key in `src/graphs/functions/functionPresetCollections.ts:428` (`functionCollection("prob-density", ...)`) alongside `src/graphs/probability/collections.ts:10`. Whether this shadows or conflicts with the probability collection was not checked.
- Other families' rows (functions, analysis, unit-circle, waves, patches, and the rest of the catalog order) were not selected by this grep.
- No diff-level comparison against pre-registration behaviour was made.
- Cleanup: the preview was harness-owned and disposed by `smoke-built`. This worker created no data and started no long-lived process; no process started by this worker remains.
