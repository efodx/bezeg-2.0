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
