# Sweep task 24 (Fortune registration) browser smoke: PARTIAL

Preview: http://127.0.0.1:4323/bezeg-2.0 (left running). Worktree stream-geometry at 165448ba plus uncommitted task 24. Status: handoff at context budget. The final corrected run was NOT completed.

Scripts and logs in docs/reviews/sweep-algorithms/: 24-smoke.cjs (edited after the first run), 24-smoke.log, 24-smoke-results.json, 24-smoke-probe2.cjs/.log (probe). Screenshots: 24-smoke-fortune-{desktop,phone}-{load,false-alarm,end}.png, 24-smoke-lang-en.png, 24-smoke-preset-restored.png, 24-smoke-compgeo-*.png.

## Results (first run, then probes)

1. Load and reload, 1280x720 and 390x844: console errors none. Equal axis units pass (unitX = unitY). Step-0 readout says the sweep line is above all sites: pass. The "graph visible" check FAILED but is a script error: it used the first svg (an icon). Re-check with the .jxgbox box is still needed. The board bbox at desktop suggests about 848x475 px.
2. Stepping: 7 Next-step clicks reach Step 8 of 8 (display is 1-based, starts at Step 1). Readouts update per step: pass. False alarm at step 5 shows a queue entry "circle event (B, A, C) (cancelled, false alarm)": pass, both viewports. Sweep-height line: MathJax (mjx-container), not KaTeX. No raw TeX found. Probe confirmed one mjx-container in the page at step 3. Pass in substance. Live region: aria-live polite, 1x1 visually-hidden, announces steps: pass. No horizontal overflow at 390: pass. Reset playback: pass (returns to Step 1; script expectation was wrong, now fixed).
3. Language SL to EN to SL: H1 switches, step kept at 3, readouts switch and restore identically. Pass (the script's expected step value was off by one, now corrected to 3).
4. Preset round trip: save, list and restore with step 4 and point 1 x kept: pass. Reset preset reloads the selected preset (step 4 with the temp preset selected), and to Step 1 with Default. This matches docs/ui-functionality.md. Delete preset: did not remove the entry in my click-only probe. The control "requests confirmation", and I did not check for an in-app confirm button. Unverified, not a defect yet. Point 1 x commits on blur, not on Enter (Enter did not commit).
5. Catalog: Fortunov algoritem card links to /bezeg-2.0/compgeo/fortune: pass. The family-heading check failed because it used the heading role; "Računska geometrija" exists in sl.ts. Re-check with getByText.
6. visually-hidden on monotone-partition and segment-intersections: 13 and 15 elements, all clipped to 1x1: pass. Visible content present: pass. One visually-hidden LABEL "Graph element size, value" is missing from the aria snapshot, so the check failed. Likely the input's name carries it, not verified.

## Not verified
- Corrected full run (script edits applied; one replacement did not match, so the slAfter expectation may still be off by one).
- Delete preset confirm flow.
- Visual screenshot review of 390 clipping.
- Graph visibility via .jxgbox.

## Handler 45 follow-up (closes the worker's partial items)

The worker returned partial at its budget. The handler reran its doubtful items with a probe (`C:/Users/1337Hacker/.claude/jobs/65226deb/tmp/probe24*.cjs`, job scratch) against the same preview:

- **Graph visible:** the board, found through `JXG.boards[*].containerObj` (the worker's `.jxgbox`/svg selector was wrong), is 848×475 px at 1280×720 and 364×295 px at 390×844. No page or console errors. Screenshot `24-h-board-phone.png`, viewed: sites A–D framed, equal units, sweep line at \(y=7\) above A at \(y=5\).
- **Catalog:** `/bezeg-2.0/demonstrations` shows "Računska geometrija" and three links to `/compgeo/fortune`. The worker's heading probe used the wrong role.
- **"Graph element size" label on `/compgeo/monotone-partition`:** the `visually-hidden` label is present ("Velikost elementov grafa, vrednost") and names its spinbutton. The spinbutton sits in a collapsed panel (`aria-hidden` ancestor), which is why the worker's aria snapshot did not list it. This is not a regression.
- **Preset delete:** not rechecked. It is the shared Preset UI, unchanged by task 24, and it has its own smoke rows in `just smoke-built`, which passed (`24-h-smoke-built.log`).
- **Point x commits on blur, not Enter:** existing shared `NumberInput` behaviour, not task 24.
- Desktop false-alarm frame viewed (`24-smoke-fortune-desktop-false-alarm.png`): the dashed cancelled circle with its cross, the two solid true circles, and the beach line. The SL prompt renders in the prompt bar.
