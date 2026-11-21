---
target: UX picks round 5 (all picks; transformations lesson, Taylor, De Casteljau)
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\1337Hacker\\Desktop\\bezeg-2.0\\.claude\\worktrees\\ux-picks\\src\\uxPicks\\toolsCard\\ToolsCard.tsx"
target_fingerprint: "sha256:d265365c749c96e286d18c9beb645ce2ec7c43a6fa51f13d020159d460f96c3e"
target_path: "C:\\Users\\1337Hacker\\Desktop\\bezeg-2.0\\.claude\\worktrees\\ux-picks\\src\\uxPicks\\toolsCard\\ToolsCard.tsx"
timestamp: 2026-11-21T23-02-50Z
slug: src-uxpicks-toolscard-toolscard-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector + browser sub-agent), plus a separate audit agent. Walks: transformations lesson to completion (keys, Bližnjice, Z/N), Taylor free and lesson, De Casteljau at 1440×900 and 1024×768, touch at 1024 and 390, Presentation glance. A scored 27; the handler set heuristic 6 to 3 (A's 2 rests on "hidden" gestures that the new Bližnjice card lists, reachable from the pucks strip, the ⋯ menu and the "?" key) and discounted "lesson text clipped at every desktop step" (A's own w1-1440-s6 shows step 4 whole; the audit measures 3/15 clipped frames on transformations). Evidence: Desktop/bezeg-ux-picks/round5/{critique/A,critique/B,audit}/.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Two counters "Korak 1 od 7 · 1/2" |
| 2 | Match system / real world | 3 | Unlabelled ↺ on a moved card reads as "reset parameters" |
| 3 | User control and freedom | 3 | PageDown in the lesson card advances while its text is unread; N has no one-key restore |
| 4 | Consistency and standards | 2 | Open tools card has no title (grip + ↺ only, toolsCard.css:164 hides it); phone lesson head differs from desktop |
| 5 | Error prevention | 3 | Locked pucks state their reason |
| 6 | Recognition rather than recall | 3 | Bližnjice lists every key and gesture; the N row shows even when N is inactive |
| 7 | Flexibility and efficiency | 3 | Z/N/?, typed entry, Alt+arrows; letter keys need focus on the graph (by WCAG 2.1.4 design) |
| 8 | Aesthetic and minimalist design | 2 | At 1440 a lesson step shows lesson card, chips, hint, Odčitki, Legenda, 5 pucks + 5 ∿ + "?" |
| 9 | Error recovery | 3 | Povrni, card reset |
| 10 | Help and documentation | 3 | Excellent puck help; Bližnjice ~20 rows, scrolls, covers the pucks at 1024 |
| Total | | 28/40 | Acceptable |

Audit: a11y 3, performance 3, theming 2, responsive 3, integrity 3 = 14/20 (unchanged). Fixed: PageUp/PageDown scope, ∿ title, hint close, menu below Back/Next, Odčitki width, Taylor repeat, recap wrap; tools folded in every lesson; Bližnjice opens from four places, Escape returns focus, fits at 1024/390/360 and 24 px root, contrast ≥ 6.4; Z/N/? inert on body and while typing (2.1.4 met by focus scope); drag start 85 → 58 ms. Worse: colour literals 126 → 136 (shortcuts.css shadows, fade masks); inline Slovenian 53 → 68 lines (Shortcuts.tsx). Lesson card still clipped where the board is short: transformations 3/15 frames (max 119 px), Taylor 9/22 (max 395), De Casteljau 3/19 at 1440; Taylor 12/22 at 1024.

Detector: CLI exit 0, 73 advisories (37 colour, 36 radius; +4 from shortcuts.css). Overlay 5-12 per page, same set as round 4: nested cards, tick labels under the lesson summary/hint/puck buttons; the rest app shell or JSXGraph false positives.

## Priority issues
1. [P1] Open tools card has no title: the head shows a grip, an unlabelled ↺ (after a move) and the fold; on transformations no tabs either (A w1d-04-tools-open; toolsCard.css:164, DockCard.tsx:286). Fix: keep "Orodja" visible in the open head (tabs on their own row or after the title); give ↺ a visible or tooltip label "Vrni kartico na mesto". Command: clarify.
2. [P1] The lesson needs more height than the board gives: Taylor clipped on 9/22 frames at 1440 and 12/22 at 1024 (up to 614 px); PageDown inside the card advances past unread text. Fix: PageDown scrolls the card's text first and advances at its end; give the board more height in a lesson (compact page header). Command: layout + harden.
3. [P2] Density in a lesson at 1440: lesson card, folded chips, hint, Odčitki, Legenda and a pucks strip of 11 targets. Fix: in a lesson, the strip shows the parameters the frame names, others behind one "+". Command: distill.
4. [P2] Bližnjice is long (~20 rows, 5 groups), scrolls and covers the pucks at 1024 (450×553); lists N when inactive. Fix: two columns, only active rows, terse labels. Command: distill.
5. [P3] Phone: the pucks "?" is dead under the lesson's graph catcher; chips truncate ("Legen…", "Odči…"). Command: adapt.

## Persona red flags
- Alex: Z/N go silent after a stray click off the board; the strip "?" is 24 px; N leaves values swept with no restore.
- Jordan: two counters in the step label; the open Orodja head is blank; the Odčitki "?" unlabelled.
- Casey (390): lesson sits below graph and pucks; chips truncate; puck help card covers the graph.

## Minor observations
- Typing a value widens a puck and shifts its neighbours.
- At 1024×768 the page title and buttons take ~300 px before the graph.
- Moving Orodja to the right pushes Odčitki down and clips its help row.
- Tab out of Bližnjice lands at the page top (portalled at the end of body); two De Casteljau fold buttons share one name.
- Presentation: card type stays 12-13 px; hint still shows.

## Questions to consider
- If the lesson is the point, why does the page header take ~300 px before the graph?
- Do five always-available sweeps teach more than one sweep the frame chooses?
- Should each affordance show its own key where the hand is, rather than one list?
