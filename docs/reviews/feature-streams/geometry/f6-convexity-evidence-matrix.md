# F6 evidence matrix: Convexity Batch 1 (A1, A2, A4, chapter `convexity-hulls`)

Audit of 2026-11-02 at `8be00ede`, read-only, by a Sonnet `bezeg-reviewer`. Tests were read, not re-run (`just check` ran at the same time). Classes: COVERED (an automated test asserts it), PARTIAL, MANUAL (browser or visual only), MISSING, N/A.

Abbreviations (under `src/` unless stated): PRED `compgeo/predicates.test.ts`; PM `compgeo/polygonMeasures.test.ts`; SH `compgeo/slowHull.test.ts`; GW `compgeo/giftWrapping.test.ts`; MC `compgeo/monotoneChain.test.ts`; OG `graphs/compgeo/OrientationGraph.host.test.tsx`; PAG `graphs/compgeo/PolygonAreaGraph.host.test.tsx`; HG `graphs/compgeo/HullTraceGraph.host.test.tsx`; HA `graphs/compgeo/HullTraceLessonActions.host.test.tsx`; GL `learning/content/compgeoGuidedLessons.test.ts`; HL `learning/content/compgeoHullLesson.test.ts`; CH `learning/content/convexityChapter.test.ts`; SMOKE `tests/guided-lessons.smoke.spec.cjs` l.1670-1707; TSC `graphs/base/graphTransientStateContract.tsx` (`orientation`, `polygon-area`, `convex-hull` in `PRESET_DATA_STATE_KEYS` l.66-68).

| Item | Class | Evidence |
|---|---|---|
| A1.1 +8, −8, 0 shown exactly | COVERED | OG l.59, l.70; PRED l.108; GL l.78 (six scenes); SMOKE `ORIENTATION_VALUES` |
| A1.2 swapping two points negates | COVERED | OG l.85; PRED l.58 |
| A1.3 collinear shows 0 and "collinear", keyboard reachable | COVERED | OG l.70 (arrow keys only), l.180, l.142 |
| A1.4 displayed sign equals `orient` over a grid | COVERED | OG l.99 ([−3,7]×[−3,3]); PRED l.28 (BigInt reference); GL l.88 |
| A1.5 status after scene change and Back | COVERED | GL l.103; OG l.125; exit restore generic in TSC |
| A1.6 both languages | PARTIAL | OG l.125 live switch of readout and board text; GL l.43, l.88. Live switch on lesson text: browser |
| A2.1 21/8/18 and doubled 36/16/11 | COVERED | PM l.34, l.45; PAG l.40, l.55; GL l.131, l.149; SMOKE `AREA_DOUBLED` |
| A2.2 reversal negates signed area, keeps \|A\| | COVERED | PM l.53; PAG l.65; GL l.149 |
| A2.3 B by gcd; I independent of B and Pick | COVERED | `interiorLatticeCount` (`compgeo/polygonMeasures.ts` l.97-110) scans lattice points with `strictlyInsidePolygon`; Pick computed after (l.128); PM l.178, l.129 (300 random polygons), l.113, l.122 |
| A2.4 self-intersecting labelled, no Pick | COVERED | PAG l.81; PM l.73, l.87 |
| A2.5 vertices on lattice nodes | COVERED | PAG l.175, l.111; GL l.204; `pointSetModel.test.ts` |
| A2.6 both languages | PARTIAL | PAG l.97; GL l.156, l.284. As A1.6 |
| A4.1 trace equals hand-checked pops | COVERED | MC l.31 (−2, 0, −5, −2 then 0); HG l.242; HA l.88; HL l.92 |
| A4.2 hull equals oracle on random sets with duplicates and collinear points | COVERED | MC l.80, SH l.65, GW l.82; trace bound SH l.99, GW l.116 |
| A4.3 three algorithms agree on default and all-collinear | COVERED | SH l.59, GW l.73, HA l.119 |
| A4.4 edit resets and pauses; Reset; Next = Play | COVERED | HG l.89, l.125, l.162; HA l.129, l.144, l.154, l.167; HL l.143 |
| A4.5 n<3, all-collinear: hull with message | COVERED | SH l.76, GW l.93, MC l.99, HG l.280 |
| A4.6 slow test labelled teaching algorithm, cost shown | COVERED | HG l.269, l.351; HL l.73 |
| A4.7 both languages | PARTIAL | HG l.269; HL l.129. Live switch in a lesson: browser |
| Spec counts 72/504/5 and 35/5 | COVERED | SH l.26; GW l.32; HA l.77, l.108; HL l.73, l.116; SMOKE `HULL_TESTS` |
| TD unit/math (orient grid sweep, area and Pick, trace vs pops and oracle) | COVERED | PRED l.28; PM l.34, l.45; MC l.31, l.80; SH l.65; GW l.82. Kettner case is A5 (Batch 2) |
| TD point in polygon, separating axis | N/A | A3, A6 are not Batch 1 |
| TD trace model | COVERED | `compgeo/trace.test.ts` l.24-40; SH l.99-126; GW l.116-140; MC l.113-146 |
| TD graph adapter (add/remove/drag/snap/arrows/limit) | COVERED | `PointSetGraph.host.test.tsx`; SH l.150, GW l.164, MC l.172; OG l.113 |
| TD Preset import validation | COVERED | HG l.201, l.227; OG l.225; TSC |
| TD multi-action scenes in one sequence | COVERED | GL l.78, l.131 |
| TD lesson tests (default, Back, exit, handoff, notation, languages) | PARTIAL | Back GL l.103, HL l.143; default and exit restore generic (TSC); no explicit final-scene handoff assertion; CH l.74 launch links |
| TD playback | COVERED | HG l.89, l.125, l.162, l.191, l.302; HA l.167 |
| TD smoke (lesson rows, keyboard-only A1/A4, touch add, live switch) | PARTIAL | SMOKE rows for all three; keyboard-only, touch and lesson live switch: browser |
| Gate 1 direct open, refresh, lesson, preview | PARTIAL | registration tests and CH l.74; refresh and previews: browser |
| Gate 2 contracts and numbers | COVERED | rows above |
| Gate 3 inputs, projection, restore, stopped playback, Presets, export | PARTIAL | stopped HA l.69, HL l.49; Presets HG l.201, OG l.225; restore TSC; export and projection: browser |
| Gate 4 existing routes and Presets | COVERED | TSC full scope in CI; `just check` (handler) |
| Gate 5 evidence recorded, push | PARTIAL | handler step |

## Documentation

- `docs/capabilities.md`: route rows named the three routes but not Pick, the self-intersection rule or the three hull algorithms (PARTIAL).
- `GLOSSARY.md`: no entry for orientation, signed area or convex hull (MISSING), the same gap as T1/S1.

## Language note

Quoted numbers are checked in both languages (GL l.88-95, HL l.129). The step-text token check at GL l.164 is Slovenian only; HL l.16 sets Slovenian as baseline. Live switch is tested on readouts (OG l.125, HG l.269), not on lesson text.

## Contradictions

None: every spec number matches its assertion.

Not read: `PointSetGraph.host.test.tsx`, `pointSetModel.test.ts`, `lessonMathNotation.test.ts`, tasks 07–15 acceptance sections.
