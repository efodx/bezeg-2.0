---
target: UX picks round 4 (all picks; transformations lesson, Taylor, De Casteljau)
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:C:\\Users\\1337Hacker\\Desktop\\bezeg-2.0\\.claude\\worktrees\\ux-picks\\src\\uxPicks\\toolsCard\\ToolsCard.tsx"
target_fingerprint: "sha256:60b56bd80665f079f8a4f24d1d3d6d9a1168678416b60aaa9dd780d3cb4e1581"
target_path: "C:\\Users\\1337Hacker\\Desktop\\bezeg-2.0\\.claude\\worktrees\\ux-picks\\src\\uxPicks\\toolsCard\\ToolsCard.tsx"
timestamp: 2026-11-21T22-36-59Z
slug: src-uxpicks-toolscard-toolscard-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector + browser sub-agent), plus a separate audit agent. Walks: transformations lesson to the completion card, Taylor (lesson and free), De Casteljau at 1440×900 and 1024×768, touch at 1024 and 390, Presentation glance. Handler adjusted A's heuristic 6 from 2 to 3: its touch-help finding was unverified in headless runs and the ∿ buttons carry aria-label and title. Evidence: Desktop/bezeg-ux-picks/round4/{critique/A,critique/B,audit}/.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Progress row, rail, "Končano · 7/7"; a folded lesson card shrinks progress to "1/7 · 1/2" |
| 2 | Match system / real world | 3 | Plain Slovenian; "Strni", "Prilagodi točkam" need context |
| 3 | User control and freedom | 3 | Back on the completion card, Povrni, fold, reset; PageUp/PageDown captured page-wide |
| 4 | Consistency and standards | 2 | Folded "ORODJA" and "VRSTNI RED OPERACIJ" chips look alike but differ; lesson/tools/readout cards differ in chrome; Odčitki widens 197→360 px when "?" opens |
| 5 | Error prevention | 3 | Typed puck entry rounds silently (2.5 → 2,1 shown) |
| 6 | Recognition rather than recall | 3 | Puck help card, section "?"; keyboard map (Alt+←/→, typed entry, double-click reset) is undiscoverable |
| 7 | Flexibility and efficiency | 3 | Keyboard frame keys, typed values, docking; no fold-all, no sweep-all |
| 8 | Aesthetic and minimalist design | 2 | At 1440×900 in a lesson the lesson and an open tools card share the left column: prose fades mid-sentence, tools show only the select; 8+ regions on screen |
| 9 | Error recovery | 3 | Povrni restores in one tap |
| 10 | Help and documentation | 3 | "Kaj bi morali opaziti", light puck help, one-time gestures hint |
| Total | | 28/40 | Acceptable |

Audit: a11y 3, performance 3, theming 2, responsive 3, integrity 3 = 14/20 (unchanged). Round-4 changes verified: no native puck title under a29; Naprej to the completion card on all three routes, Končaj only in "⋯"; Alt+→/PageDown advance; tools folded at 1024 in a lesson; gestures hint once; reduced motion stops nudge/shake; tabs on one line at 24 px root; no Odčitki card holds only its "?". Cover at 1024: lesson 38 % (was 43), Taylor 26, De Casteljau 24; at 1440: 31/39/22 % (was 34/43/22). Unchanged: 126 colour literals, drag start 85 ms long task, untracked timers. Regressed: inline Slovenian (38 lines in 15 pick files plus 8+ in GuidedLesson.tsx).

Detector: CLI exit 0, 68 advisories (35 colour, 33 radius; ParamPucks.css, dock.css, toolsCard.css, UxPicksPanel.css, PuckHover.css most). Overlay 6-12 per page; real in the picks: nested cards (.ux-bcard-*), axis labels under the lesson summary and the gestures hint; the rest is app shell (eyebrow, gesture hint text, h1→h3) or JSXGraph false positives (grid background, assembled shapes).

## Priority issues
1. [P1] Lesson and tools share the left column at 1440×900: lesson prose cut mid-sentence after ~6 lines with a fade, tools show only the select and a cut hint (A w1-1440-00). Below 1200 px the tools fold; at 1440 they open. Fix: during a lesson the tools start folded at every width (open on demand) and the lesson card takes the column up to its text. Command: layout.
2. [P2] Nested scroll in the tools card on a free graph: De Casteljau's coordinate table is cut after p1 at 1440×900 inside a scroll window (A w3-1440). Fix: sections fold by default beyond the first, or the card grows to the board's free height with a visible scroll cue. Command: layout.
3. [P2] PageUp/PageDown captured page-wide (GuidedLesson.tsx window keydown): with focus on body or a button PageDown changes the frame and the page cannot scroll. Fix: only when focus is inside the lesson card, or drop them and keep Alt+←/→. Command: harden.
4. [P2] Card chrome inconsistency and density: folded tool and section chips look identical; Odčitki jumps wider when "?" opens; "⋯" menu covers Back/Next; Taylor's Odčitki repeats "ocena napake: skrita" and "Predpostavka ocene skrito"; 8+ regions in a lesson. Command: distill.
5. [P3] Completion recap wraps with a leading "·" on a new line (h7 tr-1024-end, A w1). Fix: separators that never start a line (list with inline separators, or one item per line when it wraps). Command: polish.

## Persona red flags
- Alex (power user): Alt+←/→ and PageUp/PageDown, typed entry, double-click reset are not advertised; no sweep-all or fold-all.
- Jordan (first-timer): pucks below the fold at 1440×900 and 1024×768; "ORODJA" and "VRSTNI RED OPERACIJ" chips look the same but do different things; the gestures hint floats over the graph.
- Casey (390×844): the Prototipi pill covers the sticky Nazaj/Naprej bar (prototype chrome); lesson prose shows about one line above the bar; touch targets 44 px.

## Minor observations
- A puck widens while sweeping or typing, shifting its ∿.
- The puck hover card spills past the board's left edge.
- ∿ keeps a native title while a29 is on; hint close button 24×34.
- Round-4 CSS added literals #fbefd4 and #526152.
- Presentation: pucks below the fold at 900 px, Prototipi over Legenda.

## Questions to consider
- If the pucks are the control, why does Orodja open at all in a lesson?
- Should the lesson card be the only open card in a lesson and the rest drawers?
- What would give the graph its first 300 px back (page header collapse on entry)?
