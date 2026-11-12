# Task 08 batch 4 smoke: point-set triangulation and Delaunay

Production build from `3a2bf2c8` (full `3a2bf2c8cd7f3e037334ad5941da6729ef478279`, clean tree), covering the point-set triangulation and Delaunay graphs now declaring their scene through `pointSetPersistence` (commit `3a2bf2c8`). `just build` log `.command-logs/batch4-build.log` (`exit=0`, 5.0s; provenance log `.command-logs/2026-11-12T21-13-01-561Z-38008-c96438e1.log`; warnings present, not classified).

Routes: the two ids are point-set-triangulation and delaunay (the batch's changed graphs) plus ear-clipping as a control, served at `/bezeg-2.0/<id>` as in batches 3a and 3b.

Grep (saved `.command-logs/batch4-grep.txt`): `(^| )(point-set-triangulation|delaunay|ear-clipping)( |$)|the catalogue shows every demonstration|catalog filters combine|generated preview mapping and provenance`

Dry run: `just smoke-built --port 4331 --workers=2 --list --grep "$G"` (wrapper `.command-logs/batch4-list.log`, child `.command-logs/2026-11-12T21-13-12-596Z-38864-df6cfb7c.log`), `Total: 12 tests in 2 files`. Listed rows:
- Catalog (3): "the catalogue shows every demonstration in teaching order with useful cards and supported destinations" ; "generated preview mapping and provenance cover the active catalog without a fixed route total" ; "catalog filters combine topic and forgiving search, then clear recoverable empty results".
- Demonstrations (3): "renders its heading, graph, and inspector" for each of ear-clipping, point-set-triangulation, delaunay.
- Lesson walks (6): `Lesson <id>` Slovenian `?learn=1` walk ("walks every frame in order with pointer clicks on Next and completes") and English 390x844 walk ("every frame in order keeps points in view, math blocks inside the viewport and Next pointer-clickable") for each of the same three ids.
- Extra (0): no extra row matched. No triangulation flip or Delaunay trace row exists in the listing.
- 3 + 3 + 6 + 0 = 12.

Run: `just smoke-built --port 4331 --workers=2 --grep "$G"` (wrapper `.command-logs/batch4-smoke.log`, `exit=0`; Playwright log `.command-logs/2026-11-12T21-13-29-186Z-38788-1e838deb.log`): `12 passed (12.9s)`; smoke-built passed in 13.6s on revision 3a2bf2c8 (clean). Harness-owned preview on port 4331.

Result: 12 passed, 0 failed, 0 skipped, 0 flaky. No row was rerun.
- Catalog (3/3): pass.
- Demonstration render (3/3): pass.
- Lesson walks (6/6, sl desktop + en 390x844): pass.
- Extra (0): none selected.

Not covered:
- Preset save/reopen and import/export for point-set-triangulation and delaunay. This is the behaviour batch 4 changes (scene persistence), and no smoke row exercises it. Persistence correctness is only indirectly covered by the render and walk rows.
- Triangulation flip and Delaunay trace rows: none exist in the listing for these ids, so those interactions are not smoke-covered.
- Lesson exit / figure return for these ids: no `Lesson <id> exit` rows were selected.
- Lesson reset: no reset rows for these ids were selected.
- Console and page errors, drag/slider interaction, mathematical correctness of triangulation and Delaunay constructions, catalog controls at other widths.
- Unit tests were not run here.
- Build warnings were not classified.
