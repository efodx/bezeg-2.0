# F6 evidence matrix: Convexity Batch 2 (A3 point in polygon, A5 degeneracy and robustness)

Audit at HEAD `3fabf5aa`, read-only. Tests were read, not re-run (a gate was running). Classes: COVERED, PARTIAL (what only a browser shows is named), MISSING.

Abbreviations (under `src/`): PIP `compgeo/pointInPolygon.test.ts`; INEX `compgeo/inexactOrientation.test.ts`; PG `graphs/compgeo/PointInPolygonGraph.host.test.tsx`; PA `graphs/compgeo/PointInPolygonLessonActions.host.test.tsx`; PL `learning/content/compgeoPointInPolygonLesson.test.ts`; RG `graphs/compgeo/HullRobustnessGraph.host.test.tsx`; RA `graphs/compgeo/HullRobustnessLessonActions.host.test.tsx`; RR `graphs/compgeo/hullRobustnessReadout.test.ts`; RL `learning/content/compgeoHullRobustnessLesson.test.ts`; SMOKE `tests/guided-lessons.smoke.spec.cjs` (rows `point-in-polygon` l.1750, `hull-robustness` l.1763).

## A3 Point in polygon

| Item | Class | Evidence |
|---|---|---|
| A3.1 notched pentagon (3,1), (1,3) winding 1, (3,3) notch 0 | COVERED | PIP "notched pentagon: ..." l.73 (both rules, locations); crossings (3,1)=1, (3,3)=2 l.84; PG l.54, l.72 (readout values); PL l.149 quoted counts equal rendered readout |
| A3.2 ray through a vertex equals a nearby ray, all vertices | COVERED | PIP l.225-265. "Nearby ray" is formalised as the ray lifted by the dyadic 1/1024 on a 1024-scaled copy, compared by `toEqual` to the coarse result. Run over every vertex of three figures and 200 random polygons (>2000 cases). Reads real classification, not empty data. A general (non-dyadic) nearby ray is not tested |
| A3.3 point on edge is "on the boundary", not in or out | COVERED | PIP l.171 (every lattice point of every edge and every vertex); PG l.108 (readout says boundary, no count); PL l.102 |
| A3.4 pentagram centre winding 2, rules disagree | COVERED | PIP l.98 (centre: winding 2, evenOdd outside, nonzero inside; tips winding 1); PG l.87; PL l.126 |
| A3.5 odd crossings equals odd winding for every tested point | COVERED | PIP l.267-295: parity assertion inside the loop over 400 random polygons (>10000 points) and the three examples |
| A3.6 both languages | PARTIAL | PG l.284 (live language switch of readout, q label); PL l.149 step and scene text in sl and en. Live switch of lesson prose and projection legibility: browser |
| A3 note: pentagram is a stated lattice approximation, winding verified exactly | COVERED | PIP l.89 (five distinct lattice points, self-intersecting), l.98, l.109 (clearance from edges), l.285 (angle-sum reference); PL l.135 and l.172 ("mrežni približek", "lattice approximation" in step text) |
| A3 steps 1-7 reachable, ray hidden at predict step | COVERED | PL l.55 (seven scenes), l.83 (no ray, no count before reveal), l.191 (Back and scene change restore) |
| A3 half-open rule stated | COVERED | PIP l.134-155 (rule behaviour); PL l.149 end (sl "Polodprto pravilo", en "half-open rule") |

## A5 Degenerate cases and robustness

| Item | Class | Evidence |
|---|---|---|
| A5.1 112 wrong, 2052 false zero, i=41, j=48 (+9.33e-15 vs -5.68e-14) with exact rational reference | COVERED | INEX l.16-54: BigInt `refExact` reference, 4096 pivots, `toBe(112)`, `toBe(2052)`, value ratios within 1e-4; l.73 sign map cells equal reference and counts follow; RR l.37, l.86; RG l.231; RL l.136 |
| A5.2 inexact mode labelled inexact everywhere | COVERED | RG l.242 (every rendered double string in sl and en, all three cell kinds, panel); RL l.227 (every lesson and chapter string that says "double" also says "nenatančen" / "inexact", over 8 strings). Limit: keyed on the word "double", a double-based value with no such word would pass |
| A5.3 exact mode never disagrees with reference over a grid sweep | COVERED | INEX l.30 (throws on any exact mismatch over 4096 cells), l.73 (`cell.exact` equals reference); `orientExactDyadic` l.125 random multiples of 2^-53; grid `orient` against BigInt over a grid in `compgeo/predicates.test.ts` (A1.4) |
| A5.4 lesson states what the picture shows, not that doubles always fail | PARTIAL | RL l.190 pins quoted numbers; no test asserts the absence of an "always" claim. Wording is review-only |
| A5.5 both languages | PARTIAL | RL l.190 (step, scene, summary, chapter in sl and en), RG l.415 live switch. Live lesson-text switch: browser |
| A5 ex.: sample 1, (2,0) dropped under `<=`, kept under `<` | COVERED | RG l.77; RL l.107 (5 entries / 23 tests vs 6 / 22) |
| A5 ex.: three collinear points, duplicates | COVERED | RG l.97, l.109; RL l.90 (4 entries, P2 twice), l.125 (9 vs 6 entries); RA l.127-157 edits pause and reset |
| A5 steps 5-6: free-double board then exact, Back | COVERED | RL l.136, l.160, l.172, l.240, l.260; RG l.377 checkpoint, l.176 mode switch, l.476 unmount disposal |
| A5 keyboard operation of the map | COVERED (logic) | RG l.343 arrow keys with clamp, l.299 press selects, l.317 live line. Real focus order and projection: browser |

## Batch-wide acceptance gate

| Item | Class | Evidence |
|---|---|---|
| G1 opens from family, directly and after refresh, lesson and static preview | PARTIAL | `demonstrations.test.ts` l.100-101 (catalog, titles, prompts); `Routes.test.tsx` l.160-161 (route to graph); `PresetCatalog.test.tsx` l.33 keys; PL l.182 lesson joined. Refresh and preview image render: SMOKE rows only (browser) |
| G2 contracts hold with checked numbers | COVERED | rows above |
| G3 accessible inputs, projection readability, scene restore, stopped-by-default, Presets, figure export | PARTIAL | restore PL l.191, RL l.260; Presets PG l.327, `batch2PresetCollections.host.test.tsx`; stopped-by-default RG l.280, RA l.159. Projection readability and figure export: browser |
| G4 existing routes and Presets unchanged | PARTIAL | RA l.209, PA l.125 (other graphs refuse the new operations); full regression is the gate run, not read here |
| G5 evidence recorded, commit and push | N/A | handler step |

## Documentation

| Item | Class | Evidence |
|---|---|---|
| GLOSSARY.md: terms for the two demonstrations | MISSING | No entry for winding number, even-odd rule, ray casting / crossing number, half-open rule, or the Kettner inexact-orientation case (grep: only Orientation l.31, Polygon area l.35, Convex hull l.37 exist). The existing Convex hull entry does not mention the pop-rule choice |
| docs/capabilities.md: the two demonstrations | MISSING | 0 matches for point in polygon, robustness, orientation or hull; it contains no per-demonstration list, so Batch 1 is absent too. Decide whether it should list them |
| docs/current-architecture.md | PARTIAL | l.112, l.116 mention compgeo and the point-set graph; confirm the new kernels and graphs are named (2 grep hits) |
