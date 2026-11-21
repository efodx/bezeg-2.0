---
target: UX picks round 3 (all picks; transformations lesson, Taylor, De Casteljau)
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\1337Hacker\\Desktop\\bezeg-2.0\\.claude\\worktrees\\ux-picks\\src\\uxPicks\\toolsCard\\ToolsCard.tsx"
target_fingerprint: "sha256:f75f22522ac809ce448cf320d49caabeb5b3d5f629118400be8a950df050787e"
target_path: "C:\\Users\\1337Hacker\\Desktop\\bezeg-2.0\\.claude\\worktrees\\ux-picks\\src\\uxPicks\\toolsCard\\ToolsCard.tsx"
timestamp: 2026-11-21T22-06-23Z
slug: src-uxpicks-toolscard-toolscard-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector + browser sub-agent), plus a separate audit agent. Walks: transformations lesson, Taylor (lesson and free), De Casteljau at 1440×900 and 1024×768, touch at 1024 and 390. A's "Besedilo/Odčitki title switch" is discounted (the rename went live during its walk, ee869958). Evidence: Desktop/bezeg-ux-picks/round3/{critique/A,critique/B,audit}/.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Progress "Korak 7 od 7 · 3/3", rail, Povrni |
| 2 | Match system / real world | 3 | Plain Slovenian |
| 3 | User control and freedom | 3 | Back, fold, Povrni; menu's "Končaj vodeni primer" has no confirm (by owner's earlier choice) |
| 4 | Consistency and standards | 2 | "Končaj" button vs "Končano" header; a Legenda dropped on Odčitki overlaps it |
| 5 | Error prevention | 3 | Taylor lesson no longer crashes |
| 6 | Recognition rather than recall | 3 | Section "?", puck help |
| 7 | Flexibility and efficiency | 3 | Dock, typed values, keyboard |
| 8 | Aesthetic and minimalist design | 2 | At 1024 the left stack + pucks cover ~43% of the board; cramped scroll windows |
| 9 | Error recovery | 3 | Povrni restores in one tap |
| 10 | Help and documentation | 3 | "Kaj bi morali opaziti" reveal, puck help with ghosts |
| Total | | 28/40 | Acceptable |

Audit: a11y 3, performance 3, theming 2, responsive 3, integrity 3 = 14/20. Round-2 P1s: Presentation contrast fixed (min 5.9:1); 1024 coverage improved (lesson 43%, Taylor 26%, De Casteljau 24%; was 44/53/30); phone and sweep fixes hold; drag start still one 80 ms task; colours unchanged (126 literals). Taylor lesson walks all 22 frames without error. No new P0/P1.

Detector: CLI exit 0, 67 advisories (37 colour, 30 radius). Overlay 10-11 per desktop page, 2 on phone; real in the picks: nested cards (.ux-bcard-*), small/straggler text in .ux-btext-body .inspector-help; the rest is app shell (.workspace-eyebrow, .workspace-gesture-hint, h1→h3) or JSXGraph.

## Priority issues
1. [P1] Cramped reading at 1024: the lesson body shows ~4 lines, the tools ~100 px; at 1440 the completion recap is cut after item 3-4. Command: layout.
2. [P1] At 1024 cards still cover ~43% of the board in a lesson; the puck strip crosses Taylor's x-axis ticks; a dropped Legenda lands on Odčitki. Command: layout.
3. [P2] The Odčitki card is a clipped wall of text and states one fact twice ("skrita"/"skrito"). Command: distill.
4. [P2] Wording: "Končaj" vs "Končano"; strings outside t() in the lesson card (GuidedLesson.tsx:731, 764, 788, 791). Command: clarify.
5. [P2] Desktop targets 24 px on the lesson card controls; tool tab labels break mid-word at 24 px root text; nudge ring and refuse shake ignore reduced motion (ParamPucks.css:32, 41). Command: polish/adapt.

## Persona red flags
- Student at 1024: four lines of lesson text at a time, the curve partly under the pucks.
- Teacher projecting: readable in Presentation now; the left stack still covers a large part of the board at 1024.
- Keyboard user: logical order; 24 px targets.

## Minor observations
- Taylor steps 1-4 kept Odčitki folded at 1024 (no reference in those frames); drag start 80 ms; untracked timers (ParamPucks.tsx:168, 360; morph.ts:132); setupChanged ignores arrays of different length.

## Questions to consider
- At 1024, should the lesson card own the left half of the board while it is open, with the tools folded to a tab?
- Has the card-on-graph model reached its limit at 1024, so the app-wide plan should define a narrow-screen layout of its own?
