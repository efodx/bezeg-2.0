---
target: tools card pick (toolsCard)
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\1337Hacker\\Desktop\\bezeg-2.0\\.claude\\worktrees\\ux-picks\\src\\uxPicks\\toolsCard\\ToolsCard.tsx"
target_fingerprint: "sha256:cf70656d6775c11bc1938accabf12e373166c4e1796117194819b1fcf4344054"
target_path: "C:\\Users\\1337Hacker\\Desktop\\bezeg-2.0\\.claude\\worktrees\\ux-picks\\src\\uxPicks\\toolsCard\\ToolsCard.tsx"
timestamp: 2026-11-21T18-01-33Z
slug: src-uxpicks-toolscard-toolscard-tsx
closed: true
---
Method: dual-agent (A: design review · B: detector + browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Drag preview is clear; nothing says a card can be moved until it is grabbed |
| 2 | Match System / Real World | 3 | Dock, fold, rail and "Ob grafu levo/desno" read plainly |
| 3 | User Control and Freedom | 2 | Reset is double-click or Home only; a side target reflows the whole graph mid-drag |
| 4 | Consistency and Standards | 3 | Same head as the other cards; flat beside the graph, rounded on it (intended) |
| 5 | Error Prevention | 2 | A floating tools card can sit over the board and the pucks; no visible way back |
| 6 | Recognition Rather Than Recall | 3 | Keyboard model lives only in the grip's title and aria-label |
| 7 | Flexibility and Efficiency | 2 | Placement is per route: a teacher's layout does not follow to the next demonstration |
| 8 | Aesthetic and Minimalist Design | 3 | Minimal head; the board is already crowded by three cards (pre-existing) |
| 9 | Error Recovery | 2 | Keyboard moves and drops are silent to a screen reader; the folded rail reads as a disabled stripe |
| 10 | Help and Documentation | 2 | Only the grip tooltip teaches the gesture |
| **Total** | | **25/40** | **Acceptable** |

## Design Specificity Verdict

LLM assessment: the default state is the existing Bezeg tools column, pixel for pixel (flat, full height, ink rule on top, shell tokens); the 42 px vertical rail is a considered, product-specific detail. The cost is an invisible drag-and-dock model added to a board that already carries three cards.

Deterministic scan: CLI detector clean on ToolsCard.tsx, DockCard.tsx, BoardDock.tsx, DemonstrationWorkspace.tsx (exit 0). Browser overlay (headless, three states) 12-14 findings each: undersized functional text (5; the 0.68rem card titles, also flagged by A), tiny body text (1-2), nested cards (3; dock cards inside the graph panel, inherent to the dock), text occluded (4-6; board cards over JSXGraph axis labels, pre-existing boardText behaviour), heading skip h1 to h3 "Odčitki" (readout card, pre-existing), decorative grid background (the graph's own grid: false positive), one low-contrast hit in the lesson.

## Overall Impression

Right default, right instinct (side docks take space instead of covering the board), but the moment of moving is rough: the graph jumps under the cursor, the held card hides its own target, and keyboard and screen-reader users get no feedback.

## What's Working

- Default placement equals today's workspace; nothing is lost for someone who never drags.
- Side docks narrow the board instead of covering it, which suits projection.
- The lesson card follows the tools' side and stacks above them, on both sides.

## Priority Issues

- [P1] Mid-drag reflow at a side target. Why: the graph jumps ~330 px the moment the gap appears and the held card covers its own ghost, so the target is unreadable. Fix: glide the side column open (width transition, instant under reduced motion) and let the ghost show through the held card while it is over a side dock. Command: animate.
- [P1] Keyboard moves are silent; the grip's focus ring overlaps the title. Why: screen-reader users hear neither the target nor the result; sighted keyboard users see "OORODJA". Fix: a polite status line in DockCard announcing the target and "pripeto"; more room between grip and title. Command: harden.
- [P2] No visible way back from a moved or floating card. Why: a student who floats the tools over the graph has to know double-click or Home. Fix: a reset button in the head that appears only while the card is away from its default place. Command: clarify.
- [P2] Folded rail is a weak target. Why: only the 24 px "+" opens it and it merges with the ink rule; the rail reads as a disabled stripe. Fix: a click anywhere on a folded card's head opens it; give the rail top padding. Command: polish.
- [P3] Card titles at 0.68rem (10.9 px) are undersized for projection (detector and A agree). Fix: raise to 0.75rem. Command: typeset.

## Persona Red Flags

- Alex (power user): placement is stored per route; a preferred layout must be rebuilt on every demonstration.
- Sam (keyboard / screen reader): the grip is a role=button that is really an arrow-key widget; no announcement of target or drop; focus ring collides with the title.
- Teacher projecting: at 1024 px the 310 px column plus three board cards leave a mostly covered ~650 px graph; card titles too small for the back of a room.
- Student in a guided lesson: can drag the tools while a lesson is open with little reason to; can float them over the graph with no visible way back.

## Minor Observations

- The "Prosto" pill can overlap the pucks strip.
- Prototype labels are inline Slovenian (by design on this branch; production needs catalog keys).
- The side ghost is a flat sage rectangle without content preview.

## Questions to Consider

- If the board is the product, should the tools ever sit on top of it, or only beside it?
- Should the tools' place be a global preference (one layout for all demonstrations) rather than per page?
- Would left/right column plus fold cover nearly all use at a fraction of the model's complexity?
