# Task 08 batch 3b smoke: hull and Bezier graphs

Production build from `deca58bd` (full `deca58bdf3f15bf1f91930c440ce1f79fe38c8d9`, clean tree), covering the hull and Bezier graphs now persisting their scene through `pointSetPersistence` (commit `deca58bd`). `just build` log `.command-logs/batch3b-build.log` (`exit=0`, 7.0s; provenance log `.command-logs/2026-11-12T20-08-04-852Z-25848-a5dcd461.log`; warnings present, not classified).

Routes: the five ids are convex-hull, hull-robustness, bezier-hulls and bezier-clipping (the batch's changed graphs) plus ear-clipping as a control, served at `/bezeg-2.0/<id>` as in batch 3a.

Grep (saved `.command-logs/batch3b-grep.txt`): `(^| )(convex-hull|hull-robustness|bezier-hulls|bezier-clipping|ear-clipping)( |$)|the catalogue shows every demonstration|catalog filters combine|generated preview mapping and provenance`

Dry run: `just smoke-built --port 4331 --workers=2 --list --grep "$G"` (wrapper `.command-logs/batch3b-list.log`, child `.command-logs/2026-11-12T20-08-19-901Z-28424-78da24a0.log`), `Total: 18 tests in 2 files`. Listed rows:
- Catalog (3): "the catalogue shows every demonstration in teaching order with useful cards and supported destinations" ; "generated preview mapping and provenance cover the active catalog without a fixed route total" ; "catalog filters combine topic and forgiving search, then clear recoverable empty results".
- Demonstrations (5): "renders its heading, graph, and inspector" for each of convex-hull, hull-robustness, bezier-hulls, ear-clipping, bezier-clipping.
- Lesson walks (10): `Lesson <id>` Slovenian `?learn=1` walk ("walks every frame in order with pointer clicks on Next and completes") and English 390x844 walk ("every frame in order keeps points in view, math blocks inside the viewport and Next pointer-clickable") for each of the same five ids.
- Extra (0): no extra row matched.
- 3 + 5 + 10 + 0 = 18.

Run: `just smoke-built --port 4331 --workers=2 --grep "$G"` (wrapper `.command-logs/batch3b-smoke.log`, `exit=0`; Playwright log `.command-logs/2026-11-12T20-08-32-258Z-34504-fe308309.log`): `18 passed (28.6s)`; smoke-built passed in 29.3s on revision deca58bd (clean). Harness-owned preview on port 4331.

Result: 18 passed, 0 failed, 0 skipped, 0 flaky. No row was rerun.
- Catalog (3/3): pass.
- Demonstration render (5/5): pass.
- Lesson walks (10/10, sl desktop + en 390x844): pass.
- Extra (0): none selected.

Not covered:
- Preset save/reopen and import/export for these five ids. This is the behaviour batch 3b changes (scene persistence), and no smoke row exercises it. Persistence correctness is only indirectly covered by the render and walk rows.
- Lesson exit / figure return for these ids: no `Lesson <id> exit` rows were selected.
- Lesson reset: no reset rows for these ids were selected.
- Console and page errors, drag/slider interaction, mathematical correctness of hull and Bezier constructions, catalog controls at other widths.
- Unit tests were not run here.
- Build warnings were not classified.
