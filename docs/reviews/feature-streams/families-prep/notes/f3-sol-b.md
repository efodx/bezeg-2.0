# F3 solids Batch B, slice 1 (worker note)

## Written
- `src/learning/model.ts` (solids union + comment): `set-shear {shear}`, `set-discs {discs}`, `set-cursor {cursor}`, `set-axis {axis: 'x'|'y'}`.
- `src/graphs/solids/SolidsGraph.tsx`: four cases in `applySolidsAction`; `commitSolids` patch now also writes shear/discs/cursor; `stackPair` import. `set-axis` reframes, the others do not.
  `set-shear` throws `solids set-shear: the cone and the cylinder are not sheared (...)` for the failing pair in stack mode; sphere axis y throws `solids set-axis: axis inconsistent.` (from `parseSolidsState`).
- `src/graphs/solids/SolidsLessonActions.host.test.tsx`: 3 new tests plus the old `set-shear` refusal changed to an unknown `set-twist`.

## Observed
- Red: new ops thrown early -> 4 failed, 7 passed (`host-red.log`). Green: `host.log`. `just unit src/graphs/solids src/solids`, `just typecheck`, `just lint` all passed.
- The Edit tool left CRLF in SolidsGraph.tsx and the test; converted to LF (0 CR).

## Probe summary (full: `.command-logs/solids-b/probe.txt`, sl + en)
- Stack mode ids: cube, square-prism (sheared pair), cone (failing pair) (`solidsModel.ts:53`). Switching from the default cube to stack keeps the cube: volumes 1 and 1, slice area 1 and 1, height 0,5. Square-prism: 2x2x3, z -1,5..1,5, volumes 12 and 12 (mesh = exact), slice areas 4 and 4 at every shear/cursor. "Height of the slices" row is the z coordinate, not a fraction (cursor 10/20/30 -> -0,75 / 0 / 0,75 for the prism; 0,25/0,5/0,75 for the cube).
- Default slabs = 10 (not 12); 11 slab outlines (k = 0..discs, `solidsScene.ts:246`); at 12: 13. Rows round to 5 decimals (`SolidsPanels.tsx` `fmt(..., 5)`).
- Notes shown at once in stack/sheared: "Strižba vsako rezino le premakne vstran, zato je ploščina rezin na vsaki višini enaka in prostornini sta enaki." / "The shear only slides every slice sideways, so the slice area is equal at every height and the volumes are equal." plus the one-height-only caveat.
- Failing pair (cone left, cylinder right, offset 4, `solidsScene.ts:220`): cone r=3, h=4; volumes 37,59154 (mesh) / 37,69911 and 112,77463 / 113,09734; areas at cursor 10/20/30: 15,85893 / 7,04841 / 1,7621 vs 28,19366. Note: "The slice areas differ: ... nothing follows about the volumes." Shear control replaced by a text ("Strižba velja le za kocko in štiristrano prizmo; ..."), the action throws.
- Volume mode: all 8 solids. It draws ONE solid: no pyramids, no split of the cube, no labels, no board text. Rows: mesh and exact volume only (cube 1 and 1; prism 6/12; pyramid 21,33333; cone 37,59154 / 37,69911; sphere 110,27559 / 113,09734). The spec's cube-into-three-pyramids (apex (1,1,1)) does not exist in the code.
- Revolve cone (axis x; midpoint sum `solidsScene.ts:328`): disc sum 4: 37,11006; 10: 37,60486; 60: 37,69649; exact 37,69911 (12 pi). The spec's 37,110 and 37,605 agree; 100 discs are off the grid, 60 gives 37,696. The disc sum is a row only in revolve mode, not in volume mode. Axis y: washer sums 101,31636 / 100,65663 / 100,53446 vs exact 100,53096.
- Camera: every opening is fitted (dist 2,87 cube; 6,84 prism; 26,12 failing pair; 15,56 cone); resetView returns az -0,9, el 0,5 with the same fit; 'front' keeps the fit. Not checked: pixel inclusion of whole solids in the view.

## Which readouts reveal the predictions at once
- SV3 step 1 (volume of the slanted stack): yes, the first frame of stack square-prism shows both volumes 12 and 12 and the "volumes are equal" note. The lesson cannot ask for it before the learner sees it unless it hides the panel or uses the cube/other solid.
- SV4 step 1 (how many pyramids fill the cube): not answered, since nothing in volume mode shows pyramids; the lesson needs a kernel/drawing change for the three-pyramid split.
- SV4 step 4 (disc sum as count grows): the revolve panel states the disc sum and exact volume on its first frame (10 discs: 37,60486 vs 37,69911); the volume-mode cone shows no sums.

## Doubts
- The `live` status readout (data-solids-live) text lagged the mode in the probe (still showed the section text); likely a debounce, unconfirmed.
- Probe test deleted; it was a temporary file.

## Graph slice: three pyramids

SV4 volume mode, cube only. New `pyramids` state (default false, strict boolean), kernel `src/solids/cubePyramids.ts`, scene `drawCubePyramids` in `solidsScene.ts`, switch in `SolidsPanels.tsx`, action `set-pyramids`. Each pyramid is pulled 1/4 along the outward normal of its base (the three stay disjoint: pyramid 1 lies on y-x >= 1/4, z-x >= 1/4 and so on, tested). The mesh renderer has one fill colour and `src/graphs/patches/` was out of scope, so the pyramids are told apart by edge colour (roles iso-v purple, iso-w amber, compare teal) and three apex markers; the fill is one colour. Term: "Razreži kocko na tri piramide" (recorded in docs/localization.md, handler-unreviewed). The switch shows only in volume mode; for a solid other than the cube it is unavailable with a reason. Evidence: `.command-logs/solids-b/graph/` (red.log, unit.log, tsc.log empty, lint.log, build.log, after-*.png).

## Slice 2 (LESSON): SV3

### Written
`src/learning/content/solidsVolumesGuidedLessons.ts` (new, LF): export `solidsCavalieriLesson` (id `solids-cavalieri` is for the registry, not in the object), helper `solidsStackActions` (prepared-scene, set-mode stack, set-solid, then set-shear, set-discs, set-cursor only if given), constants `SV3_STRAIGHT/SHEARED/STEEP/FAILING/FREE`, one formula block `solids-cavalieri` (hypothesis => conclusion, attached to step 5 only). Five steps, no worked example. SV4 not written. Probe: `.command-logs/solids-b/probe2-sv3.txt` (sl + en; temporary test deleted).

### Numbers per step (source)
- 1: opens prism shear 0; rows 12/12/12/12, slice 4/4 (probe.txt "stack square-prism"). Prediction: volume at Strižba 1,5 (stored 6, shear = top moves 1,5 sideways, `solidsScene.ts:121`). After: 12 x4, note appears (probe2 "shear 6").
- 2: opens shear 6; predict -1,5 (stored -6) and 3 (stored 12; slider range +-3 = SHEAR_RANGE 12/4). After: rows 12, slices 4/4 (probe2).
- 3: opens shear 12, cursor 20 (50 %, height 0). Predict 25 % / 75 % (cursor 10/30; heights -0,75 / 0,75, probe2). After: 4/4. Argument (translated slice, same area) in expectedObservations.
- 4: cone + cylinder, cursor 20: 7,04841 / 28,19366; cursor 10: 15,85893; 30: 1,7621 (probe.txt). Exact volumes 12 pi = 37,69911, 36 pi = 113,09734; 9 pi = 28,27433 (arithmetic); r = 3, h = 4 from the same readouts (cone area at height 2 = pi*1,5^2*0,99715 mesh).
- 5: SV3_FREE shear 6, discs 12 (opening). Claim: slab count leaves volume rows unchanged (probe2 "discs 12": 12 x4).

### Deviations
None from the brief. Slider reads as the brief says: Strižba 1,5 / -1,5 / 3, cursor 25 / 50 / 75 %.

### Test design
Mechanics: scene actions run in the order above; set-shear is omitted for `cone` (it throws). Rows (data-readout keys): volume-0/1, exact-0/1, height, slice-0/1. Openings: step1 shear 0 (rows 12, no sheared note, only the one-height note); step2 shear 6 and sheared note visible; step3 shear 12 cursor 20; step4 cone pair cursor 20 (failing note visible); step5 shear 6 discs 12. Post-change states: shear -6, 12; cursor 10/30 (heights -0,75/0,75); cone cursor 10/30. Quote list: 12, 4, 1,5, -1,5, 3, 25/50/75 %, -0,75, 0,75, 15,85893, 7,04841, 1,7621, 28,19366, 37,69911, 113,09734, 28,27433 (sources above).

### Doubts
- First frames show answers by themselves: the mode help ("poševno telo ima enako prostornino kot ravno, če so ploščine rezin enake") is on screen at every stack opening, and the failing note ("nothing follows about the volumes") on step 4's. Cannot be hidden without a graph change.
- Step 2's opening already shows the sheared note (shear 6), which hints the answer for -1,5 and 3.
- The failing pair's slice areas are mesh (48-gon) values; the text says so.

### Checks
tsc empty; bscheck 0 singles, rawcheck 1 line (the `\{,\}` regex in `text()`, as in solidsGuidedLessons.ts); unit graphs/solids + solidsGuidedLessons.test passed; lint passed; temp notation copy: 2 passed, 1 failed (the "scans every lesson module" list-equality assertion, expected). Not run: smoke, build, any registry test.

### Handler 37 review repairs (supersede the Test design above where they differ)
Review `.command-logs/solids-b/review-sv3.md`. Graph: the stack mode help (`solids_graph_mode_help_stack`, sl/en) is now neutral ("Telo, razrezano na tanke plošče, ob drugem telesu za primerjavo ploščin rezin in prostornin." / "The solid cut into thin slabs, beside a second solid to compare slice areas and volumes."). Lesson: **steps 2 and 3 now open at `SV3_STRAIGHT`** (shear 0, cursor 20, no sheared note); step 2 asks the direction and distance of the top slab at −1,5 and 3 (expected: 1,5 the other way, 3 the first way, slabs between proportionally less); step 3's learner first sets Strižba 3, then cursor 25 and 75. `SV3_SHEARED`/`SV3_STEEP` remain as post-change states. **Step 4** gives the 50 % readouts (7,04841, 28,19366, a quarter) in the explanation and asks for the cone-to-cylinder area fraction at 25 % and 75 % (expected (1−t)²: 9/16 and 1/16; radius 3(1−t)); the "what can you conclude" question moved to the observation prompt, after the reveal. Quote list adds 9/16, 1/16, 3(1−t), (1−t)².


## Slice 2 (LESSON): SV4

### Written
`src/learning/content/solidsVolumesGuidedLessons.ts`, SV3 untouched, SV4 appended from line 239: helper `solidsVolumeActions` (:254, prepared-scene, set-mode, set-solid, then set-axis, set-discs, set-pyramids), constants `SV4_CUBE/SPLIT/CONE/FREE` (:267-270), formulas `solids-pyramid-volume`, `solids-disc-sum`, 6 steps (:299-), export `solidsPyramidConeLesson` (:477), id `solids-pyramid-cone` is NOT set here (the lesson object has no id field; registration owns it). Probe: `.command-logs/solids-b/probe2-sv4.txt` (sl + en; temporary tests deleted).

### Numbers per step with source
| Step | Number | Source |
|---|---|---|
| 1 | cube volume rows 1 and 1; edge 1, B = 1, h = 1 | probe2-sv4 "cube volume off" |
| 2 | pyramids 0,33333 each (1/3), sum 1; pulled out by a quarter | probe2-sv4 "cube volume on"; caption `solids_graph_caption_pyramids` |
| 3 | point (0,5; 0,2; 0,9) lies in the y = 0 pyramid | arithmetic: pyramid x = 0 is {y >= x, z >= x} (section at height x is the square [x,1]^2) |
| 4 | square pyramid side 4, h 4: 21,33333 mesh and exact = 64/3 | probe2-sv4 "square-pyramid volume"; `solidsCatalog.ts:20` (-8..8 in 1/4 units, apex 8), SV2 spec line 72 |
| 5 | disc sums 37,11006 / 37,60486 / 37,69649 at 4 / 10 / 60; exact 12 pi = 37,69911; mesh 37,59154 | probe2-sv4 "revolve cone"; 4 discs checked by hand: pi*(9/16)*(0,25+2,25+6,25+12,25)*1 |
| 6 | axis y: exact 32 pi = 100,53096; washers 101,31636 / 100,65663 / 100,53446 at 4 / 10 / 60 | probe2-sv4 (free step); 32 pi by shells 2 pi * int x*(3x/4) dx |

### Deviations
- Step 2 opens on the SAME state as step 1 (switch off): the learner turns the switch on. Step 2 has its own prediction (does the pull-out change a volume, what does the sum row read).
- Step 4 (square pyramid) added, so 6 steps; the cone is step 5, free is step 6 (free step uses the y axis, where the disc sum is above the exact value).
- Step 3 argument is by smallest coordinate and coordinate swap; the extension to other pyramids (stretching, Cavalieri with area B(1 - z/h)^2) is stated as an extension.

### Test design
- Scene mechanics: each scene = prepared-scene, set-mode, set-solid, [set-axis], [set-discs], [set-pyramids] in that order, synchronous.
- Openings and expected readouts: step 1, 2: cube volume, pyramids false: rows volume-mesh 1, volume-exact 1, no pyramid rows, switch unchecked. Steps 3, 4: cube volume, pyramids true: pyramid-0..2 = 0,33333, pyramids-sum 1. Step 5: revolve cone axis x discs 4: axis, volume-mesh 37,59154, volume-exact 37,69911, disc-sum 37,11006. Step 6: same with discs 10: disc-sum 37,60486.
- Learner actions and post-change states: step 2 set-pyramids true -> pyramid rows as above. Step 4 set-solid square-pyramid (state keeps pyramids true, panel switch unchecked/unavailable) -> volume-mesh and volume-exact 21,33333. Step 5 set-discs 10 -> 37,60486; 60 -> 37,69649. Step 6 set-axis y -> volume-exact 100,53096, disc-sum (label "Vsota obročev (n)" / "Sum of washers (n)") 100,65663 at 10, 101,31636 at 4, 100,53446 at 60.
- Quote list: all numbers in the table; labels from `solids_graph_*` (Način/Mode, Telo/Solid, Razreži kocko na tri piramide, Število diskov, Os vrtenja, Vsota diskov, Vsota obročev, Prostornina (mreža), Prostornina (natančno), Piramida 1: prostornina mreže, Vsota prostornin treh piramid).

### Checks (logs `.command-logs/solids-b/s2-*-sv4.*`)
tsc empty; bscheck 0 singles, rawcheck 1 line (the `\{,\}` regex of `text()`, as in SV3 and solidsGuidedLessons.ts); `just unit src/graphs/solids src/learning/content/solidsGuidedLessons.test.ts` passed; lint passed; temporary lessonMathNotation copy with SV4: 2 of 3 passed, only the chapter-count assertion failed (one extra solids lesson); copy deleted; LF only.

### Still to do
Registration, chapter, preview, test lists, smoke (owner of those paths). Nothing left in the lesson text.

### Doubts
- The graph's note "B·h/3 = 1/3" appears as soon as the switch is on (step 2), before the step 3 argument; the lesson cannot hide it.
- Step 2 reads the same opening as step 1; if the reviewer prefers an opening with the switch on for step 2, step 1 would need a different opening.
- Step 6 claim "pod pri osi x, nad pri osi y" is stated for these two solids only.
- Slovenian is unreviewed by a native; the graph note and switch help call the pyramids "skladne" (also used).

### Handler 37 review repairs (SV4)
Review `.command-logs/solids-b/review-sv4.md` (no blocking). Step 3 asks open questions (which pyramid holds (0,5; 0,2; 0,9); can a point lie in two or none; how to show two are congruent); the `solids-pyramid-volume` formula block is on **step 4** now (not step 3); step 6's conclusion is "for this shape". Test design unchanged otherwise.

### Slice 2d (LESSON): SV3
`src/learning/content/solidsVolumesGuidedLessons.test.ts` (new; one `describe` for SV3 at line 154, SV4 to be added below it). Part A: both-language scene sweep (out of order, twice, restore), the learner actions of every prompt (state, readouts, notes; no opening equals a produced state), quoted readout values, control names, predicting steps do not render their answers, sl/en decimal rules. Part B: kernels only (`prism`, `cone`, `revolve`, `meshVolume`, `sliceAreaAt`, an own shear): volume 12 equal to 1e-12, slice areas at 100 heights, top-face move, cone/cylinder 48-gon slice areas, ratio (1-t)^2, 9π/12π/36π, a numeral whitelist over all five steps and a mutation guard. Checks: unit green (graphs/solids included), tsc empty, lint clean. Red: `.command-logs/solids-b/s2d-red-sv3.log` (a quoted cone area and the mutation guard changed in the test file, not the lesson; restored). Logs `s2d-*-sv3.log`.
False claims in the lesson (pinned by a test per language, flip the flags when fixed): (1) en step 1 prompt says "Volume: sheared solid", the graph row is "Volume: oblique solid (mesh)" (`solids_graph_name_sheared`, en.ts:3916); (2) step 4 prompt (sl and en) says "Prostornina (natančno)" / "Volume (exact)", the stack rows are "Prostornina: stožec (natančno)" / "Volume: cone (exact)". Not verified: browser, build, registry tests.

### Slice 2d (LESSON): SV4
`src/learning/content/solidsVolumesGuidedLessons.test.ts`: SV4 scene/prompt describe at line 546, mathematics describe at line 724 (SV3 describe untouched; imports extended). Part A: both-language sweep of the six openings (out of order, twice, restore), the prompted actions (switch, square pyramid, discs 10/60, axis y with discs 4/10/60) with readouts from the kernels, quoted values, exact labels (switch, rows, axis, discs, washers), no opening equals a produced state, predicting steps do not show their answers. Part B: three pyramids 1/3 each (1e-12), partition and swap congruence, square pyramid 64/3 and slice areas B(1-z/h)^2, cone 12 pi and mesh, midpoint disc sums (4/10/60, by hand for 4), washers 32 pi (two ways) and 101,31636 / 100,65663 / 100,53446, monotone checks 1..60, numeral whitelist plus mutation guard, sl/en decimal rules. Checks: unit green (with `src/graphs/solids`), tsc empty, lint clean, LF. Red: `s2d-red-sv4.log` (two quoted numbers changed in the test, 2 failures; restored). Logs `s2d-*-sv4.log`.
Labels: no named row or control mismatches the graph. False claim (pinned by a KNOWN test, flip when fixed): step 5 expected observation 2 quotes the rounded mesh volume "ostane 37,59154" / "stays 37.59154" without "približno" / "about" (`solidsVolumesGuidedLessons.ts:414-415`). Not verified: browser, build, registry tests.

## Slice 3: chapter join
Written: sections `cavalieri` and `pyramid-cone` in `solidsChapter.ts` and `solidsChapterRegistry.ts` (ids `solids-cavalieri`, `solids-pyramid-cone`); counts 202 to 204, solids sections 2 to 4 (familyChapters test, smoke spec); lessonMathNotation lesson set and demo ids; solidsGuidedLessons.test.ts section-id list; previews `pending` for both ids; localization row (handler-unreviewed); task 06 and README status. Chapter calls it "Cavalierijevo pravilo" (spec wording); the existing purpose text was changed from "načelo" to match. Examples: cylinder r=1, h=5 (5 pi); pyramid 3x3, h=2 (V=6); cone r=2, h=3 (4 pi, 3-disc midpoint sum 35 pi/9).
Outcome: tsc, lint, build, smoke-lesson solids, unit src/learning src/graphs/solids (175/176 files, one stale section-id list fixed and rerun green), ci-change-scope tests green. Red observed after the chapter text but before the registry rows (coverage test failed).
Not verified: familyChapters count test was not seen red separately; no screenshot of the chapter.
