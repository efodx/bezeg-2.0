# Task 4 closeout smoke: full browser checklist, Slovenian and English

Preview: production build of `72d7d578` at `http://localhost:4327/bezeg-2.0/` (handler-owned; not started or stopped). Working tree had unrelated uncommitted edits (step 6 playback slot); the preview is the built commit as stated in the brief, not independently verified.
Tool: Playwright Chromium, scripts and logs in `.command-logs/w3-closeout/` (`main.cjs`, `sl.log`, `en.log`, `en2.log`, `narrow-*.png`). Viewports: 1280x800 desktop; 390x844 touch emulation for row 8. Language switched with the app's SL/EN selector (not a URL). Elapsed about 70-80 s per full language run, plus debugging reruns. Not run: automated route suite (hosted CI).

## Failures first

| Row | Lang | Observed | Repro |
| --- | --- | --- | --- |
| c Readout `[data-readout-live]` count | SL, EN | Counter works ("Korak 1 od 5" -> "Korak 2 od 5"; "Step 1 of 5" -> "Step 2 of 5") but there are 3 `[data-readout-live]` elements (all `p role=status aria-live=polite`, class `visually-hidden`); only the first has text, the other two are empty. The brief expected exactly one. Judge whether 3 empty/non-empty regions are intended for Delaunay (step readout, edge readout, one more). | Open `/compgeo/delaunay`, `document.querySelectorAll('[data-readout-live]').length` is 3. |

No other row failed in the final runs. Earlier failures were script errors, not app bugs: a wrong drag target, and ambiguous English button names ("Next" vs "Next prompt", "Exit example" vs "Exit and restore graph"); each was fixed and the row rerun.

## Results (final runs)

| Check | SL | EN | Evidence (identical in both unless noted) |
| --- | --- | --- | --- |
| 1 Entry and graph families | passed | passed | Demonstrations link opens `/bezeg-2.0/demonstrations`; bezier/curve, rational/base, spline/c1spline, ph/cubic each show the translated H1, 2 boards (>150 px; PH extra aux boards counted), Edit tab visible, 0 console errors. |
| 2 Point and slider response | passed | passed | Mouse-dragged p1 (-3,2) by +60,+40 px to (-2.772,2.23). De Casteljau slider 0.5 -> 0.8: readout "t = 0,50" -> "t = 0,80" (EN "0.50" -> "0.80") and board markup changed. |
| 3 Family-specific controls | passed | passed | Rational: Increase weight changed the board. The weight text was not read (regex on SVG text matched nothing); evidence is board change only. PH: 3 boards (main plus hodograph aux); w0 x -3.5 -> -2.5 changed arc length 10.333 -> 7.467. |
| 4 Navigation and lifecycle | passed | passed | Bezier -> PH -> back, twice, via pushState/popstate and history back: 1 H1, 1 workspace, 2 boards each time, 0 console errors; p2 x edit to 2 works after return. Navigation was history-API based, not link clicks. |
| 5 Language retains scene | passed | passed | p1 x=1, Curve1 selected; switch language: H1 translated, p1 x still 1, 1 board; switch back: restored, selection pressed. |
| 6 Preset save/reopen | passed | passed | Saved `smoke-w3-<timestamp>` with p1 x=1, changed to -2, reopened: p1 x=1. Delete asked "Izbrisi prednastavitev?" (Da/Ne; EN equivalent) and the option disappeared. |
| 7 Guided lesson | passed | passed | Edited p1 x=1, entered `?learn=1`, 3 x Next, expanded overlay: Fit button pointer-blocked by `guided-lesson-graph-catcher` (by design, first click hides the overlay); after Hide, Zoom in changed the board; compact tab reopened overlay; Next worked; Exit shows confirm "Zapustiti vodeni primer?" / EN equivalent; confirm restored the entry scene (p1 x=1) and left the lesson UI. Frame-heading evidence is weak (H2 list did not change), the frame change was not independently read. |
| 8 Narrow 390x844 touch | passed | passed | No horizontal overflow (0 px), board 364 px wide, tabs visible, Display tab opens on tap, language selector works. Screenshot `narrow-<lang>.png`. |
| 9 Keyboard 1280x800 | passed | passed | Language select changed by arrow keys; Tab reached Display tab (20 tabs), visible focus (solid 3 px outline), Enter opened the panel, Space toggled a checkbox. |
| a Playback group `/analysis/bisection` | passed | passed | Keyboard only: Next step (Enter) 0 -> 1; Play (Enter) advanced to 3 and a Pause button appeared; Pause (Enter) held at 3; Reset (Space) -> 0. After 52 Next clicks the button is `aria-disabled=true` and the reason is shown ("Ni vec korakov." / "There are no more steps."). |
| b Curve operation `/bezier/subdivision` | passed | passed | Subdivide applied 5 times, then `aria-disabled=true`, reason "Na voljo je najvec 5 korakov subdivizije. Ponastavite primer za nov zacetek." / "At most 5 subdivision steps are available. Reset the example to start again." |
| c Readout `/compgeo/delaunay` | failed (count) | failed (count) | Counter text and update pass; `[data-readout-live]` count 3, not 1 (see above). |

## Limits and cleanup

- Each check ran in a fresh browser context; no storage persisted. The temporary preset was deleted in-app and the context discarded; no `smoke-w3-` data remains.
- Not covered: real touch hardware, library search/Back-Forward, export/import, GitHub Pages behavior, reduced-height or Presentation mode.
- No source file was edited.
