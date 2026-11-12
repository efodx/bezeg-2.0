# Task 08 batch 5 smoke: point-set Voronoi and point-in-polygon

Production build from `bff3c138` (full `bff3c138890fcf68f858c33e3f4abb624ba6dd17`, clean tree), covering the point-set Voronoi and point-in-polygon graphs now declaring their scene through `pointSetPersistence` (commit `bff3c138`). `just build` log `.command-logs/batch5-build.log` (`exit=0`, 16.6s; provenance log `.command-logs/2026-11-12T22-10-29-663Z-30308-8d487945.log`; warnings present, not classified).

Routes: the changed ids are voronoi, voronoi-degenerate, and point-in-polygon, plus delaunay as a control (it shares the changed point-set base), served at `/bezeg-2.0/<id>` as in batches 3a, 3b and 4.

Grep (saved `.command-logs/batch5-grep.txt`): `(^| )(voronoi|voronoi-degenerate|point-in-polygon|delaunay)( |$)|the catalogue shows every demonstration|catalog filters combine|generated preview mapping and provenance`

Dry run: `just smoke-built --port 4331 --workers=2 --list --grep "$G"` (wrapper `.command-logs/batch5-list.log`, child `.command-logs/2026-11-12T22-10-52-192Z-39212-a9a84d27.log`), `Total: 15 tests in 2 files`. Listed rows:
- Catalog (3): "the catalogue shows every demonstration in teaching order with useful cards and supported destinations" ; "generated preview mapping and provenance cover the active catalog without a fixed route total" ; "catalog filters combine topic and forgiving search, then clear recoverable empty results".
- Demonstrations (4): "renders its heading, graph, and inspector" for each of point-in-polygon, delaunay, voronoi, voronoi-degenerate.
- Lesson walks (8): `Lesson <id>` Slovenian `?learn=1` walk ("walks every frame in order with pointer clicks on Next and completes") and English 390x844 walk ("every frame in order keeps points in view, math blocks inside the viewport and Next pointer-clickable") for each of voronoi, voronoi-degenerate, delaunay, point-in-polygon.
- Extra (0): no extra row matched. No Voronoi cell-edit, point-in-polygon query, or Delaunay trace row exists in the listing.
- 3 + 4 + 8 + 0 = 15.

Run: `just smoke-built --port 4331 --workers=2 --grep "$G"` (wrapper `.command-logs/batch5-smoke.log`, `exit=0`; Playwright log `.command-logs/2026-11-12T22-11-32-314Z-26488-f33baa4b.log`): `15 passed (31.0s)`; smoke-built passed in 32.3s on revision bff3c138 (clean). Harness-owned preview on port 4331.

Result: 15 passed, 0 failed, 0 skipped, 0 flaky. No row was rerun.
- Catalog (3/3): pass.
- Demonstration render (4/4): pass.
- Lesson walks (8/8, sl desktop + en 390x844): pass.
- Extra (0): none selected.

Not covered:
- Preset save/reopen and import/export for voronoi, voronoi-degenerate, point-in-polygon and delaunay. This is the behaviour batch 5 changes (scene persistence), and no smoke row exercises it. Persistence correctness is only indirectly covered by the render and walk rows.
- Voronoi cell and point-in-polygon query interactions: none exist in the listing for these ids, so those interactions are not smoke-covered.
- Lesson exit / figure return for these ids: no `Lesson <id> exit` rows were selected.
- Lesson reset: no reset rows for these ids were selected.
- Console and page errors, drag/slider interaction, mathematical correctness of Voronoi and point-in-polygon constructions, catalog controls at other widths.
- Unit tests were not run here.
- Build warnings were not classified.
