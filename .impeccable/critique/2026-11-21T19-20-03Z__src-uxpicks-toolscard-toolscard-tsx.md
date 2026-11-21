---
target: tools card, lesson card on the graph, pucks-only (pick toolsCard)
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\1337Hacker\\Desktop\\bezeg-2.0\\.claude\\worktrees\\ux-picks\\src\\uxPicks\\toolsCard\\ToolsCard.tsx"
target_fingerprint: "sha256:59f89cbf5fc530ec798bfc8082896c8d5e7e801e583f3b66b6ba33f784944eb4"
target_path: "C:\\Users\\1337Hacker\\Desktop\\bezeg-2.0\\.claude\\worktrees\\ux-picks\\src\\uxPicks\\toolsCard\\ToolsCard.tsx"
timestamp: 2026-11-21T19-20-03Z
slug: src-uxpicks-toolscard-toolscard-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector + browser sub-agent)
Target: lesson card on the graph, pucks-only tools, tools fold while reading, and the board dock with them (pick toolsCard; ux-picks branch).

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Lesson progress is small grey text; a puck mid-animation (c 2,8208) disagrees with frame text (c = 3) without saying so |
| 2 | Match System / Real World | 3 | Natural Slovenian; "Končaj" beside "Nazaj v poglavje" does not say what is lost |
| 3 | User Control and Freedom | 3 | Fold, drag, reset per card exist; no "put every card back" |
| 4 | Consistency and Standards | 2 | Lesson title cut to "Preo…" in the card head, against DESIGN.md (title wraps, never cut); the base phone lesson still says "Skrij" |
| 5 | Error Prevention | 3 | Locked parameters announced; default lesson place collides with other cards on short boards |
| 6 | Recognition Rather Than Recall | 3 | Pucks show name and value; their help is hover/focus only |
| 7 | Flexibility and Efficiency | 3 | Drag, dock, keyboard grip; no layout presets |
| 8 | Aesthetic and Minimalist Design | 2 | During a lesson at 1440×900: Legenda, Besedilo, Odčitki, lesson card, folded tools, five pucks with wave buttons; the graph's free middle is about 550×520 |
| 9 | Error Recovery | 2 | Not exercised; no recovery for a card left in an awkward float |
| 10 | Help and Documentation | 3 | The puck hover card is a good teaching surface; unreachable on touch |
| **Total** | | **27/40** | **Good, with crowding and touch gaps** |

## Design Specificity Verdict

LLM: mostly specific. Cream panels, Literata, serif formulas in Besedilo/Odčitki and pucks that sit next to the curve they change belong to a mathematics instrument. Generic: the identical card chrome (grip, small caps, −/+) reads as "floating panels" more than a study notebook.
Deterministic: CLI detector clean on the six markup files (0 findings). Browser overlay (3 pages at 1440): small functional text (the "Graf" eyebrow, base app), one unverified low-contrast hit on the lesson page, nested-card hits on tools content (false positives except arguably `.guided-lesson-reading` tint boxes), "text occluded" on small icon buttons beside pucks (false positives), graph-paper grid banner (false positive; graph-paper is the brand). No overlay is left visible to the user (headless run).

## Overall Impression

The architecture is right now: one card system for tools, text, legend, readouts and the lesson. The weakness is density: with a lesson open the board carries five cards and a puck strip, and the default lesson place is the most crowded corner on a 900 px tall window. Biggest opportunity: a lesson-time layout that keeps only what the frame needs.

## What's Working

- Pucks put each parameter beside the curve it moves, and the hover card (name, the tools' help, neighbour fan) teaches better than the old slider rows.
- The tools card folding during reading frames gives the lesson the room at the moment it needs it.
- Board cards share one shell, so moving, folding and resetting are learned once.

## Priority Issues

- [P1] Lesson card head cuts the title ("Preo…" at 1024, "Preoblikovanje graf…" at 1440). Why: DESIGN.md says the lesson title wraps and is never cut; the learner loses which lesson this is. Fix: let the head wrap: title on its own line when the actions do not fit, actions on a second row (as the base card does). Command: $impeccable polish.
- [P1] Crowding during a lesson on 1440×900 and 1024×768: lesson card shares the right column with Besedilo and Odčitki and gets ~120 px of text at 1440. Fix: while a lesson is open, start Legenda and Odčitki folded (like the narrow-window rule), or give the lesson its own column side by default. Command: $impeccable distill / layout.
- [P1] Puck help unreachable on touch: the hover card ignores touch, and the help no longer sits in the tools. Fix: a tap without drag on the puck's name area opens the card (close on outside tap), keeping the track tap as jump. Command: $impeccable adapt.
- [P2] Lesson progress ("Razlaga / Korak 3 od 7 · Okvir 1 od 2") is the smallest text in the card. Fix: give it the 12.5–13px semibold of the other progress text and a clear step/frame rhythm. Command: $impeccable typeset.
- [P3] A puck animating (a3 or a scene) shows values the frame text does not; no "moving" state on the value. Fix: mark the value while a sweep runs. Command: $impeccable polish.

## Persona Red Flags

Classroom teacher at 1920: card labels and puck names at 11–13 px are hard to read from the back; five cards crowd the projected graph; Presentation's effect on the dock was not checked.
Student on a 1024 laptop: title "Preo…", lesson card squeezed under Besedilo, unclear that folding the card unlocks the graph.
Phone user at 390: lesson below the board (base behaviour), puck strip scrolls with a puck cut at the edge, no puck help on touch.

## Minor Observations

- Wave (∿) buttons beside each puck carry no visible label.
- The Prototipi pill covers lesson text near the bottom right (prototype only).
- "Prosto" slightly overlaps the top-left of a tall carried card near the board top.

## Questions to Consider

- Should Legenda, Besedilo and Odčitki be one "Podatki" card with tabs during a lesson?
- Should a lesson's reading frame only pause the graph instead of locking it?
- Is the right side the best default for the lesson, or should it start where the tools are (top left) since the tools fold while reading?
