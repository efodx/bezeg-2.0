# Step 5a smoke: guided lesson focus and draggable card

Scope: guided lesson Next/Back keep focus across frames; the lesson card can be dragged anywhere in the window (including off the board). Exit focus unchanged by design.

Target: `http://localhost:4327/bezeg-2.0/` (production preview, already running; not started or stopped by this run). Revision and dirty state of the preview were not verified by the worker. Browser: Playwright Chromium, 1280x720 unless noted. Scripts and logs: `.command-logs/s5a-smoke/` in the agent-a18d8a9709fec93af worktree (`t3.cjs`, `run.log`, `t4.cjs`, `run4.log`).

## Results

| # | Check | Language | Status | Evidence |
|---|---|---|---|---|
| 1 | Focus Next, Enter x3 advances a frame each time; focus stays on Next | SL, EN; Voronoi | Passed | Each Enter moved one frame (SL "Okvir 1 od 2" to "Okvir 2 od 2", then to next step). Focus stayed on `Naprej` / `Next` throughout. Progress text changed each frame. |
| 1 | Back Enter x2 goes back twice, focus stays on Back | SL, EN; Voronoi | Passed | Back moved two frames; focus stayed on `Nazaj` / `Back`. |
| 1 | Same as above | SL, EN; Bezier control points | Passed (forward and back) | Frame changes and focus retention observed. |
| 1 | Last frame: where focus goes | SL, EN; Voronoi | Passed | On the final frame (Korak 7 od 7, Okvir 2 od 2) Next is replaced by `Končaj in raziskuj graf` / `Finish`, and focus stays on it. Enter on it shows the completion heading (H3 "Vodeni primer je končan" / "Example complete"), which takes focus. |
| 1 | Last frame | SL, EN; Bezier | Not tested | Bezier last frame not reached in the run. |
| 2 | Drag grip +900 px x, +420 px y | SL normal | Passed (in window, see note) | Card before (204,283)-(748,708); after (730,289)-(1274,708). Board stays (51,271)-(901,871). Card overlaps the board and stays inside the 1280 px window; grip inside window. |
| 2 | Same | SL presentation | Passed | Card before (63,291)-(607,708); after (730,297)-(1274,708). Board (51,279)-(1211,864) unchanged. |
| 2 | Same | EN normal and presentation | Passed | Same positions as SL. |
| 3 | Arrow keys on grip | SL | Passed | Grip focused. 10x ArrowRight moved card +160 px; 20 more moved +320 px to x 684-1228, inside window. 5x ArrowDown moved it 12 px down. Step sizes not measured further. |
| 4 | Resize to 800x600 after moving right | SL | Passed | Card re-clamped to (410,296)-(794,588), inside the window. Grip inside window. Board also re-laid out to (32,278)-(440,863). |
| 5 | Hide, then reopen | SL | Passed | After moving card, `Skrij navodila vodenega primera` removes the card. Hidden bar offers `Nazaj na navodila`. Reopen card at (730,289)-(1274,708), inside 1280x720. |
| 5 | Končaj, then Zapusti in povrni graf | SL | Passed | Dialog offers `Nadaljuj vodeni primer` and `Zapusti in povrni graf`. Exit returned to `/bezeg-2.0/compgeo/voronoi`, card removed. |
| 5 | Page errors | SL | Passed | 0 page errors and 0 console errors across the run. |
| 6 | Card visible after page scroll | SL | Failed (observation) | Page is scrollable (scrollHeight 2025, viewport 720). Scrolling to the bottom (scrollY 1305) moved the card to y -1016 to -527, i.e. off screen. The card scrolls with page content, so it does not stay visible. |

Note on check 2: the card stays within the window at 1280x720, but the right edge is at 1274 px, so the grip is at the window's right boundary. Clamping is observed.

## Harness notes

- The first run (`run.log`) failed check 5 only because my reopen locator used an exact name; the hidden bar button name is longer. The rerun (`run4.log`) used the right label and passed. This is a harness issue, not an app defect.
- Last-frame test in the first run stopped at "Korak 7 od 7, Okvir 1 od 2" by mistake; rerun in `run4.log` reached the true last frame.

## Coverage limits

- Bezier last-frame focus not tested.
- EN check 5 (hide/reopen/exit) not run; brief asked SL only.
- Keyboard step size for ArrowDown not characterized.
- No mobile or touch testing. No accessibility audit beyond focus and labels observed.
- Preview revision not verified against the step 5a commit.

## Cleanup

Each script closed its browser in `finally`. No servers were started or stopped. Two `node` processes ran in the background and exited with code 0.

## Verdict

Checks 1 through 5 passed for the covered scope. Check 6 failed as an observation: the card scrolls with the page and is not visible after scrolling. The handler should decide whether that behaviour is intended.

## Handler reading (2026-11-10)

Accepted. Item 6 is not a regression: the card is a graph-anchored overlay (ADR 0003) and scrolled with the page before this change too; only its drag bounds changed. Checked before publishing that master had no newer lesson-runtime change: `dd736cfc` (2026-11-07, upper-left start when the graph area is about twice the card width) is in the base and complements this fix; it does not cover the 850 px board, dragging off the board, or Next focus.
