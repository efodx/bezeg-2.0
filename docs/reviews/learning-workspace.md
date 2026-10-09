# Learning workspace implementation review

Implements [the selected B layout](../specs/learning-workspace.md). Comparison source remains on `codex/workspace-prototypes` at `375d453`; the implementation removes all prototype components and variant routing.

## Verification on 2026-10-08

- TypeScript check passed.
- Production build passed with existing CRA/dependency and unrelated lint warnings.
- Workspace and localization suites: 19 tests passed. These cover inspector value retention, explicit presentation controls, prompt switching without resetting controls, point-fit delegation, Bernstein prompts, fixed-parameter repeated subdivision, and localization contracts.
- In-app browser review at 1440 × 900: all 26 graph routes mounted an SVG board and had no horizontal overflow. Grouped navigation highlights and opens the current family.
- At 390 × 844: graph and inspector controls remain reachable, collapse/open works, and both workspace and starting page have no horizontal overflow. Native operation summaries respond to Enter.
- Slovenian/English switching updated headings, topics, prompts, and real preset/export labels. The preset save dialog opens; no user preset data was written or deleted during visual checks.
- PH selection exposes its live hodograph; presentation mode hides learning/navigation and offers explicit open tools and exit controls.
- Point-fit changes the viewport when points are visible and preserves it when all control points are hidden. Bernstein does not offer point-fit.

Parallel source review covered teaching accuracy, preserved mathematical interaction semantics, engineering, UI, and accessibility. Two findings were corrected: repeated subdivision uses a fixed-½ prompt, and fitting an empty visible-point set no longer zooms into the origin. Evaluation, operations, routes, stored presets, and hosting are unchanged. Physical touch and projector review remain unperformed.

Captures: [desktop workspace](learning-workspace-desktop.jpg), [mobile workspace](learning-workspace-mobile.jpg), [starting page](learning-home-desktop.jpg).
