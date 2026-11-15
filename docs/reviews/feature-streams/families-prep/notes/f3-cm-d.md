# F3 complex maps Batch D notes

## Slice 1a: complex-power

### Written
- `src/learning/model.ts`: union members `{kind: 'complex-power', operation: 'set-z', A, B}` and `{..., operation: 'set-n', n}` with a comment.
- `src/graphs/complex/ComplexPowerGraph.tsx`: `applyComplexPowerLessonAction`, private `editStored`, `registerLessonActions` (`registry.on("complex-power", ...)`). Merge, whole-number check, `parseComplexPowerState`, unknown fields refused, one `edit` of changed fields (pauses playback). Messages: `complex-power set-z: re is out-of-range.`, `... n must be a whole number.`, `... no such field n.`
- `src/graphs/complex/ComplexPowerLessonActions.host.test.tsx` (6 tests). No action-kind list needed registering.
- Logs in `.command-logs/cm-d/`: p-host-red.log (6 failed with the `registry.on` line commented out), p-host.log (6 passed), p-unit.log, p-tsc.log, p-lint.log, p-probe.txt (sl + en + grid scan).

### Observed
- Defaults: z = 1 + i, n = 5, counter "Korak 5 od 8".
- Rows (sl/en labels use the current n): z, n, Re/Im z^n (exact fraction + decimal), |z^n| exact radical, n·arg z, principal arg, real?, on unit circle?, equals 1?. Captions only label powers ("z³"), never give coordinates; out-of-view powers get "z⁴, modul 4".
- The status sentence gives z^n only (not lower powers); `≈` unless both parts are whole numbers.

### Probe summary
- z = 1+i: n=1 z; n=2 `2i`; n=3 `−2 + 2i`, 135°; n=5 `−4 − 4i`, |z^5| 4√2 ≈ 5,656854, 225°, principal −135°; z^4, z^5 are arrows (modulus 4, 5,66).
- z = 0,8+0,6i: |z^n| = 1 exact, unit-circle row "da" at every n; no sentence says it, only the row. Re/Im exact fractions (z^5 = −3116/3125 − 237/3125 i). z^3 = −44/125 + 117/125 i = −0,352 + 0,936i, 110,6097°, principal 110,6097°. n=8: principal −65,0408°.
- z = 0,5+0,5i: n=8 gives 1/16, unwrapped 360°, principal 0°, real yes. Stays inside the view.
- z = 1,5+0,5i n=8: z^3..z^8 arrows (moduli 3,95 6,25 9,88 15,63 24,71 39,06); status lists all of them.
- z = 0: status "z = 0 ... nima argumenta; vse potence so 0"; angle rows "brez argumenta (z = 0)".
- Triple angle: cos20° + i sin20° is not on the grid; nearest 0,95+0,35i (|z| = 1,012423), z^3 = 0,50825 + 0,90475i, modulus 1,037733, angle 60,6746° (3 × 20,2249°), not on the unit circle. Grid points with |z| = 1 exactly: ±0,6/0,8 and ±0,8/0,6 only (plus axes); 0,8+0,6i with z^3 = −0,352 + 0,936i is an exact triple-angle example (36,87° to 110,61°).
- Reveal: the rows and status show z^n for the current n at once, so "predict z^3" must be asked at n <= 2 (z^2 row then shows only z^2; z^3 stays hidden, only a caption-less point appears from n=3). n=1 shows z only. Setting n back to 2 hides z^3. Reset sets n=1 and keeps z.

### Doubts
- `ComplexPowerGraph.act` (re/im/step, old `ComplexPowerAction`, used by ComplexPowerGraph.test.tsx) remains beside the new lesson action with a different payload shape (A/B vs re/im); there is no lesson `step` action (the test uses `stepOnce()` in the sequence). Left alone; the handler may want to remove or align.
- The probe covers rows as text only; no screenshot of the board arrows.

## Slice 1b: complex-euler

### Written
- `src/learning/model.ts`: `complex-euler` members `set-angle {degrees}`, `set-motion {omega?, velocity?, acceleration?}`, `set-mode {mode, b?}`, `set-series {degree}` after `complex-power`, plus `import type {EulerCircleMode}`.
- `src/graphs/complex/EulerCircleGraph.tsx`: `applyComplexEulerLessonAction`, `editStored`, `registerLessonActions` (same structure as ComplexPowerGraph). Merge, strict `parseEulerCircleState` before any write, unknown fields refused, a missing required field (`degrees`, `mode`, `degree`) refused as `<field> is missing`, one edit with the changed fields, pause playback. Errors read `complex-euler <op>: degrees is out-of-range.` / `off-grid` / `not-finite` / `not-boolean` / `not-mode`.
- `src/graphs/complex/EulerCircleLessonActions.host.test.tsx` (8 tests): each action equals the control input (angle field, drag, omega field, arrow toggles, mode checkbox + b field, N field and steppers), one synchronous sequence, checkpoint restore, pause-not-start, supportsLessonAction (a `complex-power` action is unsupported and throws without a change), invalid actions leave state, readouts and status unchanged.
- Red: with the `registry.on` line commented out 8 of 8 failed (`e-host-red.log`); restored, 8 of 8 pass (`e-host.log`). `just unit src/graphs/complex src/complex` green, tsc 0, lint 0 (`e-unit.log`, `e-tsc.log`, `e-lint.log`).
- Mode chooser (`setProductMode`) only sets `mode`; `b` is kept, so `set-mode` does the same (`b` stays 330 after product then motion).

### Observed
Full dump of every readout, status, caption and panel label in sl and en: `.command-logs/cm-d/e-probe.txt` (probe test deleted).
- Default state: theta 30, omega 2, N 5, velocity ON, acceleration off, motion mode, b 45 (so the default already shows the velocity row and arrow).
- Panel (sl): Kot θ (stopinje), Kotna hitrost ω, Stopnja vrste N, Zmnoži dve točki (mode checkbox), Prikaži hitrost, Prikaži pospešek, Naslednji korak / Predvajaj / Ponastavi; b slider "Drugi kot φ" appears only in product mode. en: Angle θ (degrees), Angular speed ω, Series degree N, Multiply two points, Show the velocity, Show the acceleration, Next step / Play / Reset.
- Always-visible rows: Kot θ (deg and rad), ω, Čas t = θ/ω, Obhodni čas 2π/ω, cos θ, sin θ, Delna vsota stopnje N, Točka (cos θ; sin θ), Razdalja delne vsote od točke; sl "Čas t = θ/ω, izračunano = π/12 ≈ 0,262". Caption on the board: "e^(iθ) = (√3/2; 1/2)" on the point itself, always.
- Exact vs computed: label word "natančno"/"izračunano" (exact/computed) in every row label. Exact where the model has exact trig (observed: 0, 30, 45, 90, 180, 270, 360, all "natančno": (1; 0), (√3/2; 1/2), (√2/2; √2/2), (0; 1), (−1; 0), (0; −1)); theta 15 is "izračunano" with 0,9659 + 0,2588i (status "≈ ..., izračunano"). cos row at 30: "√3/2 ≈ 0,8660254", sin "1/2". Brief's "(0,8660254; 0,5)" is therefore shown as exact (√3/2; 1/2) with the decimal beside it only in the cos/sin rows.
- omega 2 velocity: "Vektor hitrosti iω·e^(iθ), izračunano = −1 + 1,7320508i", "Velikost hitrosti = 2", "Kot med krajevnim vektorjem in vektorjem hitrosti = 90°" at every theta and omega (0..360); omega 1 gives speed 1 and period 2π, omega 3, 4 scale speed. Acceleration on: "Vektor pospeška −ω²·e^(iθ), izračunano = −3,4641016 − 2i"; board caption "a = −ω²·e^(iθ), narisano v merilu 0,225" (0,9/ω²). There is no speed/period row tied to acceleration; the period row is always present (2π/ω).
- Product, theta 30 b 45: status "θ + φ = 75°: e^(iθ)·e^(iφ) ≈ (0,258819; 0,9659258), izračunano"; row "Zmnožek e^(iθ)·e^(iφ) = e^(i(θ+φ)), izračunano = (0,258819; 0,9659258)" (the spec's 0,2588190 prints without the trailing zero); captions e^(iφ) = (√2/2; √2/2), e^(i(θ+φ)). theta 180 b 45: "θ + φ = 225°: ... = (−√2/2; −√2/2)" natančno. b 330 with theta 30: sum reduced to 0°, product "(1; 0)" natančno. Product rows (b, sum-angle, second, product) and the b slider exist only in product mode. In the dump the "e^(iπ) = −1" at theta 180 motion mode reads "Točka (cos θ; sin θ), natančno = (−1; 0)", status "e^(iθ) = (−1; 0)" (written as a pair, not as −1).
- Series at theta 180 (row "Delna vsota stopnje N, izračunano = ..."; the status says "Delna vsota stopnje N: ..., njena razdalja od točke je ..."; no sentence "equals"): N1 1 + 3,1416i (dist 3,72), N3 −3,9348 − 2,0261i (3,57), N5 0,1239 + 0,524i (1,24), N9 −0,976 + 0,0069i (0,025), N13 −0,9999 (0,000103), N21 −1 (7,64·10⁻¹¹), N30 −1 (0). N1, N3 and theta 270, 360 at N5: partial sum outside the view: row "Ali je delna vsota stopnje N v pogledu? = ne", caption "Delna vsota stopnje N je zunaj pogleda", status adds "Delna vsota je zunaj pogleda in ni narisana".
- Time and play: theta = omega t shown as the row "Čas t = θ/ω"; play steps theta by 5 deg per tick (STEP_INTERVAL_MS), from 0 three ticks gives 15 deg and the status switches to "izračunano" at 15 deg; paused keeps 15. Time at 15 deg reads "izračunano = ≈ 0,131" (a doubled "= ≈"; the same at 45 deg and with `≈` rows generally). The live line (data-readout-live) lags: it kept the previous theta right after an action (settled readout), the readout list and status are current.
- Reset: theta back to 0, playback stopped, omega, N, arrows, mode and b kept.

### Probe summary (reveals)
- A "predict where the point is" step is answered at once by the board caption, status line and the Točka row; the point itself is drawn. Ask it from a state where the learner has not yet seen the target angle, or hide nothing: there is no way to hide the point or the caption.
- Velocity direction: hidden only with velocity off (set-motion velocity false hides the arrow, the three velocity rows and the caption); default is ON, so a "predict the direction of motion" opening must send `velocity: false` first; with it on, speed 2 and angle 90° are readable. Acceleration likewise off by default.
- Product: hidden in motion mode (second point, product point, rows, status sentence); set-mode product reveals everything at once with default b 45, so a "predict where the product lands" step stays in motion mode and the action that follows is `set-mode product, b`.
- Series limit: the N5 default already shows a near partial sum, and the distance row shows convergence; for a "predict" step use N 1 (out of view) and step N up; the row always names the degree, never "equals". The limit −1 is visible from N 13 (dist 0,000103), 21, 30.

### Doubts
- "izračunano = ≈ 0,131" doubled sign belongs to the existing time formatter (formatArgument), not changed here (kernels and drawing out of scope).
- The live readout line (LiveReadout) shows the previous state until settled; a lesson that quotes it should quote the status or the rows.
- The brief's product decimals (0,2588190) print as 0,258819 (six decimals shown).
- The existing `EulerCircleGraph.act` (old `euler-circle` payload) stays beside the new lesson actions, as with ComplexPowerGraph.
- Not verified: browser/visual screenshot, 310 px panel check (no control or layout changed).

## Slice 2a: M6 lesson

### Written
- `src/learning/content/complexPowerGuidedLessons.ts`: `complexPowerLesson` (7 steps, sl + en, `demonstrationId: 'complex-power'`), `powerSceneActions(id, {A?, B?, n?})` (prepared-scene, then `set-z` if A and B, then `set-n`), scene constants `M6_SECOND`, `M6_THIRD`, `M6_CIRCLE`, `M6_INSIDE`, `M6_WRAP`, `M6_TRIPLE`, `M6_DEFAULT`, `M6_EXPLORE`. Formula blocks `de-moivre` (theorem with induction proof) and `triple-angle`.
- Probe 2 (z = 1+i n=4; z = 0,8+0,6i n=2; sl and en) appended to `.command-logs/cm-d/p-probe2.txt`; probe test deleted.
- Chapter, registry, registration, notation test untouched (slice 3).

### Steps (opening, prediction, learner change)
1. Third power: z=1+i, n=2 (M6_SECOND). Predict modulus/argument/point of z^3 from z, z^2. Learner: n=3 (field Eksponent n / Exponent n, or stepper Povečaj število / Increase count).
2. Rule for powers: theorem with induction proof in the explanation; z=1+i, n=3 (M6_THIRD). Predict z^4. Learner: n=4.
3. z=0,8+0,6i, n=1 (M6_CIRCLE). Predict |z^k| and arg z^3. Learner: n=3, then n=8.
4. z=0,5+0,5i, n=1 (M6_INSIDE). (a) predict z^8; learner n=8. (b) predict z^8 for 1,5+0,5i; learner types Re 1,5 (Im stays 0,5), n stays 8.
5. z=1+i, n=4 (M6_WRAP). Predict 5·arg z and principal arg of z^5. Learner: n=5.
6. z=0,8+0,6i, n=2 (M6_TRIPLE). Predict cos3φ, sin3φ from the formulas. Learner: n=3.
7. Default z=1+i, n=5 (M6_EXPLORE = M6_DEFAULT = {}), free exploration.

### Numbers per step with source
| Step | Quoted | Source |
| --- | --- | --- |
| 1 | |z|=√2, 45° | p-probe n=1 (√2 ≈ 1,414214, 45°) |
| 1 | n=2: 2i, modulus 2, 90° | p-probe n=2 |
| 1 | n=3: −2+2i, 2√2 ≈ 2,828427, 135° | p-probe n=3 |
| 1 | ×√2 per step, +45° | arithmetic (√2·√2=2, 2·√2=2√2) |
| 2 | n=4: −4, modulus 4, 180°, z^4 arrow modulus 4, status sentence | p-probe2 (status "Zunaj pogleda, narisano kot puščice: z⁴ z modulom 4") |
| 3 | 0,8²+0,6²; n=3: −44/125 ≈ −0,352, 117/125 ≈ 0,936, modulus 1, 110,6097° | p-probe n=3 |
| 3 | n=8: modulus 1, 294,9592° | p-probe n=8 |
| 4 | |z|=√0,5≈0,7071 | arithmetic |
| 4 | n=8 z=0,5+0,5i: 1/16 = 0,0625, 360°, principal 0°; z^4 = −0,25 | p-probe n=8 and n=4 |
| 4 | z=1,5+0,5i: |z|²=2,5, 2,5^4=625/16=39,0625, ≈ −32,94+21i, 147,4796°; arrows from z³ | arithmetic, p-probe (n=8 status and caption) |
| 5 | n=4: 180°, principal 180°; n=5: 225°, −135°, −4−4i, 4√2 ≈ 5,656854 | p-probe2, p-probe n=5 |
| 6 | cosφ=0,8, sinφ=0,6; 4·0,512−2,4=−0,352; 1,8−0,864=0,936 | arithmetic (0,8³=0,512, 0,6³=0,216); z^3 rows from p-probe n=3 |
| 6 | n=2: z² ≈ 0,28+0,96i | p-probe2 |
| 7 | 0,6+0,8i modulus 1; (1+i)²=2i, ^4=−4, ^8=16; i powers | arithmetic; A=0,B=20 is i |

### Deviations from the brief
- Step 2 raises n only to 4 (not 5): the principal argument of z^5 (−135°) is shown by the rows at n=5, so z^5 is reserved for step 5 where it is the prediction. z^5 = −4−4i and 4√2 appear in step 5.
- The theorem and its proof are stated in step 2, after step 1's prediction (step 1 asks the learner to find the pattern from z and z^2); the formula block `de-moivre` carries the same proof.
- Step 3 opens at z=0,8+0,6i, n=1, which already shows |z|=1 (row |z¹|); the prediction therefore targets the argument and the "on the circle" verdict for z^3, z^8 using |z|^n.
- Step 7 exploration prompt includes z=i (A=0,B=20) from arithmetic only; its rows were not probed.

### Test design (for the tests worker)
- Scene mechanics: every scene is `prepared-scene` then optional `set-z` then `set-n`; set-z equal to the default is accepted (the probe applied z=1+i). Readouts: `data-readout` ids `z, n, re, im, modulus, angle, principal, real, unit, one`; status in `[data-complex-power-status]`; counter `[data-step-counter]`.
- Openings and post-change states (sl labels in p-probe/p-probe2):
  - M6_SECOND n=2: re 0, im 2, modulus 2, angle 90°, status "z² = 2i"; after n=3: −2 / 2, 2√2 ≈ 2,828427, 135°.
  - M6_THIRD n=3 → n=4: re −4, im 0, modulus 4, angle 180°, principal 180°, status lists z⁴ with modulus 4.
  - M6_CIRCLE n=1 (re 4/5, im 3/5, modulus 1, unit "da") → n=3 (−44/125, 117/125, 110,6097°) → n=8 (164833/390625, −354144/390625, 294,9592°, principal −65,0408°, unit "da").
  - M6_INSIDE n=1 → n=8: re 1/16, im 0, modulus 1/16, angle 360°, principal 0°, real "da"; then Re 1,5: re −527/16, im 21, modulus 625/16 ≈ 39,0625, angle 147,4796°, status lists z³..z⁸.
  - M6_WRAP n=4 → n=5: angle 180°→225°, principal 180°→−135°, re/im −4/−4, modulus 4√2 ≈ 5,656854.
  - M6_TRIPLE n=2 (re 7/25, im 24/25, modulus 1, 73,7398°) → n=3 (−44/125, 117/125).
  - Default: n=5, z=1+i, counter "Korak 5 od 8".
- Learner actions: field `Eksponent n` typed value or Povečaj število button (step 1, 2); Re field typed 1,5 in step 4 (names "z, Re", "z, Im" as in ComplexPowerLessonActions.host.test.tsx).
- Quote list: all rows of the table above; the ones not read from a probe are arithmetic only.

### Checks
tsc clean (`s2a-tsc.log`), backslash checks 0 singles/0 flagged (`s2a-backslash.txt`), unit green (`s2a-unit.log`), lint see `s2a-lint.log`.

### Still to do (slice 3)
Chapter/registry/registration, preview copy, the notation test list, a lesson test over the scenes, smoke specs.

### Doubts
- sl "Povečaj število" and the field name "Eksponent n" come from the probe's button list and panel labels; the sl text uses "polje Re" for the real-part field whose accessible name is "z, Re".
- Not verified: the lesson text through `lessonMathNotation.test.ts` (not yet registered), a browser view of the board.

### Slice 2a-d
- New `src/learning/content/complexPowerGuidedLessons.test.ts` (part A scenes, sl and en, out of order and twice; restore; prompt labels; learner actions by field and stepper; step 7 claims; part B quotes by repeated BigInt multiplication, hedging, decimals, triple angle).
- Green: `s2d-unit.log` (255 tests with src/graphs/complex), tsc clean, lint clean. Red: one sl number changed (2,828427 to 2,828428), fails "missing 2,828427", restored (`s2d-red.log`).
- No false claim found. Not checked: lessonMathNotation (unregistered), a browser view.

### Slice 2a-f

M6 review findings applied in `complexPowerGuidedLessons.ts` and its test. B1: step 6 now uses z = 0,6 + 0,8i (M6_TRIPLE A = 12, B = 16, n = 2); host probe (`p-probe2.txt`) showed z^2 = -7/25 + 24/25 i at n = 2 and z^3 = -117/125 + 44/125 i at n = 3; no earlier step shows that z^3. N2 real z is a ray; N3 rounded angles use `\approx`; N4 step 3 prompt asks for positions and arguments, predict before the unit-circle row; N5 wrapping remark moved to the expected observation; N6 step 7 natural n, graph shows up to 8; N7 fields named "Re in the row z under the heading Number z". Purposes are not rendered in the lesson runtime (only chapter purposes), so left unchanged. Checks: tsc clean, backslash 0 in the lesson file, unit green, lint clean.

## Slice 2b: M7 lesson

### Written
- `src/learning/content/complexEulerGuidedLessons.ts`: `complexEulerLesson` (`complex-euler`, 7 steps, sl + en), `eulerSceneActions(id, spec)` (prepared-scene, then one `set-motion` with the named fields, `set-angle`, `set-series`, `set-mode`; each only when named), `EulerSceneSpec`, constants `M7_PATH`, `M7_PERIOD`, `M7_VELOCITY`, `M7_ACCELERATION`, `M7_PRODUCT`, `M7_SERIES`, `M7_DEFAULT`, `M7_EXPLORE`. Formula blocks: `euler-definition` (step 1), `euler-velocity` (step 4), `euler-series` (step 6). Status stated in the text: definition (1), arguments (velocity, acceleration; 3-4), proof (product rule, 5), cited theorem (series, 6), partial sums an illustration; real theta only.
- Probe `.command-logs/cm-d/e-probe2.txt` (sl + en, probe test deleted). Steps 1-5 open at N = 1 (not in the brief): at N = 5 the step 1 state at 180 degrees shows S_5 = 0,1239 + 0,524i, a step 6 answer.

### Numbers per step (source)
- Scenes (open -> learner): 1 theta 0, v off, N 1 -> 90, 180, 270; 2 theta 90, omega 1, v off, N 1 -> omega 2, 4; 3 theta 30, omega 2, v off, N 1 -> velocity on; 4 theta 90, omega 2, v on, N 1 -> acceleration on; 5 theta 30, v off, N 1, motion -> product (b 45), then theta 90 + b 90; 6 theta 180, v off, N 1 -> N 3, 5, 9, 13, 21; 7 default.
- 1: (0;1), (-1;0), (0;-1) "natančno" (probe2 s1; probe 1b).
- 2: omega 1 theta 90: t = π/2 ≈ 1,571, period 2π ≈ 6,283; omega 2: π/4 ≈ 0,785, π ≈ 3,142; omega 4: π/8 ≈ 0,393, π/2 ≈ 1,571 (probe2 s2, sl and en).
- 3: iω·e^(iθ) = −1 + 1,7320508i, speed 2, angle 90° (probe2 s3 vel on); exact form −1 + √3 i by arithmetic.
- 4: acceleration row −4i (probe2 s4); length ω² = 4 and scale caption "narisano v merilu 0,225" (probe 1b, at omega 2); velocity −2 (probe2 s4 open).
- 5: θ + φ = 75°, product (0,258819; 0,9659258) computed (probe2 s5; cos 75°, sin 75° by arithmetic); θ 90 b 90: 180°, (−1; 0) "natančno" (probe2 s5).
- 6: S1 1 + 3,1416i dist 3,72; S3 −3,9348 − 2,0261i 3,57 (both out of view); S5 0,1239 + 0,524i 1,24; S9 −0,976 + 0,0069i 0,025; S13 −0,9999, 0,000103; S21 −1, 7,64·10⁻¹¹ (probe2 s6; probe 1b). S1 = 1 + iπ by arithmetic.
- 7: θ = 45 point (√2/2; √2/2) exact (probe 1b); θ 30 + b 330 product (1; 0) (probe 1b); period at omega 3 = 2π/3 ≈ 2,094 (arithmetic, not probed); Play 5° per step and Reset to 0° (probe 1b).

### Deviations
- N = 1 in steps 1-5 (above). Step 5's i·i = −1 repeats what step 1 showed at 180° ((−1; 0)); it is a new reading (the product rule), not a new value.
- Step 3 and 4 explanations avoid the answer, so the argument (z′ = iωz) sits in step 3's expected observations and the block `euler-velocity` is attached to step 4; the product-rule proof sits in step 5's expected observations (no block).
- Labels in prompts carry `\(...\)` around symbols ("Kot \(\theta\) (stopinje)"); the English row names follow the probe ("Time t = θ/ω", "Period of revolution", "Angles add").

### Test design
- Mechanics: the scene helper builds prepared-scene then set-motion, set-angle, set-series, set-mode; apply on a real graph, then compare state and readouts to the numbers above. Readouts: `[data-readout]` (dt/dd text), `[data-euler-status]`. Controls: angle field "Kot θ (stopinje)", "Kotna hitrost ω", "Stopnja vrste N", mode checkbox "Zmnoži dve točki", slider "Drugi kot φ (stopinje)", toggles "Prikaži hitrost"/"Prikaži pospešek".
- Openings (state, readout): step 1 θ 0, status "θ = 0°: e^(iθ) = (1; 0)"; velocity rows absent; step 2 time "π/2 ≈ 1,571", period "2π ≈ 6,283"; step 3 velocity rows absent; step 4 velocity "−2", no acceleration row; step 5 no product rows; step 6 S1 "1 + 3,1416i", row "Ali je delna vsota stopnje 1 v pogledu? = ne".
- Learner actions and post states: see the numbers above; also step 5 b 90 with θ 90 (b on the 5° grid), step 7 period at omega 3.
- Quote list: every number in "Numbers per step"; exact values stay exact, rounded ones carry \approx.

### Still to do
Test file, chapter, registry, preview copy, smoke; en review of row names against the final graph.

### Doubts
- S diamond on the board in steps 1-5 (N = 1) is unexplained until step 6 (one sentence in step 1 tells to ignore it).
- Period at omega 3 and the time/period rows at omega 3 quoted from arithmetic, not probed.
- The "= ≈" doubled sign noted in 1b was not seen in the rows probed here (π/2 ≈ 1,571 formats).
- Not run: browser, 310 px check, `lessonMathNotation.test.ts` (file not registered yet).

### Slice 2b-d
- `src/learning/content/complexEulerGuidedLessons.test.ts` (46 tests, both languages). Part A (to line ~361): scene sweep out of order and twice in one act, restore, openings not the asked state, learner actions through real controls, prompt labels. Part B (after it): quoted numbers per step (Q/hedge/English decimals), points, time/period, velocity/acceleration by finite differences, product by complex multiplication, partial sums by the term recurrence.
- Green: `s2bd-unit.log`, tsc clean (`s2bd-tsc.log`), lint clean (`s2bd-lint.log`). Red: S_5 real part 0,1239 changed to 0,1329 in the sl text fails the m7-series quote test (`s2bd-red.log`), restored.
- No false claim found. Observation: the step 2 opening (omega 1) reads time "pi/2 = 1,571", the same number as the omega 4 period answer; the test compares per row (time with time, period with period), so it does not count this as a leak.
- Not verified: browser, 310 px, `lessonMathNotation.test.ts`.
