# F6 evidence matrix: Triangulation T2 (B2 point-set triangulation, B3 Delaunay)

Audit of 2026-11-02 at `2512429b`, read-only (committed files; uncommitted MonotonePartition work ignored). Status: covered / partial / missing. Test files were read, not re-run.

Abbreviations: `PI` = `src/compgeo/pointInsertion.test.ts`; `TRI` = `src/compgeo/triangulation.test.ts`; `DEL` = `src/compgeo/delaunay.test.ts`; `INC` = `src/compgeo/incircle.test.ts`; `TG` = `src/graphs/compgeo/TriangulationGraph.host.test.tsx`; `TA` = `TriangulationLessonActions.host.test.tsx`; `DG` = `DelaunayGraph.host.test.tsx`; `DA` = `DelaunayLessonActions.host.test.tsx`; `TL` = `src/learning/content/compgeoPointSetTriangulationLesson.test.ts`; `DL` = `compgeoDelaunayLesson.test.ts`; `CH` = `src/learning/content/triangulationChapter.test.ts`; `SMOKE` = `tests/guided-lessons.smoke.spec.cjs` (rows point-set-triangulation l.1749, delaunay l.1761); `TSC` = `src/graphs/base/graphTransientStateContract.tsx` (ids at l.72-73).

Random-test bounds (spec n<=15, 40-point cap): `PI` n = 4..11 start plus at most 4 inserts, capped at 15 (l.156-235, 400 + 600 seeds); `DEL` general-position n = 4..14 (l.284, >=250 checked), Lawson runs n = 5..12 (l.323, 400 attempts). All within bounds.

## B2: point-set triangulation

| Item | Status | Evidence (test) / lacking |
|---|---|---|
| B2.1 T0 has 7 triangles, 13 edges, 8 interior | covered | `PI` l.72 "B2 example T0: 7 triangles, 13 edges, 8 interior, k = 5"; `TG` l.89 "the default scene is the B2 example in T0 ..."; `TL` l.81 step 3 |
| B2.2 random general-position sets, random legal flips keep 2n-2-k and 3n-3-k | covered | `PI` l.219 "general-position grid sets" (flips then inserts, invariants after each step); `TRI` l.348 "keep 2n-2-k triangles and 3n-3-k edges through random legal flips"; l.266 collinear boundary |
| B2.3 flip refuses non-convex quadrilateral and states why | covered | `TRI` l.299 "refuses a non-convex quadrilateral and never builds a degenerate triangle", l.292 hull edge; `TG` l.159 "a flip of a non-convex quadrilateral and of a hull edge each show their reason and change nothing"; `TA` l.102; `TL` l.100 step 4 |
| B2.4 point inside triangle +2; outside matches formula | covered | `PI` l.87, l.97, l.106, l.115, l.130 (each case, exact count change); `TG` l.184 (+2), l.194 (outside, 2n-2-k); `TL` l.134 step 5 |
| B2.5 collinear boundary points counted in k and readout says so | covered | `PI` l.78 (sample 1: k=6, one collinear, 10 triangles); `TG` l.194 (collinear note), l.205 (nine points); `TL` l.186 step 7 |
| B2.6 flip changes the angle vector; readout shows both minima | partial | Both minima: `TG` l.138 "a legal flip keeps both counts, changes the smallest angle and shows both minima"; `TL` l.100. No test asserts the full sorted angle vector (3 x triangles angles) changes at a B2 flip; the vector itself is asserted only for the B3 quad (`DG` l.102, `DEL` l.178). The readout shows minima only |
| B2.7 / C1 edit recomputes, resets | covered | `TG` l.216 (valid move keeps list, breaking move rebuilds with note), l.229 (remove), l.521 |
| B2.7 / C2 Reset, scene change and restore | covered | `TG` l.486 "Reset returns to the default scene"; l.506 (state write clears event and selection); `TL` l.250 "a scene change and the checkpoint restore ..."; `TSC` id l.72. Lesson exit restore is the generic contract |
| B2.7 / C3 stepping | covered, not applicable to a trace | B2 has no trace; steps are lesson scenes, `TL` l.52-202 |
| B2.7 / C4 both languages, live switch | partial | `TG` l.272 and l.566 live switch; `TL` l.203 "quoted numbers appear in the step text and the scene description of both languages"; `lessonMathNotation.test.ts`. Lacking: browser EN lesson walk beyond the recorded `just smoke-lesson point-set-triangulation` (task 15: SL desktop, EN 390 px); live switch inside the real lesson is browser-only |
| B2.7 / C5 every action without a pointer | partial | `TG` l.257 "edge selection and flip work with the native list and button alone"; add and nudge via base `PointSetGraph.host.test.tsx`. Lacking (browser): Tab order and focus ring; touch add mode; a real board click on an edge was not completed in the task 14 smoke (task 14 l.57) |
| B2.7 / C6 invalid input refused with message, not moved | covered | `TG` l.239 "duplicates, collinear and too few points are refused ..."; l.533 refusal announced once; `PI` l.138 refusals |
| 12.4 Presets and import validation | covered | `TG` l.357, l.367, l.388 round trip, l.421 "import refusals" (each case, localized), l.454 invalid stored triangulation throws and leaves scene, l.473 empty list |
| 12.6 disposal | covered | `TG` l.580 "unmount leaves no board objects, language listeners or key listeners" |
| 12.3 overlays | covered | `TG` l.302, l.321, l.336, l.414 (unknown overlay refused) |
| 12.1 hull edges distinct without colour | covered | `TG` l.103, l.550 |
| 12 performance (40 points drag) | partial | `TG` l.602 model-edit API timing only. Lacking: browser drag measurement at 40 points on the final tree (`scripts/triangulation-browser-perf.cjs`, `docs/reviews/triangulation-voronoi/14-perf.md` record one; not re-run) |
| 11.1 insertPoint cases, refusals `duplicate-point` / `too-many-points`, no mutation | covered | `PI` l.87-155 (incl. l.148 "never mutates the input") |
| 11.2 boundaryCount {k, corners, collinear} | covered | `PI` l.71-85 |
| 11.3 random sets n<=15, a few hundred, invariants | covered | `PI` l.219 (400 seeds), l.227 (600 seeds); case coverage tallied |
| 11.3 two deliberate mutations observed | covered (log) | Task 11 evidence section; mutation logs exist in `docs/reviews/feature-streams/geometry/` (e.g. `15-mut-*.log`); logs not re-read |
| 15 lesson B2: 7 steps, actions, numbers at quoting steps | covered | `TL` l.52, l.63, l.81, l.100, l.134, l.162, l.186; `TA` l.50-149 (synchronous sequence l.126; refused by other graphs l.149 and `TL` l.288) |
| 15 Back and scene change restore readouts | covered | `TL` l.250; `TSC` |
| 15 view contains all scene points | covered | `TL` l.277 |

## B3: Delaunay and Lawson flips

| Item | Status | Evidence (test) / lacking |
|---|---|---|
| B3.1 incircle equals exact rational reference; +64, -64, -64, -64 | covered | `INC` l.112 "random quadruples ... agree with the reference", l.130 "exhaustive small grid", l.48-60 (+64, +64 mirror, -64 after flip), l.164-198 BigInt and 2^11 bound; `DEL` l.160 |
| B3.2 example 1 shows 19.65 and 26.57 (two decimals) | covered | `DEL` l.178 "angle vectors before and after"; `DG` l.102 (six sorted angles, min 19,65 to 26,57); `DL` l.116 step 4 |
| B3.3 example 2: three flips, 25.35 degrees | covered | `DEL` l.185 "exactly three flips, removing p1p4, p2p4, p4p6"; `DG` l.129; `DL` l.169 step 6 (illegal edges l.147, 1,91 to 25,35) |
| B3.4 flips only on strictly illegal edges with convex quadrilateral | covered | `TRI` l.299 (non-convex refused), `DEL` l.323 (flip order vs independent reference), l.370 restart scan |
| B3.4 lesson states the illegal-edge quadrilateral is always convex (dBCKO) as a cited fact | partial | Text present in `triangulationChapter.ts` l.74 (SL and EN) and the citation `berg-delaunay` at `compgeoGuidedLessons.ts` l.1231. No test asserts the sentence: the `CH` l.127 fact list has no convexity fact and `DL` has none. Add a `toContain` for the fact in both languages |
| B3.5 random sets (and random-flip starts): terminates, vector strictly increases, equals brute force | covered | `DEL` l.284 "equals the brute-force oracle on random general-position sets" (>=250 checked), l.298 degeneracies, l.323 "terminates with done; angle vector grows strictly at every flip ..." (400 attempts, random-flip starts), l.381, l.398 |
| B3.6 unit square: D=0, both diagonals legal; lesson states non-unique | covered | `INC` l.70-88; `DEL` l.209; `DG` l.165 (non-unique note); `DL` l.193 step 7; `CH` l.127 (`D=0`) |
| B3.7 drawn circle is the exact circumcircle | covered | `DG` l.180 (centre (2, 7/3), radius sqrt(85)/3, only at test events), l.422 (selected triangle, dashed) |
| B3.8 / C1 edit recomputes trace, step 0, pauses | covered | `DG` l.244 "an edit while playing ... returns to step 0, pauses and leaves nothing scheduled"; `DA` l.237 |
| B3.8 / C2 Reset, scene change, restore | covered | `DG` l.211 (Reset to step 0), l.364 (scene change and unmount), l.488; `DA` l.147; `DL` l.301; `TSC` id l.73 |
| B3.8 / C3 Next step and Play identical | covered | `DG` l.211 "Next step k times equals Play for k ticks"; `DA` l.83; `DL` l.252 |
| B3.8 / C4 both languages, live switch | partial | `DG` l.331, l.538 live switch; `DL` l.216 both languages; `lessonMathNotation.test.ts`. Lacking: browser EN lesson walk with live switch (only the recorded `just smoke-lesson delaunay` of task 16) |
| B3.8 / C5 keyboard without pointer | partial | `DA` l.173 select-triangle by action, `DG` l.448 board press; panel triangle list and trace buttons are native. No Delaunay host test drives selection by keyboard alone (compare `TG` l.257). Lacking (browser): keyboard-only run of B3 (spec smoke list), Tab order, focus ring, touch add mode |
| B3.8 / C6 invalid points refused, not moved | covered | `DG` l.351 "points that allow no triangulation show no trace and disable the buttons"; `DEL` l.222, l.234, l.422 |
| 13.2 illegal edges dashed and labelled, not colour only | covered | `DG` l.154, l.200, l.331 |
| 13.3 circle overlay outside trace, determinant with sign word | covered | `DG` l.404, l.422, l.497, l.520 |
| 13.5 Presets: quad, B2 seven points, unit square; step clamped | covered | `DG` l.296 "the start and the step survive a Preset round trip; a stale step is clamped; the collection validates" |
| 13.6 disposal, no timers | covered | `DG` l.364, l.538 |
| Showpiece projection legibility | partial | `DG` l.483 default view frames quad and circles (geometry only). Lacking (browser): projection-size legibility of circle, labels and angle vector |
| 16.1 actions algorithm-trace, set-trace-step, select-triangle | covered | `DA` l.75-237 |
| 16 lesson B3 numbers equal readouts; synchronous sequence | covered | `DL` l.83-216; `DA` l.216 |
| 14 performance (Delaunay drag, trace recompute at 40 points) | partial | `14-perf.md` and `scripts/triangulation-browser-perf.cjs`; no unit assertion; not re-run |

## Batch-wide gate and registration (tasks 14, 17)

| Item | Status | Evidence / lacking |
|---|---|---|
| Gate 1 each route opens directly and after refresh with lesson and static preview | partial | Registered in `demonstrations.ts` l.112-113, `graphFactories.ts` l.164-165; posters `point-set-triangulation.png` and `delaunay.png` exist under `src/images/demonstrations/catalog/`; `demonstrationPreviewAssets.test.ts` l.9; `SMOKE` rows l.1749, l.1761. Direct-open and reload were browser-checked in the task 14 smoke (1440x900, 390x844); not rechecked on the final tree |
| Gate 2 concept contracts hold with spec numbers | covered | rows B2.1-B2.5, B3.1-B3.3 |
| Gate 3 both languages | partial | see C4 rows |
| Gate 3 accessible inputs | partial | see C5 rows |
| Gate 3 projection readability | partial | browser-only |
| Gate 3 scene restore, stopped-by-default playback | covered | `DA` l.75, l.147; `TL` l.250; `DL` l.252 |
| Gate 3 Presets | covered | `TG` l.388, `DG` l.296; ids in `TSC` l.72-73 |
| Gate 3 figure export | missing | No test or smoke step exports a figure from either route (no export assertion in the two graph host tests or lesson tests). Browser evidence needed: export on both routes in SL and EN, Delaunay with circle overlay |
| Gate 4 existing routes and Presets as before | covered | `GraphTransientState.part2.test.tsx`; full unit runs recorded in tasks 14-17; not re-run |
| Gate 5 verification recorded | covered | Evidence sections in tasks 11-17; this matrix |
| 14.3 collections in `compgeoPresetCollections` and PresetCatalog key list | partial | `TG` l.367, `DG` l.296, `TSC` ids; `PresetCatalog.test.tsx` not opened, so the key-list entry is not verified |
| 14.5 posters | covered | files present |
| 17.1 sections after ear-clipping | covered | `CH` l.19, l.63, l.127 |
| 17.1 B2 section states 2n-2-k and 3n-3-k in both languages | covered | `CH` l.63 |
| 17.2 ownership, return links, focus restore | partial | `CH` l.77, l.89, l.105, l.142, l.159 and `guidedLessonOwnership.test.ts`; focus landing on return is covered only by generic chapter tests; browser check not verified |
| 17.3 no unreleased lesson advertised | covered | `CH` l.33 |

## Documentation rows

| Item | Status | Evidence / lacking |
|---|---|---|
| `docs/capabilities.md` route rows | covered | l.75 (`/compgeo/point-set-triangulation`, `TriangulationGraph`), l.76 (`/compgeo/delaunay`, `DelaunayGraph`) |
| `docs/capabilities.md` family paragraph names the new Demonstrations | missing | l.82: "The trace Demonstrations (convex hull, ear clipping, both sweeps)" omits the Lawson trace; the refusal list names only polygon and segment preconditions, not duplicate or collinear point sets for the T2 routes; no mention of edge flips or the circumcircle overlay |
| `docs/current-architecture.md` lists the compgeo graphs | missing | l.116 describes PointSetGraph; grep finds no `TriangulationGraph` or `DelaunayGraph` (task 14.6 asked for it) |
| `GLOSSARY.md` terms the spec uses | missing | Present: Trace (l.14), Ear (l.26), Convex hull, Orientation. Absent: Delaunay triangulation, Edge flip (Lawson flip), Circumcircle / empty circle, Incircle test, Triangulation, Illegal edge. The Trace entry lists "convex hull, ear clipping, sweeps" without the Lawson trace |

## Summary of lacking evidence

- Browser only: EN lesson walk and live language switch inside both lessons; keyboard-only B3 run, Tab order, focus ring, touch add mode; projection legibility; real board click on a B2 edge; 40-point drag measurement on the final tree; figure export.
- Test gaps: full sorted angle vector at a B2 flip (B2.6); dBCKO convexity sentence not asserted (B3.4); no Delaunay keyboard-only host test (C5); PresetCatalog key list unverified.
- Documentation gaps: capabilities family paragraph, current-architecture graph list, glossary terms.
