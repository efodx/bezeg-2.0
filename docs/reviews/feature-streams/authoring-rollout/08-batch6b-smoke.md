# Task 08 batch 6b smoke: legacy point-set persistence branch removed, all 22 point-set ids

Production build from `160db37e` (full `160db37ed43838364f2f72ad0e60b67ffd44fb33`, clean tree), covering the Simson-line and inversion graphs declaring their scene through `pointSetPersistence` and the removal of the legacy point-set persistence branch shared by every point-set graph (commit `160db37e`). `just build` log `.command-logs/batch6b-build.log` (`exit=0`, 8.9s; build log `.command-logs/2026-11-12T23-15-13-592Z-18860-b1355ea4.log`; warnings present, not classified).

Routes: the 22 point-set ids are served at `/bezeg-2.0/<id>` as in batches 2 through 6a. `bezier-clipping` is served at `/bezeg-2.0/bezier/clipping` for its lesson walk, as in batch 2. The compgeo and plane-geometry ids follow the registrations used in batch 2.

Grep (saved `.command-logs/batch6b-grep.txt`): `(^| )(orientation|polygon-area|ear-clipping|interval-sweep|segment-intersections|monotone-partition|monotone-triangulation|fortune|convex-hull|hull-robustness|bezier-hulls|bezier-clipping|point-set-triangulation|delaunay|voronoi|voronoi-degenerate|point-in-polygon|triangle-centres|euler-line|inscribed-angle|simson-line|inversion)( |$)|the catalogue shows every demonstration|catalog filters combine|generated preview mapping and provenance`

Grep additions: none beyond the id alternation. The one extra row is matched by the `inversion` id, as in batch 2.

Dry run: `just smoke-built --port 4331 --workers=2 --list --grep "$G"` (wrapper `.command-logs/batch6b-list.log`, child `.command-logs/2026-11-12T23-15-30-379Z-25836-d287d6db.log`; extracted rows `.command-logs/batch6b-rows.txt`), `Total: 70 tests in 2 files`. Listed rows:
- Catalog (3): "the catalogue shows every demonstration in teaching order with useful cards and supported destinations" ; "generated preview mapping and provenance cover the active catalog without a fixed route total" ; "catalog filters combine topic and forgiving search, then clear recoverable empty results".
- Demonstrations (22): "renders its heading, graph, and inspector" for each of orientation, polygon-area, convex-hull, hull-robustness, point-in-polygon, bezier-hulls, bezier-clipping, ear-clipping, interval-sweep, segment-intersections, monotone-partition, monotone-triangulation, fortune, point-set-triangulation, delaunay, voronoi, voronoi-degenerate, triangle-centres, euler-line, inscribed-angle, simson-line, inversion.
- Lesson walks (44): `Lesson <id>` Slovenian `?learn=1` walk ("walks every frame in order with pointer clicks on Next and completes") and English 390x844 walk ("every frame in order keeps points in view, math blocks inside the viewport and Next pointer-clickable") for each of the same 22 ids.
- Extra (1): "Inversion extras > T5 centre point: X = C has no image and the panel says so" (guided-lessons.smoke.spec.cjs:3119), matched by the id `inversion`.
- 3 + 22 + 44 + 1 = 70. Batch 2 listed 70 for the same 22 ids, so the total is unchanged.

Run: `just smoke-built --port 4331 --workers=2 --grep "$G"` (wrapper `.command-logs/batch6b-smoke.log`, `exit=0`; Playwright log `.command-logs/2026-11-12T23-15-44-289Z-39796-92a657ea.log`): `70 passed (1.4m)`; smoke-built passed in 93.4s on revision 160db37e (clean). Harness-owned preview on port 4331.

Result: 70 passed, 0 failed, 0 skipped, 0 flaky. No row was rerun.
- Catalog (3/3): pass.
- Demonstration render (22/22): pass.
- Lesson walks (44/44, sl desktop + en 390x844): pass.
- Extra Inversion T5 (1/1): pass.

Not covered:
- Preset save/reopen and import/export for the 22 point-set ids. This is the behaviour the legacy-branch removal touches, and no smoke row exercises it. Persistence correctness is only indirectly covered by the render and walk rows.
- Point-dragging and construction interactions for the point-set graphs, including the Simson-line and inversion constructions: none exist in the listing, so they are not smoke-covered.
- Lesson exit / figure return for these ids: no `Lesson <id> exit` rows were selected.
- Lesson reset: no reset rows for these ids were selected.
- Console and page errors, drag/slider interaction, mathematical correctness of the constructions, catalog controls at other widths.
- Unit tests were not run here.
- Build warnings were not classified.
