# CP5 browser smoke (inspect view), revision 9c0bbd19 dirty, build/ preview on 4320
Script cp5-browser/run.cjs, log cp5-browser/log.txt, screenshots in cp5-browser/. Desktop 1440x900 sl+en, mobile 390x844 touch sl+en.
1. PASS. Next advances sweep and active list (n=20: sweep x 231, 2 active at step 18); Prev goes back; Prev disabled at start, Next disabled at end (n=40, 121 events). Mid-sweep shots: {desk,mob}-sl-n20-mid.png, n40-mid.png.
2. PASS. n=40 mid-sweep: 41 svg texts + 2 active items, 0 overlapping boxes at both widths (measured).
3. PASS. n=40 after full sweep: 3 solid (no dasharray), 18 dashed ("6 4"); legend has both.
4. PASS. Tab reaches range, Next, Play, New (Prev skipped only while disabled). Range input: Right/Up +1, Left -1. Number field: Up/Down +-1, Left/Right do nothing (text caret, expected). Enter and Space both activate Next and Prev.
5. PASS. Live region empty and unchanged over 1.5 s idle; one DOM mutation per click (3 clicks, 3 mutations).
6. PASS. Play: aria-pressed true, label switches, frames differ, Next disabled. Pause: aria-pressed false, frames identical. Mobile play frames also differ.
7. PASS. Mobile: buttons 44 px high, range 44, number field 88x40 (below 44, a note), scrollWidth = clientWidth = 390.
8. PASS. Labels 12.67:1, body text 11.28:1, legend/caption 5.76:1 (lowest).
9. PASS. No console or page errors in any of the 4 contexts.
Not covered: contrast of unhighlighted interval outlines (non-text), mobile keyboard, n=5.
