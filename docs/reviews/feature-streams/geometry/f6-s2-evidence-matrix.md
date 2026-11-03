# F6 evidence matrix: Sweep S2 (C3 monotone partition, C4 monotone triangulation)

Audit of 2026-11-03 at `3b5c93c1` by a Sonnet `bezeg-reviewer`, read-only (committed files only; untracked logs ignored). Status: covered / partial / missing / browser. Test files were read, not re-run. Saved by geometry handler 40.

Summary: 53 rows: 40 covered, 10 partial, 3 missing.

Abbreviations: `MP` = `src/compgeo/sweep/monotonePartition.test.ts`; `MT` = `src/compgeo/sweep/monotoneTriangulation.test.ts`; `GEN` = `src/compgeo/sweep/testPolygons.ts`; `PG` = `src/graphs/compgeo/MonotonePartitionGraph.host.test.tsx`; `PR` = `monotonePartitionRun.test.ts`; `PA` = `MonotonePartitionLessonActions.host.test.tsx`; `TG` = `MonotoneTriangulationGraph.host.test.tsx`; `TR` = `monotoneTriangulationRun.test.ts`; `TA` = `MonotoneTriangulationLessonActions.host.test.tsx` (all five graph tests in `src/graphs/compgeo/`); `GL` = `src/learning/content/compgeoGuidedLessons.test.ts`; `LM` = `src/learning/content/lessonMathNotation.test.ts`; `SC` = `src/learning/content/sweepChapter.test.ts`; `SMOKE` = `tests/guided-lessons.smoke.spec.cjs` (monotone-partition l.1912, monotone-triangulation l.1925); `TSC` = `src/graphs/base/graphTransientStateContract.tsx` (l.78-79).

Random-test bounds (spec n<=15; kernel cap `SWEEP_MAX_POLYGON_VERTICES` = 20): `GEN` starPolygon n = 4..15 (l.13), untangledPolygon n = 5..15 (l.21), coordinates -10..10; `MP` l.288 and `MT` l.305 each check 250 simple polygons (floor >= 200), seed 20261102. All within the spec bound. The 20-vertex limit is tested separately (`MP` l.245-250). 183 of 250 polygons have equal-height ties, asserted (`MP` l.320, >=100).

## C3: monotone partition (spec l.94-102)

| Item | Status | Evidence (test) / lacking |
|---|---|---|
| C3.1 example 1: types, processing order, one diagonal (4,3)(8,5), two pieces of area 20 | covered | `MP` l.97, l.120; `PA` l.213; `PG` l.127; `PR` l.9 |
| C3.1 merge vertex (8,5) is helper of the left edge before the split vertex is processed | covered | `MP` l.134; `PA` l.213; `PG` l.127 |
| C3.1 second example: types, no split, merge vertices get diagonals, area 58 | covered | `MP` l.101, l.193; `PA` l.234; `PG` l.185 |
| C3.2 random simple grid polygons: pieces partition, areas sum, pieces = diagonals+1 | covered | `MP` `checkPartition` l.60-93, run l.289 |
| C3.2 every piece y-monotone by an independent check | covered | `MP` l.69 (`isYMonotone`), unit cases l.274, l.281 |
| C3.2 diagonals inside, not crossing, not polygon edges | covered | `MP` l.73-86 |
| C3.2 tie cases exercised in the random run | covered | `MP` l.317-320 |
| C3.3 #start+#split = #end+#merge | covered | `MP` l.63; `PA` l.170-180; `PG` l.127 |
| C3.4 equal-height tie rule (smaller x first) | covered | `MP` l.97, l.222, l.281; `PA` l.234 |
| C3.4 three consecutive collinear vertices refused, middle vertex named | covered | `MP` l.265; `PG` l.375; `PA` l.250; `PR` l.94 |
| C3.4 non-simple refused with the offending edges | covered | `MP` l.259; `PG` l.365 |
| C3 clockwise input: same diagonals in input indices, `reversed: true` | covered | `MP` l.107, l.173, l.211, l.309-315; `PR` l.61, l.75; `PG` l.386 |
| C3 predicate counts per event | covered | `MP` l.163 |
| C3 trace kinds and length | covered | `MP` l.90-93, l.150 |
| C3 steps 1-7 as lesson scenes | covered | `PA` l.160, l.180; `GL` l.44-46 |
| C3 step 2 prediction hides the types before Next | covered | `PA` l.167 |
| C3 colour-independent labels | covered | `PG` l.170 (appearance and contrast browser-only) |
| C3 side lists: queue and status with helper | covered | `PG` l.214, l.243; `PR` l.28 |

## C4: monotone triangulation (spec l.104-112)

| Item | Status | Evidence (test) / lacking |
|---|---|---|
| C4.1 example pieces: 2 triangles and 1 diagonal each, hand-checked stacks | covered | `MT` l.145, l.167, l.184 |
| C4.1 whole C3 polygon: 4 triangles, 3 diagonals, doubled area 80 | covered | `MT` l.216; `TR` l.49; `TG` l.127; `TA` l.242 |
| C4.1 random: m-2 triangles per piece, area sums, no triangle contains another vertex | covered | `MT` l.306-325; `TR` l.133 |
| C4.2 valid triangulation, same count as ear clipping | covered | `MT` l.337-341 |
| C4.2 monotone input triangulated directly, identical to the combined result | covered | `MT` l.260, l.356-361 |
| C4.3 non-monotone input is partitioned first and the lesson says so | partial | Kernel `MT` l.270, graph `TG` l.127; lesson text not asserted |
| C4.3 "already monotone" notice | covered | `TG` l.213; `TR` l.79 |
| C4.4 counts equal the sums of `predicateCount` | covered | `MT` l.245, l.343-351; `TR` l.133; `TG` l.127 |
| C4.4 counts quoted in lesson step 6 equal kernel counts | covered | `TA` l.224 |
| C4.4 growth statement O(n^2) vs O(n), "illustrates, not proves" | partial | `TA` l.224 checks the panel (sl only); lesson prose and EN panel not asserted |
| C4 trace ends in `done`; length formula | covered | `MT` via l.308; `TR` l.22, l.97, l.112 |
| C4 chains left/right in text and marker, stack bottom to top | covered | `TG` l.159, l.183; `TR` l.79; `MT` l.145 |
| C4 visibility test pair drawn with outcome | covered | `TG` l.159; `MT` l.358-359 |
| C4 phase boundary and piece change without dead step | covered | `TR` l.22, l.97, l.112; `TG` l.240 |
| C4 steps 1-7 as lesson scenes | covered | `TA` l.155, l.178, l.206 |
| C4 comparison step names the ear-clipping lesson and links it | missing | Task 20 decision; no test asserts the link or contrast text |
| C4 comparison text claims no saving the counts do not show (piece 1: 7 > 3) | partial | `TA` l.224 pins counts, not the wording |

## Common criteria C-1 to C-7, both graphs

| Item | Status | Evidence (test) / lacking |
|---|---|---|
| C-1 edit recomputes, step 0, pauses; Reset does the same | covered | `PG` l.283; `TG` l.267; `PA` l.110 |
| C-1 Next step and Play reach identical states, Play stops at done | covered | `PG` l.255; `TG` l.240 |
| C-2 Preset round trip, stale step clamped, non-polygon mode coerced | covered | `PG` l.409, l.435; `TG` l.303, l.284 |
| C-2 Preset import validation | covered | `PG` l.435; `PA` l.83; `TSC` l.78-79 |
| C-3 Reset, scene change, restore, Back leave no pending callback | covered | `PA` l.120, l.142; `TA` l.115, l.139 |
| C-4 live language switch | covered | `PG` l.453; `TG` l.325 |
| C-5 every action without a pointer | partial | Buttons tested; Tab order, focus ring, board click browser-only |
| C-6 refusals | covered | `PG` l.324-386; `TG` l.284; `MP` l.233-271 |
| C-7 board labels not colour only | covered | `PG` l.170; `TG` l.159 |
| StrictMode remount, disposal | covered | `PG` l.478, l.487; `TG` l.350, l.359 |
| Live region silent during Play, announces on pause | covered | `TG` l.199 (partition graph inherits the base; not asserted) |
| Drag performance | missing | No spec perf clause for C3/C4; flagged for completeness only |

## Lessons C3 and C4 (tasks 19, 20)

| Item | Status | Evidence (test) / lacking |
|---|---|---|
| Registered in both catalogs, bounded, ordered | covered | `GL` l.43-72 |
| Lesson math notation | covered | `LM` l.175 |
| Views frame every scene polygon | covered | `PA` l.207, l.180; `TA` l.206, l.178 |
| Actions synchronous, never play | covered | `PA` l.180; `TA` l.178 |
| `set-trace-step` clamps; `end` is the last step | covered | `PA` l.83; `TA` l.88 |
| Back and scene change pause playback | covered | `PA` l.97, l.120, l.142; `TA` l.101, l.115, l.139 |
| Quoted values in step text equal the readouts | partial | Readouts pinned, step text numbers not compared |
| Lesson names the tie rule and the three-collinear refusal | missing | Behaviour tested, lesson text not |
| Lesson text in both languages with live switch | partial | `GL`, `SC` l.126; live switch in the lesson browser-only |
| Mutation evidence per new assertion | covered (log) | Logs for 14-16; records 19-21 |
| SMOKE rows | browser | `SMOKE` l.1910-1935 |

## Tasks 14-21 and documentation

| Item | Status | Evidence (test) / lacking |
|---|---|---|
| 14 kernel scope 1-5 | covered | `MP` l.96-286 |
| 15 kernel scope 1-3 | covered | `MT` l.144-300; `TR` l.40 |
| 16 graph items 1-8 | covered | `PG`, `PR` |
| 17 graph items 1-8 | covered | `TG`, `TR` |
| 18 routes | covered | `src/Routes.test.tsx` l.164-165 |
| 18 demonstrations table, prompts | covered | `src/demonstrations.test.ts` l.97-98; `src/DemonstrationsPage.test.tsx` l.46 |
| 18 Preset keys | covered | `PresetCatalog.test.tsx` l.34; `TSC` l.78-79 |
| 18 default views | covered | `compgeoDefaultView.host.test.tsx` |
| 18 posters in `POSTER_PENDING` | covered | `src/demonstrationPosterPending.ts` |
| 21 sections, key facts, ownership, activity identity | covered | `SC` l.12-102; `guidedLessonOwnership.ts` l.112-113 |
| 21 breaking-change record | covered | `SC` l.102; task 21 header; `21-acceptance.md` |
| Gate: kernel tests pass | partial | Handler's `just check` |
| Gate: `docs/capabilities.md` | missing | No monotone partition / triangulation row |
| Gate: `GLOSSARY.md` | missing | No monotone polygon, vertex types or helper |
| Gate: `docs/current-architecture.md` | partial | l.116 says "registered without a lesson yet"; stale |
| Gate: ADR S0 accepted | not checked | Handler's record |

## Could not verify

- Browser-only: focus order, touch, text enlargement, EN 390 px, live switch inside the lesson, label contrast, drag measurement.
- Helper bodies (`checkTriangulation`, `checkTrace`, `expectedTraceLength`) not read.
- Mutation logs listed, not re-read; ADR S0 and test runs not checked.
