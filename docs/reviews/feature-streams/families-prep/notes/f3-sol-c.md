# F3 solids Batch C (SV5)

## Slice 1 (probe)

Full dump (sl and en, every row, note, caption, polyline ids, framed bounds, camera): `.command-logs/solids-c/probe.txt`. Rounding: `fmt(x, 5)` in `SolidsPanels.tsx:121-183` (five decimals, decimal comma in sl); disc sum is a midpoint sum (`solidsScene.ts:376-378`); about y a washer sum with radius `sqrt(b^2 - inner(y)^2)`. Profiles `solidsCatalog.ts:58-72`.

### Probe summary (default 10 discs, axis x; every opening shows the same notes and captions)

| solid | interval | mesh | exact | disc sum 1 / 2 / 5 / 6 / 10 / 60 |
|---|---|---|---|---|
| sqrt | 0..4 | 24,86295 | 25,13274 (8 pi) | 25,13274 at every count |
| parabola | 0..1 | 0,63198 | 0,62832 (pi/5) | 0,19635 / 0,50315 / 0,60752 / 0,61384 / 0,62309 / 0,62817 |
| cone 3x/4 | 0..4 | 37,59154 | 37,69911 (12 pi) | 28,27433 / 35,34292 / 37,32212 / 37,43731 / 37,60486 / 37,69649 |
| sphere | -3..3 | 110,27559 | 113,09734 (36 pi) | 169,646 / 127,2345 / 115,35928 / 114,66813 / 113,66282 / 113,11304 |

Axis y (row label "Vsota obročev (n)", en "Sum of washers (n)"; row "Os vrtenja = os y"):

| solid | exact | washer sum 1 / 2 / 5 / 6 / 10 / 60 |
|---|---|---|
| parabola | 1,5708 (pi/2) | 1,5708 at every count; mesh 1,57869 (10 discs) |
| cone | 100,53096 (32 pi) | 113,09734 / 103,67256 / 101,03362 / 100,88003 / 100,65663 / 100,53446 |
| sqrt | 128 pi/5 = 80,42477 | 94,24778 / 84,4303 / 81,09029 / 80,88793 / (10 not read) / 80,42943 |
| sphere | refused | `set-axis` throws "solids set-axis: axis inconsistent." (no UI refusal text read) |

Notes (all openings): the unit note, then the generic mesh note ("Mreža je mnogokotniška ocena ... lahko nekoliko večja ali manjša od natančne"); for the cone (axis x or y, mesh below exact) the "below" note instead. Captions: "Krivulja: graf funkcije.", "Črtkana črta: os vrtenja.", "Krogi: robovi diskov.", "Poln lik: telo." Mode help: "Graf funkcije, zavrten okoli osi, razrezan na diske."

### Which readouts reveal the predictions

- Step 1 (predict the solid from f and the axis): the first frame already shows the solid, the profile and the axis; nothing in the rows names the shape. No answer in text, but the 3D body is drawn from the first frame, so a prediction cannot be made before seeing it. Hide it only by choosing which opening is shown first (needs a lesson-side decision; no action hides the solid).
- Step 3 (disc sum as discs grow): the disc-sum row and the exact row are visible together at every count, so the convergence is readable, not hidden. For sqrt the sum equals the exact value (25,13274) at every count, and for parabola about y likewise (1,5708); the first frame of those already states the answer to "does the sum approach the integral".
- Step 4 (exact beside the sum): the exact row is on the first frame; no way to ask for it as a prediction.
- Step 5 (about y): the axis row, exact and washer sum change at once on `set-axis`; before it, the y-axis exact value is not shown. The parabola about y first frame gives 1,5708 only after the action.

### Spec numbers reproduced

sqrt 8 pi = 25,1327 and mesh 24,8629 (24,86295): yes. parabola pi/5 = 0,62832 and 5 discs 0,60752: yes. cone 12 pi: yes (37,69911). sphere 36 pi = 113,097 (113,09734), 6 discs 114,668 (114,66813), 60 discs 113,113 (113,11304): yes. parabola about y pi/2 = 1,5708: yes.

### Gaps

- The graph of f is drawn in 3D only (`profile` polyline, 49 points, z = 0, plus `axis`, `disc-k` rings); there is no separate 2D profile view before rotation. The default camera is az -0.9, el 0.5 (perspective); the 'front' preset (az 0, el 0) shows the profile as a plane curve with the disc rings edge-on, so spec step 2 ("rotate the curve") can be read as set-camera front, then the isometric view.
- The whole solid is inside the framed bounds at the default and at 'front' (camera distance and target fit the bounds: sqrt x[0,4] target (2,0,0); parabola y: x[-1,1] y[0,1]).
- The `LIVE` status text read in the test stayed on the opening state ("Ravninski presek: Kocka ...") after the actions; that is the test harness reading before the live region updates (not investigated).
- Reset from revolve mode: not verified (the reset button text lookup failed in the probe).
- The sphere refusal on the UI path (`solids_graph_axis_sphere_only_x`, "Krogla se vrti le okoli osi x.") not rendered in this probe; only the action's thrown error was read.

### Doubts

- sqrt and parabola-about-y sums are exact at every count (a linear integrand pi*x and pi*(1-y) make the midpoint sum exact), so step 3 gives no convergence for those; use cone, parabola about x or sphere for that step.
- The mesh note says the mesh may lie above or below the exact value; sqrt and sphere mesh lie below, parabola above.

## Slice 2 (LESSON): SV5

### Written

`src/learning/content/solidsRevolutionGuidedLessons.ts`: `solidsRevolutionLesson` (line 314; id `solids-revolution` is set at registration), six steps (`sv5-solid` 101, `sv5-discs` 131, `sv5-integral` 161, `sv5-sphere` 191, `sv5-axis` 221, `sv5-free` 255), two formula blocks (disc sum on step 2, integral on step 3), scene helper `solidsRevolveActions` (44: prepared-scene, set-mode revolve, set-solid, then set-axis, set-discs, set-camera as given), constants `SV5_PROFILE/DISCS/EXACT/SPHERE/AXIS/FREE` (61-66). Second probe `.command-logs/solids-c/probe2.txt` (temporary host test deleted). The washer integral and the shells check sit in step 5 `expectedObservations` (no formula block states a step answer).

### Numbers per step with source

| step | quoted | source |
|---|---|---|
| 1 | radii 1 and 2, areas pi and 4 pi; mesh 24,86295, exact 25,13274 only in the unrendered scene text | arithmetic; probe.txt sqrt default; probe2 step1 |
| 2 | 1 disc 0,19635 = pi/16; 5 discs 0,60752; 60 discs 0,62817; exact pi/5 = 0,62832; mesh 0,63198 | probe.txt parabola; probe2 step2; arithmetic (x_k = .1,.3,.5,.7,.9) |
| 3 | 4 discs parabola 0,59595; sqrt sum 25,13274 at 1, 4, 10, 60; 8 pi; mesh 24,86295 (1,1 % low) | probe2 step3; probe.txt sqrt; (25,13274-24,86295)/25,13274 = 0,0107 |
| 4 | 6 discs 114,66813; 60 discs 113,11304; 2 discs 127,2345; 10 discs 113,66282; exact 113,09734 = 36 pi; mesh 110,27559; integral 36 pi | probe.txt sphere; probe2 step4; arithmetic |
| 5 | exact y pi/2 = 1,5708; mesh 1,57869; ratio 5/2; centroid (3/4, 3/10); shells 2 pi/4 | probe2 step5; probe.txt parabola y; arithmetic |
| 6 | y axis 128 pi/5 = 80,42477; sums 80,59203 (10), 80,42943 (60); 16/5 | probe.txt sqrt y; arithmetic (32 - 32/5 = 128/5) |

### Deviations

- Step 3 opens on `parabola` with 4 discs (sum 0,59595, below exact) and the learner switches Telo to the sqrt option; discs stay 4 (probe2 step 3). The brief said "sqrt at a small disc count", but that opening would already show the answer (equal).
- Step 6 opens on `sqrt` about x, 10 discs (not the cone, which repeats SV4 step 6).
- The camera control is in the tab Prikaz / Display, button Ponastavi pogled / Reset view (`SolidsPanels.tsx:211-220`); the group heading there still says "patch" ("Pogled na krpo"), not quoted.

### Test design

- Scene mechanics: each scene = prepared-scene, set-mode revolve, set-solid, then optional set-axis x|y, set-discs, set-camera (front). Camera front after sqrt: az 0, el 0; Reset view returns az -0,9, el 0,5 (probe2 step 1).
- Rows (data-readout ids): `axis`, `volume-mesh`, `volume-exact`, `disc-sum` (label "Vsota diskov (n)" / "Sum of discs (n)", "Vsota obročev (n)" / "Sum of washers (n)" about y).
- Openings (sl, 5 decimals): sqrt front 10 discs mesh 24,86295 exact 25,13274 sum 25,13274; parabola 1 disc 0,19635 (mesh 0,63198, exact 0,62832); parabola 4 discs 0,59595; sphere 6 discs 114,66813 (mesh 110,27559, exact 113,09734); parabola x 10 discs 0,62309; sqrt x 10 discs 25,13274.
- Post-change: parabola 5 / 60 discs 0,60752 / 0,62817; parabola 4 discs then Telo sqrt: sum 25,13274, camera distance reframed; sphere 60 discs 113,11304; parabola axis y: axis "os y", mesh 1,57869, exact 1,5708, "Vsota obročev (10)" 1,5708. en uses decimal points and labels in probe2.txt.
- Quote list (sl/en, from sl.ts/en.ts): Prikaz/Display (tab, probe2 buttons), Ponastavi pogled/Reset view (`patch_view_reset`), Število diskov/Number of discs (`solids_graph_discs`), Telo/Solid, option "Vrtenina funkcije √x"/"Revolution of √x", Os vrtenja/Axis of rotation, options "os x","os y"/"x-axis","y-axis", rows Prostornina (mreža)/(natančno), Vsota diskov, Vsota obročev.
- Learner actions: Reset view (1); discs 5, 60 (2); Solid = sqrt option, discs 1, 10, 60 (3); discs 60, 2, 10 (4); axis y (5).

### Checks

tsc empty; backslash checks: 0 singles (only the `text()` regex line); `just lint` passed; `just unit src/graphs/solids src/learning/content/solidsVolumesGuidedLessons.test.ts` passed; temporary copy of `lessonMathNotation.test.ts` with the lesson: 2 of 3 pass, only the "scans every lesson module" list assertion fails (copy deleted).

### Still to do

Registration, chapter, preview copy, test lists, smoke spec (handler). Review pass for the prediction-before-reveal rule.

### Doubts

- Titles with math (`\(\pi\int f^2\)` in the lesson title) passed the notation test but are not checked in the rendered UI.
- Step 1 tells the learner not to read the volume rows yet; the first frame shows them.
- Step 4 says earlier sums were below or equal, which mildly leans on "above"; the opening already shows it.
- Sphere refusal text on the UI path not rendered (edge case quotes only the action rule).

### Handler 37 review repairs (supersede the Test design above where they differ)
Review `.command-logs/solids-c/review.md`. **Step 1 opens on `cone`** (`SV5_PROFILE = {solid: 'cone', camera: 'front'}`, discs 10 by default: sum 37,60486, exact 37,69911), sections at x = 2 (radius 3/2, area 9π/4) and x = 4 (radius 3, area 9π); the "do not read the rows" sentence is gone. **Step 4** no longer quotes the opening values in the explanation; it asks the learner to read the side and gap, explain the side, and predict the gap ratio from 6 to 60 discs; expected: gap about 1,5708 at 6, about 0,0157 at 60 (a hundredth), exactly 18π/n² at n discs (2 discs: 14,137; 10: 0,5655). Purpose of step 4 reworded ("Razložiti …, napovedati, kako hitro se razlika manjša"). Quote list adds 9π/4, 9π, 3/2, 1,5708, 0,0157, 18π/n².

### Slice 2d (LESSON): SV5

`src/learning/content/solidsRevolutionGuidedLessons.test.ts`: Part A (scene sweep in sl and en, out of order and twice; prompted actions incl. Reset view; quoted readouts per step; control/row names against `solids_graph_*`; no-answer-rendered check) and Part B (closed-form exact volumes, midpoint sums by independent loop at every quoted count, sqrt sum = 8π and parabola washer sum = π/2 for n = 1..60 to 1e-9, sphere gap exactly 18π/n², mesh = frustum sum × kgonFactor(48) to 1e-12, decimal-format and "približno"/"about" markers, every sl 4+ decimal number reproduced). The parabola y-axis mesh (1,57869) is the quoted literal only (the washer mesh has no independent kernel here). Red: one sl number in the SV5 sphere scene text changed (…66813 to …66815); "every quoted number is reproduced" failed (`.command-logs/solids-c/s2d-red.log`); restored (grep counts 0 / 4). Green: `just unit` 127 tests; tsc empty; lint clean. No false claim found.
