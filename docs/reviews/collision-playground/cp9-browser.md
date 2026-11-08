# CP9 browser smoke (production preview 127.0.0.1:4320, uncommitted tree)
Languages sl/en, 1440x900 and 390x844 touch. Scripts in %TEMP%/cp9; log: cp9-browser/run-log.txt; stage canvases: cp9-browser/s0-2.png (sl, 10 objects).

1. PASS (sl, en): invitation, playground (polygon mode), three paragraphs after the guided example; no raw backslash-paren in text.
2. PASS: all controls reachable/operable by keyboard (arrows switch radios, Space/Enter on buttons, PageUp on slider), 3px focus outline; mobile: slider 44px, radio labels 44px high, buttons 44px, no horizontal overflow. Radio inputs themselves are 24px (label is the 44px target).
3. PASS (sl): boxes dashed, hulls dotted, pieces solid. Touching ring NOT verified visually (touching pairs 0 at 10 objects).
4. PASS with defect D2. Labelled numeric readouts and live region name objects, method, box tests, three removed counts; live text unchanged while playing.
5. FAIL (D1, sl and en).
6. PASS: sweep-idea playground and interval-sweep inspector render, no console errors.
7. PASS: no console errors or failed requests on any page/viewport.

## Defects
D1. bezier-hulls link missing. withHullProxyLink (convexityChapter.ts) sets link label "Ovojnica kot poceni nadomestek pri trkih" / "The hull as a cheap proxy in collisions", but linkedParagraph only links a label that is a substring of the paragraph text, and it is not. No anchor renders (only #bezier-hulls and the guided example link). Expected: a visible link to /learn/convexity-hulls#convex-hull. Fix: put the label in the sentence text.
D2. Paused count change gives misleading readouts. Pause, focus slider, PageUp: Objects 557, box tests 0, hull/piece tests 0, "pairs removed by boxes 154,846" (all pairs) and the live region announces "0 box tests ... boxes remove 154,846 pairs". Stale until Step. Expected: not claim all pairs removed before a step has run (compute a step or show a dash).
Note: playground autoplays on load, Step disabled until Pause.

## Handler follow-up (2026-11-08)

- D1 fixed: the link label is now a phrase of the sentence ("pri trkih" / "in collision detection"); `convexityChapter.test.ts` asserts the label occurs in the text in both languages.
- D2 fixed in `collisionLoop.ts`: a rebuilt world (count change, reset, init) is measured with `measureWorld`, so its readouts and announcement describe the new arrangement; covered by the new "a rebuilt world is measured" test, which was seen failing with zeroed counters. This also changes circles, which showed 0 box tests after a paused count change.
- Pending: a Haiku recheck of D1 and D2 in both languages before push.

## Haiku recheck (2026-11-08)

Checkout: worktree `stream-collision`, HEAD `fbe1ca1e`. Preview: production at `http://127.0.0.1:4320` (not rebuilt by this run). Worker: Haiku 5.5, read-only on source. Script and results: `%TEMP%/cp9-recheck/run.js`, `result-<lang>-<viewport>.json`, `log-*.txt`. Each run used a fresh browser context with `bezeg-language` preset, or the `#bezeg-language` select for English. Chromium was launched headless with Playwright from the worktree's `node_modules`.

Commands: `node run.js <sl|en> <width> <height> <touch 0|1> <outdir>`, run for `sl 1440x900`, `en 1440x900`, `sl 390x844 touch`, `en 390x844 touch`. Plus two repeats of `sl 1440x900` for D1 flake checks.

### D1 (bezier-hulls paragraph link to #convex-hull)

- sl 1440x900 (click): link `pri trkih` found, href `/bezeg-2.0/learn/convexity-hulls#convex-hull`. URL becomes `...#convex-hull`. Heading `#convex-hull-heading` top 54 px, in viewport, scrollY 3680. Stable over 4 samples at 1 s intervals. Two repeats gave the same values. PASS.
- en 1440x900 (click): link `in collision detection` found, same href. Hash `#convex-hull`, heading top 54 px, in viewport, stable over 4 samples. PASS.
- sl 390x844 (tap): hash `#convex-hull`, heading top 111 px, in viewport, scrollY 5115. PASS.
- en 390x844 (tap): hash `#convex-hull`, heading top 111 px, in viewport. The first sample was 53 px at 1 s, then 111 px. This settled within 1 s and is not a failure. PASS.
- Note: an earlier run (before the language fix, sl 1440) recorded the heading at top -3644 px with scrollY 7345 after 1.5 s. It did not reproduce in three later sl 1440 runs. Recorded as a single unexplained transient, not a confirmed defect.
- Screenshots: `%TEMP%/cp9-recheck/d1-{sl,en}-{1440,390}.png`.

### D2 (polygon-mode playground, hull-as-proxy block)

No mode radio exists on this page. The polygon playground is the one that has the `collision-overlay` radio group, and it is always polygon mode. The circle playground is optional and was not run.

Pause was pressed (aria-pressed true to false in all runs). Focus went to the slider `input[type=range]`. PageUp was pressed once, and the readouts were read after 1.5 s.

| Run | Objects | Box tests | Removed by boxes | All pairs n(n-1)/2 | Pairs left | Live region |
|---|---|---|---|---|---|---|
| sl 1440 | 557 | 1787 | 154 820 | 154 846 | 26 | "557 objektov, Pometanje in obrezovanje: 1787 preizkusov očrtanih pravokotnikov na korak; pravokotniki zavrnejo 154.820 parov, ovojnice 9, konveksni deli 2" |
| en 1440 | 557 | 1787 | 154,820 | 154,846 | 26 | "557 objects, Sweep and prune: 1,787 bounding box tests per step; the boxes remove 154,820 pairs, the hulls 9, the convex pieces 2" |
| sl 390 | 557 | 1787 | 154 820 | 154 846 | 26 | same as sl 1440 |
| en 390 | 557 | 1787 | 154,820 | 154,846 | 26 | same as en 1440 |

Consistency check: 26 candidates, 9 removed by hulls, 17 hull passes, 2 removed as pieces, 15 touching. The "Stikajoči se pari" readout was 15 at this count, which matches. PASS in all four runs: box tests are nonzero and the removed count is not all pairs.

### Touching ring

After four more PageUp presses, paused, the count was 5000 in all runs. Touching pairs were 162 (sl 1440, en 1440 and both 390 runs). With playing, the max touching count sampled over 6 s was 180 (sl 1440), 196 (en 1440) and 162 (390 runs). The ring is visible. In `d2-sl-1440-paused.png` the orange rings are around the touching bodies. Touching > 0 and a ring is visible: PASS in all four runs.
- Screenshots: `%TEMP%/cp9-recheck/d2-{sl,en}-{1440,390}-{paused,play}.png`. I viewed only `d2-sl-1440-paused.png`.

### Console and network

Console errors and warnings: none. Page errors: none. Failed requests and HTTP 4xx/5xx: none. This was checked on all four runs.

### Coverage limits and cleanup

- Circle playground not checked (optional).
- The touch runs used `tap` for the link and buttons. Real-device touch was not tested.
- I did not inspect the full checklist in `docs/smoke-tests.md`. The checks came from the brief.
- Each Playwright script closed its browser in `finally` and exited. Three `chrome-headless-shell.exe` processes (PIDs 25940, 17928, 26888) were still running afterwards. I cannot confirm that they are from this run, so I left them alone.
- No source files were changed. No commits, no pushes.

### Summary

- D1: PASS in sl and en, at 1440 and 390.
- D2: PASS in all four runs. Box tests 1787; boxes removed 154,820 of 154,846 pairs.
- Touching ring: PASS. 162 touching at 5000 objects, ring visible.
- Console and network: clean.
