# Task 08 batch 3a smoke: step graphs

Production build from `e63b1ee0` (full `e63b1ee022f501f790bb5c8f7bb109f500a804b2`, clean tree), covering the step graphs now persisting their step through `pointSetPersistence` (commit `e63b1ee0`). `just build` log `.command-logs/batch3a-build.log` (`exit=0`, 7.3s; provenance log `.command-logs/2026-11-12T19-10-42-671Z-32300-9ad2ffaa.log`; warnings present, not classified).

Routes: the seven ids are the step graphs named in the brief (ear-clipping, interval-sweep, segment-intersections, monotone-partition, monotone-triangulation, fortune) plus orientation as a control, served at `/bezeg-2.0/<id>` as in batch 2.

Grep (saved `.command-logs/batch3a-grep.txt`): `(^| )(orientation|ear-clipping|interval-sweep|segment-intersections|monotone-partition|monotone-triangulation|fortune)( |$)|the catalogue shows every demonstration|catalog filters combine|generated preview mapping and provenance`

Dry run: `just smoke-built --port 4331 --workers=2 --list --grep "$G"` (wrapper `.command-logs/batch3a-list.log`, child `.command-logs/2026-11-12T19-10-55-642Z-10356-0dc3eaf0.log`), `Total: 24 tests in 2 files`. Listed rows:
- Catalog (3): "the catalogue shows every demonstration in teaching order ..." ; "generated preview mapping and provenance cover the active catalog ..." ; "catalog filters combine topic and forgiving search, then clear recoverable empty results".
- Demonstrations (7): "renders its heading, graph, and inspector" for each of orientation, ear-clipping, interval-sweep, segment-intersections, monotone-partition, monotone-triangulation, fortune.
- Lesson walks (14): `Lesson <id>` Slovenian `?learn=1` walk and English 390x844 walk for each of the same seven ids.
- Extra (0): no extra row matched; the Inversion extra from batch 2 is not selected by this grep.
- 3 + 7 + 14 + 0 = 24.

Run: `just smoke-built --port 4331 --workers=2 --grep "$G"` (wrapper `.command-logs/batch3a-smoke.log`, `exit=0`; Playwright log `.command-logs/2026-11-12T19-11-58-959Z-19048-f46f4f87.log`): `24 passed (39.5s)`; smoke-built passed in 40.5s on revision e63b1ee0 (clean). Harness-owned preview on port 4331.

Result: 24 passed, 0 failed, 0 skipped, 0 flaky. No row was rerun.
- Catalog (3/3): pass.
- Demonstration render (7/7): pass.
- Lesson walks (14/14, sl desktop + en 390x844): pass.
- Extra (0): none selected.

Not covered:
- Preset save/reopen and import/export for these seven ids. This is the behaviour batch 3a changes (step persistence), and no smoke row exercises it: a search of `tests/*.cjs` for preset/import/export titles naming these ids or `compgeo-*` keys found no row. Persistence correctness is therefore only indirectly covered by the render and walk rows.
- Lesson exit / figure return for these ids: the grep selected no `Lesson <id> exit` rows.
- Lesson reset: no reset rows for these ids were selected.
- Console and page errors, drag/slider interaction, mathematical correctness, catalog controls at other widths.
- Unit tests were not run here.
- Build warnings were not classified.
