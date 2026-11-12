# Task 08 batch 6a smoke: triangle centres, Euler line, inscribed angle and Voronoi control

Production build from `0eda4b52` (full `0eda4b52d233a94dcc5e7d8736506eff364b13a1`, clean tree), covering the triangle-centres, Euler-line and inscribed-angle graphs now declaring their scene through `pointSetPersistence` (commit `0eda4b52`). `just build` log `.command-logs/batch6a-build.log` (`exit=0`, 9.3s; provenance log `.command-logs/2026-11-12T22-46-35-208Z-38604-1cb04a33.log`; warnings present, not classified).

Routes: the changed ids are triangle-centres, euler-line and inscribed-angle, plus voronoi as a control (it shares the changed point-set base), served at `/bezeg-2.0/<id>` as in batches 3a, 3b, 4 and 5. Voronoi is served at `/bezeg-2.0/compgeo/voronoi` for the lesson walk, as in batch 5.

Grep (saved `.command-logs/batch6a-grep.txt`): `(^| )(triangle-centres|euler-line|inscribed-angle|voronoi)( |$)|the catalogue shows every demonstration|catalog filters combine|generated preview mapping and provenance`

Grep additions: none. The lesson titles in `tests/guided-lessons.smoke.spec.cjs` match the ids (`Lesson triangle-centres`, `Lesson euler-line`, `Lesson inscribed-angle`), so the id alternation selected every lesson walk without extra rows.

Dry run: `just smoke-built --port 4331 --workers=2 --list --grep "$G"` (wrapper `.command-logs/batch6a-list.log`, child `.command-logs/2026-11-12T22-46-57-586Z-24588-86163908.log`), `Total: 15 tests in 2 files`. Listed rows:
- Catalog (3): "the catalogue shows every demonstration in teaching order with useful cards and supported destinations" ; "generated preview mapping and provenance cover the active catalog without a fixed route total" ; "catalog filters combine topic and forgiving search, then clear recoverable empty results".
- Demonstrations (4): "renders its heading, graph, and inspector" for each of triangle-centres, inscribed-angle, euler-line, voronoi.
- Lesson walks (8): `Lesson <id>` Slovenian `?learn=1` walk ("walks every frame in order with pointer clicks on Next and completes") and English 390x844 walk ("every frame in order keeps points in view, math blocks inside the viewport and Next pointer-clickable") for each of voronoi, triangle-centres, inscribed-angle, euler-line.
- Extra (0): no extra row matched. No triangle-centres, Euler-line or inscribed-angle preset, persistence or lesson exit/reset row exists in the listing.
- 3 + 4 + 8 + 0 = 15.

Run: `just smoke-built --port 4331 --workers=2 --grep "$G"` (wrapper `.command-logs/batch6a-smoke.log`, `exit=0`; Playwright log `.command-logs/2026-11-12T22-47-15-160Z-28872-c3fa3f62.log`): `15 passed (21.3s)`; smoke-built passed in 22.2s on revision 0eda4b52 (clean). Harness-owned preview on port 4331.

Result: 15 passed, 0 failed, 0 skipped, 0 flaky. No row was rerun.
- Catalog (3/3): pass.
- Demonstration render (4/4): pass.
- Lesson walks (8/8, sl desktop + en 390x844): pass.
- Extra (0): none selected.

Not covered:
- Preset save/reopen and import/export for triangle-centres, euler-line and inscribed-angle. This is the behaviour batch 6a changes (scene persistence), and no smoke row exercises it. Persistence correctness is only indirectly covered by the render and walk rows.
- Point-dragging and construction interactions for the three changed graphs (vertex drag, glider P on the inscribed-angle chord, Euler-line and nine-point-circle updates): none exist in the listing, so they are not smoke-covered.
- Lesson exit / figure return for these ids: no `Lesson <id> exit` rows were selected.
- Lesson reset: no reset rows for these ids were selected.
- Console and page errors, drag/slider interaction, mathematical correctness of the centres, Euler line and inscribed-angle constructions, catalog controls at other widths.
- Unit tests were not run here.
- Build warnings were not classified.
