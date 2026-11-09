# Wave 3 smoke recheck (repair c731a291)

Preview: `http://localhost:4327/bezeg-2.0/` (production, served by the handler; not started or stopped by this run). Chromium via repository Playwright, language set to Slovenian through `bezeg-language` before load. Scripts and captures: `.command-logs/w3-smoke-r/` (`run.cjs`, `run2.cjs`, `results.txt`, logs, PNGs). No app or repo files were edited; no processes were left running by this run (each script closes its browser and exits).

Console and page errors: none on any page visited.

## Item 1: /inversion, desktop 1280x800 (PASS, with one tooling caveat)

- Angle slider absent before selecting focus `power`: count 0. After selecting option `power` in the "Prikaz" select: count 1 (range labelled "Smer sekante θ (stopinje)").
- Arrow keys: from 0, ArrowRight gave 1, ArrowLeft gave 0.
- Shift+ArrowRight from 0 gave 10. PageUp from 10 gave 20; PageDown gave 10.
- Wrap: 359 + ArrowRight gave 0. 359 + Shift+ArrowRight gave 9.
- Focus visible: focused range computed `outline: solid 3px`. Note: focus was set with `element.focus()`, not with a Tab keypress, so Tab traversal is not separately evidenced.
- Typed value: 90 + Enter set the range to 90. The first `<svg>` in the document did not change, so that run did not verify the board. Re-check (`run2.cjs`) with 200 + Enter: the largest board svg markup changed (hash differs) and `data-inversion-state` reads `secant`. Board move: PASS.
- Language: SL→EN: slider found as "Secant direction θ (degrees)", value kept at 90. EN→SL: "Smer sekante", value 90. PASS.
- Caveat: `locator('option')` inside the combobox returned an empty list in `evaluateAll`, though `selectOption('power')` succeeded. Not a product failure; not investigated.

## Item 2: /inversion, 390x844, touch emulation, focus power (PASS)

- Slider count 1 after selecting power. `scrollIntoViewIfNeeded` succeeded.
- Range element box: 44 px tall, 336 px wide. Exact field (spinbutton "Smer sekante…"): 44 px tall, 88 px wide.
- Horizontal page overflow: 0 px.
- Thumb itself not measured separately; the range element box is 44 px.

## Item 3: /analysis/sequence, desktop 1280x800 (PASS)

- Before: label "Pokaži certifikat", `data-revealed="false"`.
- After click: label "Skrij certifikat", `data-revealed="true"`.
- After second click: back to "Pokaži certifikat", `false`; board text restored.
- Visible change: the board text changes from "certifikat: skrit" (before) to "certifikat: N ne deluje / Izberi širino pasu ε in prag N ter napovej…" (after). The inspector HTML also changes.

## Item 4: playback group (PASS)

Group `.inspector-playback` (role=group), one button, label "Predvajaj", button and group widths equal, left and right gaps 0.

| Route | Viewport | Group aria-label | Group W | Button W | Button H | Page overflow |
|---|---|---|---|---|---|---|
| /bezier/arc-length | 320x640 | Gibanje po krivulji | 266 | 266 | 44 | 0 |
| /bezier/arc-length | 390x844 | Gibanje po krivulji | 336 | 336 | 44 | 0 |
| /curve-geometry/parametric | 320x640 | Kotaljenje | 266 | 266 | 44 | 0 |
| /curve-geometry/parametric | 390x844 | Kotaljenje | 336 | 336 | 44 | 0 |

Not covered: pressing Play, reduced motion, and keyboard Tab/Enter on these routes (outside this recheck's list).

## Coverage gaps

- Tab-key traversal to the angle slider was not tested (focus was set programmatically).
- Reveal button check was on desktop only.
