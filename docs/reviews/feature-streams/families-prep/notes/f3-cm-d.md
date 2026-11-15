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
