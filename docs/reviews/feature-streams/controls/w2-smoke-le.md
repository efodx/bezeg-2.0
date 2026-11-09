# Wave 2 smoke, group le (learning playgrounds), preview 50ec35df

Chromium, 1280x800 plus Pixel 5 emulation at 390x844 with touch. Routes: /learn/sweep-algorithms (run), /learn/convexity-hulls (polygons), /learn/bezier-curves (draw, inspect). Scripts and screenshots: .command-logs/w2-smoke-le/.

- Collision (a): PASS on both chapters. Method select changes the canvas; overlay select (boxes, hulls, pieces) changes the canvas hash; bounce is a native checkbox in the switch look and toggles. While playing, Step is disabled and [data-readout-live] does not mutate on a method change; after Pause it announces once (1 mutation, polite status). Step once announces.
- Drawing (b): PASS. Starter curve: Undo/Redo aria-disabled, press Undo shows "Ni česa razveljaviti." After Clear: Clear "Platno je že prazno.", Close "Za zaprtje sta potrebni vsaj dve točki.", Delete point and anchor types "Najprej izberi točko."; each focusable, one notice paragraph. After 4 clicks Undo/Close/Delete/Kotna act; Close fills (0.14), Undo reopens; selected point: G1 sets aria-pressed.
- Look underneath (c): PASS. Four switches (control points, De Casteljau, joins, one curve through all points) each change overlay elements and restore on re-toggle. Previous at first: "To je prvi odsek."; Next at last (after 5 clicks): "To je zadnji odsek.", both aria-disabled.
- SL->EN->SL: PASS. Buttons relabel (Undo ... Next segment), EN reasons "This is the last segment." / "Select a point first.", scene kept (Next still disabled); SL restored.
- 390x844 touch on drawing: PASS. No horizontal scroll; all buttons 44 px high; tap on disabled Delete shows the reason; two canvas taps add 2 anchors, Undo removes one. No console errors on any route.
- Notes: collision playground autoplays when scrolled into view (aria-pressed true on arrival), so Play/Pause tests must scroll first (not judged a regression). Playwright cannot tap aria-disabled buttons without force.
