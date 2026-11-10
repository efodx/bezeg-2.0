# Step 6 smoke, Group B: conditions and baseline

Target: production build of commit 64e2c0c2 at `http://localhost:4327/bezeg-2.0/` (preview owned by the handler, not started or stopped here). Tool: Playwright Chromium emulation only (touch/mobile contexts for phone sizes, desktop context for 1280x800); no physical device, no real rotation, no screen reader. Source was read-only; the working tree shows only untracked `ph.png`, `r.png` from before the run. Scripts, logs and screenshots: `.command-logs/w3-s6-smoke-b/` (`cond.cjs`, `cond.json`, `cond2.cjs`, `cond4.cjs`, `cond6.cjs`, `base_full.cjs`, `preset.cjs`, `*.png`).

## Failures

None observed against the brief's expectations. Two items are worth the handler's attention (not failures):

1. Voronoi (`/compgeo/voronoi`) at default state: Next step, Play are `aria-disabled` and the status reads "Trenutni podatki ne dajo korakov." until a site is chosen in the inspector (clicked `P1`). Same on 1280x800, so it is existing behaviour, not slot related. After choosing P1, Play, rotation 390x844 to 844x390 and back keep it playing with focus on Play. A phone user sees a disabled row beside the graph with no reason visible in the row itself; the reason reads in the status area only.
2. Landscape and 200% text: the board is only 200 CSS px tall at the board-top scroll position (320x640, 844x390, 390x844 at 200%). Board plus full row fit together, but the board is small. In English at 390x844 (100% text) the board was 390 px visible on fixed point. Not compared with a before value.

## Condition x route table (fixed point FP, bisection BI, De Casteljau DC, Voronoi VO; Slovenian unless stated)

"Together" = after scrolling the board top to the viewport top, every playback button and the board are inside the viewport. One `.inspector-playback` with buttons in the document, inside `[data-playback-slot]`, in every phone row below. Buttons all at least 44 px high and wide in every row; no horizontal overflow; no button clipped horizontally; no console or page errors.

| Condition | FP | BI | DC | VO |
| --- | --- | --- | --- | --- |
| 320x640 | pass: together, board 200 px, buttons 44 px | pass (same) | pass (2 buttons) | pass (4 buttons, 2x2 grid) |
| 844x390 landscape | pass: one scroll, board 200 px + rows at 200-293 px of 390 | pass | pass | pass |
| 390x844 at 200% root font | pass: together, buttons 84 px tall, inside slot, no clip | pass | pass (49 px) | pass (84 px) |
| 390x844 English | pass: "Next step / Play / Reset to x0", slot placement | pass: "Reset iteration" | pass: "Play / Reset" | pass: "Show bisector / Play / Reset construction / Back" |
| Keyboard 390x844 | pass: Tab reaches slot after 9 tabs; Next, Play, Reset focus ring solid 3 px; Enter starts, Space pauses Play (data-playing false, true, false) | pass (11 tabs) | pass (25 tabs, sliders first); Play toggles the same way | Tab reaches slot after 10 tabs; Play disabled at default (see note 1) |
| Rotate 390x844 to 844x390 to 390x844 while playing | pass: playing true throughout, Play keeps focus, one group, in slot | pass | pass in a second run (true throughout); first run had stopped by the end (the run is one-shot and took about 2 s) | pass only after choosing P1 (playing true throughout, focus kept); disabled at default |
| 1280x800 | pass: group in inspector, slot has 0 children | pass | pass | pass (buttons lie below the fold of 800 px; desktop inspector layout, not compared with before) |
| Presentation mode 390x844 | pass: slot empty, group in inspector (3 buttons), no overflow | pass | pass (2 buttons) | pass (4 buttons) |
| Guided lesson 390x844 | pass: opening sets slot opacity 0.7 and inspector pointer-events none; a touch tap on the dimmed Next step changed nothing; Exit (confirmation dialog, "Zapusti in povrni graf") restores opacity 1, one group in slot; Play works afterwards | pass (same) | not in the brief | not in the brief |
| Route exit while playing (history navigation to `/bezier/curve`, then back) | pass: 0 groups on the other route, one group in slot on return, not playing | pass | pass | not playing before (see note 1); returned with one group in slot |
| Nonanimated `/bezier/curve`, `/analysis/euler-method` 390x844 | pass: 0 groups, slot has 0 height and no children (no empty row), board 296 px at top, no overflow | | | |

Note on the lesson row: the lesson panel overlays most of the dimmed row on a phone (`fixedpoint-lesson.png`), so only the bottom of the row shows through. Opacity 0.7 and inert taps are confirmed; the visual appearance of "dimmed" is largely hidden by the panel.

## Baseline rows (Slovenian, production, 1280x900 unless stated)

| Row | Status | Evidence |
| --- | --- | --- |
| Entry and graph families | passed | Home to Demonstracije (`/demonstrations`); `/bezier/curve` h1 "Bézierjeva krivulja", `/rational/base`, `/spline/c1spline`, `/ph/cubic` each one board and 21-33 inspector controls |
| Point and slider response | passed | Dragged p1 (-3.2, 2) to (-2.327, 2.842), curve path changed; De Casteljau slider 0.5 to 0.7, construction changed |
| Family-specific controls | passed in part | Rational weight 2 to 3 changed the curve. PH route loads with one board and its inspector buttons; the generating-point editor was not opened and exercised. Marked partial |
| Navigation and lifecycle | passed | Bezier to PH and back twice, via `history` navigation (not link clicks): exactly one workspace, one graph, one svg each time; dragging a point after return moved it |
| Language retains scene | passed | Tab "Uredi" to "Edit" and back; selected curve count 1 both ways; p0 x field kept its value (shown "0,65" in sl, "0.65" in en); curve path identical. Language restored to sl |
| Preset save/reopen | passed | Name `smoke-b-628277`: saved with p0 x 0.65, changed to -0.4 (geometry differed), reopened (geometry equal to saved), deleted via confirm "Da"; preset removed from list. Isolated context, so no stored data remains |
| Guided lesson | passed in part | Bisection: opened, advanced three frames, hid and reopened by the tab, exited with confirmation, graph restored. A lesson-specific graph action was not exercised |
| Narrow viewport and keyboard | passed | 390x844 `/bezier/curve`: no overflow, board x 13 to 377; Tab reached the language select after 4 tabs, solid 3 px outline, ArrowDown switched to English (restored); Enter on the "Uredi" tab opened the editor |
| Console and page errors | passed | None in the baseline run or in any condition run |

The automated smoke suite was not run (it starts its own server, so it would not test this preview).

## Cleanup

Each scenario used its own browser context and closed it; the scripts exit on their own with a deadline. Nothing was started other than short-lived Chromium processes. Presets were only created in isolated contexts. No source edits, no commits.

## Coverage gaps

Chromium emulation only. Rotation was a viewport resize, not a device rotation (no orientation event). "Scene unchanged" during rotation was checked through playing state, focus and status text; step counters are not exposed on these routes, so no stronger equality check. Presentation mode was observed, not compared with a before measurement; likewise the 1280x800 layout and the nonanimated routes were checked for absence of the slot row, not pixel-compared with before. Route exit used history navigation rather than an in-app link. Guided lesson, as a full run, was not repeated on De Casteljau or Voronoi (outside the brief). PH generating-point editor not exercised. Other routes belong to Group A.
