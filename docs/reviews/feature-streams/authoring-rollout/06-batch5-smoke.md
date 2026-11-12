# Batch 5 smoke: splines family registration

Production build from `565e4247` (clean). Command: `just build` (log `.command-logs/batch5-build.log`, provenance log `.command-logs/2026-11-12T11-01-16-840Z-31036-75836366.log`). The build passed; its only warnings are Sass deprecation notices (`DEPRECATION WARNING: Sass's behavior for declarations that appear after nested...`), unrelated to this change. Then `just smoke-built --port 4331 --workers=2 --grep "$G"`. The grep is saved in `.command-logs/batch5-grep.txt`:

`(^| )(spline-cn|spline-c1|spline-c2|spline-g1|spline-g1-symmetric)( |$)|the catalogue shows every demonstration|catalog filters combine|generated preview mapping and provenance`

Wrapper log: `.command-logs/batch5-smoke.log`. Playwright run log: `.command-logs/2026-11-12T11-01-32-828Z-31328-e567ab28.log`. The build was reused from the same clean revision. The preview was the harness-owned production preview on `http://127.0.0.1:4331/bezeg-2.0`.

Registered paths checked (from `src/graphs/curves/spline/registration.ts`): `spline-cn` `/bezeg-2.0/spline/spline`, `spline-c1` `/bezeg-2.0/spline/c1spline`, `spline-c2` `/bezeg-2.0/spline/c2spline`, `spline-g1` `/bezeg-2.0/spline/g1spline`, `spline-g1-symmetric` `/bezeg-2.0/spline/g1-sym-spline`.

Result: 22 passed, 0 failed, 0 skipped, 0 flaky. The run log contains no error lines.

Selected rows:
- Catalog (3): "the catalogue shows every demonstration in teaching order...", "generated preview mapping and provenance...", "catalog filters combine topic and forgiving search...". All pass.
- Demonstrations (5): `spline-cn`, `spline-c1`, `spline-c2`, `spline-g1`, `spline-g1-symmetric` each render heading, graph and inspector. All pass.
- Lesson walks (10): Slovenian `?learn=1` walk and English 390x844 walk for each of the five IDs. All pass.
- Lesson exit (1): `Lesson spline-c1 exit`, English exit and re-entry. Passes.
- Shared lesson runtime on `spline-g1` (3): header language switch, Tab+Enter on Next, lossless Back walk. All pass.

Unrelated rows: none selected. The anchored regex did not match `spline-parameterization`, the B-spline or Catmull-Rom lessons, or any other spline family.

Not covered:
- Preset import/export of the `g1-spline-graph` collection. The harness has no row for it. The only Preset row near it (`workflows.smoke.spec.cjs`, "saving, changing, and reopening a preset...") covers Bézier, so it was not selected. Import behaviour is covered only by unit tests (`PresetImport.test.ts`, `registrationComposition.test.ts`).
- Preset UI on the five routes: no harness check for splines was run.
- Console and page errors on the demonstration rows: the demonstration tests do not capture them, so those rows establish render only. Lesson walks fail on runtime errors, and they passed.
- Drag or slider on these routes; only route load and lesson walks ran.
- `Lesson spline-cn exit`, `spline-c2 exit`, `spline-g1-symmetric exit`: the exit test exists only for `spline-c1` in the selected set, so these were not run.
- Catalog controls at 390, 724 and 1440 px (`catalog controls remain readable...`) and the other catalog tests (topic history, deep links, card-back restore) were not selected, per the brief.
- Routes, loaders and lesson owners were checked only through the tests above; no diff-level comparison against pre-registration behaviour was made.
