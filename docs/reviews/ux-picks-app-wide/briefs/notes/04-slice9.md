# 04 slice 9 (smoke spec migration): second worker, finished

Logs: `docs/reviews/ux-picks-app-wide/smoke/04-slice9-*.log` (j-l targeted, m per spec, n full guided-lessons, o demonstration-motion, p controls-fixture).

## Done
- Product: `.board-card-fold` is 44x44 (`src/workspace/cards/CardShell.css:37-38`, negative block margin keeps the head at the control height). `just unit src/workspace/cards` passed.
- Passing after: workflows, standalone-learning, rendered-appearance, demonstration-motion, `just controls-fixture`, all earlier groups (curve-editing-modes, library-picker, curve-ownership, lesson-graph-access, count-setter).
- guided-lessons full run (n): 316 passed, 18 skipped (phone, task 09), 10 failed. Walks/exits (decasteljau, farin, spline-c1) now pass.
- Edited: playback test (strip group "Construction animation" + puck slider `Parameter t`, reads aria-valuenow); `lessonScrollPort` accepts the card body; card drag uses title + big gesture (passes to the drag assertion); 844x390 card overlap skipped (row added to task 09).

## Open failures (10), cause
1. interp-runge sl desktop walk, step 4: not a view/aspect bug. Board bbox is the graph's own `DEFAULT_VIEW` [-1.25, 2.5, 1.25, -0.5] (`RungeInterpolationGraph.tsx:21`) at 1440x900 and 1280x720; the five reported points have y 3.02-3.59, above the top 2.5 at any size. Not compared with master.
2. Observation flow 3160: focus does not return to the lesson panel after the card is reopened (card mode: `hideOverlay`/`showOverlay` only call `onRequestFold`, `GuidedLesson.tsx:266-291`). Product gap.
3. Observation flow 3235 playback: playback started from the strip keeps running after reopening the card (`GuidedLesson.tsx:266-291` card branch skips `pausePlayback()`). Also `cardOpen` (line 221/559) stays true while the card is folded, so the header never gets the lesson's animation controls. Product bug.
4. Reading position (lesson-experience 108): no scroll owner exists; the card is height-cut with a "More content" bar (`board-card--cut`, body overflow 608/608, section 423/423). Design change: test needs a rewrite around More content (handler decision).
5. Navigation keeps one position (154, sl/en): drag now passes; the toolbar moves 14 px (y 578 -> 564) after frame 2 because the card height follows content. Product regression of "Back/Next stay under the pointer".
6. Persistent actions (219) desktop/projection sl+en: "action is pointer reachable" at middle/bottom, and scroll offset 69 vs 57; same cause as 4 (no scroll range, card cut). The 44 px fold failure is fixed.

Not verified: 320 px blocks (unreachable, kept for task 09); the fold CSS only through unit tests and the rows above, no screenshot of the card head.
