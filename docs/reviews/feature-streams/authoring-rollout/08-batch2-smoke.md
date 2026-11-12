# Task 08 batch 2 smoke: PointSetGraph persistence declaration

Production build from `a5e837e1` (full `a5e837e1f78c5a047569c87864811729eb502a5d`, clean tree), covering `56eafed4` (ScenePersistence type param) and `909bf39b` (PointSetGraph projects through `pointSetPersistence.ts`). `just build` log `.command-logs/batch2-build.log` (`exit=0`, 8.8s; provenance log `.command-logs/2026-11-12T18-25-10-074Z-30024-17d4d6f6.log`; warnings present, not classified).

Routes: the 16 compgeo ids come from `src/graphs/compgeo/computationalGeometry/registration.ts`; the five plane-geometry ids from `src/graphs/compgeo/planeGeometry/registration.ts:16-20` (`/bezeg-2.0/<id>`); `bezier-clipping` from `src/graphs/curves/bezier/registration.ts:21` (`/bezeg-2.0/bezier/clipping`).

Grep (saved `.command-logs/batch2-grep.txt`): `(^| )(<22 ids joined by |>)( |$)|the catalogue shows every demonstration|catalog filters combine|generated preview mapping and provenance`

Dry run: `just smoke-built --port 4331 --workers=2 --list --grep "$G"` (wrapper `.command-logs/batch2-list.log`, child `.command-logs/2026-11-12T18-25-21-336Z-6544-e15e3a13.log`), `Total: 70 tests in 2 files`. Listed rows:
- Catalog (3): "the catalogue shows every demonstration in teaching order ..." ; "generated preview mapping and provenance cover the active catalog ..." ; "catalog filters combine topic and forgiving search ...".
- Demonstrations (22): "renders its heading, graph, and inspector" for each of orientation, polygon-area, convex-hull, hull-robustness, point-in-polygon, bezier-hulls, bezier-clipping, ear-clipping, interval-sweep, segment-intersections, monotone-partition, monotone-triangulation, fortune, point-set-triangulation, delaunay, voronoi, voronoi-degenerate, triangle-centres, euler-line, inscribed-angle, simson-line, inversion.
- Lesson walks (44): `Lesson <id>` Slovenian `?learn=1` walk and English 390x844 walk for each of the same 22 ids.
- Extra (1): "Inversion extras > T5 centre point: X = C has no image and the panel says so" (guided-lessons.smoke.spec.cjs:3119), matched by the id `inversion`.
- 3 + 22 + 44 + 1 = 70.

Run: `just smoke-built --port 4331 --workers=2 --grep "$G"` (wrapper `.command-logs/batch2-smoke.log`, `exit=0`; Playwright log `.command-logs/2026-11-12T18-25-37-475Z-30672-32b336cf.log`): `70 passed (1.7m)`; smoke-built passed in 110.7s on revision a5e837e1 (clean). Harness-owned preview on port 4331.

Result: 70 passed, 0 failed, 0 skipped, 0 flaky.
- Catalog (3): pass.
- Demonstration render (22/22): pass.
- Lesson walks (44/44, sl desktop + en 390x844): pass.
- Extra Inversion T5 (1): pass.

Not covered:
- Lesson exit / figure return for these ids: the grep selected no `Lesson <id> exit` rows (exitTest, `guided-lessons.smoke.spec.cjs:2706`, is generated only for ids in `exitAfter`; none of the 22 matched). `tests/lesson-experience-checks.cjs` and `lesson-graph-access.smoke.spec.cjs` exit rows target Taylor, not these ids.
- Lesson reset: search of `tests/*.cjs` for reset rows found none for these ids.
- Preset save/reopen and import/export: a search of `tests/*.cjs` for preset/import/export test or describe titles naming these ids or `compgeo-*` keys found no row; the only preset row (`workflows.smoke.spec.cjs:89`) is Bezier.
- Console and page errors, drag/slider interaction, mathematical correctness, catalog controls at other widths.
- Unit tests were not run here.
