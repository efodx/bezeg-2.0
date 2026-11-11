# F2b random and kinematics smoke (final)

Build in build/ (HEAD 89ba5e4c, dirty); `just preview 4333`, stopped at end. Scripts and shots: `.command-logs/f2b-rk-smoke/` (`scripts/run2.cjs`, logs `*-1280.log`, `*-390.log`, `*-en.log`).

## Results (sl unless noted; no console or page errors on any run)
- Render + heading + inspector: PASS sim/kin at 1280 and 390; EN 1280 PASS (h1 "Simulation of random experiments", "Kinematics of a point on a curve").
- Simulation: 6 modes each change drawing PASS; seed by keyboard PASS; steps/status PASS (status is a debounced live region, updates about 1-2 s after a step); Play/Pause PASS; Ponovi same tally PASS; reduced motion PASS (speed control shows "Zmanjšano gibanje ..." reason, Play disabled at full run; after Ponovi, Play shows whole run at once).
- Playback "500 od 1000": NOT a defect. Playback runs stops 1,2,5,...,500,1000 every `stopMs` (450 ms) and ends at 1000 in about 4 s; the earlier script paused (Stop click) mid-run at 500 and compared that tally. Fixed in script.
- Kinematics: all 5 changed motions change drawing (index 0 equals default by construction); time slider keyboard PASS; play/pause PASS; velocity, acceleration, decomposition, travelled-part toggles all change drawing PASS.
- Reset (Ponastavi, in Shrani tab) PASS both; saved mode/seed/toggles equal defaults.
- Preset save/export/delete (confirm "Da")/import PASS on sim (1280, 390) and kin state (motion, toggle) restored. Import timeout earlier was a script problem: with an existing collection the dialog button is "Zamenjaj zbirke in uvozi", not "Uvozi"; tab was also wrong ("Uredi" is the tools tab).
- Demonstrations: kinematics card in Geometrija krivulj, simulation card in Verjetnost in statistika PASS.

## Notes and gaps
- 390: no horizontal overflow, controls in view. Kinematics caption (legend text at top of board) is legible but overlaps the y-axis line and tick labels (8, 6) - minor visual issue, `kin-390-start.png`.
- Drawing-equality after reset/import not evidenced: DOM fingerprint differs even on reset (unstable markup); state fields compared instead.
- Not run: EN beyond render, 390 EN, touch drag on the boards, pinch/zoom.
