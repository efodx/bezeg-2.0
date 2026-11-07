# Foundation 1b browser smoke

Checkout: worktree stream-controls, HEAD 26a535af, dirty (uncommitted BooleanField change). Target: production preview on port 4328 built from this checkout (revision matched, dirty). Chromium via Playwright; scripts and raw data in `.command-logs/` (`smoke1b.cjs`, `smoke1b-results.json`, `smoke1b-summary.txt`); screenshots in `.command-logs/shots-1b-smoke/`.

## Coverage

States measured (bounding boxes, computed styles) for each cell: switch/field presence, label/help clipping, horizontal overflow, row height, checked colour.

| State (route, tab) | 1440x900 | 1024x768 | 724x900 | 390x844 | 1024 + 200% text | touch 390 (hasTouch, isMobile) | Languages |
|---|---|---|---|---|---|---|---|
| Curve Display: /bezier/decasteljau, Display (5 switches) | ok | ok | ok | ok | ok | ok | sl, en |
| Function inspector: /functions/trigonometric, Display (1 switch) | ok | ok | ok | ok | ok | ok | sl, en |
| Function inspector: trigonometric, Edit (4 sliders, no switch) | ok | ok | ok | ok | ok | ok | sl, en |
| Tools list: /bezier/arc-length, Edit (3 switches) | ok | ok | ok | ok | ok | ok | sl, en |
| Lesson: decasteljau after Learn (5 switches in dimmed inspector) | measured only | measured only | measured only | measured only | measured only | measured only | sl, en |

"ok" means: no label, help or field clipped or beyond the viewport, no page horizontal overflow, checked background not transparent, slider/number/count rows wrapped (no child past the row's right edge) at 390 and at 200% text. Row heights: 38px at 1440, 1024 and 724 (the 44px rule starts at 700px or coarse pointer); 44px at 390 and in the touch context for every switch; slider/count/number controls measured 44px in touch. At 200% text rows grow (51 to 170px) by wrapping the label, no clipping.

Interactions at 1440, sl and en, first switch of each state (decasteljau, trigonometric, arc-length): Tab reaches the switch with :focus-visible, outline solid 3px rgb(87,124,195); Space toggles and toggles back; the row pixels and the board markup change; clicking the label toggles; Enter neither reloads the page nor toggles (url and a window marker unchanged). Off: track rgb(229,233,224), border rgb(139,151,134), dark thumb. On: track and border rgb(25,55,47), white thumb. Pixel comparison of the row differs between states.

Theme: presenting (dark stage) on decasteljau Display, 1440 en: 5 switches, rows 38px, no clipping, on and off pixel-different (screenshot `presenting-decasteljau.png`). Forced colours (decasteljau Display, en): see failure 2.

## Failures and weaknesses

1. Lesson switches could not be exercised. During a guided lesson the inspector is `pointer-events: none`, opacity .7 and aria-disabled in every frame I stepped (explanation, observation, calculation), so the label click times out and Tab never reaches a switch (120 presses). No lesson panel or lesson graph under src/learning has its own switch. Probably by design, but the switch behaviour in a lesson is untested; only its dimmed layout was measured (no clipping).
2. Forced colours (`forcedColors: active`): on and off are distinguishable in pixels (border black vs rgb(55,0,110), thumb), but the checked state shows an empty outlined pill with no thumb (track and thumb both resolve to white, `forced-colors-row-first.png`); only the off state shows a visible thumb (`forced-colors-row-second.png`). The on state carries no mark, so the distinction is weak and does not signal "on". Suggest a forced-colors rule using `Highlight`/`CanvasText` for the checked track or thumb.
3. Presenting (dark) theme, low contrast: the on track rgb(25,55,47) sits on the navy panel; it is told apart only by the white thumb at the right (`presenting-decasteljau.png`, "Control points"). Not a failure of distinctness, but the track edge is hard to see. Also in presenting mode the "Tools for this graph" kicker and "Collapse" are nearly invisible (not a switch, unrelated to this change).

No missing elements, no page errors, no horizontal overflow in any measured cell.

## Gaps

- The brief's /analysis/taylor has no switch; trigonometric stands in for the function inspector.
- No checkbox-variant (`bool-field-checkbox`) instance was found on the tested routes; untested.
- Disabled and help-text variants of BooleanField were not found on these routes; help text on switches not exercised (slider and count help text checked for clipping only).
- Tab/Space/Enter, focus ring and label click were tested on the first switch per state at 1440 only, not at every viewport or theme; focus ring on sliders/number/count was not checked.
- Dark theme was checked at 1440 en only; light is the only theme elsewhere. Forced colours on one route only.
- 200% text emulated by `html { font-size: 200% }`, not the browser zoom setting.
- Slovenian screenshots exist only for 390 and touch390; sl measurements for other viewports are numeric only.

## Repair recheck

Checkout 26a535af, dirty. Production preview on port 4329 (build revision matched, dirty), no rebuild. Script `.command-logs/repair-recheck.cjs`, raw data `.command-logs/repair-recheck-results.json`, log `.command-logs/repair-recheck.log`, screenshots `.command-logs/shots-repair-recheck/`. Pixel compare script `.command-logs/repair-diff.cjs`. No page errors.

R1 forced colours (decasteljau, Display, en, 1440x900, `emulateMedia({forcedColors: 'active'})`): pass. First switch "Point labels" renders as a native checkbox (type checkbox, appearance auto, 18x18). On: ticked (`r1-forced-first-before.png`). Off after clicking the label: empty box (`r1-forced-first-after.png`).

R2 presenting theme (same entry as the first pass: Presentation mode, then Display): fail for the on state. Off: border-color rgb(181, 191, 208), track rgb(229, 233, 224) (pass). On (first switch starts on): border-color rgb(25, 55, 47), track rgb(25, 55, 47), not rgb(181, 191, 208). Cause: `.bool-field .bool-field-input:checked` (specificity 0,3,0) beats `.is-presenting .bool-field-input` (0,2,0), so the green checked border wins. Screenshots `r2-presenting-first-before.png` (on) and `r2-presenting-first-after.png` (off), plus `r2-presenting-page-before.png`.

R3 normal theme (1440x900, en, decasteljau, Display): pass. Border-color of the first `.bool-field-input` is rgb(25, 55, 47) (on, not rgb(181, 191, 208)). Full-page viewport screenshot `r3-normal-1440-en.png` pixel-compared with `shots-1b-smoke/decasteljau-display-1440-en.png`: 0 differing pixels out of 1440x900, so no difference at all, including the switch state.

Coverage: R1 to R3 only, first switch on one route. Other routes, viewports, Slovenian and the checkbox variant were not rechecked. Preview stopped; port 4317 not touched.
