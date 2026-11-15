# F3 isometries Batch C, slice 1 (rosette and frieze scene actions, opening probe)

## Written
- `src/learning/model.ts`: `set-rosette` (`n?`, `mirrors?`, `point?`) and `set-frieze` (`features?: Partial<{vertical, horizontal, halfTurn, glide}>`, `period?`) in the `isometry` union, with comment.
- `src/graphs/isometry/IsometryGraph.tsx` `applyIsometryAction`: two new cases, validated completely before one `setState`; unchanged values write nothing; the mode is never changed. Messages start `isometry set-rosette: ` / `isometry set-frieze: `. An action naming no field (or `features: {}`) throws, as `set-dilation` does (brief did not say; flagged below).
- `IsometryLessonActions.host.test.tsx`: 5 new tests (action equals controls for both, only named fields written and unchanged writes nothing, synchronous sequence plus checkpoint restore, invalid payloads with message prefix and no change).
- Red: new operations routed to a never-matching case: 5 failed / 9 passed (`host-red.log`). Green: `host.log`, `s1-unit.log` (src/graphs/isometry src/isometry), `s1-tsc.log`, `s1-lint.log` all exit 0. Files LF.
- Temp probe test deleted.

## Observed (full text in `.command-logs/iso-c/probe.txt`, sl and en per opening)
- Default state: mode `mirrors`; rosette n 5, no mirrors, point (4,1); frieze halfTurn only, period 4. Entering frieze mode shows p2 at once.
- Rosette first frame (n 5, no mirrors): status "Rozeta ima 5 gibanj in 5 različnih slik točke." / "The rosette has 5 motions and 5 distinct images of the point."; rows Grupa=ciklična grupa C5, Red grupe=5, Število različnih slik=5, point, Slika 1, Slika 2 (computed). Captions slika 1..5, središče, točka lika. So the L4 step 1 answer (5) is stated on the first frame, in the status and two rows.
- Mirrors on, generic point: status "10 gibanj in 10 različnih slik", D5, order 10, captions slika 1..10, mirror lines drawn (1 curve), diamonds for reflected images. Orientation alternation is not stated in text; only marker shape (circle direct, diamond reflected) shows it.
- On a mirror (n 5, point (4,0)): "Točka leži na zrcalu: različnih slik je 5 od 10 gibanj." Centre (0,0): "Točka je središče rozete ... slika ena sama." Mirror lines for n 5 are at angles j*36 degrees; grid points within |x|,|y|<=8 on a mirror: only the x axis (y=0) (scan result in probe.txt, ON-MIRROR line; n=5 only was scanned).
- n=1,6,12: counts n, 2n (1/2, 6/12, 12/24) in status, grammar "1 gibanj" / "1 motions" is wrong for 1 (and "1 slik lika").
- Frieze, all 16 subsets, period 4 and 6, identical: none p1 (1); V p1m1 (2); H p11m (2); V+H p2mm (4); R p2 (2); V+R, H+R, V+H+R p2mm (4); G p11g (2); V+G p2mg (4); R+G p2mg (4); H+G, V+H+G, V+R+G, H+R+G, all four: reducesPeriod (status "Ta izbira zmanjša periodo ..."/"This choice shortens the period ...", type row "ne"/none, no type caption). Matches the spec table (1,2,2,2,2,4,4; p2mg from V+G or R+G; V+R gives p2mm). No disagreement.
- L5 step 1 (only half-turn): first frame states p2 and "2 slik lika" (status, rows, caption "tip friza p2"). L5 step 2 (V added to G): p2mg, 4 images in status, rows and caption. Both answers are visible before asked.
- Frieze rows: Tip friza, Slik lika v periodi, Perioda, then the four features da/ne. Captions: perioda N, lik, tip friza X.
- Board: all openings [-18.7, 18.8] x [-12.5, 12.5] in the JSDOM shim (600x400); the initial view is half-height 10 in a real browser. Rosette images lie within |x|,|y| about 7 for point (4,1); frieze captions sit within x 4. Frieze polygons: 36 polygons for period 4 V+H (p2mm) across the model's range; whether the whole range is on screen was not checked in a browser.
- Reset (from rosette or frieze mode): returns the full default state, mode `mirrors` (composite rotation, 53,13 degrees), not the rosette or frieze opening.
- NaN breaks: model level, `mergedPoly` of 36 polygons gives 431 points, exactly 35 NaN separators, 36 rings each closed on itself, so no segment can join two copies in the data. In the JSXGraph curve objects of the JSDOM board the points array carries the NaN as non-finite points (7 of 95, 26 of 323). JSDOM draws no SVG path (`d` attribute absent), so the drawn path itself is not confirmed; needs a real browser.

## Doubts
- Empty `set-rosette` / `set-frieze` throw (my choice, consistent with `set-dilation`); the brief said nothing.
- The drawn-captions list in the probe may include hidden-by-callback captions (e.g. 10 image captions at a mirror point); not trusted as a visibility check.
- Pluralisation "1 gibanj", "1 slik lika", "1 motions" at n=1 is an existing wording defect (outside this slice).

## Slice 2 (LESSON): L4 rosettes

### Written
- `src/learning/content/isometriesRosetteGuidedLessons.ts` (new, LF): `rosetteLesson` (4 steps), `rosetteSceneActions`, constants `L4_*`. Scene = demonstration default, `set-mode rosette`, `set-rosette {n, mirrors, point}`. Two formula blocks (`rosette-rotation`, `rosette-mirrored`), no worked examples. Statuses are the reworded ones (`sl.ts`/`en.ts`), checked in `.command-logs/iso-c/probe2-l4.txt`.
- Checks: tsc, lint, `just unit src/graphs/isometry` green; backslash checks 0 singles (a `\'` was reworded away); notation test passed on a temporary copy with the lesson added (deleted); logs `s2-*-l4.*`.

### Numbers per step with source
| Step | Opening | Learner change | Quoted | Source |
| --- | --- | --- | --- | --- |
| 1 | n 4, no mirrors, (4,1) | n to 5 | C4 opening; 5 motions, 5 distinct, C5; angles 0,72,...,288; image 2 about (0.285, 4.1132) | probe2 rows (n4, n5); arithmetic 360/5 |
| 2 | n 5, no mirrors, (4,1) | mirrors on | D5, 10 motions, 10 distinct; 5 direct, 5 reflected | probe2 (n5 mirrors (4,1)); 5 rotations + 5 reflections arithmetic |
| 3 | n 5, mirrors, (4,1) | point (4,0), then (0,0) | (4,0): 5 of 10, Image 2 = Image 1; centre: 1 image, order 10 | probe2 rows; status keys |
| 4 | n 6, no mirrors, (3,2) | free | n 12 mirrors (3,2): 24 of 24; n 4 mirrors (4,0),(4,4): 4 of 8; centre 1 | probe2 (n12, n4 rows) |

### Deviations
- Step 2 asks for the numbers of direct and reflected images (5 and 5), not for "alternation in order": the order of the images 1..10 was not probed.
- Step 3 says one mirror of D5 is the x axis; the probe-1 scan covered only |x|,|y| <= 8.

### Test design
- Scene: `rosetteSceneActions(id, spec)` in one synchronous tick; states per `L4_*`. Rows read by `data-readout` keys `group`, `order`, `distinct`, `point`, `image-1`, `image-2`; status in `[data-isometry-status]`.
- Openings: n4 C4 4/4; n5 C5 5/5; n5 D5 10/10 at (4,1); n6 C6 6/6 at (3,2). Post-change: n5 C5 5/5 (image-2 about (0.285, 4.1132)); n5 D5 10/10; (4,0) 5 of 10 (image-2 = (4;0)), status "Točka leži na zrcalu: število različnih slik je 5, število gibanj pa 10." ; (0,0) 1, order 10, centre status.
- Learner actions: field "Število vrtežev n" to 5; switch "Zrcala (diedrska grupa)"; point fields "P, x"/"P, y" (group "Točka lika"). Free quotes: n12 mirrors (3,2) 24/24; n4 mirrors (4,0) and (4,4) 4 of 8 (both probed).

### Still to do
- Circle/diamond marker counts (5 and 5) are not covered by any readout; a board-level check or a visual look is needed. Chapter, registry, tests lists and docs are slice 3.

### Doubts
- Circles direct, diamonds reflected comes from the slice 1 note and the graph code, not from a rendered check.

## Slice 2 (LESSON): L5 friezes

### Written
- `src/learning/content/isometriesFriezeGuidedLessons.ts` (new, LF): `friezeLesson` (6 steps), `friezeSceneActions`, constants `L5_*` (`L5_SCENES`, `L5_COPIES`, periods, 11/5 counts). Scene = demonstration default, `set-mode frieze`, `set-frieze {features (all four), period}`. Two formula blocks (`frieze-translation-half-turn`, `frieze-glide`). Statuses are the reworded ones; no new probe was needed (every opening and post-change state is in `probe2-l5.txt`).
- Checks: tsc 0, lint 0, `just unit src/graphs/isometry` 0, backslash checks 0 singles (a `\'` reworded away); notation test passed on a temporary copy (lesson and one more `'isometries'` id added; deleted). Logs `s2-*-l5.*`.

### Numbers per step with source
| Step | Opening | Learner change | Quoted | Source |
| --- | --- | --- | --- | --- |
| 1 | none, L 4 | tick half-turn | opening p1, 1 image; after p2, 2 images; centres spaced L/2 (2 at L=4) | probe2 none, R; arithmetic (rho then tau_L = (-x+L,-y)) |
| 2 | G, L 4 | tick vertical | opening p11g, 2; after p2mg, 4; half-turn row da; centre L/4 from mirror | probe2 G, V+G; spec L/4 |
| 3 | V | tick horizontal | opening p1m1, 2; after p2mm, 4; half-turn row da, glide row ne | probe2 V, V+H |
| 4 | H | tick glide | opening p11m, 2; after: reduces-period status, type none, period 4; H then G = translation L/2 | probe2 H, H+G; arithmetic |
| 5 | V+H+R (p2mm) | untick H (still p2mm, 4, H row da), untick R (p1m1, 2), tick G (p2mg, 4) | seven types, signatures, 1,2,2,2,2,4,4; 11 valid / 5 shortening | probe2 V+H+R, V+R, V, V+G; probe rows |
| 6 | G, L 6 | free | 11 combinations give a type, 5 shorten (H+G, V+H+G, V+R+G, H+R+G, all four); periods 4 and 6 same | probe2 all 16 subsets, G p6 |

### Deviations
- The spec Terms/Correctness line gives p2mm "all four" features; the probe rows show p2mm has glide = ne (V, H, half-turn only). The lesson follows the probe (p2mm: vertical, horizontal, half-turn).
- The seven types with their signatures are in the step 5 expected observation (after the answer), not the explanation, so the explanation does not give the answers it asks for.
- Step 5 asks for ticks, then untick-and-tick sequence; there is no state in which one tick change yields p1m1 from the p2mm opening.

### Test design
- Scene: `friezeSceneActions(id, spec)` in one synchronous tick; specs in `L5_SCENES`. Readout rows by `data-readout` keys `type`, `copies`, `period`, `has-vertical|horizontal|halfTurn|glide`; status `[data-isometry-status]`; caption "tip friza X".
- Openings (type, copies): none p1/1; G p11g/2; V p1m1/2; H p11m/2; V+H+R p2mm/4; G period 6 p11g/2. Post-change: R p2/2; V+G p2mg/4 rows V da H ne R da G da; V+H p2mm/4 glide ne; H+G reduces status, type none, period 4; V+R p2mm/4 with H row da; V p1m1/2; V+G p2mg/4.
- Learner actions: checkboxes "Navpično zrcalo", "Vodoravno zrcalo", "Vrtež za 180°", "Zrcalni zdrs" in group "Simetrije vzorca"; slider "Perioda". Quote list: type names and image counts above, 11 and 5 combinations, L/2 and L/4 positions.

### Still to do
- Chapter, registry, test lists and docs (slice 3). Marker/caption positions on the board were not checked in a browser.

### Doubts
- "Centre a quarter period from the mirror" (step 2) and "centres spaced L/2" (step 1) are derived from the spec and arithmetic, not from a rendered check of the board.
- `src/learning/content/isometriesRosetteGuidedLessons.ts` shows modified in the working tree; not by this slice (another actor).
