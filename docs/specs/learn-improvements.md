# Learn improvements

Source: owner request, 2026-10-26, to execute [the ordered backlog](../tasks/learn-improvements/README.md). The backlog itself stays local and must not be pushed. This specification extends [unified learning](unified-learning.md).

## Sequence and boundaries

Complete the content audit first, then the landing page, shared reader, reproducible app figures, Bézier pilot, each remaining chapter in backlog order, reading/exploration navigation, and final editorial/browser verification. Define acceptance for each implementation slice before editing its application code. Preserve stable chapter/section/activity links, existing valid presets and independent graph entry unless a deliberate break is documented here.

## 1. Content audit

Review the rendered content sources for all eight chapters, Slovenian first and English for equivalent meaning. Cover mathematical correctness and assumptions, prerequisite sufficiency, introduced notation, worked-example arithmetic, explanation gaps, graph instructions, and connections. Distinguish actual errors from teaching improvements, prioritize actionable findings, and give source locations and a concrete correction or outcome. Check the relevant graph or lesson source where an instruction depends on available behavior. Do not modify application content in this slice.

Acceptance:

- A repository-local audit covers Foundations, Bézier, Rational curves, Splines, PH curves, Parametrization, Functions and calculus, and Analysis individually.
- Each chapter records reviewed scope and evidence, prioritized errors and teaching improvements (or an explicit absence of identified errors), and recommendations suitable for the later bounded implementation.
- Verify numerical examples by calculation; separate demonstrated defects, pedagogical judgment, and unverified claims. Resolve mathematical contradictions before dependent edits.
- The handler checks findings against sources and records disposition for later slices. Documentation-only audit needs no browser smoke.

## Shared constraints and later verification

Keep static client-only ownership, Slovenian default and equivalent English, elderflower visual identity, readable formulas and precise mathematics. Use actual reproducible Bezeg captures for figures. Reading pages mount no boards. Verify UI changes at desktop/narrow widths, enlarged text, keyboard access and projection-like views; run the smoke skill for affected routes/workflows. Final verification covers refresh, language switch, browser history and exact-section activity return. Record observed evidence and gaps per slice; physical device/projector observations are optional under the release policy.

## 2. Learn landing page

Owner confirmed a Foundations starting point followed by an ordered topic map with graph lessons within each topic, and delegated remaining design decisions (2026-10-26). Refine the existing cream/green reading surface. The page should help students choose; full chapter prerequisites belong in the reader.

Acceptance:

- Give Foundations an explicit starting action in the introduction. Explain that topic order is suggested, not enforced, and distinguish reading from step-by-step guided graph lessons.
- Keep all eight topic anchors, chapter routes and all 45 available guided lesson links. Each topic has one main chapter heading and read action; eliminate the repeated family/chapter heading pair.
- Show a meaningful existing app-derived graph preview for every topic, using catalog capture assets and accurate bilingual alt/caption text. Preserve the entire graph image rather than cropping away controls or labels. Images load lazily below the introduction; no videos or live boards are needed.
- Replace landing-page prerequisite paragraphs with short topic connections pointing to relevant chapters. Use a clear primary read action and a native expandable list of guided graph lessons per topic, with an informative count. All lessons remain reachable by keyboard without a pointer.
- At 1440px, 1024px (projection-like), 390px, and 200% text, retain readable headings, visible focus, usable targets and no document horizontal overflow. Expanded lesson lists fit naturally. Hash returns scroll to the topic, language changes update labels and previews, and browser Back retains navigation.
- Run focused learning unit checks, typecheck, production build, and delegated production browser validation covering these states. Review the rendered page before acceptance; no mathematical runtime or preset behavior changes are in this slice.

Accepted 2026-10-26: audit in `docs/reviews/learn-improvements/content-audit.md`; landing implementation and browser evidence in `docs/reviews/learn-improvements/landing-worker.md` and `landing-browser.md`. Handler reviewed desktop and narrow renders and repaired lesson link target heights after browser review. Catalog captures may contain Slovenian graph labels; bilingual alternative text/captions supply the corresponding explanation. Later chapter figures still require reproducible captures matched to their specific examples and activities.
