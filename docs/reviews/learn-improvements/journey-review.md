# Task 7 navigation, ownership and UI review

Reviewed the Task 7 acceptance in `docs/specs/learn-improvements.md` §7, product/engineering constraints in `docs/guardrails.md`, localization guidance, and the changed family-link, context-parser, workspace, CSS, test and architecture files. This was a read-only source review; I did not run tests or a browser pass.

## Finding

- **P2 — Give the new investigation links touch-sized targets.** The free-exploration and guided-lesson links added in [`FamilyChapterPage.tsx`](../../../src/learning/FamilyChapterPage.tsx#L79) both sit in `.learning-investigations`. [`LearningPage.css`](../../../src/learning/LearningPage.css#L27) gives those anchors only inline-block display and 5px vertical padding; the adjacent 44px minimum is scoped only to `.learning-lessons a` at line 29. These new actions therefore do not receive the app's established 44px target height and are harder to activate by touch on narrow readers. Extend the 44px rule to the investigation links (or give these two action classes an equivalent target) while keeping the explanatory prompt compact.

## Reviewed contracts

The parser resolves only an authored chapter/section/demo triple on its matching route and constructs its own fixed-base return path; it does not accept an arbitrary return URL. Invalid/duplicate family context is stripped with replacement while unrelated query/hash values are retained. Context is read-only and does not participate in graph scene commands. Changing demonstrations constructs a fresh route without `explore`, while guided lesson entry/exit preserves the family context and removes only `learn`. The family return link targets the exact section; `FamilyChapterPage` waits for MathJax before scrolling and focusing that section heading. Link activation first replaces the reader entry with the exact section hash, preserving modified-click behavior. The added context has a dedicated one-column layout, including the narrow breakpoint, so the shared Bézier activity action grid is not imposed on it.

Focused parser and workspace tests cover valid/mismatched/duplicate context, cleanup preservation, bilingual prompt rendering, and direct guided-context exit. The implementation's final browser evidence, history/focus behavior, responsive/touch behavior, and the worker's requested pre-change or mutation evidence were not available in this source-review pass; the handler should confirm them against the final bytes.

Handler disposition: the 44px rule now covers investigation links. Final browser inventory measured every family free link at least 44px high; exact return, Back focus after math, responsive layout, keyboard/touch and mutation evidence are closed in [Task 7 acceptance](journey-acceptance.md).
