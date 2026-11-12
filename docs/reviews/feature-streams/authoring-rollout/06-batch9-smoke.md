# Batch 9 smoke: interpolation family registration

Production build from `519c3a23` (clean; `519c3a23` is HEAD and is the local interpolation-family registration commit named in the brief). Command: `just build` (log `.command-logs/batch9-build.log`, provenance log `.command-logs/2026-11-12T12-04-51-450Z-25580-46337f3f.log`). The build passed (`exit=0`, `build: passed in 10.4s; revision 519c3a2312f65e03421fa60bd4d82411f3444df1; clean`); its warnings are the existing ones recorded in the provenance log.

Then `just smoke-built --port 4331 --workers=2 --grep "$G"`. The grep is saved in `.command-logs/batch9-grep.txt`:

`(^| )(interp-lagrange|interp-hermite|interp-runge|interp-least-squares|interp-subdivision)( |$)|the catalogue shows every demonstration|catalog filters combine|generated preview mapping and provenance`

Wrapper log: `.command-logs/batch9-smoke.log` (`smoke-built: passed in 34.0s (test slot 1/2, 5 workers)`, `exit=0`, reused the build from the same clean revision). Playwright run log: `.command-logs/2026-11-12T12-05-07-878Z-35676-dadeecb5.log` (`18 passed (32.8s)`; no failed, skipped, or flaky lines). The preview was the harness-owned production preview started by `smoke-built` on port 4331 (Playwright owns its server).

Result: 18 passed, 0 failed, 0 skipped, 0 flaky.

Selected rows (18 total, all `[chromium]`):
- Catalog (3): "the catalogue shows every demonstration in teaching order with useful cards and supported destinations" (`demonstrations.smoke.spec.cjs:61`), "generated preview mapping and provenance cover the active catalog without a fixed route total" (`:140`), "catalog filters combine topic and forgiving search, then clear recoverable empty results" (`:149`). All pass.
- Demonstrations (5): `interp-lagrange`, `interp-hermite`, `interp-runge`, `interp-least-squares`, `interp-subdivision` each "renders its heading, graph, and inspector" (`demonstrations.smoke.spec.cjs:299`). All pass.
- Lesson walks (10): for each of the five IDs, the `Lesson <id>` describe (`guided-lessons.smoke.spec.cjs:2642` and `:2653`): the Slovenian `?learn=1` walk with pointer clicks on Next to completion, and the English 390x844 walk (points in view, math inside viewport, Next pointer-clickable). All pass.

Unrelated rows: none selected. The anchored regex matched only the five interpolation IDs and the three catalog rows. The other interpolation-family lessons and the `curve-geometry` rows were not in the run. The `Lesson <id> exit` describes were not generated for these IDs (`EXIT_SAMPLE` in `guided-lessons.smoke.spec.cjs` does not list them), so none was selected.

Preset save/reopen: no harness row covers any of the five IDs. The only preset-related rows are `workflows.smoke.spec.cjs:89` (Bezier coordinates) and the Farin elevation row in `guided-lessons.smoke.spec.cjs` (seeded stored preset). Neither touches the interpolation collections, so no Preset row was added.

Not covered:
- Lesson exit for any of the five IDs (no exit rows exist for them in the harness).
- Preset import/export and save/reopen for the interpolation collections (`interpolationCollectionKeys` in `src/graphs/curves/interpolation/registration.ts`). No harness row exists; import behaviour is covered only by unit tests, if any.
- Console and page errors on the demonstration rows: the demonstration test does not capture them, so those rows establish render only.
- Drag and slider interaction on the five routes; only route load, render, and lesson walks ran.
- Catalog controls at 390, 724 and 1440 px (`catalog controls remain readable...`), topic history, deep links, card-back restore, and breadcrumb rows were not selected.
- The `interpolation` lesson readout values beyond what the lesson walk probes check were not independently verified here; the walk passing means the harness probes passed, not that the mathematics was re-derived.
- Other families' catalog order relative to the interpolation rows was not checked in this batch (the batch-8 order check covered the curve-geometry family only).
- No diff-level comparison against pre-registration behaviour was made.
- Cleanup: the smoke run is a harness-owned preview; no data was created or changed by this worker.
