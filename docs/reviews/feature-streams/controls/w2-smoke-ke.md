# Wave 2 smoke, group ke

Preview http://localhost:4327/bezeg-2.0/ (production build, commit 5e2bfc47 per brief; not independently verified). Chromium 1280x800; 390x844 touch on rational, interpolation/subdivision. Scripts and screenshots: `.command-logs/w2-smoke-ke/`. No console errors on any route.

Routes: rational/base, spline/c1spline, spline/g1spline, bezier/subdivision (and -2), curve-geometry/offset, ph/cubic, interpolation/subdivision, bezier/arc-length.

| Route | 1 load | 2 controls | 3 reason/refusal | 4 keyboard | 5 SL/EN |
|---|---|---|---|---|---|
| rational | pass | pass: weight +/-0.25 (2 to 2.25, 5x minus to 1), typed 0,1 gives w1=0.10 on board, coord select Samo osi changes board | pass: minus aria-disabled at 0.25, reason "Utež mora biti pozitivna."; typed 0 refused, reason once under field, weight kept | pass: Tab to + , Enter 1.00 to 1.25 | pass: Decrease/Increase weight, select kept |
| c1/g1 spline | pass | pass: c1 lists 6 free points (derived point absent), g1 lists 5; typing p1 x=2,5 moves board point | n/a | field focus outline present | pass |
| bezier/subdivision | pass | pass: after Subdiviziraj two curves, list "Krivulja N: točke" follows selection (Krivulja 2 p0 x=0), typing p3 x=6 moves point | see gaps | not exercised | pass |
| curve-geometry/offset | pass | pass | pass: Dodaj/Izbriši točko aria-disabled "Za ta način izberi krivuljo.", hint text shown; both enabled after selection | Dodaj točko focusable; Enter shows no extra refusal text | EN relabel ok |
| ph/cubic (lines switch) | pass | pass | pass: lines switch aria-disabled with "Najprej prikaži kontrolne točke odmikov.", Space keeps it off, reason once; enabled once offset control points on | focusable | pass |
| interpolation/subdivision | pass | pass | pass: limit switch disabled for four-point, reason once; live region empty while playing; Reset polygon during play returns to step 0 | switch focusable, Space keeps off | pass |
| bezier/arc-length | pass | pass | pass: position slider aria-disabled while playing, reason linked "Točko premika predvajanje..." | slider focusable | pass (EN reason) |

Mobile 390x844: rational steppers 44x47, field 88x44, tap + works; interpolation steppers 44x44.

## Gaps and notes
- bezier/subdivision and -2, rational/base have no "Način urejanja" group at all; the editing-mode buttons and selection hint exist only on offset (point-editing routes). Brief expected them on subdivision; cannot confirm that expectation.
- Arc-length Play: reason linked (arc-reduced-motion-reason) only under prefers-reduced-motion, and the button is natively disabled (not focusable), unlike aria-disabled pattern.
- Offset count stepper and 390x844 on offset not measured (script failed on locator); interpolation count field value not read on touch.
- Board change for offset/PH toggles not visually inspected beyond control state.
