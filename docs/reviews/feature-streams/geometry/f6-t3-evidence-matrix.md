# F6 evidence matrix: Triangulation T3 (B4 Voronoi diagrams and duality, B5 Degenerate sites)

Audit of 2026-11-03 at `284bdf5d`, read-only (committed files). Status: covered / partial / missing. Test files were read, not re-run; browser records (`docs/reviews/triangulation-voronoi/21-smoke.md`, `21c-smoke.md`, `22h-smoke.log`, `23b-smoke.log`, `24b-smoke.log`) were not re-read and are cited only as recorded evidence, not as committed assertions.

Abbreviations: `VK` = `src/compgeo/voronoi.test.ts`; `VD` = `src/graphs/compgeo/voronoiDrawing.test.ts`; `VP` = `src/graphs/compgeo/voronoiDrawing.perf.test.ts` (opt-in, `BEZEG_PERF=1`); `VC` = `src/graphs/compgeo/voronoiConstruction.test.ts`; `VG` = `src/graphs/compgeo/VoronoiGraph.host.test.tsx`; `DS` = `src/graphs/compgeo/DegenerateSitesGraph.host.test.tsx`; `DSK` = `src/graphs/compgeo/degenerateSites.test.ts`; `VL` = `src/learning/content/compgeoVoronoiLesson.test.ts` (also holds the shared action and `set-mode` tests); `DL` = `src/learning/content/compgeoVoronoiDegenerateLesson.test.ts`; `CH` = `src/learning/content/triangulationChapter.test.ts`; `TSC` = `src/graphs/base/graphTransientStateContract.tsx` (ids l.74-75); `PC` = `src/graphs/base/presets/PresetCatalog.test.tsx` (l.34); `SMOKE` = `tests/guided-lessons.smoke.spec.cjs` (rows `voronoi` l.1786, `voronoi-degenerate` l.1803, both in `LESSONS` l.2182; generic walks l.2257-2373).

Random-test bounds (spec and task 05: grid sets n<=40): `VK` duality sets n = 3, 4, 5, 8, 12, 20, 30, 40 and 9 to 41 capped at 40 (l.270-272, 14 attempts, grid 600); query agreement 400 rational queries on the B4 set (l.319) plus 4 further sets (l.321); `VD` zoom factors 1, 2, 5, 40 (l.215); `VG` seeded random query positions (l.179). The 41 in `VK` l.271 is clamped by `Math.min(n, 40)`, so the bound holds. All within bounds. Only 14 duality attempts: few for the n<=40 claim, but each checks exact duality, Euler counts and tiling.

## B4: Voronoi diagrams and duality

| Item | Status | Evidence (test file:line) / lacking |
|---|---|---|
| B4.1 vertices equal the exact spec list, each equidistant (exact), no site nearer | covered | `VK` l.173 (list), l.186 (equidistance, none nearer); `VG` l.76 (7 vertices as exact text); `VL` l.60 |
| B4.2 each finite edge = one interior Delaunay edge, each ray = one hull edge | covered | `VK` l.258 (8 interior, 5 hull), l.266 (random sets: exact duality, Euler counts, tiling), l.178 (8 segments, 5 rays); `VG` l.76; `VL` l.107 |
| B4.3 nearest site of a random query point lies in the cell the drawing assigns | covered | `VK` l.318 (400 rational queries), l.328 (ties); `VG` l.179 (seeded random positions, highlighted cell equals brute force), l.209 (tie lists all tied sites) |
| B4.4 unbounded cells visibly open; clipping consistent when the view changes | covered | `VD` l.75 (5 open cells with markers, 2 closed), l.91 (marker on box boundary at open side), l.208 (one marker per open side at every zoom), l.220 (zoom out and back, same polygon); `VG` l.374 (after zoom rays reach box, markers on it, Reset view restores) |
| B4.4 "continues" marker legible on a projector | partial | geometry placed (`VD` l.91); size and contrast are not asserted. Browser smoke only |
| B4.5 duality overlay toggled, not always on | covered | `VG` l.96 (off after load, toggles, hull and interior edges differ without colour), l.609 (triangle list follows the switch); Reset switches it off `VG` l.334 |
| B4.6 drawing built from a value without Delaunay code | covered | `VK` l.461, l.485 (hand-built three-site value clips and queries like the Delaunay-built one); `VD` l.175, l.191 (draws identically) |
| B4.7 / C1 edit recomputes, clears selection and construction | covered | `VG` l.223 (site drag changes diagram and overlay in one write; edit clears selection and construction), l.536 (bare import resets site, count, query) |
| B4.7 / C2 Reset, navigation, scene change, restore | covered | `VG` l.334 (Reset), l.627 (reset after grid step change), l.496 (scene change); `VL` l.162 (Back and a scene change restore readouts and view); `TSC` id l.74. Lesson exit restore is the generic restoration contract (enumerates lessons generically) |
| B4.7 / C3 stepping and stopped-by-default | covered, not applicable to a trace | Voronoi has no trace or playback; steps are lesson scenes (`VL` l.88-139); construction count is scene state (`VG` l.223; `VL` l.148 set-construction x k equals construct-next x k) |
| B4.7 / C4 both languages, live switch | partial | `VG` l.484 live switch of panel and query text; `VL` l.181 (quoted numbers present in both languages); `SMOKE` generic `en 390x844` walk l.2268 and header switch l.2350 apply to the `voronoi` row. Lacking: live switch inside the running lesson is browser-only (recorded in `22h-smoke.log`) |
| B4.7 / C5 every action without a pointer | covered | `VG` l.290 (keyboard only: select site, select triangle, move query point, toggle overlay), l.323 (dragged query snaps to quarters), l.578 (announcement), l.620 (labelled query inputs); `SMOKE` l.2366 (Next by Tab and Enter) |
| B4.7 / C5 touch add mode, Tab order, focus ring | partial | no committed assertion. Browser smoke only |
| B4.7 / C6 invalid input refused with a message, not moved | covered | `VG` l.354 (duplicates and fewer than two refuse and draw nothing; collinear noted), l.578 (move refused at limit shows and announces), l.554 (typing error clears); `VK` l.451 |
| B4 step 3 bisector construction ends at `clipCell`, decided order | covered | `VC` l.17 (increasing distance, ties by index), l.34 (monotone shrink), l.51 (ends at `clipCell` exactly, B4 example and tie-rich set); `VG` l.261 |
| B4 step 5 triangle (0,1,5) shows its vertex; each triangle its own vertex | covered | `VG` l.122 (every triangle from the spec list); `VL` l.107 (P1P2P6 vertex) |
| B4 step 6 drag a site, both diagrams change together | covered | `VG` l.223 (one write); `VL` l.124 (after set-points every triangle has a vertex of its three sites) |
| B4 step 7 query point | covered | `VG` l.179, l.209, l.290; `VL` l.139 |
| B4 steps 1-2 show no diagram, count, vertex or cell (no spoiler) | covered | `VL` l.75; `SMOKE` l.1793-1795 (readout absent on steps 1-3, shows 7 afterwards) |
| B4 lesson: seven steps, numbers equal readouts, both languages, only spec vertices quoted | covered | `VL` l.60, l.88, l.107, l.181; `SMOKE` l.1795; `lessonMathNotation.test.ts` unchanged |
| B4 prerequisite B3 and caveat that pictures illustrate, do not prove | partial | `CH` l.180 asserts the duality caveat in the chapter section (both languages). No assertion in `VL` that the lesson prerequisite names `delaunay` or that the lesson text carries the caveat (`DL` l.172 does this for B5 only) |
| B4 circumcentre outside hull or view: board frames the diagram, Reset view | covered | `VD` l.154 (frame contains every vertex and site), l.355 (grows to include far circumcentre); `VG` l.374, l.523 |
| Kernel: exact rationals, no drawn-double comparisons | covered | `VK` l.173, l.186 (exact), l.236 (clipped polygons match exact data); `VD` l.366 (clipToBox keeps exact rationals) |
| 05 two deliberate mutations observed | covered (log) | Task 05 evidence; not re-read |
| 18.1 draws cells, segments, rays, full lines; degree-4 marker not by colour only | covered | `VD` l.75, l.165, l.269 (different shape, not only colour) |
| 18.3 options are separate toggles | covered | `VD` l.248 |
| 18.4 ownership: handle owns objects, dispose removes all, redraw reuses | covered | `VD` l.281, l.291, l.299, l.323, l.342 (second dispose harmless) |
| 18.5 mutation observed per assertion | covered (log) | `docs/reviews/triangulation-voronoi/18-acceptance.md`; not re-read |
| 18.6 drag at 40 sites and 12-site redraw measured | partial | `VP` is opt-in (`BEZEG_PERF=1`, writes `18-perf-raw.txt`); no default-suite assertion; numbers recorded in the review, not re-run |
| 18.7 Fortune reuse review | covered | `docs/reviews/triangulation-voronoi/18-fortune-reuse.md` present (document, not a test) |
| 19.1 shared circle drawing extracted, Delaunay tests unchanged | covered (log) | `19-extract.log`, `19-mut1-delaunay.log`; `DelaunayGraph` host and lesson-action tests are the unchanged consumers |
| 19.3 construction state in the scene (Next, Back, Reset work) | covered | `VG` l.223, l.334; `VL` l.148, l.162 |
| 19.5 readouts: n, vertices, edges, rays, bounded/unbounded, selected vertex, live region | covered | `VG` l.76, l.122, l.578 (announcement), l.595 (ring marker) |
| 19.8 Presets: round trip, stale values clamped, legacy import, refusals | covered | `VG` l.411 (pre-overlay Preset), l.428 (round trip, clamp, collection validates), l.458 (each refusal localized); `PC` l.34 lists `compgeo-voronoi`; `TSC` l.74 |
| 19.9 localization block at same position in `sl.ts` and `en.ts` | covered | the locale lockstep test under `src/localization` and `VG` l.484; not opened here |
| 19.10 disposal: no objects, listeners or timers | covered | `VG` l.496 |
| 22.1 actions select-site, set-construction, set-query-point; invalid values throw; other graphs reject | covered | `VL` l.192 (rejected by every other point-set graph), l.204 (invalid values throw, change nothing; `DegenerateSitesGraph` inherits) |
| 22.3 frames in one synchronous sequence | covered | `VL` l.272 (shared sequence), l.124 |
| 22.3 Back and scene change restore readouts and view | covered | `VL` l.162, l.139 |
| 22 mutation per new assertion | covered (log) | `22b-mutation.log`; not re-read |

## B5: Degenerate sites

| Item | Status | Evidence (test file:line) / lacking |
|---|---|---|
| B5.1 unit square: D exactly 0, one degree-4 vertex, both diagonals legal | covered | `DSK` l.15; `VK` l.357 (degree 4, four rays); `DS` l.69 (with the not-unique note); `DL` l.53 |
| B5.1 symmetric trapezoid behaves the same | covered | `DSK` l.25; `VK` l.379; `DS` l.88 |
| B5.2 one grid step off the circle: D nonzero, two degree-3 vertices, one legal diagonal; moved back degree 4 | covered | `DSK` l.47 (D = 2); `VK` l.389 (two degree-3 vertices joined by a segment); `DS` l.100 (the graph moves nothing itself) |
| B5.3 five collinear sites: four parallel lines, no vertices, no triangles, visible explanation | covered | `VK` l.415; `VD` l.165 (four full lines, strips open); `DS` l.137 (explanation visible, announced, both languages); `DL` l.110; `SMOKE` l.1815-1817 |
| B5.4 duplicate sites refused | covered | `DS` l.159 (including drag onto an existing site, never moved or merged); `VK` l.451; `VG` l.354 |
| B5.5 / C1 mode switch and edits reset derived state | covered | `DS` l.177 (switching keeps sites, recomputes), l.227 (edit clears chosen site and construction) |
| B5.5 / C2 Reset, scene change, restore | covered | `DS` l.289 (Reset example returns to the square in four-point mode); `DL` l.154 (restoreState undoes set-mode and set-points); `TSC` id l.75 |
| B5.5 / C3 stepping and stopped-by-default | covered, not applicable to a trace | lesson scenes only (`DL` l.53) |
| B5.5 / C4 both languages, live switch | partial | `DS` l.367 live switch of readout, mode switch and examples; `DL` l.53, l.110 (both languages); `SMOKE` generic EN walk l.2268 and switch l.2350. Lacking: live switch inside the running lesson is browser-only (`23b-smoke.log`) |
| B5.5 / C5 keyboard and numeric entry reach the on-circle position | covered | `DS` l.259 (arrow keys one grid step, numeric fields), l.277 (real buttons with pressed state and names), l.395 (named group), l.403 (live text changes when the sign changes) |
| B5.5 / C5 touch drag, focus ring and Tab order | partial | no committed assertion. Browser smoke only |
| B5.5 / C6 invalid input refused | covered | `DS` l.159, l.208 (exactly four in four-point mode, up to 40 in sites), l.248 (count message instead of a readout) |
| B5 steps 1-2 four points near a circle; prediction shows no count (no spoiler) | covered | `DL` l.93; `SMOKE` l.1812-1813; `DSK` l.34 (near-circle quadruple, outside) |
| B5 steps 3-4 on the circle then off; quoted determinant equals readout | covered | `DL` l.53; `DSK` l.34; `DS` l.117; `SMOKE` l.1800-1801 (determinant patterns) |
| B5 step 6 convention and why the snapped grid makes exactly-on reachable | covered | `DL` l.132 (incircle <= 0 convention, both diagonals legal when cocircular, correctness notes present) |
| B5 step 7 unit square and trapezoid as the cocircular examples | covered | `DS` l.289, l.69, l.88; `SMOKE` l.1800 |
| B5 prerequisites B3 and B4 | covered | `DL` l.172 (both languages, both lessons exist) |
| B5 correctness: degree-4 vertex, dual not a triangulation, uniqueness phrasing corrected 2026-11-03 | covered | `DL` l.132; `CH` l.238 section scan (degree-four vertex, non-uniqueness, strips) |
| B5 determinant counter-clockwise against the fourth; collinear first three; large values exact | covered | `DSK` l.58, l.69, l.84; `DS` l.129 |
| 20.3 four-point mode needs exactly four sites; sites mode up to 40 | covered | `DS` l.208, l.248 |
| 20.6 Presets: mode optional, legacy load, unknown mode refused with localized message | covered | `DS` l.289, l.308, l.322, l.333, l.345; `PC` l.34 lists `compgeo-voronoi-degenerate`; `TSC` l.75 |
| 20.8 disposal | covered | `DS` l.380 |
| 20 mutation per assertion | covered (log) | `20-mut-*.log`, `20r-mut-*.log`; not re-read |
| 23.1 `set-mode` and move actions; other graphs reject | covered | `VL` l.226, l.256 (same as the control; clears the refusal message) |
| 23.3 quoted determinants and degrees equal readouts; Back and scene change restore; step 5 message in both languages | covered | `DL` l.53, l.110, l.154 |
| 23.3 frames in one synchronous sequence | covered | `VL` l.272 (lesson B5 validates and runs in one sequence) |
| 23 mutation per new assertion | covered (log) | `23b-mut1..10.log`; not re-read |

## Batch-wide gate and registration (tasks 21, 24), routes `voronoi` and `voronoi-degenerate`

| Item | Status | Evidence / lacking |
|---|---|---|
| Gate 1 each route opens from its family directly and after refresh with lesson | partial | Registered `demonstrations.ts` l.124-125, `graphFactories.ts` l.190-191; guided-lesson SMOKE rows open `?learn=1` directly (`SMOKE` l.2257). Refresh is recorded in `21-smoke.md` only; no committed spec reloads either route |
| Gate 1 static preview | partial | Both ids are in `POSTER_PENDING` (`src/demonstrationPosterPending.ts`, T2 precedent); `demonstrationPreviewAssets.test.ts` l.9-14 passes because of the pending list. Posters await the joint capture |
| Gate 2 concept contracts hold with spec numbers | covered | rows B4.1-B4.3, B5.1-B5.3 |
| Gate 3 both languages | partial | see C4 rows |
| Gate 3 accessible inputs | partial | see C5 rows |
| Gate 3 projection readability | partial | browser-only; no row asserts text or marker size |
| Gate 3 scene restore, stopped-by-default playback | covered | `VL` l.162, `DL` l.154; no playback in either graph |
| Gate 3 Presets | covered | `VG` l.428, `DS` l.289; `PC` l.34; `TSC` l.74-75 |
| Gate 3 figure export | missing | no test or smoke assertion exports a figure from `voronoi` or `voronoi-degenerate` (`VG` l.425 and `DS` l.294 `exportPreset` are Preset exports, not figure export) |
| Gate 4 existing routes and Presets as before | covered | Delaunay host and action tests unchanged after the extraction (task 19.1); `PC` key list only grew; full runs recorded in tasks 21-24; not re-run |
| Gate 5 verification recorded | covered | task evidence sections, `21-acceptance.md` to `24b-*.log`; this matrix |
| 21.3 collections join `compgeoPresetCollections` and the `PC` key list | covered | `PC` l.34 contains both ids; `TSC` l.74-75 |
| 21.6 enumerating tests that list ids; docs rows | covered | `docs/capabilities.md` l.81-82; `docs/current-architecture.md` l.116 names `VoronoiGraph` and `DegenerateSitesGraph` |
| 24.1 sections after `delaunay`, prose, activity link last | covered | `CH` l.180 (numbers, vertex, caveat, both languages, activity at end), l.212 (forward link), l.238 (B5 section) |
| 24.1 B3 section forward link to B4; opening may name the diagram | covered | `CH` l.51 (Delaunay section ends with a forward link naming the Voronoi section); l.24 (title) |
| 24.2 ownership, return links land on owning section and restore focus | partial | `CH` l.196-201 and l.238-242 (launch resolves for own section, not for the other), l.63-75 (opens from its own section, owns it, returns to it); `guidedLessonOwnership.test.ts`. Focus landing on return is covered only by generic chapter tests; browser smoke (`24b-smoke.log`) |
| 24.3 T2 unreleased-lessons scan narrowed to B2 and B3 text | covered | `CH` l.39-48 |
| Chapter renders in both languages | partial | recorded in `f6-smoke/chapter-triangulations-voronoi-sl.png` and `-en.png`; no committed layout assertion |

## Documentation rows

| Item | Status | Evidence / lacking |
|---|---|---|
| `docs/capabilities.md` route rows | covered | l.81 (`/compgeo/voronoi`), l.82 (`/compgeo/voronoi-degenerate`) |
| `docs/capabilities.md` family paragraph names the new Demonstrations | partial | l.90 says every route has a guided lesson and names the Lawson trace; it does not name the Voronoi routes (rows suffice) |
| `docs/current-architecture.md` lists the compgeo graphs | covered | l.116 names `TriangulationGraph`, `DelaunayGraph`, `VoronoiGraph`, `DegenerateSitesGraph` |
| `GLOSSARY.md` terms used by the spec | partial | Present: Edge flip (l.31), incircle (l.38), Delaunay triangulation (l.40). Absent: Voronoi diagram / cell, duality, cocircular points |

## Gaps

| Row | Proposed test (file, assertion) |
|---|---|
| B4.4 marker legibility on a projector | smoke: `just smoke-lesson voronoi` at 1280x720; assert the continues markers are visible and not clipped on step 4 |
| B4.7 / B5.5 C4 live switch inside lesson | smoke: header switch test (SMOKE l.2350) on both rows; record the latest result in `docs/reviews/feature-streams/geometry/` |
| B4.7 / B5.5 C5 touch, Tab order, focus ring | smoke: Tab through sites, triangle list, query inputs and mode switch on both routes at 390 px; assert a visible focus outline on each |
| B4 prerequisite and caveat in the lesson text | `compgeoVoronoiLesson.test.ts`: assert prerequisites name `delaunay` and the lesson text carries the illustrates-not-proves sentence in both languages |
| 18.6 performance | smoke: `scripts/triangulation-browser-perf.cjs` drag at 40 sites on `voronoi`; record frame times (jsdom cannot assert) |
| Gate 1 refresh | smoke row: `page.reload()` on both routes, assert lesson panel and board |
| Gate 1 static preview | joint capture: remove both ids from `src/demonstrationPosterPending.ts`; `demonstrationPreviewAssets.test.ts` then asserts the posters exist |
| Gate 3 figure export | smoke: export a figure from both routes, check non-empty image showing cells |
| Gate 3 projection readability | smoke: 1280x720 screenshots of `voronoi` steps 4-5 and `voronoi-degenerate` step 3 |
| 24.2 focus restore on return | smoke: after lesson exit on `voronoi`, assert `document.activeElement` is the section activity link |
| Chapter layout both languages | smoke: chapter heading and section visible at 1440 and 390 px |
| `docs/capabilities.md` family paragraph | doc edit: name the Voronoi routes at l.90 (no test) |
| `GLOSSARY.md` terms | doc edit: add Voronoi diagram, duality, cocircular points (no test) |
