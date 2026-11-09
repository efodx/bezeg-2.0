# Wave 2 smoke, group pa-a (patches: tensor, decasteljau, derivatives, coons)

Preview http://localhost:4327/bezeg-2.0/ (handler-owned; revision not verified by this worker). Playwright Chromium 1280x800; 390x844 touch for tensor and coons. Scripts and screenshots: `.command-logs/w2-smoke-pa-a/` (main/second/third/e/d4 .cjs and .log). Board change judged by an MD5 of the board screenshot. No console or page errors on any route (desktop or mobile).

| Route | 1 load | 2 controls | 3 refusal | 4 keyboard | 5 SL-EN-SL |
|---|---|---|---|---|---|
| tensor | pass | pass | pass | pass | pass |
| decasteljau | pass | pass | pass | pass | pass |
| derivatives | pass | pass | pass | pass | pass |
| coons | pass | pass | pass | pass | pass |
| 390x844 tensor | pass | | | | |
| 390x844 coons | pass | | | | |

Evidence
- Point choice by i, j selects with "Brez izbire"; P12 x typed `2,5` + Enter committed (board changed, focus stayed in the field, no Apply button); y committed on blur; `abc` refused with "Te vrednosti ni mogoče uporabiti." (aria-invalid, hint once, focus kept); "none" hides the coordinate fields. Same on all four routes (Coons: edge select + point select).
- Tensor: degree + changed board and start-patch select went to "Lastna krpa" (custom appears only after the edit); + disabled at 4, - disabled at 1; picking the first start patch changed the board. Keyboard Enter on + works on decasteljau.
- View tab (tensor, decasteljau, derivatives, coons): Zgoraj / S strani / Izometrično / Spredaj each changed the board; Reset view restored azimuth -52, elevation 28.76.
- Decasteljau: construction-order select (rows/columns/bilinear) changes board, ArrowUp works, relabels in EN; u=7 refused "Vnesi vrednost med 0 in 1."
- Derivatives: corner select shows "Ni v oglišču" off a corner and the corner value when on one; picking a corner sets u,v. On the collapsed-edge patch, corners (0,0) and (0,1) show the visible status once and the live region announced it once; (1,0), (1,1) clear it.
- Coons: mismatch status ("Vogal (u, v) = (0, 0): krajišči sta narazen za 3 ...") is visible and also appears in the polite region after an edit.
- Mobile: Edit tab usable, no horizontal overflow, tensor steppers 44x44, selects and fields 44 px high, tap + changed degree and board, coordinate commit works.
- Focus outline 3px solid on every tabbed control.

Observations (not failures)
- Tensor degree "typed middle field" is an `<output>` (read-only), not an input; typed 1-4 entry was not available to test.
- Derivatives corner select drops the "Ni v oglišču" option while a corner is selected (4 options, not 5).
- Coons "Povezani vogali" checkbox input is 32x18 on mobile; its label row is 336x44.
- Coons and Derivatives panels still import `LiveReadout` without using it (unused import, harmless).

Gaps: Slovenian screenshots not reviewed visually beyond a few; no drag on board; revision not confirmed.
