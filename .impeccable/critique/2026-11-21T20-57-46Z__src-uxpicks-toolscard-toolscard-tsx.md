---
target: UX picks round 1 (all picks; transformations lesson, Taylor, De Casteljau)
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:C:\\Users\\1337Hacker\\Desktop\\bezeg-2.0\\.claude\\worktrees\\ux-picks\\src\\uxPicks\\toolsCard\\ToolsCard.tsx"
target_fingerprint: "sha256:f75f22522ac809ce448cf320d49caabeb5b3d5f629118400be8a950df050787e"
target_path: "C:\\Users\\1337Hacker\\Desktop\\bezeg-2.0\\.claude\\worktrees\\ux-picks\\src\\uxPicks\\toolsCard\\ToolsCard.tsx"
timestamp: 2026-11-21T20-57-46Z
slug: src-uxpicks-toolscard-toolscard-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector + browser sub-agent), plus a separate audit agent (C). Walks: transformations lesson, Taylor, De Casteljau at 1440×900, 1024×768 and touch 1024. Evidence: Desktop/bezeg-ux-picks/round1/{A,B,C}/.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Rail, Povrni line, Prosto pill clear; folded head "1/7 · 1/2" cryptic |
| 2 | Match system / real world | 3 | Plain Slovenian; "Prosto", "Povrni" unspecific |
| 3 | User control and freedom | 3 | Fold, Povrni, Back, reset; a card dropped on the graph has only a hidden way home |
| 4 | Consistency and standards | 2 | Odčitki repeats Besedilo, pucks repeat both; (2, 4) vs (2; 4); Končaj vs Nadaljuj v poglavju |
| 5 | Error prevention | 2 | Cards sit over draggable points (De Casteljau p0 at 1024) |
| 6 | Recognition rather than recall | 2 | Icon-only Back, ⋯, ∿, −, grips |
| 7 | Flexibility and efficiency | 4 | Dock, float, fold, typed values, sweep, keyboard, remembered places |
| 8 | Aesthetic and minimalist design | 2 | 1024: left stack covers a third of the graph; 1440: seven cards open |
| 9 | Error recovery | 3 | Povrni works; its line pushes the text down |
| 10 | Help and documentation | 3 | Puck help card strong but long, covers the tools |
| Total | | 27/40 | Acceptable |

Audit (C): accessibility 3, performance 2, theming 2, responsive 2, integrity 3 = 12/20.

Design specificity: mostly grounded (Literata titles, ochre parameter letters, ghost pucks, Povrni); generic card chrome carried by the palette. Detector: CLI exit 0, 66 advisories (37 design-system-color, 29 design-system-radius; ParamPucks.css, dock.css, UxPicksPanel.css). Overlay 11-13 per page: undersized text ("Graf", "Preizkusi in opazuj" 10.4-10.6 px, hint 11.5 px), skipped heading h1→h3 in the lesson card, pucks/∿ over axis labels, 104-char line in "Preizkusi in opazuj"; false positives: grid background, JSXGraph SVG.

## Priority issues
1. [P1] Cards cover the graph's content by default: De Casteljau p0 hidden at 1024; transformations left stack covers a third of the curve and y-axis labels. Fix: content-aware default placement, or the board makes room (pan/refit), or fold a card that lands on a point. Command: layout.
2. [P1] Too many cards open at once with duplicated data (Besedilo, Odčitki, Legenda, lesson, tools, Vrstni red, pucks at 1440; Odčitki repeats Besedilo). Fix: lesson + tools + pucks open during a lesson, others folded; merge Besedilo and Odčitki. Command: distill.
3. [P1] Phone 390 px: board chips overlap each other and the curve; puck strip shows only c, d, a (b and u unreachable by touch). dock.css:111-154, ParamPucks.css:83-100. Command: adapt.
4. [P1] ∿ sweep and puck drag drop frames: lesson sweep 13 frames/33 ms, long tasks to 112 ms; drag 59-83 ms long tasks. a3/oscillators.ts:76,187; a29/PuckHover.tsx:97; a19/ScrubPreview.tsx:88. Command: optimize.
5. [P2] Labels and the lesson end: icon-only Back/⋯/∿, folded "1/7 · 1/2", "Prosto"; 10-11.5 px text; Končaj vs Nadaljuj v poglavju; no recap at the end, graph left at y = −2 f(0,5(x − 3)) + 1. Command: clarify (typeset for the small text).

## Persona red flags
- Student on a tablet (1024): seven cards before one parabola; ∿ unexplained; no reward at the end.
- Teacher projecting: ~15 px lesson text and small puck values; four data cards fill the right half; hover help needs a mouse; in-card scrolling awkward.
- Keyboard / low-vision: logical Tab order and visible ring, but 20+ stops before the pucks; 10-11 px card headings.

## Minor observations
- Reduced motion ignored by the b1 morph (b1/morph.ts:112, 750 ms) and the ∿ sweep; card glides honour it.
- Odčitki cuts its last row on Taylor; completion text under its button at 1024 (regression from 993a22f3, fixed in ee2f3350 after the run).
- Folding the lesson card jumps the tools up; the Povrni line pushes the text down.
- Prototipi chip covers "Naslednji namig" at 1024; hover help stayed after Escape at 1440; step 5 prediction has no input.
- ~90 hard-coded colours/radii in pick CSS; puck accessible names inline Slovenian (needs catalog keys app-wide).

## Questions to consider
- Which single object should the room remember: lesson card, pucks, or graph?
- Should a card ever sit on the graph's own content, or should the board step aside?
- What does a student carry out of the end screen that they did not have at step 1?
