# Wave 2 smoke, group kd (B-spline family)
Preview http://localhost:4327/bezeg-2.0/ (commit 5e2bfc47 per brief), Chromium 1280x800, mobile 390x844 touch. Scripts and screenshots: `.command-logs/w2-smoke-kd/`.
No failures observed. Console errors: 0 on all six routes.
- basis: degree CountSetter 44x47, + changes board and knot count (7 to 8); knot u3 typed refusal "Vnesi vrednost med -100 in 100." once under field; Tab+Space/Enter operate stepper, 3px focus; EN labels "Decrease/Increase count".
- blossom: - AD at min; + AD at 3 with reason "Najvec 3." once; no Ponastavi button; p1 y typed 3 changes board; keyboard works.
- insertion: typed insert value refusal once; Vstavi vozel adds knot; "Ponastavi primer" restores p1 y=2 (keyboard); typed point edits board.
- nurbs: weight refusal under field once ("utez 3 mora biti pozitivna"; abc gives "Te vrednosti ni mogoce uporabiti."); p1 x and weight edit change board.
- deboor: two steppers; deg+ to 3 AD with "Najvec 3." and points stepper AD "Najmanj 4."; live region polite, empty while playing, "Prikazane ravni: 2 od 2." after.
- extraction: typed point edits board, refusal once, "Ponastavi primer" works.
- Language SL-EN-SL keeps values on all; pixel hash of blossom board differed after round trip but screenshots look identical (anti-aliasing).
