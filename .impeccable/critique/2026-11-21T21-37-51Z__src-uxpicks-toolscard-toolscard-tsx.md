---
target: UX picks round 2 (all picks; transformations lesson, Taylor, De Casteljau)
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\1337Hacker\\Desktop\\bezeg-2.0\\.claude\\worktrees\\ux-picks\\src\\uxPicks\\toolsCard\\ToolsCard.tsx"
target_fingerprint: "sha256:f75f22522ac809ce448cf320d49caabeb5b3d5f629118400be8a950df050787e"
target_path: "C:\\Users\\1337Hacker\\Desktop\\bezeg-2.0\\.claude\\worktrees\\ux-picks\\src\\uxPicks\\toolsCard\\ToolsCard.tsx"
timestamp: 2026-11-21T21-37-51Z
slug: src-uxpicks-toolscard-toolscard-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector + browser sub-agent), plus a separate audit agent. Walks: transformations lesson, Taylor, De Casteljau at 1440×900 and 1024×768, touch at 1024 and 390. A ran partly with "board makes room" on (reverted in 86a32c61 during the run); its view-jump finding is discounted. Evidence: Desktop/bezeg-ux-picks/round2/{critique/A,critique/B,audit}/.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Rail, Povrni, Prosto clear; "Končaj" seen on a frame that only advances |
| 2 | Match system / real world | 3 | Plain Slovenian; "Korak 7 od 7" spans three frames |
| 3 | User control and freedom | 3 | Back, fold, Povrni, reset; ⋯ menu opens over Naprej |
| 4 | Consistency and standards | 3 | One card language; the dark puck help card is a one-off |
| 5 | Error prevention | 3 | Locked params in reading frames gone; phone hint truncated |
| 6 | Recognition rather than recall | 2 | Grip, head double-click, Prosto, icon-only ∿ undiscoverable |
| 7 | Flexibility and efficiency | 3 | Dock anchors, typed values, arrow-key grips |
| 8 | Aesthetic and minimalist design | 2 | At 1024 cards cover 30-53% of the board |
| 9 | Error recovery | 3 | Povrni in one tap |
| 10 | Help and documentation | 3 | Section "?" and puck help strong; 11 px text weak for projection |
| Total | | 28/40 | Acceptable |

Audit: accessibility 3, performance 3, theming 2, responsive 3, integrity 3 = 14/20 (was 12). Round-1 P1s: phone fixed (0 overlaps, 5/5 pucks at 390 and 360); sweep fixed at 1x (0 long tasks; drag 62-78 ms, 421 ms at 4x); hard-coded colours unchanged (90). Reduced motion fixed for morph and sweep.

Detector: CLI exit 0, 66 advisories (37 colour, 29 radius; ParamPucks.css 17, dock.css 11, toolsCard.css 10). Overlay 8-12 per desktop page (was 11-13), 2 on phone: undersized "Graf"/"Preizkusi in opazuj" (10.4-10.6 px), 11.5 px hint, nested cards, h1→h3, 104-char line on the completion page, axis labels under cards; false positives: grid, JSXGraph SVG.

## Priority issues
1. [P1] At 1024×768 the default anchors put cards over the curve and x-axis ticks (lesson 44%, Taylor 53%, De Casteljau 30%: tools card hides half the Bézier curve); Besedilo/Legenda text cut. "Board makes room" was reverted as not generalizable. Command: layout.
2. [P1] Presentation mode: readout help text in the Besedilo card ~2:1 on cream (no .is-presenting override; boardText/BoardTextCard.css). Command: polish.
3. [P2] Lesson end: "Končaj" shown on a frame that only advances (accessible name "Naprej: naslednji okvir"), extra frame after it, "Korak 7 od 7" over three frames, completion card without recap. Command: clarify.
4. [P2] Free exploration density: three open cards hide Taylor's x-axis at 1440. Command: distill.
5. [P2] Small text and targets: 11-12 px help/captions, 40 px tabs, 34 px phone chips. Command: typeset/adapt.

## Persona red flags
- Teacher projecting: 11 px help text, Besedilo readout help unreadable in Presentation, cards over a third of the board at 1024.
- Student on a tablet: chips 34 px; Prototipi pill over Naprej at 360 (prototype artifact).
- Keyboard user: logical Tab order and arrow-key grips; Končaj name/label mismatch.

## Minor observations
- 360 px puck strip wraps raggedly; the dark help card overlaps the tools; ⋯ menu over Naprej; 90 hard-coded colours; polling intervals (cleaned up) and inline Slovenian strings unchanged.

## Questions to consider
- Should a narrow board fold every card but the lesson and tools by default, outside lessons too?
- Does the lesson need a recap at the end, or is the graph the recap?
