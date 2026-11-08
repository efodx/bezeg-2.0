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
