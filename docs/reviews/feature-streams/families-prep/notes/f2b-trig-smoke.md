# F2b trig routes browser smoke (partial, budget handoff)

Status: PARTIAL. Budget signal reached before the corrected rerun. Only the first pass ran.

## Setup
- Checkout: stream-families-prep worktree, HEAD 1e3344c7, dirty (uncommitted F2b work).
- Preview: `just preview 4321`, production build, provenance matched this checkout (dirty at build time). Started by this run and stopped (PID 25532 killed; nothing listening on 4321 afterwards).
- Browser: Playwright Chromium 1248 headless, viewports 1280x800 desktop and 390x844 mobile.
- Scripts and captures: `.command-logs/f2b-smoke/` (run.cjs, per-run `*.json`, `*.png`, `*-export.txt`).
- Frame time: not measured. The smoke-tester skill has no drag-timing helper.

## First-pass results (run.cjs before the final patch)

| Item | unit SL desk | unit EN desk | unit SL 390 | tri SL desk | tri EN desk | tri SL 390 |
|---|---|---|---|---|---|---|
| 1 catalog card, family, link | FAIL (script: checked link text, which is empty; card text in `li` verified manually: family, title, prompt present) | same | same | FAIL script, same cause; SL family "Ravninska geometrija" not found in body text | PASS family "Plane geometry"; card check same script cause | not run |
| 1 link opens, no console error | PASS (no console errors recorded) | PASS | PASS | PASS | PASS | not run |
| 2 drag point | PASS | PASS | PASS | n/a | n/a | n/a |
| 2 type 45 | PASS | PASS | PASS | n/a | n/a | n/a |
| 2 type 400 refused | PASS (script saw invalid/message; not inspected) | PASS | PASS | n/a | n/a | n/a |
| 2 cosine on/off | PASS | PASS | PASS | n/a | n/a | n/a |
| 2 Reset | FAIL: no button named "Reset" (only "Reset preset" in Save tab). Rerun patched to Reset preset, unverified | same | same | n/a | n/a | n/a |
| 3 drag vertex | n/a | n/a | n/a | PASS | PASS | not run |
| 3 modes sides/circle/solve | n/a | n/a | n/a | FAIL: script error, mode is a `select` ("Način"; EN "Mode"), not buttons. Patched, unverified | same | not run |
| 3 side 13 refused | n/a | n/a | n/a | FAIL: script locator timed out. Patched, unverified | same | not run |
| 3 SSA solve view | n/a | n/a | n/a | screenshot taken, not inspected | screenshot taken, not inspected | not run |
| 4 save, change, reopen (state and view) | PASS | PASS | PASS | PASS | PASS | PASS |
| 4 export file | PASS (454 bytes, contains preset name) | n/a | PASS | PASS (582 bytes) | PASS | n/a |
| 4 import | FAIL: script used a hidden file input that is not in the DOM until the button is clicked. Patched to file chooser, unverified | same | same | same | same | n/a |
| 5 Tab order | Captured from the Save-tab import button, not from the Edit controls, so numeric inputs were not reached. Incomplete | same | same | same | same | n/a |
| Mobile 390: no horizontal overflow, board in viewport | n/a | n/a | PASS | n/a | n/a | PASS |

## Observations to verify
- SL catalog page did not contain the text "Ravninska geometrija" in the body during the first pass, though the EN page shows "Plane geometry". Check the `plane_geometry` Slovenian string and the catalog heading. This may be a real label mismatch with the brief.
- The unit-circle Reset control is the Save-tab "Reset preset" button. The brief's "Reset" may refer to that action; the handler should confirm.
- Catalog poster and clip are empty by design; not checked.

## Not covered
- Corrected rerun of the failing steps (catalog family check, Reset, triangle modes, side refusal, import, keyboard from the Edit tab).
- Visual review of the SSA two-solution screenshots and the unit-circle legend.
- Triangle mobile run in full, and EN mobile.
- Frame-time measurement.

## Cleanup
- Preview stopped. Temporary presets were created in each fresh browser context, so no shared browser state changed.

## Recheck (bezeg-smoke, repair recheck, partial: budget handoff)

Status: PARTIAL. Stopped at the budget signal after items 1 to 6 were run for the desktop and mobile cases listed below. Scripts: `.command-logs/f2b-smoke/recheck.cjs` (new, replaces the unverified run.cjs patches), outputs `rc-*.out` / `rc-*.json`. Preview on 4321 started by this run and stopped at the end.

| Item | Route / lang / viewport | Result | Evidence |
|---|---|---|---|
| 1 Reset | unit, SL, desk | PASS | angle 137 then Reset gives 60 (default) |
| 1 Reset | unit, EN, desk | PASS | button text "Reset", returns to default |
| 1 Reset | tri, SL, desk | PASS | vertex x 137 then Reset gives 0 |
| 1 Reset | tri, EN, desk | PASS | same |
| 2 Mode select | tri, SL, desk | PASS | options by index: sides 8 inputs, circle 8, solve 6 |
| 2 SSA two solutions | tri, SL, desk | PASS (readability partial) | default a=5, b=8, A=30 is the two-triangle case; `rc-tri-sl-desk-ssa.png` shows both triangles (B1, B2, C), h, circumcircle, labels readable. Board bottom edge is cut off by the 800px capture, so "inside the board" is not confirmed |
| 2 Side 13 refused | tri, SL, desk | PASS | new text "Vnesi vrednost med 0,25 in 12.", aria-invalid true, value kept |
| 3 Import | unit, SL, desk | PASS | export 446 bytes; import via the Save tab dialog (input inside the dialog, then "Zamenjaj zbirke in uvozi"); state 20 became 137 after loading the preset |
| 3 Import | tri, SL, desk | PASS, check weakened | 137 was refused by range, so the file held a=5. Changed to 2, imported, loaded: 5. Restore is shown, the 137 expectation was wrong |
| 4 Tab from first edit control | unit, SL, desk | PASS | angle, angle (pi), then checkboxes; focus ring present on each |
| 4 Tab from first edit control | tri, SL, desk | PASS for DOM order; visual order partly checked | DOM order A.x, A.y, B.x, B.y, C.x, C.y; rings present. Default-mode y positions 672, 753, 835, 916, 997, 1079 are monotone. One earlier run reported C.x above A.x, most likely a scroll artifact; not resolved |
| 5 EN 390x844 overflow and reach | unit, EN, mob | PASS | scrollWidth 390 = clientWidth; board at load y 253 to 549, x 13 to 377; 3 controls reachable |
| 5 EN 390x844 overflow and reach | tri, EN, mob | PASS | same geometry; 8 controls reachable. Board moves off-screen after clicking Edit, which is expected because the controls sit below it |
| 6 Legend | unit, SL, desk (cosine and symmetries on) | FAIL (defect candidate) | legend has 3 entries: Križec (orange cross), Plus (blue-grey plus), Romb (purple diamond). Colours match the objects. The purple diamond draws at (-0.5, -0.87). The cross at (0.5, -0.87) and plus at (-0.5, 0.87) are not visible in a 3x zoom, and the circle has gaps there. Board objects exist and are flagged visible. Handler to check the marker rendering |
| 6 Legend coverage | unit, SL, desk | GAP | no legend entry for the cosine trace (blue dashed curve and square point) |

Failures and notes:
- Item 1: the button's visible text is "Ponastavi" (SL) and "Reset" (EN). Its accessible name (aria-label) is the tooltip "Ponastavi prednastavitev" in SL. The EN name was not read. This is the Save-tab reset in `PresetSelector`/`ResetButton`, and it is the only reset control found.
- Item 6: see the table. Console errors and warnings: none in any run.

Coverage gaps:
- EN desktop not run for modes, SSA, import, or Tab order. Unit EN mobile not run for reset or import.
- Triangle SSA board frame bottom edge not verified in the screenshot.
- Triangle Tab visual order: the default-mode panel crop (`rc-tri-sl-desk-edit.png`) was saved but not viewed.
- Frame time not measured; no drag timing helper.
