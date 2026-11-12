# Batch 15 smoke: plane-geometry family registration

Production build from `b6175376` (clean; `b6175376` is HEAD, the local plane-geometry registration commit `refactor: register the plane-geometry family locally`). Full revision `b617537643b685a761cb9bc0c3d868888a22cbe8`. Command: `just build` (log `.command-logs/batch15-build.log`). The build passed (`exit=0`, `build: passed in 9.1s; revision b617537643b685a761cb9bc0c3d868888a22cbe8; clean; warnings present (see log)`); warnings are recorded in the provenance log (`.command-logs/2026-11-12T16-38-20-063Z-25288-8e2c5a5d.log`), not classified here.

Paths were taken from `src/graphs/compgeo/planeGeometry/registration.ts` (lines 16-20): `/bezeg-2.0/triangle-centres`, `/bezeg-2.0/inscribed-angle`, `/bezeg-2.0/euler-line`, `/bezeg-2.0/simson-line`, `/bezeg-2.0/inversion`. The Preset collection keys are `planeGeometryCollectionKeys` (lines 26-31): `triangle-centres` → `compgeo-notable-points`, `inscribed-angle` → `compgeo-inscribed-angle`, `euler-line` → `compgeo-euler-line`, `simson-line` → `compgeo-simson-line`, `inversion` → `compgeo-inversion`.

Grep saved in `.command-logs/batch15-grep.txt`:

`(^| )(triangle-centres|inscribed-angle|euler-line|simson-line|inversion)( |$)|the catalogue shows every demonstration|catalog filters combine|generated preview mapping and provenance`

Source-level check (`tests/*.cjs`): the literal grep matches three catalog test titles (`demonstrations.smoke.spec.cjs:61`, `:140`, `:149`) and one non-title line, `guided-lessons.smoke.spec.cjs:3129` (an `expect` text on the inversion centre point, inside the test at `:3119`). The demonstration and lesson rows are generated from ids, so their titles do not appear literally in source; the dry run below shows them.

Extra row (1): "Inversion extras › T5 centre point: X = C has no image and the panel says so" (`guided-lessons.smoke.spec.cjs:3119`). It matched on the word `inversion` in its describe title (`test.describe('Inversion extras', ...)` at `:3116`). It is not a row for the `inversion` route or lesson id; it is a separate existing inversion-lesson test, and it was run.

Selection dry run: `just smoke-built --port 4331 --workers=2 --list --grep "$G"` (wrapper log `.command-logs/batch15-list.log`; child list log `.command-logs/2026-11-12T16-38-37-240Z-8660-c5c4c81b.log`). It listed 19 tests in 2 files and ran no tests. Every listed row:

- Catalog (3): "the catalogue shows every demonstration in teaching order with useful cards and supported destinations" (`demonstrations.smoke.spec.cjs:61`), "generated preview mapping and provenance cover the active catalog without a fixed route total" (`:140`), "catalog filters combine topic and forgiving search, then clear recoverable empty results" (`:149`).
- Demonstrations (5): "triangle-centres", "inscribed-angle", "euler-line", "simson-line", "inversion" each "renders its heading, graph, and inspector" (`demonstrations.smoke.spec.cjs:299`, generated loop).
- Lesson walks (10): for each of the five IDs, the `Lesson <id>` describe with the Slovenian `?learn=1` walk (`guided-lessons.smoke.spec.cjs:2661`) and the English 390x844 walk (`:2672`).
- Extra (1): "Inversion extras › T5 centre point" (`guided-lessons.smoke.spec.cjs:3119`), see above.

Total: 3 + 5 + 10 + 1 = 19 rows, all `[chromium]`.

Then `just smoke-built --port 4331 --workers=2 --grep "$G"`. Wrapper log: `.command-logs/batch15-smoke.log`. Result: `smoke-built: passed in 26.1s (test slot 2/2, 5 workers); revision b617537643b685a761cb9bc0c3d868888a22cbe8; clean; reusing build from revision b617537643b685a761cb9bc0c3d868888a22cbe8 (clean at build time)`. Playwright run log: `.command-logs/2026-11-12T16-39-42-587Z-35744-6bc943ea.log` (`19 passed (25.1s)`; no failed, skipped, or flaky lines). The preview was the harness-owned production preview started by `smoke-built` on port 4331.

Result: 19 passed, 0 failed, 0 skipped, 0 flaky.

Selected rows and status:
- Catalog (3): all pass (rows above).
- Demonstrations (5): "triangle-centres", "inscribed-angle", "euler-line", "simson-line", "inversion" each "renders its heading, graph, and inspector". All pass.
- Lesson walks (10): all five `Lesson <id>` Slovenian desktop and English 390x844 walks pass. Each id owns one lesson; no second lesson row was generated for these ids.
- Extra (1): "Inversion extras › T5 centre point: X = C has no image and the panel says so" (`guided-lessons.smoke.spec.cjs:3119`). Passes.
- Lesson exit (0): no exit rows were generated for these ids.

Preset save/reopen: no Preset row covers the five IDs or their `compgeo-*` collection keys. A search of `tests/*.cjs` for `preset` (files: `curve-editing-modes`, `curve-ownership`, `guided-lessons`, `smoke-catalog`, `workflows`) and for the plane-geometry IDs or `compgeo` near preset, collection, save, import or export terms returned no Preset row for them. The hits are the Bezier preset row at `workflows.smoke.spec.cjs:89`, ownership rows on other routes (`curve-ownership.smoke.spec.cjs`), and a seeded stored preset on the elevation route at `guided-lessons.smoke.spec.cjs:2971`. No Preset row was added, and none was run.

Not covered:
- Preset save/reopen and import/export for the plane-geometry collections (`planeGeometryCollectionKeys` in `src/graphs/compgeo/planeGeometry/registration.ts`). No harness row covers them.
- Lesson exit for the five plane-geometry IDs (no exit rows are generated for them).
- Console and page errors: the demonstration rows do not capture them, so those rows establish render only.
- Drag, slider and graph interaction on the five routes; only route load, render, and lesson walks ran.
- Catalog controls at 390, 724 and 1440 px, topic history, deep links, card-back restore, and breadcrumb rows.
- Mathematical correctness of the readouts (triangle centres, Euler line, Simson line, inversion); a passing walk means the harness probes passed, not that the geometry was re-derived.
- Other families' rows were not selected by this grep.
- No diff-level comparison against pre-registration behaviour was made.
- Cleanup: the preview was harness-owned and disposed by `smoke-built`. This worker created no data and started no long-lived process; the wrapper exited with `exit=0`.
