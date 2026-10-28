# T10T smoke report (partial)

Tested the handler-owned production preview at `http://127.0.0.1:4391/bezeg-2.0/patches/joins`, checkout `.claude/worktrees/bezier-patches-r2`, HEAD `b43fdb6b09d694b1b778a6d7a29f3a542096e81e`, dirty with the assigned tensor patch/join work. The route returned HTTP 200. The bounded run took about 6 minutes including setup. Browser: headless Chromium with ANGLE SwiftShader. Viewports: 1440×1000, then 1280×720.

| Check | Status | Evidence |
| --- | --- | --- |
| Teapot capstone | Passed | “Čajnik sestavlja 32 bikubičnih Bézierjevih krp”; renderer initialized; forbidden join/degree/B-point/point-editor/inset panels absent. This checks visible text and controls, not geometric ownership. |
| Keyboard orbit | Passed | ArrowRight changed azimuth −52° to −46°. |
| Resize | Passed | Canvas remained usable; CSS/buffer size changed 1002×660 to 848×475. |
| Boundary/shading toggle | Blocked | Full-page screenshot in the “Prikaz” tab shows both switches, but Playwright’s `getByLabel` selector found neither, so toggling was not exercised. |
| PNG/SVG, preset save/export/import, invalid-value rejection, reset, narrow touch, navigation/remount, curve baseline | Skipped in initial run | Runner stopped at the SVG button lookup. The priority exports, preset roundtrip, and reset checks passed in the continuation below; other listed checks remain unattempted. |

Screenshots: `.claude/scratch/t10t-smoke-2026-10-28T23-20-59-694Z/desktop-teapot-sl.png`, `desktop-teapot-display.png`, and `desktop-resized-teapot.png`. The teapot looked small in the 1002×660 canvas. No page runtime errors or failed HTTP requests were captured; the runner error was a UI-tab selector timeout.

For continuation, select the capstone with `[data-join-scene="join-teapot"]`. Switch to “Prikaz” for the toggles and “Shrani” for exports and Preset actions. The saved runner is `.claude/scratch/t10t-browser-smoke.cjs`; failed-run JSON and screenshots remain under the scratch folder. Fresh browser contexts were closed; temporary app state did not persist. No source, build, or Git changes were made.

## Priority continuation (2026-10-29)

Tested the handler-owned production preview at `http://127.0.0.1:4391/bezeg-2.0/patches/joins`, checkout `.claude/worktrees/bezier-patches-r2`, HEAD `4064ae81d700bb1ea91f75a6ac044e173d4a8378`, dirty with the assigned work and existing review files. Route returned HTTP 200. Successful focused run took 6.2 seconds in headless Chromium with ANGLE SwiftShader at 1440×1000. Each browser context was isolated and closed; no console, page, failed-request, or HTTP errors were recorded.

| Check | Status | Evidence |
| --- | --- | --- |
| Teapot scene | Passed | Visible capstone text identifies 32 bicubic Bézier patches. |
| SVG export | Passed | Downloaded 109,392-byte SVG. Its embedded PNG was 40,917 bytes with a valid PNG signature. |
| PNG export | Passed | Downloaded 40,917-byte PNG, 1002×660. Decoding found 13,053 non-background pixels spanning 140×133 pixels. |
| Preset save/export | Passed | Exported JSON was 1,869 bytes; selected preset stored `joinCapstone: teapot` and camera azimuth −0.9 rad, elevation 0.5 rad, distance 29.1877, and target [0.2625, 0, 1.575]. |
| Preset import roundtrip | Passed | Imported scene was the teapot. Camera sliders were −52° and 28.7645°, within 1.1° of the exported values. |
| Back to default pair | Passed | Pair controls became visible and the capstone panel was absent. |
| Reset to default pair | Passed | After selecting the default preset and Reset, pair controls remained visible and the capstone panel was absent. |

Artifacts and the focused runner are in `.claude/scratch/t10t-exports-2026-10-28T23-28-14-062Z/` and `.claude/scratch/t10t-exports.cjs`. This continuation did not repeat narrow touch, invalid preset rejection, navigation/remount, curve baseline, or boundary/shading toggles; the earlier toggle attempt remains blocked by its label selector, as recorded above.

