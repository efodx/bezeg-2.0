# Wave 2 smoke, group p (commit a474efb2 build, Chromium 1280x800; mobile 390x844 touch)

Screenshots: .command-logs/w2-smoke-p/ (cr-refuse, pascal, pp-ideal, pp-zero, tv-off, delaunay, dl-focus, m-five-point, m-three-views).
No console errors on any route.

- cross-ratio: example select (Primer) switches to harmonic four; B/C point buttons aria-pressed toggle (only one true); typing 9999 + Enter refused, shows once "Vnesi vrednost med -30 in 30.", field stays 9999 with aria-invalid=true; keyboard Enter on button works.
- five-point: extrapolation switch toggles; D y arrow-up 1,8 -> 1,866667 (+1/15); endpoint/third-point selects change, Primer becomes "Lastna postavitev"; mobile: switch row 336x44 (input 18x18 inside).
- pascal: readout is "Polozaj N od 256" (brief said 24); A next/next/prev gives 2,3,2; conic and order selects work; order select has no aria-label, name "Vrstni red oglisc" via label (ariaSnapshot combobox, options with selected). "Lastni vrstni red" NOT reached (stepping B kept "Prekrizan").
- pole-polar: P y arrow-up 4,2 -> 4,4; ideal select gives direction (1,0); (0,0) refused, message once "Smer (0, 0) ni veljavna ...", fields kept 1,0.
- three-views: default point-off; angle text field readonly, range aria-disabled=true (not disabled attribute), reason "Kot je na voljo, ko je tocka P na kroznici vkljucena." once; c 0,26 -> 0,3 with notice "Zaokrozeno na 0,3."; switch on shows P and image; mobile row 336x44. Keyboard Space toggles.
- delaunay: example select to 7 points; triangle rows aria-pressed (P1,P3,P4 true, P1,P2,P3 false); keyboard Enter works.
- Language SL->EN->SL: pascal keeps scene (selects relabelled), three-views relabelled, delaunay example relabelled.
Gaps: focus ring visibility only via dl-focus screenshot, not opened; delaunay triangle pressed state across language switch not verified; per-route Tab-only operation not exhaustively tested.
