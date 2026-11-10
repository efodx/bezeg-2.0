# S5a recheck of guided-lesson findings (learn-ui.md 57-64)

Target: production preview http://localhost:4327/bezeg-2.0/ (master lesson runtime), Chromium 1280x720. Scripts and screenshots: /c/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/agent-a18d8a9709fec93af/.command-logs/s5a-recheck (t1.cjs, t2.cjs, i1-*.png, i2-exit.png, i3-*.png).

1. Next loses focus: STILL PRESENT (SL and EN; Voronoi from chapter, and Bezier control-points lesson).
   Focus Naprej/Next, Enter: frame 1 -> 2 (progress "Korak 1 od 7 · Okvir 2 od 2"). Active element after the change is the lesson SECTION (class guided-lesson, no aria-label, text starts with the lesson title). Enters 2 and 3 do nothing (progress unchanged). Bezier: Okvir 2 od 3, same result. The change is announced: the div.guided-lesson-progress (role=status, aria-live=polite) text changes. Cause: GuidedLesson.tsx:379 (effect on stepIndex/frameIndex) focuses lessonRef/completion heading.
2. Exit focus: STILL PRESENT. Koncaj -> dialog (Nadaljuj / Zapusti in povrni graf) -> Zapusti: URL /bezeg-2.0/compgeo/voronoi, focus BUTTON "Spoznaj to demonstracijo"; chapter link not restored. "Nazaj v poglavje": /learn/triangulations-voronoi#voronoi, focus on A "Vodeni primer →" (the launching link). Passes. Relevant: GuidedLesson.tsx:240 (exitInvoker), 481-500 (returnToChapter).
3. Card over board: STILL PRESENT. Normal: card x204 y283 544x425, board x51 y271 850x600 (card inside the board). Drag by 900/420: card x351, still inside. Presentation: board 1160 wide, card x63 544x417 (left part of the board). Drag: card x661-1205, inside the board (51-1210); the drag clamps to the board and cannot leave it. Only Skrij clears it. Screenshots i3-normal.png, i3-normal-drag.png, i3-present.png, i3-present-drag.png.

Coverage: no console-error capture; Bezier checked in SL and EN for item 1 only.
