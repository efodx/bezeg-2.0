# Wave 3 smoke, group D (V1), commit 42d85cbb, Chromium, scripts in .command-logs/w3-smoke-d/

Reset example (reason "Prizor že kaže primer."), aria-disabled true on load, false after a real mouse drag, true again after press (example restored):
- /bspline/extraction, /bspline/insertion, /bspline/nurbs: passed.
- /compgeo/voronoi: passed (drag P1 via JXG coords). Button sits right after the Shrani/Uredi header, before the P1..P7 buttons; no select on this route.
- /compgeo/voronoi-degenerate: unavailable on load; drag not verified (P1 name matched a non-draggable object; screen-pixel drag at 454,702 did not enable it). Button appears after the example/mode/... selects.
- /linear-map: "Ponastavi na identiteto" aria-disabled with "Preslikava je že identiteta." at identity; available after typing 2 in matrix cell + Enter; unavailable again and cell back to 1 after press: passed.
- /complex-roots: degree - / + steppers (aria "Zmanjšaj/Povečaj število") and typed field; 3 -> 4 -> 2 -> typed 5 all update the field and the title "n = 4" readout; roots hidden by default so root geometry itself not inspected: partial.
- /compgeo/point-set-triangulation: edge ChoiceSelect has no aria-disabled at load; after "Počisti vse točke" it is aria-disabled, visible line "Ni robov za izbiro." with aria-describedby resolving; selectOption timed out (Playwright refuses aria-disabled select), value unchanged: passed (changes-ignored via keyboard/dispatch not exercised).
- /projective/pascal at 390x844 touch: all 12 stepper buttons 44x44 px: passed.
- Console errors: none (first script run).
