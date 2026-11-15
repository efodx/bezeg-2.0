# F3 lines Batch C, slice 1 (set-target action and opening probe)

## Written
- `src/learning/model.ts:431-434`: union member `{kind:'lines'; operation:'set-target'; target:'lines'|'circle'}` and comment.
- `src/graphs/lines/LineGeometryGraph.tsx` (`applyLinesAction`, `set-target` branch): validates against `INTERSECT_TARGETS`, one `setState({target})` + `requestRender()`, error `lines set-target: target must be one of lines, circle.`. Equals the target select's onChange. Does not change mode.
- `src/graphs/lines/LineGeometryLessonActions.host.test.tsx`: 4 new tests (control equality both values; sync sequence; checkpoint restore; invalid values). Red: branch routed to never-taken condition, 4 of 9 failed (`.command-logs/lines-c/host-red.log`); green restored (`host.log`, `s1-unit.log`, `s1-tsc.log`, `s1-lint.log`).

## Observed
- Target persists across mode changes (away and back stays `circle`). `set-points` may write O and B while target is `lines` (no restriction, state only). Defaults: mode forms, target lines, intersect handles R(3,-2) S(2,0) = 2x+y=4 (same as T), O(1,0) B(3,1).
- Reset not exercised (calling `graph.reset()` in a host test timed out); by code (`BaseGraph` reset reloads default preset) it returns to the default state, forms mode. Unverified.
- Board view is FIXED_VIEW [-10,10,10,-10] (jsdom bbox in probe is a shim, not real); whether intersection points and circle are inside not verified visually. Default circle (O(1,0), r=sqrt5) lies inside; the circle B(3,2) points are within +-3.

## Probe summary (`.command-logs/lines-c/probe.txt`, sl and en)
- Opening 1 (also default handles): status "Presečišče premic je (4/5; 12/5)." / "The lines meet at (4/5, 12/5)."; rows: both implicit equations, Presečišče (4/5; 12/5) exact, approx (0,8; 2,4). Board texts: only labels l, m. So the meeting point is stated on the first frame, fractions and decimals.
- Parallel (R(-2,-1), S(2,1), x-2y=0): "Premici sta vzporedni in se ne sekata." / row "ni". Same (R(-2,1), S(2,3)): "Premici sovpadata, skupnih točk je neskončno mnogo." / "neskončno mnogo". Learner drags a point of the second line.
- Circle target O(1,0) B(3,1): "Premica je tangenta krožnice v točki (0; 2)."; rows r²=5, a·x₀+b·y₀−c = 5, a²+b²=5, discriminant 0, count 1, tangent point (0; 2) exact. B(3,0): r²=4, disc −5, none. B(3,2): r²=8, disc 15, rows ≈ (−1,5492; 1,2254), (1,5492; 2,7746). All match the spec's numbers (status for two points does not list points; rows do).
- Predictions answered on the first frame: step 1 (meeting point) yes, status and rows. Step 4 (tangent radius): status and rows state tangency with r²=5 and discriminant 0 at once, so the lesson must open from a non-tangent circle (e.g. B(3,2)) or ask before showing.

## Doubts
- Circle drawing and tangent-point marker visibility not checked in probe (only text and point list).

## Slice 2 (L5 lesson content)

### Written
- New `src/learning/content/analyticLinesIntersectGuidedLessons.ts`: `lineIntersectionsLesson` (`demonstrationId: 'line-geometry'`; the chapter id is slice 3), 5 steps, 4 formula blocks (`lines-meet`, `parallel-or-same`, `line-circle-quadratic`, `tangent-condition`), 2 worked examples (`l5-elimination`, `l5-line-circle`), helper `lineIntersectSceneActions` and scene constants `L5_*`. sl + en. Probe: `.command-logs/lines-c/probe2.txt` (temporary test deleted).
- Steps: (1) `l5-meeting`, (2) `l5-parallel-same`, (3) `l5-line-circle`, (4) `l5-tangent`, (5) `l5-free`.

### Numbers per step with source
| Step | Quoted | Source |
|---|---|---|
| 1 opening | R(0,0) S(2,2): m `x − y = 0`, meet (4;4) | probe2 "1 opening" |
| 1 worked example | (x−y)−(x−2y)=4 → y=4, x=4; checks 4−8=−4, 4−4=0 | arithmetic |
| 1 made | 2x+y=4, (4/5; 12/5), ≈ (0,8; 2,4); intermediates R,x=2: `x = 2`, (2;3); S,x=0: `x + y = 2`, (0;2) | probe2 |
| 2 | S(0,−1): `x − 2y = 2`, "Premici sta vzporedni in se ne sekata.", "ni"; R,x=−4 first: `x + 4y = −4`, (−4;0); R(−4,0) S(−6,−1): `x − 2y = −4`, "Premici sovpadata, skupnih točk je neskončno mnogo.", "neskončno mnogo" (en strings likewise) | probe2; t=−6 by 2−(−4) |
| 3 | r²=|OB|²=8; substitution x=2y−4: 5y²−20y+17=0, D=400−340=60, ¼D=15 = readout; points (∓2s, 2∓s), s=√15/5, ≈ (−1,5492; 1,2254), (1,5492; 2,7746); check 5s²+5=8, s²=3/5 | probe2 "3 after select"; arithmetic |
| 3 worked example | r²=10: 5y²−20y+15=0, D=100, y=1,3, points (−2,1),(2,3), checks 10, 10, −4, −4 | arithmetic |
| 4 | d=5/√5=√5, r²=5, foot (1,0)−(5/5)(1,−2)=(0,2); B(3,1),(2,2),(0,2) tangent at (0;2), r²=5, disc 0, count 1; B(3,0): r²=4, disc −5, none, "Premica ne seka krožnice (diskriminanta −5)." | probe2 (all three B), probe.txt |
| 5 | y=3 (P(−2,3) Q(2,3)), O(1,0): s=−3, a²+b²=1; B(4,0): r²=9, disc 0, tangent at (1;3); B(3,1) with y=3 gives disc −4 | probe2 |
| formulas | readout discriminant = (a²+b²)r²−s²: matches 15 (r²=8), 0, −5, −4, 0 and −256 (P(−2,3) Q(4,4): 37·5−441) | probe2 |

### Deviations
- Step 3 opens on target `lines` with O(1,0), B(3,2) written but hidden (the learner predicts, then selects the circle), not on the circle (brief outline said circle; the settled rule forbids an opening that already answers). Step 4 opens on the circle B(3,2) (two points).
- Control label is "krožnico" / "a circle" (select option), not "krožnica". Row labels with `a·x₀ + b·y₀ − c` are quoted in math (`ax_0+by_0-c`): the notation test bans Unicode subscripts in prose.
- Status quotes with a point ("v točki (0; 2)") are cut before the point and the point is written in math (notation test: numeric tuple).
- Step 2 prediction (1) keeps R and S,x fixed (one field edit, `S, y` 4 to −1); step 2 part 2 moves both points horizontally by −6 instead of the outline's R(−2,1), S(2,3).
- `rawcheck` reports 1 line: `graph\'s` apostrophe escape (same as the precedent file), no math backslash.

### Test design (for the tests worker)
- Scene mechanics: `lineIntersectSceneActions` = prepared-scene default, set-mode intersect, set-target, one set-points naming P,Q,R,S,O,B (all six, integer). Run it in one synchronous sequence; the state is `{mode:'intersect', target, P..B}`.
- Constants: `L5_MEETING_SCENE` (step 1 opening), `L5_MEETING_MADE` (= `L5_PARALLEL_SCENE` = `L5_CIRCLE_SCENE`), `L5_PARALLEL_MADE`, `L5_SAME_MADE`, `L5_CIRCLE_MADE` (= `L5_TANGENT_SCENE`), `L5_TANGENT_MADE`, `L5_NONE_MADE`, `L5_FREE_SCENE`, `L5_FREE_MADE`.
- Readouts (rows read from the graph; labels per probe2): step 1 opening status "Presečišče premic je (4; 4)." / "The lines meet at (4, 4)."; rows second line `x − y = 0`, Presečišče (4; 4). Made: (4/5; 12/5), ≈ (0,8; 2,4), `2x + y = 4`. Step 2 as in the table. Step 3 opening: the lines readouts of 2x+y=4; after `set-target circle`: "Premica seka krožnico v dveh točkah (diskriminanta 15)." r²=8, disc 15, count 2, two ≈ points. Step 4 as in the table; step 5 opening = default intersect readouts; `L5_FREE_MADE`: `y = 3`, r²=9, value −3, a²+b²=1, disc 0, tangent (1;3).
- Learner actions to test: type into fields `R, x`, `S, x`, `S, y`, `B, x`, `B, y` and choose the select (label "Presečišče premice z" / "Intersect the line with", value `circle`); the intermediate states of step 1 (R,x=2 then S,x=0 then S,y=4) and of step 2 (R,x=−4 then S,x=−6) must equal the quoted ones; all are non-degenerate (R≠S, O≠B).
- Quote list: every `\(...\)` number of the table; the step texts quote no number that is not in the table. The tests worker should recompute (integer arithmetic) the intersection, D, s, a²+b², (a²+b²)r²−s², the tangent point and the two points of step 3.

### Still to do
- Slice 3: chapter, registry, registration, preview copy, `lessonMathNotation` lists (my file passes the notation scan when added to a temporary copy of that test: no findings), tests, smoke, docs.

### Doubts
- Not viewed in a browser: whether the circle and tangent marker are drawn for B(3,2)/(3,1) and the points of step 3 are inside the view (the probe shows `point:X₁`, `point:X₂` objects only).
- The step 3 select is changed by the learner; the select's option text is the control label of both languages from `sl.ts`/`en.ts`.
- Slovenian wording not reviewed by a native reader; a free step suggestion asks the learner for a horizontal line, which is the only task not seen in the spec.
- Explanation of `line-circle-quadratic` says the readout is a quarter of D "for this line": true for x−2y=−4 (a=1), checked 15 = 60/4; the general claim is not made.
