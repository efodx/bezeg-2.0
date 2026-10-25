---
target: demonstrations
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
target_identity: "file:C:\\Users\\NonFriedMotherBoard\\IdeaProjects\\bezeg\\src\\DemonstrationsPage.tsx"
target_fingerprint: "sha256:eb3fc041e30cd5786a2ef22ccba87366c0628716f1657d1de401ba02ba6aaa5a"
target_path: "C:\\Users\\NonFriedMotherBoard\\IdeaProjects\\bezeg\\src\\DemonstrationsPage.tsx"
timestamp: 2026-10-25T08-14-10Z
slug: src-demonstrationspage-tsx
---
Method: dual-agent (A: design_assessment · B: browser_detector)

# Demonstrations critique

Target: src/DemonstrationsPage.tsx; live https://efodx.github.io/bezeg-2.0/demonstrations

The demonstrations page has a solid foundation. Its biggest opportunity is helping students choose confidently, then making the next action clearer. The cream and green palette feels appropriate, and actual mathematical previews make this recognizably Bezeg. The search/sidebar/card structure is conventional, but authentic mathematical content gives it specificity.

Design health: 29/40, Good. Heuristic judgment, not measured usability.

| Heuristic | Score /4 | Assessment |
|---|---:|---|
| System status | 3 | Result counts and filter state respond clearly |
| Real-world match | 3 | Investigation prompts help; specialist topic names assume knowledge |
| Control and freedom | 3 | Search, topic selection and clearing support exploration |
| Consistency | 3 | Cards and controls follow a coherent pattern |
| Error prevention | 3 | Constrained topic choices and forgiving search |
| Recognition | 3 | Real previews and nearby descriptions reduce guessing |
| Efficiency | 3 | Search and topics combine; card navigation has repetition |
| Minimalist design | 3 | Calm composition, with some repeated information |
| Error recovery | 3 | Source provides clear-query and broaden-topic recovery |
| Help | 2 | Useful prompts, but little guidance for choosing a starting point |
| Total | 29/40 | Good |

Strengths: real graph previews communicate the subject directly; investigation sentences give each construction purpose; browser-verified search/topic filtering updates URL, selection and result count clearly.

## Priority issues

1. [P2] Reading comfort for classroom use. Card descriptions are 13px, family labels 11px and actions 12px (src/DemonstrationCollection.css). Subdued small text weakens projected reading. Increase description/action text, strengthen secondary text, and accommodate wrapping in card heights. Suggested command: $impeccable typeset. Projection impact is a design concern, not a physical-projector test result.
2. [P2] Starting guidance. Eight mathematical families and 45 demonstrations suit users familiar with terminology; newcomers must interpret specialist names such as PH curves without a recommended entry. Add concise family explanations or an optional suggested starting demonstration, preserving independent browsing and accurate topic vocabulary. Suggested command: $impeccable onboard.
3. [P2] Graph-entry clarity and keyboard repetition. Graph and lesson actions share ghost styling. Preview, title and graph action each provide a link to the same destination (src/DemonstrationCollection.tsx). Strengthen the graph action, retain a distinct guided lesson, and reduce redundant keyboard stops while preserving comfortable pointer access. Suggested command: $impeccable clarify. Full keyboard journey remains unverified.

Minor observation: overall collection size repeats in the introduction and result summary; reserve the results line for current filtered state.

Cognitive load: moderate for newcomers. Chunking/minimal-choice checklist flags the eight-family decision and large collection; single focus, grouping, hierarchy, working-memory support and progressive filtering are strengths. Eight visible choices alone do not justify hiding the topic navigation.

Emotional journey: calm welcome, engagement through mathematical previews, possible hesitation when interpreting unfamiliar family names; filtering offers reassurance. Graph-entry ending not inspected.

Personas: Jordan (first-time student) needs help interpreting topic names; Sam (keyboard user) meets three links per card to the same graph, with full keyboard/focus navigation unverified; educator needs more readable secondary text for projection.

Questions to consider: Should discovery prioritize newcomers or topic-aware teachers? Would a starting cue or stronger card hierarchy improve selection more?

Deterministic scan: exit 0, [] / zero findings across DemonstrationsPage.tsx, DemonstrationCollection.tsx, DemonstrationPreview.tsx and DemonstrationPicker.tsx. No false positives. A clean scan does not rule out usability issues.

Browser coverage: live desktop screenshots at approximately 1250x720 and 1264x718, accessibility tree, labeled search, visible blue search focus, Bezier search (15/45), topic filter (8/45), URL and selected state updates. Narrow viewport unavailable through supplied browser APIs. Complete keyboard flow, graph/lesson navigation and physical projection not verified. No reliable overlay: browser evaluate API is read-only. No application changes.
