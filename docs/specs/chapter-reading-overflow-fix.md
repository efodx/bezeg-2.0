# Chapter reading overflow repair

Source: [Actions run 40302017782](https://github.com/efodx/bezeg-2.0/actions/runs/40302017782), 2026-10-26. The parametrization row in `tests/unified-learning.smoke.spec.cjs` fails because the document overflows at 390px after switching to English and enlarging root text to 200%.

This is a bounded repair of the narrow-screen and overflow-safe reading requirement in [unified learning](unified-learning.md), retaining [chapter ownership](chapter-owned-guided-learning.md).

## Acceptance

- Reproduce the exact failing reading workflow against current master and identify the rendered element responsible before changing styling.
- Keep chapter content within the viewport at 390px and 200% text enlargement, in both languages; retain readable action labels, keyboard access, contents navigation and locally scrolling wide formulas.
- Use a focused layout repair; preserve mathematical content, graph behavior, routes and stored presets. Do not conceal overflow at the document level or weaken the failing assertion.
- Pass the original parametrization browser row and relevant shared chapter rows against a production build. Check the affected layout visually and record the tested revision, observed failure/pass evidence and any coverage gaps.

## Reproduction boundary

The exact CI assertion failed again on a retry, but the default Windows font passed locally. A production-browser font-metric probe reproduced the same page overflow with Verdana: the English `α parametrizations` exploration action grew to about 373px inside a 328px content area, extending the 390px document to 404px. The repair must constrain the action's outer width and let its text wrap. A controlled increase in action letter spacing provides a portable regression without requiring the same operating-system fonts. The CI font itself has not been measured; this evidence establishes the layout defect rather than a specific font or asynchronous typesetting cause.

No migration or breaking change is intended.
