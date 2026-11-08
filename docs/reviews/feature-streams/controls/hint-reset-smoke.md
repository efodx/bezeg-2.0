# Hint reset smoke (commit 84b749ba build)

Preview: http://127.0.0.1:4327/bezeg-2.0 (handler-owned, not stopped by this run). Chromium via Playwright, 1440x900, Slovenian UI, fresh context. Console and page errors: none recorded.

Reset used: the workspace "Ponastavi" button (`button.btn-primary` in `#inspector-save`, the "Shrani" tab). Reached by switching to "Shrani", clicking Reset, then returning to "Uredi". The "Ponastavi" in the Uredi section is the playback reset (`data-action="reset"`) and was not used.

| Step | Route | Result | Hint before | Hint after Reset / change |
|---|---|---|---|---|
| 1 | functions/geometric-series, "Prvi člen a" | PASS | "Vnesi vrednost med 0,1 in 5." (value 999, aria-invalid=true) | Reset: value "1", no `.number-input-hint`, aria-invalid absent |
| 2 | interpolation/lagrange, "Položaj s na krivuljah" | PASS | "Vnesi vrednost med 0 in 1." (value 2, aria-invalid=true) | Reset: value "0,5", no hint, aria-invalid absent |
| 3 | functions/geometric-series, slider | PASS | "Vnesi vrednost med 0,1 in 5." (refused 999) | ArrowUp on slider: 1 to 1,1, hint cleared; typed 3 + Enter: hint absent |

Screenshots (absolute): `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/stream-controls/test-results-4327/hint-reset/` with `s1-before-reset.png`, `s1-after-reset.png`, `s2-before-reset.png`, `s2-after-reset.png`. Raw data: `results.json` in the same folder.

Coverage limits: Single browser (Chromium), one viewport. Not checked: other routes, keyboard-only Reset, English UI, touch, screen-reader announcement of hint removal, and the Reset-disabled state. Step 3 covered ArrowUp only, not drag or PageUp. The Reset button was clicked only in the Shrani tab; the field was read after returning to Uredi.
