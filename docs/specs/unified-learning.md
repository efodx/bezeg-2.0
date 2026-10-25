# Unified Learn and complete chapter drafts

Owner request, 2026-10-25: make Learn the single home for reading and guided learning, preserve useful navigation, and write missing chapter prose without an outline/prose approval gate.

## Scope and acceptance

- `/learn` groups all eight existing demonstration families in a suggested reading order. Each family offers a complete readable chapter and all its available guided lessons; the existing Bézier chapter and its activity return contract remain intact.
- Add original Slovenian and English first-draft chapters for Foundations, Rational curves, Splines, PH curves, Parametrization, Functions and calculus, and Analysis. Each contains motivation, explicit prerequisites, introduced notation, precise mathematics with assumptions, an author-worked example, graph investigation and interpretation, limitations and connections. Cover the family's demonstrations through coherent sections and existing guided lessons, rather than promising unavailable chapters or activities. These are first drafts, not claims of a complete curriculum.
- Preserve the existing lesson text, scenes, controls and direct graph `?learn=1` links. Learn lists guided lessons alongside chapter reading. Use the existing name Guided lesson / Vodena učna pot rather than a separate Guided Paths product entry. The current checkout has no separate Guided Paths route/header entry; its remaining catalog affordance is named Guided path.
- Add stable `/learn/<chapter-id>` links, contents anchors, chapter-to-chapter links, a clear return to Learn, and direct guided exploration links. Preserve `/learn/bezier-curves` and its section/activity links. Unknown chapter routes retain the existing error page.
- Preserve independent Demonstrations, catalog filtering/return navigation and existing graph routes. No preset or storage changes. Existing catalog guided actions remain useful shortcuts with consistent wording.
- Retain the cream/green reading style, keyboard links, narrow-screen flow, overflow-safe formulas, language switching and client-only graph ownership. Reading pages mount no boards.

## Verification

Run typecheck, lint, content/notation and navigation tests, full unit suite and production build. Use independent parallel mathematical/content and engineering/accessibility reviews. Run delegated production browser smoke for Learn, every chapter deep link/refresh, contents navigation, language switching, narrow/desktop layouts, guided lesson entry and existing Bézier activity return; include the shared-shell baseline. Record limitations and results before commit/push.

## Compatibility and impact

Learn expands from a pilot to eight first-draft family chapters and includes all guided lesson entry points. The catalog's Guided path label becomes Guided lesson; its destinations and return state remain unchanged. No existing route is removed because this checkout has no standalone Guided Paths route. This request supersedes the pilot-only rollout limit of `standalone-learning.md`.
