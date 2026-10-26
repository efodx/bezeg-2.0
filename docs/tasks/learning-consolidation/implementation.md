# Consolidated guided examples

Status: complete, 2026-10-26. [Acceptance and integration evidence](../../reviews/learning-consolidation/acceptance.md). Retained as a scope record, not an active assignment.
Source: [chapter-owned guided learning](../../specs/chapter-owned-guided-learning.md), confirmed consolidation section.

1. Content adapter and alignment: one LessonDefinition model for prepared activities, family prompts and authored sequences; exact spline worked join; inventory and numeric checks.
2. Workspace lifecycle: resolve all legacy entries to the unified model; one session/surface; midway return; completion retains editable graph; safe restoration and history tests.
3. Chapter entry and terminology: one chapter example list, preserving compact layout; catalog and bilingual learner names; links restore section reading position/focus.
4. Acceptance: independent lifecycle/math/accessibility reviews, automated checks, production delegated smoke for short/multiframe round trips, completion editing, midway return, catalog/direct links, history, languages, keyboard, narrow/enlarged text. Record gaps and compatibility, commit/push.

Implementation checkout: .worktrees/consolidated-learning from dd7c414. Preserve primary checkout changes. Workers do not commit, push or delegate. Runtime and content interfaces are coordinated by handler.
