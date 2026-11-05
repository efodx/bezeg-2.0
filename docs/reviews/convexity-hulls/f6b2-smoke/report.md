# f6b2 smoke report (handler 51), 2026-11-05
Target http://127.0.0.1:3012/bezeg-2.0/ (production preview, stream-geometry HEAD, dirty tree). Chromium via Playwright. Scripts: t23.cjs, f6.cjs, f6b.cjs, f6c.cjs (logs: f6-results.txt, f6b.log).

Task 23 (1440x900, 390x844, SL+EN): PASS order, no raw \(, no h-scroll, no console errors, "Return to chapter" returns focus to the launching link in both new sections (16/16). Math: the in-script check looked for .katex and failed; a probe found mjx-container (MathJax) rendering 22 and 38 nodes in the two sections, so it passes.
Not tested: the lesson "Exit" button (it stays on the demo route and focus lands on "Continue example"); only "Return to chapter" was tested.
F6: PASS deep link, reload, catalog poster SL+EN (720px png), playback stopped, live SL->EN (prose, labels), hull-robustness step5 inexact / step6 exact / Back->5 inexact, SL label "Nenatancno (double)", keyboard (q via arrows with the board focused; q x field; Kettner i/j fields and board arrows), preset save/reload/restore, SVG+PNG export, 1366x768 board inside viewport, regression convex-hull/polygon-area, no console errors.
FAIL scene restore: Exit does not restore the pre-lesson state. point-in-polygon 1366 EN: q (3,1) becomes (1,3) after 3 frames and Exit. hull-robustness: pop rule "<= 0 drop" becomes "< 0 keep" and points 1,2 change, even with 0 frames advanced. Possibly by design (Continue example); handler decides.
NOTE: arrow keys on the "Select point q" button do nothing; they work only with the board (#jgbox) focused.
NOTE visual (pip 1366): crossing numbers "2 1" stack close to the P4 label at the notch.
Cleanup: temp presets lived only in isolated contexts; browsers closed.
