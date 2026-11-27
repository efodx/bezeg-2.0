# Lane L29 (contour-map): PARTIAL handoff (budget signal 175k)

Start 01:59. Handoff about 02:40.

## Done (observed)
- Parity BEFORE converting: `data-readout-note` on `<p data-contour-status>` (ContourPanels.tsx); SAMPLES entry `contour-map` (8 states, setState on fresh fields + `setStepIndex`) in `src/graphs/base/declare/parity.test.tsx`; recorded `src/graphs/levelsets/__parity__/contour-map.json` (unit passed). Baseline copy `.command-logs/l29-parity-baseline.json`.
- Fragment `src/localization/fragments/contour-map.ts` (`contour_*` keys: level/count/step/line_x/circle names, numeric puck, degrees, count/line_x/choice rejections, status join), registered in `fragments/index.ts` (import + 3 spreads after linearProgram).
- `ContourMapGraph.tsx` converted (NOT yet unit-tested; `npx tsc --noEmit` = 0 errors after the graph edits):
  - `ContourMapIds`; `parameterBindings` (contour-level, -count, -mode, -fn, -step, -constraint, -line-x, -circle in degrees); `declaration()` (pucks: level c, count, mode choice puck, step H in descent, line-x / circle angle in lagrange; Orodja tab edit: fn (5 options), constraint (setup); action `numeric` switch puck in gradient; playback actions next-step/play-pause/reset-run placement tools tab edit as Euler; legend from `legend()`; rows `declaredRows()`; note `status`; marks = window box); `drawnObject` from `legend()`; `performAction`.
  - Text now Message-based (`sentenceMessage`, `statusMessage`, `tangencyMessage`, `declaredRows`); `readoutRows()` renders them; `behaviourText` removed; notice holds a Message.
  - Board legend text rows, `legendBand`, `frameBelowLegend` removed; view key = `viewKey(viewBox(state))`, `frameOf` = `viewBox(state)`.
  - `notifyHost` calls `store.notify()` when step or playing changes (cards re-render on the store version; step is host state).
  - JSXGraph drag handlers wrapped in `runAs('learner')` in `wireDrag`.
  - Orodja controls wrapped in `PuckOwned` (mode, level, count, numeric, step, line-x, circle).
- `ContourPanels.tsx`: `ContourReadout` has `data-declared-panel`, legend `<ul data-contour-legend>` removed.

## Placement judgements
- Pucks only where a lesson step asks: level c (LS1 steps 4-5 type c), count (LS1 step 1), mode (LS2 steps 1-4, LS4 steps 1,2,4 switch mode), step H (LS3 steps 3-6), line x (LS4 steps 1-3), circle angle (LS4 step 4), numeric switch (LS2 step 5).
- Orodja: function (5 options > 4, setup though lessons choose it: frames must `open: ['tools']`), constraint (no lesson asks), probe/start point editors (points), playback group + "Korak spusta" slider (host state, no arbiter key: undeclared), surface + camera (triage decision).
- Legend default place: not changed (no declaration field found); check a screenshot.

## Next
1. Write `src/graphs/levelsets/ContourMapGraph.declaration.test.tsx` (copy LinearProgramGraph.declaration.test.tsx; note id `status`, legend ids per state; puck label <= 16 chars); red check on a row value; quote failure.
2. Run `just unit src/graphs/levelsets src/graphs/patches` and fix own tests: untagged writes (runAs learner), removed `data-contour-legend`/board legend expectations in ContourMapGraph.test.tsx and levelSetsPresetFile.test.tsx (contour cases), controls now pucks. Catalog: `levelsets_graph_legend_title` likely unused now -> delete from sl/en in lockstep (also any other key unused, e.g. check `levelsets_graph_numeric` still used in Orodja: yes).
3. Lessons: add `declare` to StepContent/step() in both lesson files (observation frame) via `frameDeclarer<ContourMapIds>()`; reword prose naming pucks ("z gumbom Več nivojnic nastavi Število nivojnic", "v polju Vrednost nivojnice c", "v polju Način izberi", "Obkljukaj Pokaži numerično oceno gradienta", LAB.step/lineX/circleAngle/mode in optimization lessons) to "krmilnik <puck label>"; fn/next-step/Korak spusta/Sonda/P0 frames `open: ['tools']`. Highlight only rows present at the frame's opening scene.
4. Checks per brief (tsc, lint, graph-check contour-map with route from runtime.ts, golden check: expect notes gain status sentence and captions lose legend lines, report verbatim; unit set; build; smoke-lesson for the 4 lesson ids).
5. Scratch to delete by name: `.command-logs/l29-parity-rec.log`, `l29-tsc.log`, `l29-text.tsx`, `l29-parity-baseline.json`.

# Session 2 (PARTIAL handoff at the 175k signal)

## Done (observed)
- `ContourMapGraph.declaration.test.tsx` (6 states from the parity set + a write/refuse test): green (7/7). Red once: `pressed: !state.numeric` in `declaration()` -> `gradient with the estimate ... AssertionError: expected false to be true`; reverted (grep confirms).
- Graph fix: `frameOf` again frames with `fitBoundingBox` on the canvas size (the former `frameBelowLegend` math with no band); the session-1 plain `viewBox` + keepAspectRatio made Reset give ±7.392 × ±4.752 at 390 × 498 while the settle reframe gave ±2.16 × ±2.758.
- Own tests: `ContourMapGraph.test.tsx` (helper `learn` = act + runAs learner; line-x part now `typePuck('contour-line-x')` + role slider; surface-alert tests `await openTools()`; ownership test starts play by `performAction('play-pause')` since the workspace Play button leaves one timer of its own; resize in `runAs`), `ContourLessonActions.host.test.tsx` (async `after` on `mountWithPucks` + `openTools`; mode via `chooseOnPuckNow`, level/count/step/line-x/circle via `typePuck`, numeric via `puckControl`), `ContourMapPresetRoundTrip.test.tsx` (runAs on reshape).
- Shared `levelSetsPresetFile.test.tsx`: runAs learner on contour writes; narrow-board legend test now asserts no board legend rows + card >= 3 entries + an English entry wraps (gap assertion had no board rows left); opening-view contour test now asserts no board legend rows and the window lies on the board (was: below the legend band); helper `legendBottomPx` removed.
- `just unit src/graphs/levelsets src/graphs/patches`: 81 files, 1277 tests passed.
- `levelsets_graph_legend_title` deleted from sl.ts/en.ts (only unused key of the HEAD contour files, by script).

## Not done
Lessons (frames `declare` via `frameDeclarer<ContourMapIds>()`, `FrameDeclaration` has open/highlight/uses; prose rewording to krmilnik), lesson tests, graph-check, golden check, unit set incl. learning/content + localization, tsc, lint, build, smoke-lesson. tsc not rerun after session 2 edits.

# Session 3 (complete)

## Lessons (observed)
- Both lesson files: `declare` on the observation frame via `frameDeclarer<ContourMapIds>()`. Highlights name rows/notes present at the frame's opening scene (the declaration contract checks them: passed). Orodja users (`contour-fn`, probe/start fields, `next-step`, Korak spusta) open `tools`. LS4 steps 1, 2, 4 use only `contour-mode` (line-x/circle pucks appear after the switch, so they cannot be `uses`); ls3-explore and ls4-explore declare nothing ("nič ni treba vpisati").
- Rewording (old -> new), sl / en:
  - ls1-bowl: "Nato z gumbom Več nivojnic nastavi Število nivojnic na \(3\) (dvakrat pritisni)," -> "Nato krmilnik Število nivojnic nastavi na \(3\),"; "Then with the button More level sets set Number of level sets to \(3\) (press it twice)," -> "Then set the control Level sets to \(3\),"
  - ls1-saddle: "nato v polju Vrednost nivojnice c vpiši \(0\)" -> "nato v krmilnik Vrednost \(c\) vpiši \(0\)"; "then in the box Level value c enter \(0\)" -> "then type \(0\) into the control Value \(c\)"
  - ls1-hills: "Nato v polju Vrednost nivojnice c vpiši" -> "Nato v krmilnik Vrednost \(c\) vpiši"; "Then in the box Level value c enter" -> "Then in the control Value \(c\) enter"
  - ls1-explore: "nastavi Število nivojnic na \(3\)" -> "nastavi krmilnik Število nivojnic na \(3\)"; "set Number of level sets to \(3\)" -> "set the control Level sets to \(3\)"
  - ls2-bowl/tangent/valley/hills: "v polju Način izberi Gradient" (and "V polju ...") -> "v krmilniku Način izberi Gradient"; "in the box Mode choose Gradient" (and "In the box ...") -> "in the control Mode choose Gradient"
  - ls2-numeric: "Obkljukaj Pokaži numerično oceno gradienta in primerjaj" -> "Vklopi krmilnik Numerična ocena in primerjaj"; "Tick Show the numeric gradient estimate and compare" -> "Switch on the control Numeric estimate and compare"
  - LAB.step "Korak \(h\) (\(H=100h\))" / "Step \(h\) (\(H=100h\))" -> "Korak \(H\)" / "Step \(H\)"; ls3-step-9/10/11: "v polje ${LAB.step} vpiši" -> "v krmilnik ${LAB.step} vpiši"; "in the field ${LAB.step} enter" -> "in the control ${LAB.step} enter"
  - LAB.lineX "Točka na premici, \(x\)" / "Point on the line, \(x\)" -> "Točka na premici \(x\)" / "Line point \(x\)"; ls4-line "premakni drsnik" -> "premakni krmilnik", "move the slider" -> "move the control"; ls4-touch/gradients "v polje ${LAB.lineX} vpiši" -> "v krmilnik ${LAB.lineX} vpiši", "in the field ${LAB.lineX}" -> "in the control ${LAB.lineX}"
  - LAB.circleAngle "Točka na krožnici, kot" / "Point on the circle, angle" -> "Kot na krožnici" / "Circle angle"; ls4-circle "pri drsniku ${LAB.circleAngle}" -> "s krmilnikom ${LAB.circleAngle}", "at the slider" -> "with the control"
  - ls4-line/touch/circle: "v izbirniku ${LAB.mode} izberi" -> "v krmilniku ${LAB.mode} izberi"; "in the chooser ${LAB.mode} choose" -> "in the control ${LAB.mode} choose"
- Lesson tests: learner-acting tests are async on a mount that waits for the pucks and opens Orodja; level/count/step/line-x/circle via `typePuck` or the count puck's increase button, mode via `chooseOnPuckNow`, numeric via `puckControl`; label checks read puck text. `levelSetsPresetFile.test.tsx:130` gained `?.` (tsc TS2532 from session 2).

## Checks (observed)
- tsc 0 errors; `just lint` on the 16 changed source files passed; `just build` passed.
- `just graph-check contour-map --route analysis/contours`: contract, parity (2), declaration (7), shared (20) pass; golden FAIL (below; not re-recorded).
- `just unit src/graphs/levelsets src/graphs/patches src/learning/content/levelSets src/learning/content/declarationContract src/localization`: 89 files, 1494 tests passed.
- `just smoke-lesson contour-map --port 4391 --workers=1`: 2 passed. Only `contour-map` (LS1) has a smoke row; LS2-LS4 are not covered by smoke.
- Not done: inspector-width screenshot of the pucks/legend card (no preview given).

## Golden check, verbatim (only notes and captions differ: the status sentence is now a note, the legend lines left the board for the card; no row differs)
```
golden check (BEZEG_PARITY_GOLDEN_CHECK=1) golden panels contour-map
Error: contour-map: panels differ from graphs\levelsets\__parity__\contour-map.golden.json
state "default" notes: golden [] now ["Skleda: x² + y²: nivojnica pri c = 1; število nivojnic: 1."]
state "default" captions: golden ["Polna črta: nivojnica pri izbrani vrednosti c (izračunano)","Sonda (0,6; 0,8)","Sonda: točka, ki jo vlečeš","Črtkana črta: nivojnica skozi izbrano točko"] now ["Sonda (0,6; 0,8)"]
state "level-sets-surface/ls1-probe" notes: golden [] now ["Skleda: x² + y²: nivojnica pri c = 1; število nivojnic: 3."]
state "level-sets-surface/ls1-probe" captions: golden ["Polna črta: nivojnica pri izbrani vrednosti c (izračunano)","Sonda (0,6; 0,8)","Sonda: točka, ki jo vlečeš","Tanjše polne črte: dodatne nivojnice na enakih razmikih vrednosti","Črtkana črta: nivojnica skozi izbrano točko"] now ["Sonda (0,6; 0,8)"]
state "level-sets-surface/ls1-saddle" notes: golden [] now ["Dolina: x² + 10y²: nivojnica pri c = 1; število nivojnic: 3."]
state "level-sets-surface/ls1-saddle" captions: golden ["Polna črta: nivojnica pri izbrani vrednosti c (izračunano)","Sonda (1; 0,5)","Sonda: točka, ki jo vlečeš","Tanjše polne črte: dodatne nivojnice na enakih razmikih vrednosti","Črtkana črta: nivojnica skozi izbrano točko"] now ["Sonda (1; 0,5)"]
state "level-sets-surface/ls1-hills" notes: golden [] now ["Sedlo: x² - y²: nivojnica pri c = 0; število nivojnic: 3."]
state "level-sets-surface/ls1-hills" captions: golden ["Polna črta: nivojnica pri izbrani vrednosti c (izračunano)","Sonda (1; 0,5)","Sonda: točka, ki jo vlečeš","Tanjše polne črte: dodatne nivojnice na enakih razmikih vrednosti","Črtkana črta: nivojnica skozi izbrano točko"] now ["Sonda (1; 0,5)"]
state "level-sets-gradient/ls2-tangent" notes: golden [] now ["Sedlo: x² - y²: nivojnica pri c = 0; število nivojnic: 1."]
state "level-sets-gradient/ls2-tangent" captions: golden ["Polna črta: nivojnica pri izbrani vrednosti c (izračunano)","Sonda (1; 1)","Sonda: točka, ki jo vlečeš","Črtkana črta: nivojnica skozi izbrano točko"] now ["Sonda (1; 1)"]
state "level-sets-gradient/ls2-hills" notes: golden [] now ["Griči: sin x · sin y: nivojnica pri c = 0,625; število nivojnic: 1."]
state "level-sets-gradient/ls2-hills" captions: golden ["Polna črta: nivojnica pri izbrani vrednosti c (izračunano)","Sonda (1,55; 1,55)","Sonda: točka, ki jo vlečeš","Črtkana črta: nivojnica skozi izbrano točko"] now ["Sonda (1,55; 1,55)"]
state "level-sets-gradient/ls2-numeric" notes: golden [] now ["V točki (1; 1) je gradient (0,4546; 0,4546), dolžina 0,643; pravokoten je na nivojnico."]
state "level-sets-gradient/ls2-numeric" captions: golden ["Polna daljica: tangenta nivojnice, pravokotna na gradient","Polna puščica: gradient v točki (točno)","Polna črta: nivojnica pri izbrani vrednosti c (izračunano)","Sonda (1; 1)","Sonda: točka, ki jo vlečeš","Črtkana črta: nivojnica skozi izbrano točko"] now ["Sonda (1; 1)"]
state "level-sets-descent/ls3-step-9" notes: golden [] now ["Korak: 0 od 200. Dolina: x² + 10y²: začetek (2; 1), korak h = 0,03. Dolina: pri tem koraku in tem začetku pot konvergira k (0; 0)."]
state "level-sets-descent/ls3-step-9" captions: golden ["Polna črta: nivojnica pri izbrani vrednosti c (izračunano)","Polna črta: pot spusta (izračunano)","Votel kvadrat: izbrani korak","Začetek (2; 1)","Začetek: točka, ki jo vlečeš"] now ["Začetek (2; 1)"]
state "level-sets-descent/ls3-step-10" notes: golden [] now ["Korak: 0 od 200. Dolina: x² + 10y²: začetek (2; 1), korak h = 0,09. Dolina: pri tem koraku in tem začetku pot konvergira k (0; 0)."]
state "level-sets-descent/ls3-step-10" captions: golden ["Polna črta: nivojnica pri izbrani vrednosti c (izračunano)","Polna črta: pot spusta (izračunano)","Votel kvadrat: izbrani korak","Začetek (2; 1)","Začetek: točka, ki jo vlečeš"] now ["Začetek (2; 1)"]
state "level-sets-descent/ls3-step-11" notes: golden [] now ["Korak: 0 od 200. Dolina: x² + 10y²: začetek (2; 1), korak h = 0,1. Dolina: pri H = 10 y niha med dvema vrednostma."]
state "level-sets-descent/ls3-step-11" captions: golden ["Polna črta: nivojnica pri izbrani vrednosti c (izračunano)","Polna črta: pot spusta (izračunano)","Votel kvadrat: izbrani korak","Začetek (2; 1)","Začetek: točka, ki jo vlečeš"] now ["Začetek (2; 1)"]
state "level-sets-lagrange/ls4-gradients" notes: golden [] now ["Vezni pogoj: Premica x + 2y = 5. Točka (0; 2,5), f = 6,25. Gradienta nista vzporedna; determinanta je -5 (točno)."]
state "level-sets-lagrange/ls4-gradients" captions: golden ["Križec: dotikališče, kjer sta gradienta vzporedna","Polna puščica: gradient funkcije f","Polna črta: nivojnica pri izbrani vrednosti c (izračunano)","Puščice so skrajšane na 0,32 prave dolžine","Tanjše polne črte: dodatne nivojnice na enakih razmikih vrednosti","Točka (0; 2,5)","Točka na veznem pogoju: točka, ki jo vlečeš","Zelo debela polna črta: vezni pogoj","Črtkana puščica: gradient veznega pogoja g","Črtkana črta: nivojnica skozi izbrano točko"] now ["Točka (0; 2,5)"]
state "level-sets-lagrange/ls4-circle" notes: golden [] now ["Produkt: x · y: nivojnica pri c = 0; število nivojnic: 3."]
state "level-sets-lagrange/ls4-circle" captions: golden ["Polna črta: nivojnica pri izbrani vrednosti c (izračunano)","Sonda (0,6; 0,8)","Sonda: točka, ki jo vlečeš","Tanjše polne črte: dodatne nivojnice na enakih razmikih vrednosti","Črtkana črta: nivojnica skozi izbrano točko"] now ["Sonda (0,6; 0,8)"]
```
