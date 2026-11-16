# F3 waves Batch C (WV4, WV5): opening probe (slice 1)

Evidence: `.command-logs/waves-c/probe.txt` (sl and en for every opening, a set-time sweep, and two layouts). The probe was a temporary host test (`src/graphs/functions/wvC.probe.host.test.tsx`, run with `just unit`, passed, deleted afterwards). Sources: spec `docs/specs/waves-sampling-lessons.md` WV4/WV5; code `src/graphs/functions/WavesGraph.tsx`, `src/graphs/functions/waves/wavesDerived.ts`, `src/waves/sampling.ts`, `src/waves/wavesModel.ts`.

`git status --short` after deleting the probe (nothing of mine under `src/`; the two kinematics files belong to the other worker):

```
 M src/graphs/curves/kinematics/KinematicsGraph.test.tsx
 M src/graphs/curves/kinematics/KinematicsGraph.tsx
```

## Observed

Sampling mode, scene actions: `set-mode {mode:'sampling'}`, `set-components {f1, p1, a1}`, `set-sampling {fs, extra, showAlias, showJoin, showSinc}`, `set-time {t}`. Fields (sl label; range; slider step): Amplituda tona 0..4 step 0,25; Faza tona v stopinjah -180..180 step 5; Frekvenca tona v Hz 1..40 step 1; Frekvenca vzorčenja v Hz 2..64 step 1; switches "Pojav lažne frekvence (aliasing)" (on by default), "Daljice med vzorci", "Rekonstrukcija s funkcijo sinc" (off); "Dodatni vzorci za rekonstrukcijo" only while sinc is on, 0..192 step 12; time "Čas t" 0..1 step 0,01 (`WavesGraph.tsx:39`, ranges `wavesModel.ts:41-46`). Each slider also has a text field "..., vrednost".

Readout rows (sl; en in probe.txt): Čas; Frekvenca tona; Frekvenca vzorčenja; Vzorcev na periodo; Nyquistova frekvenca (text "2f = 46 Hz; fs = 24 Hz je pod njo (pojav lažne frekvence)", above: "je nad njo", at: "je enaka njej"); Navidezno gibanje (sentence); Navidezna frekvenca (signed, "obr/s", "ni določeno" when ambiguous); Zadnji vzorec ("n = 1, trenutek n/fs = 1/24 = 0,0417 s"); Največja napaka daljic (join on only); Največja napaka rekonstrukcije "x (na 0,4 do 0,6 s)" (sinc on only); Ločljivost risanja "2048 točk na sekundo". Status line: "Čas 0 s. Ton s frekvenco 23 Hz, vzorčen s 24 Hz. Kolo se navidezno vrti nazaj s frekvenco 1 Hz." (ambiguous: "Pri 2f = fs smeri vrtenja ni mogoče določiti.", rest: "Kolo navidezno miruje.").

WV4 values (all on the first frame, t = 0, phase 0; same in en):

| f, fs | Navidezna frekvenca | Navidezno gibanje | Nyquist text |
| --- | --- | --- | --- |
| 2, 24 | 2 obr/s | naprej 2 Hz | nad |
| 23, 24 | -1 | nazaj 1 Hz | pod |
| 25, 24 | 1 | naprej 1 Hz | pod |
| 9, 12 | -3 | nazaj 3 Hz | pod |
| 13, 24 | -11 | nazaj 11 Hz | pod |
| 5, 12 | 5 | naprej 5 Hz, 2,4 vzorca/periodo | nad |
| 6, 12 | ni določeno | smeri ni mogoče določiti | enaka |
| 24, 24 | 0 | miruje | pod |
| 40, 24 | -8 | nazaj 8 Hz | pod |

All agree with the spec. The state field the code uses for the tone is `f1`.

Drawn (sampling mode, both languages): axis ticks and "t (s)" title; the continuous wave (2049 points over the 1 s window, thin blue); the alias wave (dashed orange, 2049 points, only while "Pojav lažne frekvence" is on and the alias is not ambiguous, so at 2f = fs no alias wave is drawn); fs + 1 round dots at n/fs for n = 0..fs (25 at fs = 24); a strip of instants (a horizontal line below the plot at y about -1,6 peak with a tick at each n/fs, plus dotted stems to the dots) with a square marker for the last sample instant; the wheel (a circle left of the time axis, `WavesGraph.tsx:630-645`) with a dashed arrow (true mark) and a thick solid arrow (mark at the last sample n/fs), named "pravi" and "vzorec" in two rows under the circle; join (dashed polyline through the dots); sinc (dashed curve). The wheel phase is the tone's phase p1; the arrow turns anticlockwise by 2*pi*f*t + phase (`WavesGraph.tsx:634`). Captions (sl): "Vodoravno: čas t v sekundah, navpično: odmik y." / "Tanko: pravi val" / "Pike: vzorci ob trenutkih n/fs" / "Črtice na vodoravni črti: trenutki vzorčenja n/fs" / "Kolo: črtkana puščica je pravi kazalec, polna je kazalec ob zadnjem vzorcu" / "Črtkano: ton z navidezno frekvenco -1 Hz, ki da iste vzorce" (alias on) / "Črtkano: daljice med vzorci" / "Črtkano: rekonstrukcija s funkcijo sinc (okrnjena, približna)" / "Krivulje so narisane s 2048 točkami na sekundo."

Spec acceptance, WV4: (1) alias from integer `alias` (`sampling.ts:32-39`): yes. (2) the resolution is stated on screen twice (caption and readout row): yes. (3) the sampler is the strip n/fs computed from n (`wavesDerived.ts:138`, `instantOf = n/fs`), not the frame rate: yes. (5) status states the alias in text: yes, on the first frame. A strip of snapshot positions at n/fs: yes.

WV5 values (phase grid is 5 degrees, `PHASE_RANGE`; 0,4 rad = 22,918 degrees is NOT reachable; the neighbours are 20 degrees = 0,3491 rad and 25 degrees = 0,4363 rad):

| Case | Observed | Spec (phase 0,4 rad) |
| --- | --- | --- |
| join error, f = 5, fs = 12, phase 0 | 0,7183 | 0,7183 (agrees) |
| join, phase 20 / 25 degrees | 0,7386 / 0,7310 | 0,7348 at 0,4 rad (not reachable) |
| sinc E = 12, phase 0 / 20 / 25 | 0,0002 / 0,0222 / 0,0274 | 0,0253 |
| sinc E = 48, phase 25 / 20 | 0,0093 / 0,0075 | 0,0086 |
| sinc E = 192, phase 25 / 20 | 0,0025 / 0,0021 | 0,0023 |
| join, f = 6, fs = 12, phase 90 / 25 / 20 / 0 | 1 / 0,5171 / 0,4541 / 0,2105 | n/a |

The spec values at 0,4 rad lie between the 20 and 25 degree values; no reachable phase reproduces them. Join error and sinc error are shown as readouts (join row appears with the join switch; sinc row with the sinc switch and says "na 0,4 do 0,6 s"). The join row label does not say "approximate" or give its window (1 s); the sinc help, caption and switch say "okrnjena, približna" but the row label does not.

fs sweep for f = 5 (12 -> 10 -> 11 -> 9): fs = 12 "je nad njo", forward 5 Hz; fs = 10 "je enaka njej", "Pri 2f = fs smeri vrtenja ni mogoče določiti."; fs = 11 "je nad njo" (11 > 10, so the sweep point "below" is fs = 9, not 11), forward 5 Hz; fs = 9 "je pod njo (pojav lažne frekvence)", backward 4 Hz, apparent frequency -4. The code compares integers (`nyquistRelation`, `sampling.ts:42-47`).

f = 6, fs = 12, phase 90 degrees: status and readouts say only "ni določeno"; nothing states the sample values or an apparent amplitude A cos(phi) (0,9211 at 0,4 rad; at 25 degrees it would be 0,9063, at 20 degrees 0,9397). The dots are drawn at the sample values (all zero at 90 degrees). There is no "exact reconstruction" switch: the alias switch draws the single-tone reconstruction (the alias wave), which for f = 5, fs = 12 coincides with the true wave, and no error row exists for it.

set-time in sampling mode: the action accepts any real in [0, 1] (not snapped to the 0,01 slider step: t = 1/24 and 0,505 are kept; status prints it rounded to 2 decimals: "Čas 0,51 s"). What moves: the status/time row, the time cursor, the true-wheel arrow and a dot on the wave at the playhead (the true arrow follows t continuously), and the "Zadnji vzorec" row plus the square marker plus the solid arrow, which jump to n = floor(t*fs + 1e-9) (`wavesDerived.ts:20`). At f = 23, fs = 24: t = 0,5 -> n = 12, both arrows coincide; t = 1 -> n = 24 and status adds "Časovno okno se je končalo pri t = 1 s." Between instants (t = 0,01 and 1/48) the two arrows differ, at an instant they coincide (the film is correct at the instants). A mode switch sets t = 0 and the status then adds "Prikaz je spremenjen, čas je vrnjen na 0." when no later edit replaces it (a scene of `set-mode` only shows it; with `set-components` after it, it is gone).

## Missing graph needs

Handler decides; nothing implemented.

1. WV5 step 4 (the dots at exactly 2f depend on the phase): no readout of the sample values or the apparent amplitude A cos(phi) (spec 0,9211 A). Where: a readout row in `readoutRows()` (`WavesGraph.tsx:1028-1041`) or a sentence in the ambiguous status text. Without it the lesson can only point at the dots.
2. WV5 phase 0,4 rad is not reachable on the 5-degree grid. Either the lesson uses 25 degrees (join 0,7310, sinc 0,0274/0,0093/0,0025) and does not quote the spec's 0,7348/0,0253/0,0086/0,0023, or the spec text is revised. A finer phase grid (a change of `PHASE_RANGE` and Presets) is not recommended for this batch.
3. WV5 "exact reconstruction" toggle with error: absent as a separate control; the alias wave serves, with no error readout. Spec "Graph needs" lists it; acceptance does not demand it. Decide whether the alias switch counts.
4. WV5 acceptance 2: "the sinc window and the displayed error are labelled approximate". The sinc row names the window ("na 0,4 do 0,6 s") but its label "Največja napaka rekonstrukcije" lacks "približna"; the join row has neither window nor "approximate" (it is exact to the 2049-point grid, window 1 s). A label tweak in `sl.ts`/`en.ts` (`waves_graph_r_join_error`, `waves_graph_r_sinc_error`) would close it; check the readout-label tests.
5. Whether to hide predictions: no switch hides the alias readouts; see next section.

## Which readouts reveal the predictions at once

Every one of these is on the first frame, before the learner has changed anything, in the inspector readout list and the status line:

- WV4 step 2 "speed it up; predict": on entering sampling the rows "Navidezno gibanje" (e.g. "Kolo se navidezno vrti nazaj s frekvenco 1 Hz.") and "Navidezna frekvenca" ("-1 obr/s") and the Nyquist row state the outcome for every frequency the learner sets; the status line repeats the sentence. Also "Vzorcev na periodo" (1,04).
- WV4 step 3 backwards crawl: the same sentence says "nazaj" and the wheel shows both arrows.
- WV4 step 5 alias frequency: "Navidezna frekvenca" and the caption "Črtkano: ton z navidezno frekvenco -1 Hz, ki da iste vzorce" (on while the alias switch is on) state the value; the alias wave is on by default.
- WV4 step 6 change fs: same rows update.
- WV5 step 1 "predict the tone": the Nyquist and apparent frequency rows give 5 Hz.
- WV5 step 2 join vs wave: the join error row appears with the switch ("Največja napaka daljic", 0,7183 at phase 0).
- WV5 step 3 through 2f: Nyquist text ("nad", "enaka", "pod") and the apparent-frequency row.
- WV5 step 4 phase at 2f: not stated (see missing need 1); the join row shows 1 / 0,5171 / 0,4541 / 0,2105 for phases 90 / 25 / 20 / 0, which changes with phase.

The one control that hides part of it: the alias switch (`set-sampling {showAlias:false}`) removes only the alias wave and its caption, not the readouts or status.

## Layout

At the host test's 600 x 400 board and at 390 x 480 (sl and en, four openings): the wheel (x 12..124 px narrow, 54..155 px wide) and the strip stay inside the board; the captions stack from the top left (x = 10), wrapping at the board width (2 lines each for the wheel and alias captions at 390 px); the caption block ends by y about 230 px (narrow, sinc on, sl) above the plot top at 300 px. My overlap detector reported touching rows (exactly one row pitch apart); those are rounding noise of my own box estimate, not overprinting; the repo's own narrow test (`WavesGraph.test.tsx:369-`) covers captions of all four modes. One possible problem: the wheel name under the circle ("vzorec"/"sample"), second row, ends at y 400 px (sl) or 407 px (en) on the 600 x 400 board and at y 472 px (sl) or 487 px (en) on 390 x 480, by my estimate of a 16 px text box, so the en label may be clipped by up to about 7 px at the bottom edge. Not verified in a browser.

## Doubts

- The overlap and clipping figures are estimates (7,5 px per character, 16 px text height), not rendered pixels; a browser screenshot is needed to confirm the "sample" label clipping.
- Arrow angles in the probe are in board units on non-isotropic scales, so I quote only the formula (`WavesGraph.tsx:634`) and which arrows coincide, not screen angles.
- Probe covered phase 0 for all WV4 values; the wheel at non-zero phase was not dumped.
- Speed of the 0,4 rad figures: the spec's checked values were not re-derived here; the kernel tests (`sampling.test.ts`) were not rerun.

## Graph slice

- `readoutRows()` in `WavesGraph.tsx`: row `ambiguous-samples` at 2f = fs, from `a1` and cos of the snapped `p1` (rounded to four decimals, -0 normalised): first sample, its negative, apparent amplitude (0,9063 at 25 degrees, 0 at 90).
- Join row value is "{error} (na 0 do {window} s)" from `windowOf(state)` (the full window, 1 s); join and sinc row labels say approximate.
- Caption for fs > 2f reads "Črtkano: ton skozi pike (natančna rekonstrukcija)"; the alias wording stays below 2f.
- Tests: three new in `WavesGraph.test.tsx` (red in `.command-logs/waves-c/graph-red.log`, green in `graph-unit.log`/`graph-unit2.log`); one older assertion adjusted for the new join value format.
- Not done: the `set-mode`-only "čas je vrnjen na 0" text (optional, left).

## Slice 2 (LESSON): WV4

### Written

`src/learning/content/wavesSamplingGuidedLessons.ts` (new; only WV4): export `wavesAliasingLesson` (demonstrationId `waves`, 7 steps), exported scene helper `wavesSamplingSceneActions(id, spec)` (prepared-scene, set-mode sampling, set-components {f1, p1, a1}, set-sampling {fs, extra, showAlias, showJoin, showSinc}, set-time), constants `WV4_RATE = 24`, `WV4_SLOW = 2`, `WV4_FAST = 23`, `WV4_FASTER = 25`, `WV4_INSTANT_TIME = 0.5`, `WV4_CHANGE_F = 9`. Not registered anywhere (lesson id `waves-aliasing` is for the handler). Checks: tsc empty (`s2-tsc-wv4.log`); backslash checks 0 singles (`s2-backslash-wv4.txt`); `just unit src/graphs/functions src/learning/content/wavesGuidedLessons.test.ts` passed (`s2-unit-wv4.log`); `just lint` passed (`s2-lint-wv4.log`); a temporary copy of `lessonMathNotation.test.ts` with the lesson added: the two content-scanning tests passed, only the chapter-count assertion failed, as expected for an unregistered extra lesson (`s2-notation-wv4.log`; the copy was deleted). Probe: `.command-logs/waves-c/probe2-wv4.txt` (sl and en; the temporary host test was deleted).

### Steps (opening, prediction, learner change)

| Step | Opening scene (alias wave) | Prediction asked | Learner change |
| --- | --- | --- | --- |
| 1 wv4-slow | f 2, fs 24, t 0 (hidden) | when the arrows coincide; turn per frame | Čas t 0,05, then 0,25 |
| 2 wv4-fast | f 2, fs 24, t 0 (hidden) | direction and frequency at f = 23 | Frekvenca tona v Hz = 23; t 0,05 |
| 3 wv4-crawl | f 23, fs 24, t 0 (hidden) | direction and frequency at f = 25 | f = 25; t 0,05 |
| 4 wv4-instants | f 23, fs 24, t 0,5 (hidden) | the arrows at t 0,52 and 0,55; last sample | t 0,52, 0,55; count the dot swings |
| 5 wv4-alias-wave | f 23, fs 24, t 0 (hidden) | whether the wave with the apparent frequency passes through all dots | switch Pojav lažne frekvence (aliasing) on |
| 6 wv4-change-fs | f 9, fs 24, t 0 (shown) | three settings: (a) fs 12, (b) f 6, (c) f 13 and fs 24 | the three settings |
| 7 wv4-explore | f 23, fs 24, t 0 (shown) | f_a by the formula for own f, fs | free; find rest and undetermined |

Formula `alias-frequency` and worked example `wv4-wheel-40` are attached to step 7 only, so no earlier explanation or calculation frame spoils a prediction; the periodicity argument is in the step 5 expected observations (collapsed) and in the formula explanation.

### Numbers per step with source

| Quote | Value | Source |
| --- | --- | --- |
| step 1: forward 2 Hz; n = 6, 6/24 = 0,25 s at t 0,25; n = 1, 1/24 = 0,0417 s at t 0,05 | as quoted | probe2 S1 (sl, en) |
| step 1: 1/12 turn = 30 degrees per frame; solid lags dashed at 0,05 (30 vs 36 degrees) | 360*2/24; 360*2*0,05 | arithmetic |
| step 2: nazaj 1 Hz, Navidezna frekvenca -1 obr/s; n = 1 at t 0,05 | as quoted | probe2 S3 open, S2 |
| step 2: 23/24 turn = 1/24 backwards = 15 degrees; dashed 23*0,05 = 1,15 turns | arithmetic | arithmetic |
| step 3: naprej 1 Hz, 1 obr/s; n = 1 at 0,05; 25/24 turn = 15 degrees forward | as quoted | probe2 S3 f=25; arithmetic |
| step 4: n = 12 at 0,5 and at 0,52 (12,48); n = 13 at 0,55 (13,2), 13/24 = 0,5417 s; dashed 23*0,02 = 0,46 turn; 25 dots with one swing | as quoted | probe2 S4; arithmetic; probe.txt (dots of f 23, fs 24 are cos(2 pi n/24)) |
| step 5: the alias wave (-1 Hz) through all 25 dots; 23n/24 = n - n/24 | identity | periodicity of the cosine; caption `waves_graph_cap_alias` |
| step 6: (a) -3, nazaj 3 Hz; (b) ni določeno, status "Pri 2f = fs smeri vrtenja ni mogoče določiti.", row Vzorca pri 2f = fs "1 in -1"; (c) -11, nazaj 11 Hz; opening f 9 forward 9 Hz | as quoted | probe2 S6, S6a, S6b, S6c |
| step 7: f 24, fs 24: 0 obr/s, "Kolo navidezno miruje."; f 40, fs 24: -8, nazaj 8 Hz; 2048/40 = 51,2; chord error 0,00188 | as quoted | probe2 S7; arithmetic; spec Correctness Notes |

### Deviations

- Phase is 0 in every scene (the helper takes `p`, default 0), so the spec 0,4 rad example and the 25 degree matter do not arise in WV4.
- The spec f = 9, fs = 12 and f = 13, fs = 24 are step 6 (a) and (c); f = 5, fs = 12 (2,4 frames per revolution) is left to WV5.
- Step 5 opens with the alias wave hidden and the learner switches it on; steps 1 to 4 hide it, steps 6 and 7 show it.
- Step 4 opens on an instant (t 0,5) and asks about the times between instants, which the spec does not list.

### Test design

Scene mechanics: each scene is `prepared-scene`, `set-mode sampling`, `set-components {f1, p1: 0, a1: 1}`, `set-sampling {fs, extra: 48, showAlias, showJoin: false, showSinc: false}`, `set-time {t}`, run in one synchronous sequence from a restored checkpoint (as in `wavesGuidedLessons.test.ts`); use the exported `wavesSamplingSceneActions`. State after a scene: mode sampling, a1 1, p1 0, extra 48, join and sinc false, time t. With `set-components` after `set-mode`, the status does not carry "Prikaz je spremenjen, čas je vrnjen na 0." (probe2 S1 status).

Readout keys: `frequency`, `rate`, `samples-per-period`, `nyquist`, `alias`, `alias-frequency`, `frame`, `ambiguous-samples` (only at 2f = fs), `resolution`; status in `data-waves-status`. Expected values (sl; `resolution` is always "2048 točk na sekundo", en "2048 points per second"):

| Scene or learner state | alias | alias-frequency | frame | nyquist |
| --- | --- | --- | --- | --- |
| step 1 and 2 opening: f 2, fs 24, t 0 | Kolo se navidezno vrti naprej s frekvenco 2 Hz. | 2 obr/s | n = 0, trenutek n/fs = 0/24 = 0 s | nad njo |
| step 1: t 0,05 / t 0,25 | same | same | n = 1, 1/24 = 0,0417 s / n = 6, 6/24 = 0,25 s | nad njo |
| step 3, 4, 5, 7 openings: f 23, fs 24, t 0 | Kolo se navidezno vrti nazaj s frekvenco 1 Hz. | −1 obr/s | n = 0 | pod njo (pojav lažne frekvence) |
| step 2: f 23, t 0,05 | nazaj 1 Hz | −1 obr/s | n = 1, 1/24 = 0,0417 s | pod njo |
| step 3: f 25, t 0,05 | naprej 1 Hz | 1 obr/s | n = 1, 1/24 = 0,0417 s | pod njo |
| step 4: t 0,5 / 0,52 / 0,55 (f 23) | nazaj 1 Hz | −1 obr/s | n = 12, 12/24 = 0,5 s / n = 12, 12/24 = 0,5 s / n = 13, 13/24 = 0,5417 s | pod njo |
| step 6 opening: f 9, fs 24 | naprej 9 Hz | 9 obr/s | n = 0 | nad njo |
| step 6 (a): fs 12 | nazaj 3 Hz | −3 obr/s | 0/12 | pod njo |
| step 6 (b): f 6, fs 12 | Pri 2f = fs smeri vrtenja ni mogoče določiti. | ni določeno | 0/12; `ambiguous-samples` "1 in −1 (navidezna amplituda 1)" | enaka njej |
| step 6 (c): f 13, fs 24 | nazaj 11 Hz | −11 obr/s | 0/24 | pod njo |
| step 7: f 24, fs 24 | Kolo navidezno miruje. | 0 obr/s | n = 0 | pod njo |
| step 7: f 40, fs 24 | nazaj 8 Hz | −8 obr/s | n = 0 | pod njo |

English readouts are in probe2 (for example "The wheel seems to turn backwards at 1 Hz.", "−1 rev/s", "n = 13, instant n/fs = 13/24 = 0.5417 s", "The wheel seems to stand still.", "1 and −1 (apparent amplitude 1)").

Learner actions per step (controls named in the prompts): step 1 slider Čas t 0,05 then 0,25; step 2 field Frekvenca tona v Hz = 23, then t 0,05; step 3 field = 25, then t 0,05; step 4 t 0,52 then 0,55; step 5 click the switch Pojav lažne frekvence (aliasing) (en Aliasing), which is off in the opening, and afterwards `showAlias` is true; step 6 fields as in the table ((c) is two entries); step 7 fields f 24 and f 40.

Quote list: all numbers are in the table above; no quoted status string has a count before a Slovenian noun.

### Still to do (handler)

Register `wavesAliasingLesson` (chapter section, lesson id `waves-aliasing`), preview copy, test lists (`lessonMathNotation.test.ts` list and the chapter count), the scene and learner-change test, smoke specs. WV5 goes into the same file (the helper is reusable; `text`, `step` and `sources` are module-local).

### Doubts

- The arrow angles (30 and 15 degrees) come from the phasor formula, not from the drawn wheel on screen.
- Step 1 cannot hide the row Navidezno gibanje (naprej 2 Hz) on the first frame; the prediction asked there is about the arrows, not the direction.
- The Slovenian prose was not reviewed by a Slovenian reader.
