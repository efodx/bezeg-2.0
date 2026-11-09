# Wave 2 smoke, patches group pa-b

Preview `http://localhost:4327/bezeg-2.0/` (production build, revision not verified by this worker; the worktree HEAD was 3c4be65e with a dirty tree). Playwright Chromium, 1280x800; 390x844 with touch on joins and triangular. Scripts and screenshots: `.command-logs/w2-smoke-pa-b/` (sub*.mjs, j*.mjs, t*.mjs, m1.mjs). Language was set through `#bezeg-language`. No servers started.

## Results

| Route | 1 load, no console errors | 2 controls change board/readout | 3 refusal/unavailable text once | 4 keyboard | 5 SL-EN-SL |
|---|---|---|---|---|---|
| /patches/subdivision | passed (0 errors) | passed | passed | passed | passed |
| /patches/joins | passed | passed | passed | passed | passed |
| /patches/triangular | passed | passed | passed | passed | passed |

390x844 touch: joins passed, triangular passed (details below). No failures found.

## Observations

### subdivision
- Point chooser i/j selects with "Brez izbire"; picking 1,2 shows P12 with x/y/z fields; Enter on z=1 commits (readout S(u,v) changed, board hash changed), focus stays in the field. Blur commits (z=2). "Brez izbire" removes the coordinate fields.
- Refusal: z="abc" + Enter keeps the text, `aria-invalid=true`, hint "Te vrednosti ni mogoče uporabiti." (once). Screenshot sub-refusal.png.
- Degree: the middle value is a read-only `<output>` here (CountSetter without onSet), not a typed field; the brief expected typed. − steps 3 to 2, point select shrinks to 0..2, board changes.
- Starting patch select: picking another patch changes the board; after a coordinate edit the select shows "custom" ("Lastna krpa") as a fifth option.
- View: Spredaj 0/0, Zgoraj 0/88,2, S strani 90/3,4, Izometrično 45/31,5, Reset -52/28,6, each changes the board; azimuth typed 30 accepted.
- Pokaži dele krpe is on by default but point selection still works (not blocked).
- Elevate unavailable: after + on degree u (now 4, the maximum) "Dvigni stopnjo v u" has `aria-disabled=true` (not `disabled`), stays focusable (focus kept), `aria-describedby` points to a hidden span, `title` carries the reason. Visible: one `<p>` "Stopnja v smeri u je že 4, največja dovoljena, zato je ni mogoče več dvigniti." shown already before pressing. Pressing (Enter, and forced click): nothing changes (degree stays 4, text identical), focus stays on the button, nothing announced: the only `aria-live` region is the unrelated hint paragraph and `[role=status]` regions stayed empty. So the reason is exposed through aria-describedby and visible text but is not announced on press. Elevate in v still works (4). Screenshots sub-elevate-focus.png, sub-elevate-pressed.png.
- Keyboard: Tab/ArrowDown on the selects picks P11, Tab reaches P11 x, typing 1,25 + Enter commits, focus stays; visible focus (3px outline plus shadow).
- EN labels ("Index i (net row)", "Starting patch", "Elevate degree in u"), values kept (decimal point in EN), back in SL identical.

### joins
- Scene select ("Primeri stika"): G1 scene sets continuity g1 and alpha 2, sharp-edge scene sets c0, teapot swaps the select for a "Nazaj na dve krpi" button (design; control removed, not an error) and back works. After a patch A coordinate edit or start-patch change the select shows "custom" ("Lasten par krp").
- Patch A point P21 z=1,5 + Enter: board changes, focus kept, report still C1 (derived points follow). Bad value "x1": hint "Te vrednosti ni mogoče uporabiti.".
- Patch B derived point (0 izpeljana, column 1): no coordinate fields, one message "Točka Q01 je izpeljana iz krpe A in ji sledi, zato je ni mogoče premikati, ..." (joins-derived.png). Row 3 gives Q31 fields.
- Degree B u typed stepper: + 3 to 4 changes the board; typed 9 stays in the field with hint "Vnesi vrednost med 1 in 4."; typed 2 accepted; focus stays. Continuity to G1 changes the report ("G1, ne C1").
- View presets, azimuth/elevation and Reset view change the board as on subdivision.
- Keyboard: select + Tab to field, Enter commit; Tab from degree field to "+" and Space steps (degree 1 to 2). Focus ring visible (3px outline); the degree input shows outline without shadow.
- EN/SL: labels relabel ("Join examples", "Ratio α", ...), values keep, SL restored identical.

### triangular
- Select (i,j,k) incl. "Brez izbire"; P111 z=2 initially (no change, select stayed "Kubična"); z=2,75 changes board and the starting-patch select to "custom"; blur commit works; "none" removes fields.
- Degree typed stepper: + gives 4 (select to custom, 16 point options); typed 9 hint "Vnesi vrednost med 1 in 4."; − at 1 is `aria-disabled`, title "Najmanj 1.", pressing it announces "Najmanj 1." once in a `[role=status]` region.
- Starting patch Kvartična changes board and degree to 4. View presets and reset change the board.
- Keyboard and EN/SL as above, all passed.

### 390x844 touch (joins, triangular)
Edit tab reachable by tap; no horizontal overflow (scrollWidth 390). Stepper buttons 44x47 (joins patch B 44x44), typed field 88x44, selects 336x44, coordinate field 74x44. Tap + steps 3 to 4; point selected, z=1,5 + Enter keeps focus. Screenshots m-joins-edit.png, m-triangular-edit.png (only taken, not viewed in detail).

## Gaps
- Revision of the preview build not verified.
- Subdivision degree middle field is read-only (brief expected typed): flagged for the handler, probably by design.
- Board change detected by SVG innerHTML hash, not visually compared; only a few screenshots opened. Subdivision piece views (Pokaži dele) not exercised beyond the toggle. Teapot rendering not inspected. Dragging points on the board not tested. Elevate announcement judged from live-region contents, no screen reader.
- Mobile Prikaz tab and subdivision not tested at 390x844.
